import type { EvidenceChipData } from '../../engine/demo/types';

interface Props {
  chips: EvidenceChipData[];
}

/** 内联证据确认条:段落下方,提示已命中的证据已插入。status !== 'hit' 的 chip 不显示。 */
export function EvidenceConfirmBar({ chips }: Props) {
  const hitChips = chips.filter((chip) => chip.status === 'hit');
  if (hitChips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {hitChips.map((chip) => (
        <div
          key={chip.materialId}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium"
        >
          <span>✓</span>
          <span>
            证据已插入:{chip.text}(资料库 {chip.materialId})
          </span>
        </div>
      ))}
    </div>
  );
}
