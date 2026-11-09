import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { CopilotPanel } from './CopilotPanel';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { Scenario } from '../../engine/demo/types';
import { createEmptyChatState } from '../../engine/types';
import { setApiBase } from '../../lib/apiBase';

afterEach(() => {
  cleanup();
  setApiBase('');
});

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
    backendTenderSpec: null,
    backendExportPlan: null,
    backendOutline: null,
    backendCoverage: null,
    backendReport: null,
    serverDocxUrl: null,
    serverPackageUrl: null,
    error: null,
    mode: 'demo',
    chat: createEmptyChatState(),
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
  test('子路径部署为服务端返回的下载路径添加前缀', () => {
    setApiBase('/biaoshu/');
    const state = makeState({ activeStage: 9, serverPackageUrl: '/api/projects/p1/artifacts/bid.zip' });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="export" onOpenLibrary={vi.fn()} />);
    expect(screen.getByRole('link', { name: /下载/ })).toHaveAttribute('href', '/biaoshu/api/projects/p1/artifacts/bid.zip');
  });

  test('shows live progress while compliance is still running', () => {
    const state = makeState({
      activeStage: 8,
      status: 'playing',
      logs: [{ id: 'progress-compliance', text: '合规校验 16/34 批，预计还需 511 秒', stage: 8 }],
    });

    render(
      <CopilotPanel
        state={state}
        scenario={makeScenario()}
        engine={makeEngine()}
        phase="selfcheck"
        onOpenLibrary={vi.fn()}
      />,
    );

    expect(screen.getByText('合规校验 16/34 批，预计还需 511 秒')).toBeInTheDocument();
    expect(screen.getByText('合规校验进行中')).toBeInTheDocument();
  });

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
          {
            volume_id: 'v1',
            cover_title: '技术标',
            file_name: '技术标-测试项目.docx',
            section_ids: [],
            sealed_separately: true,
            requires_toc: true,
            requires_seal_page: true,
            requires_index_table: true,
            evidence: [],
          },
        ],
      },
      serverPackageUrl: 'https://example.com/bid.zip',
    });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={makeEngine()} phase="export" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText(/导出模式:分册导出/)).toBeInTheDocument();
    expect(screen.getByText('技术标')).toBeInTheDocument();
    expect(screen.getByText('技术标-测试项目.docx')).toBeInTheDocument();
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

  test('checkpoint 4 identifies TenderSpec and submits the complete edited aggregate', () => {
    const exportPlan = {
      output_mode: 'single', package_zip: false, naming_pattern: '{cover_title}.docx',
      volumes: [{
        volume_id: 'response', cover_title: '响应文件', file_name: '响应文件.docx', section_ids: [],
        sealed_separately: false, requires_toc: true, requires_seal_page: true,
        requires_index_table: false, evidence: [],
      }],
    };
    const engine = makeEngine();
    const tenderSpec = {
      project_meta: {
        '项目名': '测试项目', '项目编号': 'TEST-001', '包号': null, '采购人': '测试单位',
        '供应商占位': '【待填写】', '服务周期': null, '限价': null, evidence: [],
        evidence_by_field: { '项目编号': ['项目编号：TEST-001'], '采购人': ['采购人：测试单位'] }, confirmed_fields: [],
      },
      export_plan: exportPlan,
      style_spec: {}, submission_spec: {}, forms: [], form_candidates: [], required_form_baseline: {},
      needs_confirmation: true, confirmation_reasons: ['manual_tender_spec_review_required'],
      confirmation_status: 'pending', confirmed_reasons: [], confirmed_at: null,
    } as EngineState['backendTenderSpec'];
    const state = makeState({
      activeStage: 3,
      pendingCard: { id: 'confirm-4', stage: 3, kind: 'checkpoint', duration: 0, checkpointTitle: '确认聚合规格' },
      backendTenderSpec: tenderSpec,
      backendExportPlan: exportPlan,
    });
    render(<CopilotPanel state={state} scenario={makeScenario()} engine={engine} phase="generate" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText(/当前确认产物：TenderSpec 分册方案（export_plan）/)).toBeInTheDocument();
    expect(screen.getByText(/导出模式：single/)).toBeInTheDocument();
    expect(screen.getByText(/表单 0 项/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '高级：编辑原始 JSON' }));
    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: JSON.stringify({
        ...tenderSpec,
        export_plan: { ...exportPlan, naming_pattern: 'edited-{cover_title}.docx' },
      }) },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /保存为结构模板/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));

    expect(engine.confirmCheckpoint).toHaveBeenCalledWith({
      ...tenderSpec,
      export_plan: { ...exportPlan, naming_pattern: 'edited-{cover_title}.docx' },
    }, [], true);
  });

  test('checkpoint 4 blocks confirmation when a copy-verbatim form is unresolved', () => {
    const exportPlan = {
      output_mode: 'single', package_zip: false, naming_pattern: '{cover_title}.docx',
      volumes: [{
        volume_id: 'response', cover_title: '响应文件', file_name: '响应文件.docx', section_ids: [],
        sealed_separately: false, requires_toc: true, requires_seal_page: true,
        requires_index_table: false, evidence: [], required_forms: ['授权委托书'],
      }],
    };
    const engine = makeEngine();
    const state = makeState({
      activeStage: 3,
      pendingCard: { id: 'confirm-4', stage: 3, kind: 'checkpoint', duration: 0, checkpointTitle: '确认聚合规格' },
      backendExportPlan: exportPlan,
      backendTenderSpec: {
        project_meta: {
          '项目名': '测试项目', '项目编号': 'TEST-001', '包号': null, '采购人': '测试单位',
          '供应商占位': '【待填写】', '服务周期': null, '限价': null, evidence: [],
          evidence_by_field: { '项目编号': ['项目编号：TEST-001'], '采购人': ['采购人：测试单位'] }, confirmed_fields: [],
        },
        export_plan: exportPlan,
        style_spec: {}, submission_spec: {}, required_form_baseline: { response: ['授权委托书'] },
        forms: [{
          form_id: 'response:授权委托书', volume_id: 'response', title: '授权委托书', fill_mode: 'copy_verbatim',
          source_status: 'missing', source_evidence: [], header_snapshot: [], structure_fingerprint: null,
          fingerprint_anchor: null, source_kind: 'missing', template_source: null, template_source_sha256: null,
          template_confirmed: false, template_confirmed_at: null, template_confirmation_digest: null,
        }],
        needs_confirmation: true, confirmation_reasons: ['required_form_unresolved'],
        confirmation_status: 'pending', confirmed_reasons: [], confirmed_at: null,
      } as EngineState['backendTenderSpec'],
    });

    render(<CopilotPanel state={state} scenario={makeScenario()} engine={engine} phase="generate" onOpenLibrary={vi.fn()} />);
    expect(screen.getByText(/缺少可编辑原样表单：授权委托书/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));
    expect(screen.getByText(/缺少可验证的原样表单：授权委托书/)).toBeInTheDocument();
    expect(engine.confirmCheckpoint).not.toHaveBeenCalled();
  });

  test('checkpoint 4 promotes a pre-resolved ambiguous form candidate to required', () => {
    const exportPlan = {
      output_mode: 'single', package_zip: false, naming_pattern: '{cover_title}.docx',
      volumes: [{
        volume_id: 'response', cover_title: '响应文件', file_name: '响应文件.docx', section_ids: [],
        sealed_separately: false, requires_toc: true, requires_seal_page: true,
        requires_index_table: false, evidence: [], required_forms: [],
      }],
    };
    const engine = makeEngine();
    const tenderSpec = {
      project_meta: {
        '项目名': '测试项目', '项目编号': 'TEST-001', '包号': null, '采购人': '测试单位',
        '供应商占位': '【待填写】', '服务周期': null, '限价': null, evidence: [],
        evidence_by_field: { '项目编号': ['项目编号：TEST-001'], '采购人': ['采购人：测试单位'] }, confirmed_fields: [],
      },
      export_plan: exportPlan,
      style_spec: {}, submission_spec: {}, required_form_baseline: {},
      forms: [{
        form_id: 'response:服务确认表', volume_id: 'response', title: '服务确认表', fill_mode: 'copy_verbatim',
        source_status: 'available', source_evidence: [], header_snapshot: [], structure_fingerprint: 'strict-fingerprint',
        fingerprint_anchor: '服务确认表', source_kind: 'tender', template_source: '/tmp/source.docx', template_source_sha256: 'source-sha',
        template_confirmed: false, template_confirmed_at: null, template_confirmation_digest: null,
      }],
      form_candidates: [{
        candidate_id: 'response:服务确认表', volume_id: 'response', title: '服务确认表',
        evidence: ['附件3 服务确认表'], confidence: 0.55, status: 'pending', reason: '附件标题候选',
      }],
      needs_confirmation: true, confirmation_reasons: ['form_candidate_pending'],
      confirmation_status: 'pending', confirmed_reasons: [], confirmed_at: null,
    } as EngineState['backendTenderSpec'];
    const state = makeState({
      activeStage: 3,
      pendingCard: { id: 'confirm-4', stage: 3, kind: 'checkpoint', duration: 0, checkpointTitle: '确认聚合规格' },
      backendExportPlan: exportPlan,
      backendTenderSpec: tenderSpec,
    });

    render(<CopilotPanel state={state} scenario={makeScenario()} engine={engine} phase="generate" onOpenLibrary={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));
    expect(screen.getByText(/请逐项确认所有候选表单/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '列为必需' }));
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));
    expect(engine.confirmCheckpoint).toHaveBeenCalledWith({
      ...tenderSpec,
      export_plan: {
        ...exportPlan,
        volumes: [{ ...exportPlan.volumes[0], required_forms: ['服务确认表'] }],
      },
      form_candidates: [{ ...tenderSpec.form_candidates![0], status: 'required' }],
    }, []);
  });

  test('typing a message and pressing the send button calls engine.addCustomUserMessage and clears input', () => {
    const engine = makeEngine();
    render(<CopilotPanel state={makeState()} scenario={makeScenario()} engine={engine} phase="requirements" onOpenLibrary={vi.fn()} />);

    const input = screen.getByPlaceholderText('和 Copilot 对话或补充资料…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '补充一份业绩合同' } });
    fireEvent.click(screen.getByRole('button', { name: '➤' }));

    expect(engine.addCustomUserMessage).toHaveBeenCalledWith('补充一份业绩合同', []);
    expect(input.value).toBe('');
  });

  test('does not send an empty or whitespace-only message', () => {
    const engine = makeEngine();
    render(<CopilotPanel state={makeState()} scenario={makeScenario()} engine={engine} phase="requirements" onOpenLibrary={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '➤' }));
    expect(engine.addCustomUserMessage).not.toHaveBeenCalled();
  });

  test('renders chat messages, stale badge, citations, tail warning and proposal actions', () => {
    const engine = makeEngine({ acceptProposal: vi.fn(), rejectProposal: vi.fn() });
    const state = makeState({
      chat: {
        ...createEmptyChatState(),
        tailState: 'interrupted',
        messages: [
          {
            turn_id: 't-0001',
            client_message_id: 'c1',
            role: 'user',
            text: '请更新要求',
            intent: null,
            pipeline_state: 'checkpoint:1',
            context_fingerprint: 'ctx',
            context_turn_ids: [],
            context_stale: false,
            citations: [],
            proposal_id: null,
            escalation_proposal: null,
            material_ids: ['mat-1'],
            created_by: 'tester',
            model_id: null,
            llm_response_digest: null,
            ts: '2026-07-21T00:00:00Z',
          },
          {
            turn_id: 't-0002',
            client_message_id: null,
            role: 'assistant',
            text: '已形成提案。',
            intent: 'proposal',
            pipeline_state: 'checkpoint:1',
            context_fingerprint: 'ctx',
            context_turn_ids: ['t-0001'],
            context_stale: true,
            citations: ['req-0001'],
            proposal_id: 'p-0001',
            escalation_proposal: null,
            material_ids: [],
            created_by: 'assistant',
            model_id: 'deepseek-v4-flash',
            llm_response_digest: null,
            ts: '2026-07-21T00:00:01Z',
          },
        ],
        proposals: [{
          proposal_id: 'p-0001',
          turn_id: 't-0002',
          target_artifact: 'requirements',
          checkpoint: 1,
          base_fingerprint: 'base',
          result_fingerprint: 'result',
          patch: [{ op: 'replace', path: '/0/text', value: '新要求' }],
          op_targets: [{ op_index: 0, kind: 'existing', entity_id: 'req-0001', parent_pointer: '' }],
          diff: [{ op: 'replace', path: '/0/text', label: 'req-0001 · 文本', before: '旧要求', after: '新要求' }],
          summary: '建议更新要求文本。',
          status: 'proposed',
          created_by: 'assistant',
          created_at: '2026-07-21T00:00:01Z',
          resolved_by: null,
          resolved_at: null,
        }],
      },
    });

    render(<CopilotPanel state={state} scenario={makeScenario()} engine={engine} phase="requirements" onOpenLibrary={vi.fn()} />);

    expect(screen.getByText('请更新要求')).toBeInTheDocument();
    expect(screen.getByText('已形成提案。')).toBeInTheDocument();
    expect(screen.getByText('上下文已更新')).toBeInTheDocument();
    expect(screen.getByText('req-0001')).toBeInTheDocument();
    expect(screen.getByText(/上一条回复中断/)).toBeInTheDocument();
    expect(screen.getByText(/建议更新要求文本/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    expect(engine.acceptProposal).toHaveBeenCalledWith('p-0001');
    expect(engine.rejectProposal).toHaveBeenCalledWith('p-0001');
  });
});
