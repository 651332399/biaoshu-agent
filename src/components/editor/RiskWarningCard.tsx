import type { PricingWarning } from '../../engine/demo/types';

interface Props {
  items: PricingWarning[];
}

const LEVEL_STYLES: Record<PricingWarning['level'], { wrapper: string; badge: string; label: string }> = {
  high: {
    wrapper: 'border-red-200 bg-red-50 text-red-700',
    badge: 'bg-red-100 text-red-700',
    label: '高危',
  },
  medium: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    label: '中危',
  },
};

/** 高危/中危警示卡:醒目提示报价异常低 / 费率超标 / 关键项漏报等风险。 */
export function RiskWarningCard({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="risk-warning-card">
      {items.map((item, idx) => {
        const style = LEVEL_STYLES[item.level];
        return (
          <div
            key={idx}
            className={`flex gap-2 rounded-lg border p-3 text-xs leading-relaxed ${style.wrapper}`}
          >
            <span className="text-sm shrink-0">⚠️</span>
            <div>
              <span className={`inline-block mr-1.5 px-1.5 py-0.5 rounded font-bold text-[0.85em] ${style.badge}`}>
                {style.label}
              </span>
              <strong className="font-bold">{item.title}: </strong>
              <span className="font-sans font-medium">{item.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
