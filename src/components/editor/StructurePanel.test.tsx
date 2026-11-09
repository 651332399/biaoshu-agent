import { cleanup, render, screen } from '@testing-library/react';
import type { EditorPhase } from './phase';
import { afterEach, describe, test, expect } from 'vitest';
import { StructurePanel } from './StructurePanel';
import { kqyy } from '../../scenarios/kqyy';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { BackendRequirement } from '../../engine/types';
import { createEmptyChatState } from '../../engine/types';

afterEach(cleanup);

describe('StructurePanel', () => {
  const engine = {
    revealChapterManually: () => {},
    revealVolumeManually: () => {},
  } as any;

  const baseState: EngineState = {
    status: 'paused',
    cursor: 0,
    speed: 1,
    activeStage: 1,
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
    chat: createEmptyChatState(),
  };

  test('requirements phase: groups requirements by category and flags mandatory items', () => {
    const requirements: BackendRequirement[] = [
      { id: 'r1', type: '废标', text: '不得超过最高限价', page: 1, mandatory: true, score_weight: null },
      { id: 'r2', type: '资质', text: '需具备 CNAS 认可', page: 1, mandatory: false, score_weight: 5 },
      { id: 'r3', type: '资质', text: '需具备 CMA 认证', page: 1, mandatory: false, score_weight: 5 },
    ];
    render(
      <StructurePanel
        state={{ ...baseState, backendRequirements: requirements }}
        scenario={kqyy}
        engine={engine}
        phase="requirements"
      />
    );

    expect(screen.getByText(/要求分类/)).toBeInTheDocument();
    expect(screen.getByText('废标')).toBeInTheDocument();
    const 资质Row = screen.getByText('资质').closest('li');
    expect(资质Row).toHaveTextContent('2');
    expect(screen.getByText(/★ 强制项 1 条/)).toBeInTheDocument();
  });

  test('requirements phase: hides the mandatory reminder card when nothing is mandatory', () => {
    const requirements: BackendRequirement[] = [
      { id: 'r1', type: '格式', text: '页边距 2.5cm', page: 1, mandatory: false, score_weight: null },
    ];
    render(
      <StructurePanel
        state={{ ...baseState, backendRequirements: requirements }}
        scenario={kqyy}
        engine={engine}
        phase="requirements"
      />
    );
    expect(screen.queryByText(/需重点核对/)).not.toBeInTheDocument();
  });

  test('selfcheck phase: only shows revealed redlines and respects overrides', () => {
    render(
      <StructurePanel
        state={{
          ...baseState,
          revealedRedlines: ['rl.price'],
          redlineOverrides: { 'rl.price': 'fail' },
        }}
        scenario={kqyy}
        engine={engine}
        phase="selfcheck"
      />
    );

    expect(screen.getByText(/自检项/)).toBeInTheDocument();
    expect(screen.getByText('投标报价低于或等于最高限价')).toBeInTheDocument();
    // 未 reveal 的自检项不应出现
    expect(screen.queryByText('四张索引表与偏离表逐条应答无空白')).not.toBeInTheDocument();
    const item = screen.getByText('投标报价低于或等于最高限价').closest('li');
    expect(item).toHaveTextContent('⛔');
  });

  test('generate phase: renders the document tree and overall progress footer', () => {
    render(
      <StructurePanel
        state={{ ...baseState, grownVolumes: ['vol.1'], revealedBlocks: ['blk.open'] }}
        scenario={kqyy}
        engine={engine}
        phase="generate"
      />
    );

    expect(screen.getByText(/第一章 营业执照与 CMA\/CNAS 资质/)).toBeInTheDocument();
    expect(screen.getByText(/整册进度/)).toBeInTheDocument();
    expect(screen.getByText('1/8 章')).toBeInTheDocument();
  });

  test('generate phase: backend export plan overrides scenario volumes in tree', () => {
    render(
      <StructurePanel
        state={{
          ...baseState,
          backendExportPlan: {
            output_mode: 'three_volume',
            package_zip: true,
            naming_pattern: '*.docx',
            volumes: [
              {
                volume_id: 'qualification',
                cover_title: '资格证明文件',
                file_name: '资格证明文件-测试项目.docx',
                section_ids: ['s1'],
                sealed_separately: true,
                requires_toc: true,
                requires_seal_page: true,
                requires_index_table: true,
                evidence: [],
              },
            ],
          },
          backendOutline: {
            sections: [
              { id: 's1', title: '资格审查索引表', maps_to_requirement_ids: [], asset_refs: [] },
            ],
          },
        }}
        scenario={kqyy}
        engine={engine}
        phase="generate"
      />,
    );

    expect(screen.getByText('资格证明文件')).toBeInTheDocument();
    expect(screen.getByText('资格证明文件-测试项目.docx')).toBeInTheDocument();
    expect(screen.getByText(/资格审查索引表/)).toBeInTheDocument();
    expect(screen.queryByText(/第一章 营业执照与 CMA\/CNAS 资质/)).not.toBeInTheDocument();
  });

  // 回归:早 return(requirements/selfcheck)之前的 hooks 数必须与 generate/export
  // 一致。displayVolumes 的 useMemo 曾放在早 return 之后,phase 切换时 React 报
  // "Rendered more hooks than during the previous render" 崩溃(live restore 触发)。
  test('phase transition does not violate rules of hooks (requirements -> generate)', () => {
    const props = (phase: EditorPhase) => ({
      state: { ...baseState, grownVolumes: ['vol.1'], revealedBlocks: ['blk.open'] },
      scenario: kqyy,
      engine,
      phase,
    });
    const { rerender } = render(<StructurePanel {...props('requirements')} />);
    expect(() => {
      rerender(<StructurePanel {...props('selfcheck')} />);
      rerender(<StructurePanel {...props('generate')} />);
    }).not.toThrow();
    expect(screen.getByText(/整册进度/)).toBeInTheDocument();
  });
});
