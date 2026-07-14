import type { JSONContent } from '@tiptap/core';
import type { DocBlockData, EvidenceChipData } from '../engine/demo/types';

export const attachmentCardNodeName = 'attachmentCard';
export const formCardNodeName = 'formCard';
export const evidenceChipMarkName = 'evidenceChip';

export function blocksToTiptapDoc(
  blocks: DocBlockData[],
  options: {
    highlightedBlockId?: string | null;
    /** 按 blockId 归类的行内证据芯片,仅对 prose 块的正文文本生效 */
    chips?: Record<string, EvidenceChipData[]>;
  } = {},
): JSONContent {
  return {
    type: 'doc',
    content: blocks.flatMap((block) =>
      blockToNodes(block, block.id === options.highlightedBlockId, options.chips?.[block.id]),
    ),
  };
}

export function tiptapDocToBlocks(doc: JSONContent, previous: DocBlockData[]): DocBlockData[] {
  const byId = new Map(previous.map((block) => [block.id, block]));
  const updated = new Map(previous.map((block) => [block.id, block]));
  const order: string[] = [];
  const nodes = doc.content ?? [];

  for (const node of nodes) {
    const blockId = stringAttr(node, 'blockId');
    if (!blockId) continue;
    const original = byId.get(blockId);
    if (!original) continue;
    if (!order.includes(blockId)) order.push(blockId);
    const current = updated.get(blockId) ?? original;

    if (node.type === 'heading' || node.type === 'paragraph') {
      const text = nodeText(node);
      updated.set(blockId, {
        ...current,
        标题: node.type === 'heading' ? text || current.标题 : current.标题,
        prose: node.type === 'paragraph' ? text : current.prose,
      });
      continue;
    }

    if (node.type === 'table' && original.table) {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((cell) => nodeText(cell).trim()),
      );
      updated.set(blockId, {
        ...current,
        table: {
          headers: rows[0] ?? original.table.headers,
          rows: rows.slice(1),
        },
      });
      continue;
    }

    if (node.type === attachmentCardNodeName || node.type === formCardNodeName) {
      // 非自由文本块：不解析富文本内容，原样保留，避免结构化字段(form/attachment)与
      // 拼接文本互相覆盖导致的数据不一致。
      updated.set(blockId, current);
    }
  }

  return [
    ...order.map((id) => updated.get(id)).filter((block): block is DocBlockData => Boolean(block)),
    ...previous.filter((block) => !order.includes(block.id)),
  ];
}

export function mergeBlocks(
  current: DocBlockData[],
  incoming: DocBlockData[],
  protectedIds: Set<string>,
): DocBlockData[] {
  const currentById = new Map(current.map((block) => [block.id, block]));
  const merged = incoming.map((block) => {
    if (protectedIds.has(block.id)) return currentById.get(block.id) ?? block;
    return block;
  });
  for (const block of current) {
    if (!incoming.some((item) => item.id === block.id)) merged.push(block);
  }
  return merged;
}

function blockToNodes(block: DocBlockData, highlighted = false, chips?: EvidenceChipData[]): JSONContent[] {
  if (block.render === 'prose') {
    return [
      headingNode(block),
      {
        type: 'paragraph',
        attrs: { blockId: block.id, chapterId: block.chapterId },
        content: textContent(block.prose ?? '', highlighted, chips),
      },
    ];
  }

  if (block.render === 'table' && block.table) {
    return [
      headingNode(block),
      {
        type: 'table',
        attrs: { blockId: block.id, chapterId: block.chapterId },
        content: [block.table.headers, ...block.table.rows].map((row, rowIndex) => ({
          type: 'tableRow',
          content: row.map((cell) => ({
            type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
            content: [{ type: 'paragraph', content: textContent(cell, highlighted && rowIndex > 0) }],
          })),
        })),
      },
    ];
  }

  if (block.render === 'form' && block.form) {
    return [
      headingNode(block),
      {
        type: formCardNodeName,
        attrs: { blockId: block.id, chapterId: block.chapterId, items: block.form },
      },
    ];
  }

  if (block.render === 'attachment' && block.attachment) {
    return [
      {
        type: attachmentCardNodeName,
        attrs: {
          blockId: block.id,
          chapterId: block.chapterId,
          title: block.attachment.名称,
          materialId: block.attachment.materialId,
        },
      },
    ];
  }

  return [headingNode(block)];
}

function headingNode(block: DocBlockData): JSONContent {
  return {
    type: 'heading',
    attrs: { level: 2, blockId: block.id, chapterId: block.chapterId },
    content: textContent(block.标题),
  };
}

function textContent(text: string, highlighted = false, chips: EvidenceChipData[] = []): JSONContent[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.flatMap((line, index) => {
    const nodes: JSONContent[] = [];
    if (index > 0) nodes.push({ type: 'hardBreak' });
    if (line) nodes.push(...lineToTextNodes(line, highlighted, chips));
    return nodes;
  });
}

/** 把一行文本按命中的证据芯片子串切分,子串套 evidenceChip mark,其余保持普通文本。 */
function lineToTextNodes(line: string, highlighted: boolean, chips: EvidenceChipData[]): JSONContent[] {
  const highlightMark = highlighted ? { type: 'highlight', attrs: { color: '#fef3c7' } } : null;
  const plain = (segment: string): JSONContent => ({
    type: 'text',
    text: segment,
    marks: highlightMark ? [highlightMark] : undefined,
  });

  const ranges = chips
    .filter((chip) => chip.text)
    .flatMap((chip) => {
      const found: { start: number; end: number; chip: EvidenceChipData }[] = [];
      let from = 0;
      let idx = line.indexOf(chip.text, from);
      while (idx >= 0) {
        found.push({ start: idx, end: idx + chip.text.length, chip });
        from = idx + chip.text.length;
        idx = line.indexOf(chip.text, from);
      }
      return found;
    })
    .sort((a, b) => a.start - b.start);

  if (ranges.length === 0) return [plain(line)];

  const nodes: JSONContent[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue; // 与已消费区间重叠,跳过
    if (range.start > cursor) nodes.push(plain(line.slice(cursor, range.start)));
    nodes.push({
      type: 'text',
      text: line.slice(range.start, range.end),
      marks: [
        { type: evidenceChipMarkName, attrs: { materialId: range.chip.materialId, status: range.chip.status ?? 'hit' } },
        ...(highlightMark ? [highlightMark] : []),
      ],
    });
    cursor = range.end;
  }
  if (cursor < line.length) nodes.push(plain(line.slice(cursor)));
  return nodes;
}

function nodeText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(nodeText).join('');
}

function stringAttr(node: JSONContent, name: string): string | null {
  const value = node.attrs?.[name];
  return typeof value === 'string' && value ? value : null;
}
