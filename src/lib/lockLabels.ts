import type { DocBlockData } from '../engine/demo/types';

export function buildBlockLockLabels(_blocks: DocBlockData[]): Map<string, string> {
  const labels = new Map<string, string>();
  const chapterTitles = new Map<string, string>();
  const chapterIndexes = new Map<string, number>();
  for (const block of _blocks) {
    const explicitTitle = block.标题.trim();
    if (explicitTitle) chapterTitles.set(block.chapterId, explicitTitle);
    const index = (chapterIndexes.get(block.chapterId) ?? 0) + 1;
    chapterIndexes.set(block.chapterId, index);
    const sectionTitle = chapterTitles.get(block.chapterId) ?? '未命名章节';
    const kind = block.render === 'table'
      ? '表格'
      : block.render === 'attachment'
        ? '附件'
        : block.render === 'form'
          ? '表单'
          : '正文';
    labels.set(block.id, explicitTitle || `${sectionTitle} · ${kind} ${index}`);
  }
  return labels;
}
