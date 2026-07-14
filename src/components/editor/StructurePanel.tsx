import { useMemo } from 'react';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { Scenario } from '../../engine/demo/types';
import { getDisplayVolumes } from '../../lib/exportPlanView';
import { DocTree } from '../DocTree';
import type { EditorPhase } from './phase';

interface Props {
  state: EngineState;
  scenario: Scenario;
  engine: WorkspaceEngine;
  phase: EditorPhase;
}

const CAT_ORDER = ['废标', '资质', '评分', '技术参数', '商务条款', '格式'] as const;
const CAT_STYLE: Record<string, string> = {
  废标: 'text-[var(--bad)]',
  资质: 'text-blue-600',
  评分: 'text-emerald-600',
  技术参数: 'text-indigo-600',
  商务条款: 'text-amber-600',
  格式: 'text-gray-500',
};

export function StructurePanel({ state, scenario, engine, phase }: Props) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of state.backendRequirements) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return map;
  }, [state.backendRequirements]);
  // Hooks 必须无条件在早 return 之前调用:phase 切换(requirements/selfcheck →
  // generate/export)会跨越下方早 return,若 useMemo 在 return 之后则 hook 数变化,
  // React 报 "Rendered more hooks than during the previous render" 崩溃。
  const displayVolumes = useMemo(
    () => getDisplayVolumes(scenario, state.backendExportPlan, state.backendOutline),
    [scenario, state.backendExportPlan, state.backendOutline],
  );
  const mandatory = state.backendRequirements.filter((r) => r.mandatory).length;

  // 要求确认阶段:要求分类 + 重点核对卡
  if (phase === 'requirements') {
    return (
      <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-gray-50 h-full overflow-y-auto p-4">
        <div className="flex items-center gap-1.5 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <span>🔍</span> 要求分类({state.backendRequirements.length} 项)
        </div>
        <ul className="space-y-1.5">
          {CAT_ORDER.map((type) => {
            const n = counts.get(type) ?? 0;
            if (n === 0) return null;
            return (
              <li
                key={type}
                onClick={() =>
                  document
                    .getElementById(`req-group-${type}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2 text-xs cursor-pointer hover:border-[var(--accent)] hover:bg-gray-50 transition-colors"
              >
                <span className={`font-semibold ${CAT_STYLE[type]}`}>{type}</span>
                <span className="font-mono font-bold text-gray-500">{n}</span>
              </li>
            );
          })}
        </ul>

        {mandatory > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-bold text-amber-800 mb-1">⚠️ 需重点核对</p>
            <p className="text-[11px] leading-relaxed text-amber-700">
              ★ 强制项 {mandatory} 条,漏答即废标。请逐条确认无误再放行。
            </p>
          </div>
        )}
      </aside>
    );
  }

  // 合规自检阶段:自检项清单
  if (phase === 'selfcheck') {
    return (
      <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-gray-50 h-full overflow-y-auto p-4">
        <div className="flex items-center gap-1.5 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <span>🛡️</span> 自检项
        </div>
        <ul className="space-y-1.5">
          {scenario.redlines
            .filter((r) => state.revealedRedlines.includes(r.id))
            .map((r) => {
              const result = state.redlineOverrides[r.id] ?? r.结果;
              const icon = result === 'pass' ? '✅' : result === 'warn' ? '⚠️' : '⛔';
              const tone =
                result === 'pass'
                  ? 'text-gray-700'
                  : result === 'warn'
                  ? 'text-amber-700 bg-amber-50 border-amber-100'
                  : 'text-red-700 bg-red-50 border-red-100';
              return (
                <li key={r.id} className={`flex items-start gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-[11px] leading-snug ${tone}`}>
                  <span className="shrink-0">{icon}</span>
                  <span className="flex-1">{r.项}</span>
                </li>
              );
            })}
        </ul>
      </aside>
    );
  }

  // 生成 / 报价 / 导出:分册结构树 + 整册进度(displayVolumes 已在顶部 useMemo)
  const grownVolumes = state.backendExportPlan
    ? displayVolumes.map((volume) => volume.id)
    : state.grownVolumes;
  const totalChapters = displayVolumes.reduce((n, v) => n + v.chapters.length, 0);
  // 一章可拆多块(sectionDraftToDocBlocks),进度分子按已揭示块的去重 chapterId
  // 计章数,与分母(章数)同口径,避免 block 数当章数导致进度失真。
  const doneChapters = new Set(
    scenario.blocks
      .filter((b) => state.revealedBlocks.includes(b.id))
      .map((b) => b.chapterId),
  ).size;
  const pct = totalChapters > 0 ? Math.min(100, Math.round((doneChapters / totalChapters) * 100)) : 0;

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-gray-50 h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <DocTree
          volumes={displayVolumes}
          requirements={scenario.requirements}
          grownVolumes={grownVolumes}
          focus={state.focus}
          engine={engine}
        />
      </div>
      {totalChapters > 0 && (
        <div className="shrink-0 border-t border-[var(--border)] bg-white p-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 mb-1.5">
            <span>整册进度</span>
            <span className="font-mono">{doneChapters}/{totalChapters} 章</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
      )}
    </aside>
  );
}
