import { Fragment, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { DocBlockData, EvidenceChipData } from '../engine/demo/types';
import { Typewriter } from './Typewriter';
import { EvidenceChip } from './editor/EvidenceChip';
import { EvidenceConfirmBar } from './editor/EvidenceConfirmBar';

interface DocBlockProps {
  key?: string;
  block: DocBlockData;
  instant: boolean;
  locked: boolean;
  onLock: () => void;
  onEditSave: (newProse: string) => void;
  chips?: EvidenceChipData[];
  onChipClick?: (materialId: string) => void;
}

/** 把正文按 chip.text 切片,命中处替换成 EvidenceChip。无 chip 时返回原文。 */
function renderWithChips(
  text: string,
  chips: EvidenceChipData[],
  onChipClick?: (id: string) => void,
): ReactNode {
  if (chips.length === 0) return text;
  const hits: { start: number; end: number; chip: EvidenceChipData }[] = [];
  for (const chip of chips) {
    const idx = text.indexOf(chip.text);
    if (idx >= 0) hits.push({ start: idx, end: idx + chip.text.length, chip });
  }
  hits.sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;
  hits.forEach((hit, i) => {
    if (hit.start < cursor) return; // 跳过重叠
    if (hit.start > cursor) parts.push(<Fragment key={`t${i}`}>{text.slice(cursor, hit.start)}</Fragment>);
    parts.push(<EvidenceChip key={`c${i}`} chip={hit.chip} onClick={onChipClick} />);
    cursor = hit.end;
  });
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return parts;
}

export function DocBlock({ block, instant, locked, onLock, onEditSave, chips = [], onChipClick }: DocBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(block.prose ?? '');

  const handleEditToggle = () => {
    if (isEditing) {
      onEditSave(editText);
      setIsEditing(false);
    } else {
      setEditText(block.prose ?? '');
      setIsEditing(true);
    }
  };

  return (
    <motion.div
      data-block={block.id}
      data-chapter={block.chapterId}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative bg-[var(--surface)] border rounded-xl p-5 shadow-xs transition-all ${
        locked
          ? 'border-emerald-300 bg-emerald-50/10 shadow-emerald-50/20'
          : 'border-[var(--border)] hover:border-gray-300'
      }`}
    >
      {/* Block actions (visible on hover) */}
      <div className="absolute top-4 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
        {block.render === 'prose' && (
          <button
            onClick={handleEditToggle}
            className="flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-white text-[11px] text-gray-600 hover:text-gray-900 hover:border-gray-300 transition shadow-2xs cursor-pointer"
          >
            {isEditing ? '💾 保存' : '✏️ 编辑'}
          </button>
        )}
        <button
          onClick={onLock}
          className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold transition shadow-2xs cursor-pointer ${
            locked
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          {locked ? '🔒 已锁定' : '🔓 锁定块'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono font-bold text-[var(--muted)] tracking-wider">
          {block.标题}
        </span>
        {locked && (
          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-pulse">
            Locked
          </span>
        )}
      </div>

      {/* Render prose block */}
      {block.render === 'prose' && (
        <div className="text-[15px] text-gray-800 leading-[1.9] doc-serif">
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[var(--accent)] focus:outline-none text-sm leading-relaxed font-sans"
            />
          ) : chips.length > 0 ? (
            // 有行内证据芯片时直接渲染富文本(跳过打字机,芯片需为真实 DOM 节点)
            <>
              <p className="whitespace-pre-wrap">{renderWithChips(block.prose ?? '', chips, onChipClick)}</p>
              <EvidenceConfirmBar chips={chips} />
            </>
          ) : (
            <Typewriter text={block.prose ?? ''} instant={instant} />
          )}
        </div>
      )}

      {/* Render table block */}
      {block.render === 'table' && block.table && (
        <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {block.table.headers.map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.table.rows.map((row, rowIdx) => (
                <motion.tr
                  key={rowIdx}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: instant ? 0 : rowIdx * 0.15 }}
                  className="border-b border-gray-50 hover:bg-gray-50/40 transition last:border-none"
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3.5 py-2.5 text-gray-700 whitespace-pre-wrap">
                      {cell}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Render form block */}
      {block.render === 'form' && block.form && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/60 rounded-xl p-4 border border-gray-100">
          {block.form.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-xs md:text-sm font-semibold text-gray-800">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Render attachment block */}
      {block.render === 'attachment' && block.attachment && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 bg-blue-50/30 border border-blue-100/80 rounded-xl p-4 shadow-3xs"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg shadow-sm">
            📄
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">
              {block.attachment.名称}
            </p>
            <p className="text-[10px] text-blue-600 font-medium">
              匹配成功 · 已自动关联自公司资质库 [{block.attachment.materialId}]
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full shrink-0">
            ✓ 合规插入
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
