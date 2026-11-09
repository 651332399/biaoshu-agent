import { describe, expect, test } from 'vitest';
import type { DocBlockData } from '../engine/demo/types';
import { buildBlockLockLabels } from './lockLabels';

describe('buildBlockLockLabels', () => {
  test('gives split blocks visible section-aware labels', () => {
    const blocks: DocBlockData[] = [
      { id: 'b1', chapterId: 'c1', render: 'prose', 标题: '资质响应与佐证', prose: '正文' },
      { id: 'b2', chapterId: 'c1', render: 'table', 标题: '', table: { headers: ['A'], rows: [['B']] } },
      { id: 'b3', chapterId: 'c1', render: 'prose', 标题: '', prose: '补充' },
    ];

    const labels = buildBlockLockLabels(blocks);

    expect(labels.get('b1')).toBe('资质响应与佐证');
    expect(labels.get('b2')).toBe('资质响应与佐证 · 表格 2');
    expect(labels.get('b3')).toBe('资质响应与佐证 · 正文 3');
    expect([...labels.values()].every((label) => label.trim().length > 0)).toBe(true);
  });
});
