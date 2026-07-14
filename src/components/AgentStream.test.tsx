import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { AgentStream } from './AgentStream';
import { kqyy } from '../scenarios/kqyy';
import type { EngineState } from '../engine/ScenarioEngine';

describe('AgentStream', () => {
  const dummyState: EngineState = {
    status: 'paused',
    cursor: 1,
    speed: 1,
    activeStage: 1,
    logs: [{ id: 'l1', text: '解析招标要求：提取 27 项技术指标', stage: 1 }],
    grownVolumes: [],
    revealedBlocks: [],
    matchedMaterials: [],
    revealedRedlines: [],
    pricingRevealed: false,
    focus: null,
    pendingCard: null,
    redlineOverrides: {},
  };

  test('renders list of logs from state', () => {
    const mockEngine = {} as any;
    render(<AgentStream state={dummyState} engine={mockEngine} scenario={kqyy} />);
    expect(screen.getByText('解析招标要求：提取 27 项技术指标')).toBeInTheDocument();
  });

  test('shows processing indicator when playing', () => {
    const mockEngine = {} as any;
    const playingState = { ...dummyState, status: 'playing' as const };
    render(<AgentStream state={playingState} engine={mockEngine} scenario={kqyy} />);
    expect(screen.getByText(/AI 正在自主研判.*合规组装材料中/)).toBeInTheDocument();
  });
});
