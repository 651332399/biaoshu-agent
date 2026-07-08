import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect } from 'vitest';
import { StructurePanel } from './StructurePanel';
import { kqyy } from '../../scenarios/kqyy';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { BackendRequirement } from '../../engine/types';

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
});
