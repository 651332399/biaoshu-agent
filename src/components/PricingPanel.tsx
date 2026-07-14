import type { Pricing } from '../engine/demo/types';
import { RiskWarningCard } from './editor/RiskWarningCard';

interface Props {
  pricing: Pricing;
}

export function PricingPanel({ pricing }: Props) {
  const percentOfCeiling = Math.min(100, (pricing.报价 / pricing.限价) * 100);
  const isHighPressure = percentOfCeiling >= 99;
  const linesTotal = pricing.lines.reduce((sum, line) => sum + line.小计, 0);
  const reconciliationGap = pricing.报价 - linesTotal;

  return (
    <div
      className="doc-serif bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 md:p-7 shadow-xs"
      id="pricing-calculator-block"
    >
      <h2 className="text-center text-base md:text-lg font-bold text-[var(--text)] mb-5">开标一览表</h2>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 font-sans">
        <div className="border-b border-dashed border-gray-200 pb-2">
          <div className="text-[11px] text-gray-400">投标总价</div>
          <div className="text-sm font-bold text-gray-900">¥{pricing.报价.toLocaleString()}</div>
        </div>
        <div className="border-b border-dashed border-gray-200 pb-2">
          <div className="text-[11px] text-gray-400">招标最高限价</div>
          <div className="text-sm font-bold text-gray-900">¥{pricing.限价.toLocaleString()}</div>
        </div>
        <div className="border-b border-dashed border-gray-200 pb-2">
          <div className="text-[11px] text-gray-400">限价利用率</div>
          <div className={`text-sm font-bold ${isHighPressure ? 'text-[var(--bad)]' : 'text-gray-900'}`}>
            利用率 {pricing.利用率}
          </div>
        </div>
        <div className="border-b border-dashed border-gray-200 pb-2">
          <div className="text-[11px] text-gray-400">分项勾稽尾差</div>
          <div className={`text-sm font-bold ${reconciliationGap === 0 ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}`}>
            ¥{reconciliationGap.toLocaleString()}
          </div>
        </div>
      </div>

      <h3 className="text-center text-sm md:text-base font-bold text-[var(--text)] mb-4">分项报价表</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm font-sans">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500">
              <th className="px-2 py-2 font-semibold">检测分项名称</th>
              <th className="px-2 py-2 font-semibold text-center">数量</th>
              <th className="px-2 py-2 font-semibold text-right">单价 (元)</th>
              <th className="px-2 py-2 font-semibold text-right">小计 (元)</th>
            </tr>
          </thead>
          <tbody>
            {pricing.lines.map((line, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-none">
                <td className="px-2 py-2 text-gray-700 leading-snug">{line.项目}</td>
                <td className="px-2 py-2 text-gray-600 text-center font-mono">{line.数量}</td>
                <td className="px-2 py-2 text-gray-600 text-right font-mono">¥{line.单价.toLocaleString()}</td>
                <td className="px-2 py-2 text-gray-800 text-right font-bold font-mono">¥{line.小计.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={3} className="px-2 py-2.5 text-right font-bold text-gray-500">
                分项加总
              </td>
              <td className="px-2 py-2.5 text-right font-extrabold text-[var(--accent)] font-mono">
                ¥{linesTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 限价占用进度:克制的钩稽提示,附着在报价表下方,而非独立警示卡 */}
      <div
        className="mt-5 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={percentOfCeiling}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHighPressure ? 'bg-[var(--bad)] animate-pulse' : 'bg-[var(--accent)]'
          }`}
          style={{ width: `${percentOfCeiling}%` }}
        />
      </div>

      {pricing.压线告警 && (
        <div className="mt-6 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-[var(--bad)] leading-relaxed font-sans">
          <span className="text-sm shrink-0">⚠️</span>
          <div>
            <strong className="font-bold">最低价策略高危警告: </strong>
            <span className="font-medium">{pricing.压线告警}</span>
          </div>
        </div>
      )}

      {pricing.warnings && pricing.warnings.length > 0 && (
        <div className="mt-4 font-sans">
          <RiskWarningCard items={pricing.warnings} />
        </div>
      )}
    </div>
  );
}
