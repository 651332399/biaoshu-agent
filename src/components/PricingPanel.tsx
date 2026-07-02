import type { Pricing } from '../engine/types';

interface Props {
  pricing: Pricing;
}

export function PricingPanel({ pricing }: Props) {
  const percentOfCeiling = Math.min(100, (pricing.报价 / pricing.限价) * 100);
  const isHighPressure = percentOfCeiling >= 99;

  return (
    <div className="bg-[var(--surface)] border border-amber-200 bg-amber-50/15 rounded-xl p-5 shadow-xs" id="pricing-calculator-block">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📊</span>
        <h3 className="text-sm font-semibold text-gray-800 font-sans">
          ⑦ 智能测算 · 开标一览分项报价
        </h3>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-100 bg-white shadow-3xs mb-4">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-amber-50/20 border-b border-amber-100">
              <th className="px-3.5 py-2 font-semibold text-gray-600">检测分项名称</th>
              <th className="px-3.5 py-2 font-semibold text-gray-600 text-center">数量</th>
              <th className="px-3.5 py-2 font-semibold text-gray-600 text-right">单价 (元)</th>
              <th className="px-3.5 py-2 font-semibold text-gray-600 text-right">小计 (元)</th>
            </tr>
          </thead>
          <tbody>
            {pricing.lines.map((line, idx) => (
              <tr key={idx} className="border-b border-amber-50 last:border-none hover:bg-amber-50/5 transition">
                <td className="px-3.5 py-2 font-medium text-gray-700 leading-snug">{line.项目}</td>
                <td className="px-3.5 py-2 text-gray-600 text-center font-mono">{line.数量}</td>
                <td className="px-3.5 py-2 text-gray-600 text-right font-mono">¥{line.单价.toLocaleString()}</td>
                <td className="px-3.5 py-2 text-gray-800 text-right font-bold font-mono">¥{line.小计.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold gap-1.5">
          <span className="text-gray-500">
            招标最高限价 (最高控标底红线): <strong className="text-gray-800">¥{pricing.限价.toLocaleString()}</strong>
          </span>
          <span className={isHighPressure ? 'text-[var(--bad)] font-bold' : 'text-[var(--accent)] font-bold'}>
            最终投报总报价: ¥{pricing.报价.toLocaleString()} · 限价利用率 {pricing.利用率}
          </span>
        </div>

        {/* Progress bar representing price / limit */}
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner flex" role="progressbar" aria-valuenow={percentOfCeiling} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isHighPressure ? 'bg-[var(--bad)] animate-pulse' : 'bg-[var(--accent)]'
            }`}
            style={{ width: `${percentOfCeiling}%` }}
          />
        </div>
      </div>

      {pricing.压线告警 && (
        <div className="mt-4 flex gap-2 border border-red-100 bg-red-50/40 rounded-lg p-3 text-xs text-[var(--bad)] leading-relaxed">
          <span className="text-sm shrink-0">⚠️</span>
          <div>
            <strong className="font-bold">最低价策略高危警告: </strong>
            <span className="font-sans font-medium">{pricing.压线告警}</span>
          </div>
        </div>
      )}
    </div>
  );
}
