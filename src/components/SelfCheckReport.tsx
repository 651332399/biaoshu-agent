import type { RedlineCheck } from '../engine/demo/types';

interface Props {
  redlines: RedlineCheck[];
  revealed: string[];
  overrides: Record<string, 'pass' | 'warn' | 'fail'>;
}

const RESULT_ICON = {
  pass: '✅',
  warn: '⚠️',
  fail: '❌',
};

const RESULT_STYLE = {
  pass: 'border-emerald-100 bg-emerald-50/20 text-emerald-800',
  warn: 'border-amber-100 bg-amber-50/20 text-amber-800',
  fail: 'border-red-100 bg-red-50/20 text-red-800',
};

const BADGE_LABEL = {
  pass: '合规通过',
  warn: '存疑警告',
  fail: '不合规红线',
};

export function SelfCheckReport({ redlines, revealed, overrides }: Props) {
  const visibleChecks = redlines.filter((r) => revealed.includes(r.id));

  if (visibleChecks.length === 0) return null;

  return (
    <div className="bg-[var(--surface)] border border-blue-200 bg-blue-50/15 rounded-xl p-5 shadow-xs animate-fadeIn" id="compliance-evaluation-block">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🛡️</span>
        <h3 className="text-sm font-semibold text-gray-800 font-sans">
          ⑧ 防废标红线与一致性合规自检
        </h3>
      </div>

      <ul className="space-y-2.5" role="list">
        {visibleChecks.map((r) => {
          const finalResult = overrides[r.id] ?? r.结果;
          return (
            <li
              key={r.id}
              data-redline={r.id}
              data-result={finalResult}
              className={`flex items-start gap-3 border rounded-xl p-3 shadow-3xs transition-all ${RESULT_STYLE[finalResult]}`}
            >
              <span className="text-base mt-0.5" role="img" aria-label={finalResult}>
                {RESULT_ICON[finalResult]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold leading-snug">
                    {r.项}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider bg-white border">
                    {BADGE_LABEL[finalResult]}
                  </span>
                </div>
                {r.说明 && (
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">
                    检测详情: {r.说明}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
