import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { CopilotPanel } from './CopilotPanel';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { Scenario } from '../../engine/demo/types';

afterEach(cleanup);

function makeState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    status: 'idle',
    cursor: 0,
    speed: 1,
    activeStage: 0,
    logs: [],
    grownVolumes: [],
    revealedBlocks: [],
    matchedMaterials: [],
    revealedRedlines: [],
    pricingRevealed: false,
    focus: null,
    pendingCard: null,
    redlineOverrides: {},
    backendRequirements: [],
    backendExportPlan: null,
    backendOutline: null,
    backendCoverage: null,
    backendReport: null,
    serverDocxUrl: null,
    serverPackageUrl: null,
    error: null,
    mode: 'demo',
    ...overrides,
  };
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'kqyy',
    meta: {
      项目名: '测试项目',
      采购人: '测试单位',
      采购方式: '公开招标',
      评审办法: '综合评分法',
      限价: 270000,
      报价: 265000,
      报价利用率: '98.15%',
      保证金: 5000,
      服务周期: '1 年',
    },
    strategy: { method: 'composite', 基调: '主攻技术分', 报价基调: '按限价空间反推分项单价' },
    volumes: [],
    requirements: [],
    mapping: [],
    materials: [],
    blocks: [],
    redlines: [],
    pricing: { lines: [], 限价: 270000, 报价: 265000, 利用率: '98.15%' },
    steps: [],
    ...overrides,
  };
}

function makeEngine(overrides: Partial<WorkspaceEngine> = {}): WorkspaceEngine {
  return {
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    reset: vi.fn(),
    stepOnce: vi.fn(),
    setSpeed: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    confirmCheckpoint: vi.fn(),
    chooseOption: vi.fn(),
    provideSupplement: vi.fn(),
    revealChapterManually: vi.fn(),
    revealVolumeManually: vi.fn(),
    addCustomUserMessage: vi.fn(),
    ...overrides,
  };
}

