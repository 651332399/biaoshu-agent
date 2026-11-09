import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { DecisionCard, mergeDraftIntoRequirements } from './DecisionCard';
import type { BackendRequirement } from '../engine/types';
import type { Step } from '../engine/demo/types';

function makeRequirements(count: number): BackendRequirement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `req-${String(index + 1).padStart(4, '0')}`,
    type: '废标' as const,
    text: `要求 ${index + 1}`,
    page: index + 1,
    mandatory: true,
    score_weight: null,
  }));
}

afterEach(cleanup);

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

  test('untouched draft confirms as approve (no requirements payload)', () => {
    const card: Step = { id: 'c1', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认①' };
    const onConfirm = vi.fn();
    render(
      <DecisionCard card={card} requirements={makeRequirements(20)} onConfirm={onConfirm} onChoose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));
    expect(onConfirm).toHaveBeenCalledWith();
  });

  test('edited draft merges back into full list without dropping items beyond the window', () => {
    const card: Step = { id: 'c2', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认①' };
    const requirements = makeRequirements(20);
    const onConfirm = vi.fn();
    render(
      <DecisionCard card={card} requirements={requirements} onConfirm={onConfirm} onChoose={vi.fn()} />,
    );

    const window = requirements.slice(0, 12).map((item) => ({ ...item }));
    window[0] = { ...window[0], text: '改写第一条' };
    window.splice(1, 1); // 删除窗口内第二条
    fireEvent.click(screen.getByRole('button', { name: '高级：编辑原始 JSON' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify(window) } });
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));

    const merged = onConfirm.mock.calls[0][0] as BackendRequirement[];
    expect(merged).toHaveLength(19);
    expect(merged[0].text).toBe('改写第一条');
    expect(merged.some((item) => item.id === 'req-0002')).toBe(false);
    expect(merged.filter((item) => Number(item.id.slice(4)) > 12)).toHaveLength(8);
  });

  test('invalid draft JSON shows error and does not confirm', () => {
    const card: Step = { id: 'c3', stage: 2, kind: 'checkpoint', duration: 0, checkpointTitle: '确认①' };
    const onConfirm = vi.fn();
    render(
      <DecisionCard card={card} requirements={makeRequirements(3)} onConfirm={onConfirm} onChoose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '高级：编辑原始 JSON' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{broken' } });
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('JSON 格式不正确，请修正后再确认。')).toBeInTheDocument();
  });

  test('generic artifact draft confirms parsed JSON when edited', () => {
    const card: Step = { id: 'confirm-2', stage: 3, kind: 'checkpoint', duration: 0, checkpointTitle: '确认②' };
    const onConfirm = vi.fn();
    render(
      <DecisionCard
        card={card}
        artifact={{ label: 'outline.json', value: { sections: [{ title: '原章节', maps_to_requirement_ids: ['req-1'], asset_refs: [] }] } }}
        onConfirm={onConfirm}
        onChoose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '高级：编辑原始 JSON' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: JSON.stringify({ sections: [{ title: '删改后', maps_to_requirement_ids: [], asset_refs: [] }] }) },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认继续' }));

    expect(onConfirm).toHaveBeenCalledWith({
      sections: [{ title: '删改后', maps_to_requirement_ids: [], asset_refs: [] }],
    });
  });

  test('report artifact renders pending materials panel', () => {
    const card: Step = { id: 'confirm-3', stage: 4, kind: 'checkpoint', duration: 0, checkpointTitle: '确认③' };
    render(
      <DecisionCard
        card={card}
        artifact={{
          label: 'report.json',
          value: {
            coverage: { total: 1, responded: 1, missing: [], 废标风险项: [] },
            deviations: [],
            pending_materials: [
              { section_title: '公司资质证明', maps_to_requirement_ids: ['req-1', 'req-2'] },
            ],
          },
        }}
        onConfirm={vi.fn()}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText('待补充素材清单 · 1 项')).toBeInTheDocument();
    expect(screen.getByText('公司资质证明')).toBeInTheDocument();
  });
});

describe('mergeDraftIntoRequirements', () => {
  test('keeps items outside the window, applies edits and deletes inside it, appends new ids', () => {
    const full = makeRequirements(20);
    const parsed = full.slice(0, 12).map((item) => ({ ...item }));
    parsed[2] = { ...parsed[2], text: '编辑过' };
    parsed.splice(5, 1); // 删 req-0006
    parsed.push({ id: 'req-9999', type: '资质', text: '新增条目', page: null, mandatory: false, score_weight: null });

    const merged = mergeDraftIntoRequirements(full, parsed);

    expect(merged).toHaveLength(20); // 20 - 1 删除 + 1 新增
    expect(merged.find((item) => item.id === 'req-0003')?.text).toBe('编辑过');
    expect(merged.some((item) => item.id === 'req-0006')).toBe(false);
    expect(merged.at(-1)?.id).toBe('req-9999');
    // 窗口外 13-20 条一条不丢
    for (let i = 13; i <= 20; i += 1) {
      expect(merged.some((item) => item.id === `req-${String(i).padStart(4, '0')}`)).toBe(true);
    }
  });

  test('edits to items pasted from outside the window are honored, absence is not deletion', () => {
    const full = makeRequirements(20);
    const merged = mergeDraftIntoRequirements(full, [
      ...full.slice(0, 12),
      { ...full[15], text: '窗口外编辑' },
    ]);

    expect(merged).toHaveLength(20);
    expect(merged.find((item) => item.id === full[15].id)?.text).toBe('窗口外编辑');
  });
});
