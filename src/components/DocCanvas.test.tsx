import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { DocCanvas } from './DocCanvas';
import { kqyy } from '../scenarios/kqyy';
import type { EngineState } from '../engine/ScenarioEngine';

describe('DocCanvas', () => {
  const dummyState: EngineState = {
    status: 'paused',
    cursor: 1,
    speed: 1,
    activeStage: 1,
    logs: [],
    grownVolumes: ['vol.1'],
    revealedBlocks: ['blk.open'],
    matchedMaterials: [],
    revealedRedlines: [],
    pricingRevealed: false,
    focus: null,
    pendingCard: null,
    redlineOverrides: {},
  };

  test('renders visible blocks and the file tree', () => {
    const engine = {
      revealChapterManually: () => {},
      revealVolumeManually: () => {},
    } as any;
    render(<DocCanvas state={dummyState} scenario={kqyy} engine={engine} />);
    expect(screen.getAllByText('开标一览表 (投标函附录)').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('壹拾陆万玖仟捌佰贰拾元整'); // It's Beijing 口腔, ¥269,820.00
    expect(document.body.textContent).toContain('贰拾陆万玖仟捌佰贰拾元整');
  });
});
