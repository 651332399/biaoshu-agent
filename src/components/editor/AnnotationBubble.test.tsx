import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { AnnotationBubble } from './AnnotationBubble';
import type { Step } from '../../engine/demo/types';

afterEach(cleanup);

describe('AnnotationBubble', () => {
  test('renders nothing for a non-escalate card (checkpoint)', () => {
    const card: Step = { id: 'c1', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认策略' };
    const { container } = render(<AnnotationBubble card={card} onChoose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing for an export card', () => {
    const card: Step = { id: 'e1', stage: 9, kind: 'export', duration: 0 };
    const { container } = render(<AnnotationBubble card={card} onChoose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows escalate body, confidence and option buttons; onChoose fires with index', () => {
    const card: Step = {
      id: 'e2',
      stage: 5,
      kind: 'escalate',
      duration: 0,
      escalateTitle: '业绩口径',
      escalateBody: '该业绩合同金额存疑,是否按现状继续?',
      confidence: 0.42,
      options: [
        { label: '去补充业绩', effect: { type: 'continue' } },
        { label: '按现状继续', effect: { type: 'continue' } },
      ],
    };
    const onChoose = vi.fn();
    render(<AnnotationBubble card={card} onChoose={onChoose} />);

    expect(screen.getByText('该业绩合同金额存疑,是否按现状继续?')).toBeInTheDocument();
    expect(screen.getByText('置信度 42%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '按现状继续' }));
    expect(onChoose).toHaveBeenCalledWith(1);
  });

  test('renders without a confidence badge when confidence is absent', () => {
    const card: Step = {
      id: 'e3',
      stage: 5,
      kind: 'escalate',
      duration: 0,
      escalateBody: '这段说明里不含那个特定词汇',
      options: [{ label: '继续', effect: { type: 'continue' } }],
    };
    render(<AnnotationBubble card={card} onChoose={vi.fn()} />);
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  test('renders no option buttons when options is missing', () => {
    const card: Step = { id: 'e4', stage: 5, kind: 'escalate', duration: 0, escalateBody: '无选项' };
    render(<AnnotationBubble card={card} onChoose={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
