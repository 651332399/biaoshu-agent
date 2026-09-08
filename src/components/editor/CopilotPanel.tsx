import { useRef, useState } from 'react';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { Scenario } from '../../engine/demo/types';
import type { ChatProposal, ChatTurn, FieldDiff } from '../../engine/types';
import { exportArtifactLabel, getDisplayVolumes } from '../../lib/exportPlanView';
import { apiUrl } from '../../lib/apiBase';
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
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!t && files.length === 0) return;
    engine.addCustomUserMessage(t || `补充 ${files.length} 个材料附件`, files);
    setInput('');
    setFiles([]);
  };

  return (
    <aside className="h-full w-full shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col md:w-80 xl:w-96">
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
            onConfirm={(artifact, confirmedFields, saveAsTemplate) => {
              if (saveAsTemplate) {
                engine.confirmCheckpoint(artifact, confirmedFields, true);
              } else {
                engine.confirmCheckpoint(artifact, confirmedFields);
              }
            }}
            onChoose={(i) => engine.chooseOption(i)}
          />
        )}

        {/* 阶段标题 */}
        <div className="rounded-lg bg-[var(--accent-soft)] border border-blue-100 px-3 py-2">
          <p className="text-[11px] font-bold text-[var(--accent)]">阶段 {state.activeStage || 0} · {PHASE_LABEL[phase]}</p>
        </div>

        <ChatStream state={state} engine={engine} />

        {state.status === 'playing' && (
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              <span>{state.activeStage === 8 ? '合规校验进行中' : '后端任务进行中'}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-blue-700">
              {state.logs.at(-1)?.text || '正在等待最新进度…'}
            </p>
          </section>
        )}

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
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((file) => (
              <span
                key={`${file.name}-${file.size}`}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-gray-600"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => setFiles((items) => items.filter((item) => item !== file))}
                  aria-label={`移除 ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-[var(--accent)]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              setFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            className="text-gray-400 hover:text-[var(--accent)]"
            onClick={() => fileInputRef.current?.click()}
            aria-label="添加材料附件"
          >
            📎
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="和 Copilot 对话或补充资料…"
            className="flex-1 text-xs outline-none bg-transparent"
          />
          <button onClick={send} className="text-[var(--accent)] font-bold text-sm hover:opacity-80 cursor-pointer">
            {state.chat.sending ? '…' : '➤'}
          </button>
        </div>
      </div>
    </aside>
  );
}

function ChatStream({ state, engine }: { state: EngineState; engine: WorkspaceEngine }) {
  const messages = state.chat.messages;
  const proposals = state.chat.proposals;
  if (messages.length === 0 && proposals.length === 0 && state.chat.tailState === 'answered') return null;
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-gray-700">对话</p>
        {state.chat.sending && <span className="text-[10px] font-semibold text-blue-600">发送中</span>}
      </div>
      {state.chat.tailState === 'interrupted' && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
          上一条回复中断，已停止等待；请换一条消息重新发送。
        </div>
      )}
      <ol className="space-y-2">
        {messages.map((message) => (
          <ChatMessage key={message.turn_id} message={message} />
        ))}
      </ol>
      {proposals.length > 0 && (
        <div className="mt-3 space-y-2">
          {proposals.map((proposal) => (
            <ProposalCardView
              key={proposal.proposal_id}
              proposal={proposal}
              onAccept={() => engine.acceptProposal?.(proposal.proposal_id)}
              onReject={() => engine.rejectProposal?.(proposal.proposal_id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChatMessage({ message }: { message: ChatTurn }) {
  const isUser = message.role === 'user';
  return (
    <li className={`rounded-lg border px-3 py-2 ${isUser ? 'border-gray-200 bg-gray-50' : 'border-blue-100 bg-blue-50/60'}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-gray-600">{isUser ? '我' : 'Copilot'}</span>
        {message.intent && <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] text-gray-500">{message.intent}</span>}
        {message.context_stale && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">上下文已更新</span>}
      </div>
      <p className="whitespace-pre-line text-[11px] leading-relaxed text-gray-700">{message.text}</p>
      {(message.citations.length > 0 || message.material_ids.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {message.citations.map((citation) => (
            <span key={citation} className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[9px] text-blue-700">
              {citation}
            </span>
          ))}
          {message.material_ids.map((id) => (
            <span key={id} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700">
              材料 {id}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function ProposalCardView({
  proposal,
  onAccept,
  onReject,
}: {
  proposal: ChatProposal;
  onAccept: () => void;
  onReject: () => void;
}) {
  const terminal = proposal.status !== 'proposed';
  const statusLabel: Record<ChatProposal['status'], string> = {
    proposed: '待处理',
    accepted: '已采纳',
    rejected: '已拒绝',
    stale: '已过期',
  };
  return (
    <article className={`rounded-lg border p-3 ${proposal.status === 'stale' ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-gray-800">
          提案 {proposal.proposal_id} · {proposal.target_artifact}
        </p>
        <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">{statusLabel[proposal.status]}</span>
      </div>
      <details className="mt-2" open={proposal.diff.length <= 2}>
        <summary className="cursor-pointer text-[11px] leading-relaxed text-gray-700">{proposal.summary}</summary>
        <div className="mt-2 space-y-1.5">
          {proposal.diff.length === 0 ? (
            <p className="text-[10px] text-gray-500">等待完整提案对账。</p>
          ) : (
            proposal.diff.map((item, index) => <DiffRow key={`${item.path}-${index}`} diff={item} />)
          )}
        </div>
      </details>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={terminal}
          onClick={onAccept}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          采纳
        </button>
        <button
          type="button"
          disabled={terminal}
          onClick={onReject}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          拒绝
        </button>
      </div>
    </article>
  );
}

function DiffRow({ diff }: { diff: FieldDiff }) {
  return (
    <div className="rounded-md border border-white/80 bg-white p-2">
      <p className="text-[10px] font-semibold text-gray-700">{diff.op} · {diff.label || diff.path}</p>
      <div className="mt-1 grid gap-1 text-[10px] text-gray-600">
        <pre className="max-h-24 overflow-auto rounded bg-red-50 p-1 whitespace-pre-wrap">{formatDiffValue(diff.before)}</pre>
        <pre className="max-h-24 overflow-auto rounded bg-emerald-50 p-1 whitespace-pre-wrap">{formatDiffValue(diff.after)}</pre>
      </div>
    </div>
  );
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
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
          href={apiUrl(downloadUrl)}
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
