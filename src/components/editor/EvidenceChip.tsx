import type { EvidenceChipData } from '../../engine/demo/types';

interface Props {
  chip: EvidenceChipData;
  onClick?: (materialId: string) => void;
}

/** 行内证据芯片:正文里 📎 可点的资料引用。命中=蓝,需补=琥珀。 */
export function EvidenceChip({ chip, onClick }: Props) {
  const missing = chip.status === 'missing';
  return (
    <button
      type="button"
      data-chip-material={chip.materialId}
      onClick={() => onClick?.(chip.materialId)}
      title={missing ? '该证据尚未在资料库命中,点击去补充' : `已命中企业资料:${chip.materialId}`}
      className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-md border text-[0.85em] font-sans font-medium align-baseline transition cursor-pointer ${
        missing
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-blue-200 bg-blue-50 text-[var(--accent)] hover:bg-blue-100'
      }`}
    >
      <span className="text-[0.9em]">📎</span>
      <span>{chip.text}</span>
    </button>
  );
}
