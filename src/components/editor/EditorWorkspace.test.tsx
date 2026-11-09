import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect } from 'vitest';
import { EditorWorkspace } from './EditorWorkspace';
import { kqyy } from '../../scenarios/kqyy';
import type { EngineState } from '../../engine/ScenarioEngine';
import { createEmptyChatState } from '../../engine/types';

afterEach(cleanup);

describe('EditorWorkspace', () => {
  const engine = {
    revealChapterManually: () => {},
    revealVolumeManually: () => {},
    addCustomUserMessage: () => {},
    confirmCheckpoint: () => {},
    chooseOption: () => {},
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

  test('renders document header with project name, phase label and paused save state', () => {
    render(
      <EditorWorkspace
        state={baseState}
        scenario={kqyy}
        engine={engine}
        onOpenLibrary={() => {}}
      />
    );

    expect(screen.getByText('投标文件.docx')).toBeInTheDocument();
    expect(screen.getByText(/北京口腔医院 2026 年度医用设备相关计量检测项目/)).toBeInTheDocument();
    expect(screen.getByText(/○ 已保存/)).toBeInTheDocument();
    expect(screen.getAllByText(/要求确认 · 把关/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/阶段 1\/9/).length).toBeGreaterThan(0);
  });

  test('shows the AI auto-save indicator while the engine is playing', () => {
    render(
      <EditorWorkspace
        state={{ ...baseState, status: 'playing' }}
        scenario={kqyy}
        engine={engine}
        onOpenLibrary={() => {}}
      />
    );
    expect(screen.getByText(/● AI 自动保存/)).toBeInTheDocument();
    expect(screen.queryByText(/○ 已保存/)).not.toBeInTheDocument();
  });

  test('derives the export phase and renders the packaging page once stage 9 is reached', () => {
    render(
      <EditorWorkspace
        state={{ ...baseState, activeStage: 9, pendingCard: { id: 'export-1', kind: 'export', stage: 9, duration: 0 } as any }}
        scenario={kqyy}
        engine={engine}
        onOpenLibrary={() => {}}
      />
    );
    expect(screen.getAllByText(/导出打包/).length).toBeGreaterThan(0);
    expect(screen.getByText('WPS 最终验收')).toBeInTheDocument();
    expect(screen.getByText('服务器流水线结束不代表最终交付通过。')).toBeInTheDocument();
  });

  test('derives the self-check phase and stage once redlines are revealed', () => {
    render(
      <EditorWorkspace
        state={{ ...baseState, activeStage: 8, revealedRedlines: ['rl.price'] }}
        scenario={kqyy}
        engine={engine}
        onOpenLibrary={() => {}}
      />
    );
    expect(screen.getAllByText(/合规自检 · 防废标/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/阶段 8\/9/).length).toBeGreaterThan(0);
  });
});
