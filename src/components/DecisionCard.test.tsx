import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { DecisionCard } from './DecisionCard';
import type { Step } from '../engine/types';

describe('DecisionCard', () => {
  test('checkpoint shows confirm button and triggers onConfirm', () => {
    const card: Step = {
      id: 'c',
      stage: 2,
      kind: 'checkpoint',
      duration: 0,
      checkpointTitle: '确认策略',
      checkpointBody: '主攻技术分',
    };
    const onConfirm = vi.fn();
    render(<DecisionCard card={card} onConfirm={onConfirm} onChoose={vi.fn()} />);

    expect(screen.getByText('确认策略')).toBeInTheDocument();
    screen.getByRole('button', { name: '确认继续' }).click();
    expect(onConfirm).toHaveBeenCalled();
  });

  test('escalate shows option buttons and triggers onChoose with index', () => {
    const card: Step = {
      id: 'e',
      stage: 5,
      kind: 'escalate',
      duration: 0,
      escalateTitle: '业绩口径',
      confidence: 0.6,
      options: [
        { label: '去补充业绩', effect: { type: 'continue' } },
        { label: '按现状继续', effect: { type: 'continue' } },
      ],
    };
    const onChoose = vi.fn();
    render(<DecisionCard card={card} onConfirm={vi.fn()} onChoose={onChoose} />);

    expect(screen.getByText('置信度 60%')).toBeInTheDocument();
    screen.getByRole('button', { name: '按现状继续' }).click();
    expect(onChoose).toHaveBeenCalledWith(1);
  });
});
