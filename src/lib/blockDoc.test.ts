import { describe, expect, test } from 'vitest';
import type { DocBlockData } from '../engine/demo/types';
import { blocksToTiptapDoc, tiptapDocToBlocks } from './blockDoc';

describe('blockDoc', () => {
  test('round-trips prose and table edits through tiptap JSON', () => {
    const blocks: DocBlockData[] = [
      {
        id: 'b1',
        chapterId: 'c1',
        render: 'prose',
        标题: '第九章 服务方案',
        prose: '现场响应 1 天。',
      },
      {
        id: 'b2',
        chapterId: 'c2',
        render: 'table',
        标题: '分项报价表',
        table: {
          headers: ['项目', '报价'],
          rows: [['校准服务', '100']],
        },
      },
    ];

    const doc = blocksToTiptapDoc(blocks);
    const paragraph = doc.content?.[1];
    const tableCell = doc.content?.[3]?.content?.[1]?.content?.[1]?.content?.[0];
    paragraph!.content = [{ type: 'text', text: '人工改成 8 小时响应。' }];
    tableCell!.content = [{ type: 'text', text: '200' }];

    const next = tiptapDocToBlocks(doc, blocks);

    expect(next[0].prose).toBe('人工改成 8 小时响应。');
    expect(next[1].table?.rows[0][1]).toBe('200');
  });

  test('keeps form block data intact through round-trip (non-editable atom node)', () => {
    const blocks: DocBlockData[] = [
      {
        id: 'b3',
        chapterId: 'c3',
        render: 'form',
        标题: '资质声明表',
        form: [{ label: '企业名称', value: '示例科技有限公司' }],
      },
    ];

    const doc = blocksToTiptapDoc(blocks);
    const next = tiptapDocToBlocks(doc, blocks);

    expect(next[0].form).toEqual(blocks[0].form);
    expect(next[0].prose).toBeUndefined();
  });

  test('wraps matching chip substrings with evidenceChip marks without affecting round-trip text', () => {
    const blocks: DocBlockData[] = [
      {
        id: 'b4',
        chapterId: 'c4',
        render: 'prose',
        标题: '第九章',
        prose: '我司已获得 CNAS 认可证书,现场响应 1 天。',
      },
    ];

    const doc = blocksToTiptapDoc(blocks, { chips: { b4: [{ text: 'CNAS', materialId: 'mat.cnas', status: 'hit' }] } });
    const paragraph = doc.content?.[1];
    const chipTextNode = paragraph?.content?.find((n) => n.marks?.some((m) => m.type === 'evidenceChip'));

    expect(chipTextNode?.text).toBe('CNAS');
    expect(chipTextNode?.marks?.[0]?.attrs?.materialId).toBe('mat.cnas');
    expect(tiptapDocToBlocks(doc, blocks)[0].prose).toBe(blocks[0].prose);
  });

  test('marks the active writing block with highlight without changing block text', () => {
    const blocks: DocBlockData[] = [
      {
        id: 'b1',
        chapterId: 'c1',
        render: 'prose',
        标题: '正文',
        prose: '新增文字',
      },
    ];

    const doc = blocksToTiptapDoc(blocks, { highlightedBlockId: 'b1' });
    const text = doc.content?.[1]?.content?.[0];

    expect(text?.marks?.[0]?.type).toBe('highlight');
    expect(tiptapDocToBlocks(doc, blocks)[0].prose).toBe('新增文字');
  });
});
