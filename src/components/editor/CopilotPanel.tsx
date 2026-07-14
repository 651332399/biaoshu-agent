import { useState } from 'react';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { Scenario } from '../../engine/demo/types';
import { exportArtifactLabel, getDisplayVolumes } from '../../lib/exportPlanView';
import { DecisionCard } from '../DecisionCard';
import type { EditorPhase } from './phase';
import { PHASE_LABEL } from './phase';

interface Props {
  state: EngineState;
  scenario: Scenario;
  engine: WorkspaceEngine;
  phase: EditorPhase;
  onOpenLibrary: () => void;
}

export function CopilotPanel({ state, scenario, engine, phase, onOpenLibrary }: Props) {
  const [input, setInput] = useState('');
  const card = state.pendingCard;
  const isCheckpoint = card?.kind === 'checkpoint' || card?.kind === 'export';
  const isEscalate = card?.kind === 'escalate';

  const checkpointArtifact = (() => {
    const id = card?.id;
    if (id === 'confirm-2' && state.backendOutline) return { label: '大纲 outline.json', value: state.backendOutline };
    if (id === 'confirm-4' && state.backendExportPlan) {
      return {
        label: state.backendTenderSpec
          ? 'TenderSpec 分册方案（export_plan）'
          : '分册导出方案 export_plan.json',
        value: state.backendTenderSpec ?? state.backendExportPlan,
      };
    }
    if (id === 'confirm-3' && state.backendReport) return { label: '合规报告 report.json', value: state.backendReport };
    return undefined;
  })();

  const send = () => {
    const t = input.trim();
    if (!t) return;
    engine.addCustomUserMessage(t);
    setInput('');
  };

  return (
    <aside className="w-80 xl:w-96 shrink-0 border-l border-[var(--border)] bg-[var(--surface)] h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>🤖</span> 编写 Copilot
        </h2>
        <span className="text-[11px] font-mono font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
          阶段 {state.activeStage || 0}/9
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 阻塞确认点/待决断:确认卡置顶,不依赖正文段落是否已渲染 */}
        {(isCheckpoint || isEscalate) && card && (
          <DecisionCard
            card={card}
            requirements={card.id === 'confirm-1' ? state.backendRequirements : undefined}
            artifact={checkpointArtifact}
            onConfirm={(artifact, confirmedFields) => engine.confirmCheckpoint(artifact, confirmedFields)}
            onChoose={(i) => engine.chooseOption(i)}
          />
        )}

        {/* 阶段标题 */}
        <div className="rounded-lg bg-[var(--accent-soft)] border border-blue-100 px-3 py-2">
          <p className="text-[11px] font-bold text-[var(--accent)]">阶段 {state.activeStage || 0} · {PHASE_LABEL[phase]}</p>
        </div>

        {phase === 'requirements' && <StrategySection state={state} scenario={scenario} />}
        {phase === 'generate' && <GenerateSection state={state} scenario={scenario} onOpenLibrary={onOpenLibrary} />}
        {phase === 'pricing' && <PricingLogicSection scenario={scenario} />}
        {phase === 'selfcheck' && <ReleaseSection state={state} />}
        {phase === 'export' && <ExportSummarySection state={state} />}

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">{state.error}</div>
        )}
      </div>

      {/* 对话输入 */}
      <div className="shrink-0 border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-[var(--accent)]">
          <span className="text-gray-400">📎</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="和 Copilot 对话或补充资料…"
            className="flex-1 text-xs outline-none bg-transparent"
          />
          <button onClick={send} className="text-[var(--accent)] font-bold text-sm hover:opacity-80 cursor-pointer">
            ➤
          </button>
        </div>
      </div>
    </aside>
  );
}

function StrategySection({ state, scenario }: { state: EngineState; scenario: Scenario }) {
  const mandatory = state.backendRequirements.filter((r) => r.mandatory).length;
  const withPage = state.backendRequirements.filter((r) => r.page != null).length;
  return (
    <>
      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="text-[11px] font-bold text-gray-700 mb-1.5">投标策略建议</p>
        <p className="text-[11px] leading-relaxed text-gray-600">
          评审办法:{scenario.strategy.method === 'composite' ? '综合评分法' : '经评审最低价法'}。
          {scenario.strategy.报价基调 || '按限价空间反推分项单价,资源倾斜技术方案与业绩加分项。'}
        </p>
      </section>
      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="text-[11px] font-bold text-gray-700 mb-2">抽取质量</p>
        <MetricRow label="要求条目" value={`${state.backendRequirements.length} 项`} />
        <MetricRow label="★ 强制红线" value={`${mandatory} 项`} tone="bad" />
        <MetricRow label="带页码定位" value={`${withPage} / ${state.backendRequirements.length}`} />
      </section>
    </>
  );
}