describe('CopilotPanel', () => {
  test('requirements phase renders StrategySection with quality metrics', () => {
    const state = makeState({
      activeStage: 1,
      backendRequirements: [
        { id: 'req-1', type: '废标', text: '要求1', page: 3, mandatory: true, score_weight: null },
        { id: 'req-2', type: '资质', text: '要求2', page: null, mandatory: false, score_weight: 5 },
      ],
    });
    render(
      <CopilotPanel
        state={state}
        scenario={makeScenario()}
        engine={makeEngine()}
        phase="requirements"
        onOpenLibrary={vi.fn()}
      />,
    );

    expect(screen.getByText('投标策略建议')).toBeInTheDocument();
    expect(screen.getByText(/综合评分法。按限价空间反推分项单价/)).toBeInTheDocument();
    expect(screen.getByText('2 项')).toBeInTheDocument(); // 要求条目
    expect(screen.getByText('1 项')).toBeInTheDocument(); // 强制红线
    expect(screen.getByText('1 / 2')).toBeInTheDocument(); // 带页码定位
    // 其它阶段区块不应出现
    expect(screen.queryByText('正在生成')).not.toBeInTheDocument();
  });

  test('generate phase renders GenerateSection with logs, materials and escalate notice', () => {
    const state = makeState({
      activeStage: 4,
      logs: [
        { id: 'l1', text: '生成第一章', stage: 4 },
        { id: 'l2', text: '生成第二章', stage: 4 },
      ],
      matchedMaterials: ['m1'],
      pendingCard: { id: 'e1', stage: 4, kind: 'escalate', duration: 0, escalateTitle: '业绩口径待决断' },
    });
    const scenario = makeScenario({
      materials: [
        { id: 'm1', category: 'qual', 名称: '资质证书A', 命中: true },
        { id: 'm2', category: 'people', 名称: '人员证书B' },
      ],
    });
    const onOpenLibrary = vi.fn();
    render(
      <CopilotPanel state={state} scenario={scenario} engine={makeEngine()} phase="generate" onOpenLibrary={onOpenLibrary} />,
    );

    expect(screen.getByText('· 生成第一章')).toBeInTheDocument();
    expect(screen.getByText('· 生成第二章')).toBeInTheDocument();
    expect(screen.getByText('⏸ 1 项待决断')).toBeInTheDocument();
    expect(screen.getByText(/业绩口径待决断/)).toBeInTheDocument();
    expect(screen.getByText('资质证书A')).toBeInTheDocument();
    expect(screen.getByText('命中')).toBeInTheDocument();
    expect(screen.getByText('需补充')).toBeInTheDocument();

    fireEvent.click(screen.getByText('进入资料库 →'));
    expect(onOpenLibrary).toHaveBeenCalled();

    // 其它阶段区块不应出现
    expect(screen.queryByText('投标策略建议')).not.toBeInTheDocument();
  });

  test('pricing phase renders PricingLogicSection with pricing metrics', () => {
    const state = makeState({ activeStage: 7 });
    const scenario = makeScenario({ pricing: { lines: [], 限价: 300000, 报价: 295000, 利用率: '98.33%' } });
    render(<CopilotPanel state={state} scenario={scenario} engine={makeEngine()} phase="pricing" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText('智能测算逻辑')).toBeInTheDocument();
    expect(screen.getByText('¥295,000')).toBeInTheDocument();
    expect(screen.getByText('¥300,000')).toBeInTheDocument();
    expect(screen.getByText('98.33%')).toBeInTheDocument();
  });

  test('selfcheck phase renders ReleaseSection pass banner when coverage is complete', () => {
    const state = makeState({
      activeStage: 8,
      backendCoverage: { total: 10, responded: 10, missing: [], 废标风险项: [] },
      backendReport: {
        coverage: { total: 10, responded: 10, missing: [], 废标风险项: [] },
        deviations: [
          { requirement_id: 'r1', 招标要求原文: 'x', 应答内容: 'y', deviation: '无偏离', 说明: '' },
        ],
      },
    });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="selfcheck" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText('放行汇总')).toBeInTheDocument();
    expect(screen.getByText('10/10')).toBeInTheDocument();
    expect(screen.getByText(/硬性红线全部通过/)).toBeInTheDocument();
  });

  test('selfcheck phase hides pass banner when there is missing coverage or risk', () => {
    const state = makeState({
      activeStage: 8,
      backendCoverage: { total: 10, responded: 8, missing: ['r9', 'r10'], 废标风险项: ['r9'] },
    });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="selfcheck" onOpenLibrary={vi.fn()} />);
    expect(screen.queryByText(/硬性红线全部通过/)).not.toBeInTheDocument();
  });

  test('export phase renders ExportSummarySection with volumes and download link', () => {
    const state = makeState({
      activeStage: 9,
      backendExportPlan: {
        output_mode: '分册导出',
        package_zip: true,
        naming_pattern: '{volume}_{title}',
        volumes: [
          { volume_id: 'v1', cover_title: '技术标', file_name: 'v1.docx', section_ids: [], sealed_separately: true, requires_toc: true },
        ],
      },
      serverPackageUrl: 'https://example.com/bid.zip',
    });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="export" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText(/导出模式:分册导出/)).toBeInTheDocument();
    expect(screen.getByText('技术标')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /下载分册打包 ZIP/ });
    expect(link).toHaveAttribute('href', 'https://example.com/bid.zip');
    expect(link).toHaveAttribute('download');
  });

  test('export phase shows waiting placeholder without a plan', () => {
    const state = makeState({ activeStage: 9 });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="export" onOpenLibrary={vi.fn()} />);
    expect(screen.getByText('等待生成分册导出方案…')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  test('renders pending checkpoint card above the phase content and shows global error', () => {
    const state = makeState({
      activeStage: 2,
      pendingCard: { id: 'confirm-1', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认要求清单' },
      error: '后端解析超时',
    });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="requirements" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText('确认要求清单')).toBeInTheDocument();
    expect(screen.getByText('后端解析超时')).toBeInTheDocument();
  });

  test('typing a message and pressing the send button calls engine.addCustomUserMessage and clears input', () => {
    const engine = makeEngine();
    render(<CopilotPanel state={makeState()} scenario={makeScenario()} engine={engine} phase="requirements" onOpenLibrary={vi.fn()} />);

    const input = screen.getByPlaceholderText('和 Copilot 对话或补充资料…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '补充一份业绩合同' } });
    fireEvent.click(screen.getByRole('button', { name: '➤' }));

    expect(engine.addCustomUserMessage).toHaveBeenCalledWith('补充一份业绩合同');
    expect(input.value).toBe('');
  });

  test('does not send an empty or whitespace-only message', () => {
    const engine = makeEngine();
    render(<CopilotPanel state={makeState()} scenario={makeScenario()} engine={engine} phase="requirements" onOpenLibrary={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '➤' }));
    expect(engine.addCustomUserMessage).not.toHaveBeenCalled();
  });
});
