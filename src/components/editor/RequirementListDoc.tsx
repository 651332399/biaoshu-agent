import { useMemo } from 'react';
import type { BackendRequirement } from '../../engine/types';

interface Props {
  requirements: BackendRequirement[];
  progressMessage?: string;
}

const GROUP_ORDER = ['废标', '资质', '评分', '技术参数', '商务条款', '格式'] as const;
const GROUP_META: Record<string, { dot: string; label: string }> = {
  废标: { dot: 'bg-[var(--bad)]', label: '废标红线(强制性)' },
  资质: { dot: 'bg-blue-500', label: '资质要求' },
  评分: { dot: 'bg-emerald-500', label: '评分项' },
  技术参数: { dot: 'bg-indigo-500', label: '技术参数' },
  商务条款: { dot: 'bg-amber-500', label: '商务条款' },
  格式: { dot: 'bg-gray-400', label: '格式要求' },
};

/** P2 中央文档:AI 抽取的招标要求清单,以可复核的「要求清单」文档形态呈现。 */
export function RequirementListDoc({ requirements, progressMessage }: Props) {
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((type) => ({
        type,
        items: requirements.filter((r) => r.type === type),
      })).filter((g) => g.items.length > 0),
    [requirements],
  );
  const mandatoryCount = requirements.filter((r) => r.mandatory).length;

  return (
    <article className="mx-auto max-w-3xl bg-[var(--paper)] rounded-xl border border-[var(--border)] shadow-sm px-8 py-9 md:px-12 md:py-11">
      <header className="text-center border-b border-gray-200 pb-5 mb-6">
        <h2 className="text-xl font-bold text-gray-900">招标要求清单 · AI 抽取</h2>
        <p className="mt-2 text-xs text-[var(--muted)]">
          共 {requirements.length} 项 · {mandatoryCount} 条 <span className="text-[var(--bad)] font-semibold">★ 强制</span>
        </p>
      </header>

      {requirements.length === 0 ? (
        <div className="text-center text-sm text-[var(--muted)] py-12">
          <p>等待后端解析招标文件,抽取要求清单…</p>
          {progressMessage && (
            <p className="mt-2 text-xs font-mono text-[var(--accent)]">{progressMessage}</p>
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => {
            const meta = GROUP_META[group.type];
            return (
              <section key={group.type} id={`req-group-${group.type}`}>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                  {meta.label}
                  <span className="text-[11px] font-medium text-[var(--muted)]">· {group.items.length} 条</span>
                </h3>
                <ul className="space-y-2.5">
                  {group.items.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-start gap-2 text-[13px] leading-relaxed rounded-lg px-3 py-2 border ${
                        r.mandatory ? 'border-red-100 bg-red-50/40' : 'border-gray-100 bg-gray-50/40'
                      }`}
                    >
                      {r.mandatory && <span className="text-[var(--bad)] font-bold shrink-0">★</span>}
                      <span className="flex-1 text-gray-800">{r.text}</span>
                      <span className="shrink-0 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                        {r.page != null && <span>第 {r.page} 页</span>}
                        {r.score_weight != null && (
                          <span className="font-semibold text-emerald-600">{r.score_weight} 分</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