function GenerateSection({
  state,
  scenario,
  onOpenLibrary,
}: {
  state: EngineState;
  scenario: Scenario;
  onOpenLibrary: () => void;
}) {
  const lastLogs = state.logs.slice(-4);
  return (
    <>
      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="text-[11px] font-bold text-gray-700 mb-2">正在生成</p>
        <ul className="space-y-1.5">
          {lastLogs.length === 0 ? (
            <li className="text-[11px] text-gray-400">等待后端逐章生成…</li>
          ) : (
            lastLogs.map((l) => (
              <li key={l.id} className="text-[11px] leading-relaxed text-gray-600 line-clamp-2">
                · {l.text}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-700">企业资料底库 · 5 大底座</p>
          <button onClick={onOpenLibrary} className="text-[10px] font-semibold text-[var(--accent)] hover:underline cursor-pointer">
            进入资料库 →
          </button>
        </div>
        <ul className="space-y-1.5">
          {scenario.materials.length === 0 ? (
            <li className="text-[11px] text-gray-400">检索匹配中…</li>
          ) : (
            scenario.materials.slice(0, 6).map((m) => {
              const hit = m.命中 || state.matchedMaterials.includes(m.id);
              return (
                <li key={m.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex-1 truncate text-gray-700" title={m.名称}>{m.名称}</span>
                  <span className={`shrink-0 font-semibold ${hit ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {hit ? '命中' : '需补充'}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </>
  );
}

function PricingLogicSection({ scenario }: { scenario: Scenario }) {
  const p = scenario.pricing;
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-[11px] font-bold text-gray-700 mb-2">智能测算逻辑</p>
      <p className="text-[11px] leading-relaxed text-gray-600 mb-3">
        按限价空间反推分项单价,加总与投标函大写金额钩稽。价格分权重低时顶格报价争取技术池满分下最大化收益。
      </p>
      <MetricRow label="投标总价" value={p.报价 ? `¥${p.报价.toLocaleString()}` : '—'} />
      <MetricRow label="最高限价" value={p.限价 ? `¥${p.限价.toLocaleString()}` : '—'} />
      <MetricRow label="利用率" value={p.利用率 || '—'} tone="accent" />
    </section>
  );
}

function ReleaseSection({ state }: { state: EngineState }) {
  const cov = state.backendCoverage;
  const passed = state.backendReport
    ? state.backendReport.deviations.filter((d) => d.deviation !== '负偏离').length
    : 0;
  const risk = cov?.废标风险项.length ?? 0;
  return (
    <>
      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="text-[11px] font-bold text-gray-700 mb-2">放行汇总</p>
        <MetricRow label="要求覆盖率" value={cov ? `${cov.responded}/${cov.total}` : '—'} tone={cov && cov.missing.length ? 'bad' : 'ok'} />
        <MetricRow label="漏响应" value={cov ? `${cov.missing.length} 项` : '—'} tone={cov && cov.missing.length ? 'bad' : 'ok'} />
        <MetricRow label="废标风险" value={`${risk} 项`} tone={risk ? 'bad' : 'ok'} />
        <MetricRow label="无偏离应答" value={`${passed} 条`} />
      </section>
      {cov && cov.missing.length === 0 && risk === 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-700">
          ✅ 硬性红线全部通过,无漏响应、无废标风险。可通过并进入导出。
        </div>
      )}
    </>
  );
}

function ExportSummarySection({ state }: { state: EngineState }) {
  const plan = state.backendExportPlan;
  const downloadUrl = state.serverPackageUrl || state.serverDocxUrl;
  const downloadLabel = exportArtifactLabel(plan, downloadUrl);
  const volumes = getDisplayVolumes(
    {
      id: 'kqyy',
      meta: {
        项目名: '',
        采购人: '',
        采购方式: '',
        评审办法: '',
        限价: 0,
        报价: 0,
        报价利用率: '',
        保证金: 0,
        服务周期: '',
      },
      strategy: { method: 'composite', 基调: '', 报价基调: '' },
      volumes: [],
      requirements: [],
      mapping: [],
      materials: [],
      blocks: [],
      redlines: [],
      pricing: { lines: [], 限价: 0, 报价: 0, 利用率: '' },
      steps: [],
    },
    plan,
  );
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-[11px] font-bold text-gray-700 mb-2">导出打包</p>
      {plan ? (
        <>
          <p className="text-[11px] text-gray-600 mb-2">
            导出模式:{plan.output_mode};{volumes.length} 个{plan.package_zip ? '分册 ZIP' : 'Word 文件'}。
          </p>
          <ul className="space-y-1">
            {volumes.map((v) => (
              <li key={v.id} className="text-[11px] text-gray-700 flex items-center gap-1.5">
                📘 <span className="truncate">{v.名称}</span>
                <span className="ml-auto max-w-32 truncate font-mono text-[10px] text-gray-400" title={v.fileName}>
                  {v.fileName}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[11px] text-gray-400">等待生成分册导出方案…</p>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          className="mt-3 block w-full text-center py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-opacity-90"
        >
          🏆 {downloadLabel}
        </a>
      )}
    </section>
  );
}

function MetricRow({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'accent' }) {
  const toneClass =
    tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-[var(--bad)]' : tone === 'accent' ? 'text-[var(--accent)]' : 'text-gray-800';
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-none">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[11px] font-bold font-mono ${toneClass}`}>{value}</span>
    </div>
  );
}
