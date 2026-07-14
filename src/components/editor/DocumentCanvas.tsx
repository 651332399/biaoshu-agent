import { useState } from 'react';
import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { DocBlockData, EvidenceChipData, Scenario } from '../../engine/demo/types';
import { useDocumentStore } from '../../hooks/useDocumentStore';
import { PaperCanvas } from '../PaperCanvas';
import { DocBlock } from '../DocBlock';
import { PricingPanel } from '../PricingPanel';
import { SelfCheckReport } from '../SelfCheckReport';
import { RequirementListDoc } from './RequirementListDoc';
import { AnnotationBubble } from './AnnotationBubble';
import { ExportDialog } from '../ExportDialog';
import type { EditorPhase } from './phase';

interface Props {
  state: EngineState;
  scenario: Scenario;
  engine: WorkspaceEngine;
  phase: EditorPhase;
  onOpenLibrary: () => void;
}

/** 为一个块推导行内证据芯片:块自带 chips 优先,否则按命中素材名称在正文里做子串匹配。 */
function chipsForBlock(block: DocBlockData, scenario: Scenario, matched: string[]): EvidenceChipData[] {
  if (block.chips && block.chips.length > 0) return block.chips;
  if (block.render !== 'prose' || !block.prose) return [];
  const text = block.prose;
  const derived: EvidenceChipData[] = [];
  for (const m of scenario.materials) {
    if (!m.名称) continue;
    // 用素材名称的主干(去掉 emoji/前缀符号)在正文里找
    const needle = m.名称.replace(/^[^一-龥A-Za-z0-9]+/, '').trim();
    if (needle.length >= 3 && text.includes(needle)) {
      derived.push({
        text: needle,
        materialId: m.id,
        status: m.命中 || matched.includes(m.id) ? 'hit' : 'missing',
      });
    }
  }
  return derived;
}

export function DocumentCanvas({ state, scenario, engine, phase, onOpenLibrary }: Props) {
  const [lockedBlocks, setLockedBlocks] = useState<Set<string>>(new Set());
  const [customProses, setCustomProses] = useState<Record<string, string>>({});
  const documentStore = useDocumentStore(scenario, state);

  const visibleBlocks = scenario.blocks.filter((b) => state.revealedBlocks.includes(b.id));
  const escalation = state.pendingCard?.kind === 'escalate' ? state.pendingCard : null;
  const anchorBlockId = escalation
    ? state.focus?.docBlock ?? visibleBlocks[visibleBlocks.length - 1]?.id
    : null;

  const handleLockToggle = (id: string) => {
    setLockedBlocks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 要求确认阶段:中央 = 招标要求清单文档
  if (phase === 'requirements') {
    return (
      <div className="flex-1 overflow-auto bg-[var(--canvas)] p-5 md:p-8 scroll-smooth">
        <RequirementListDoc
          requirements={state.backendRequirements}
          progressMessage={state.logs[state.logs.length - 1]?.text}
        />
      </div>
    );
  }

  // 合规自检阶段:中央 = 防废标红线一致性报告
  if (phase === 'selfcheck' && state.revealedRedlines.length > 0) {
    return (
      <div className="flex-1 overflow-auto bg-[var(--canvas)] p-5 md:p-8 scroll-smooth space-y-6">
        <div className="mx-auto max-w-3xl">
          <SelfCheckReport
            redlines={scenario.redlines}
            revealed={state.revealedRedlines}
            overrides={state.redlineOverrides}
          />
        </div>
      </div>
    );
  }

  // 导出打包阶段:中央 = 最终终审与打包导出页面(P6,流水线最后一阶段,无需返回)
  if (phase === 'export') {
    return (
      <ExportDialog
        scenario={scenario}
        backendExportPlan={state.backendExportPlan}
        backendOutline={state.backendOutline}
        serverDocxUrl={state.serverPackageUrl || state.serverDocxUrl}
        dirtyBlockIds={[...documentStore.dirtyBlocks]}
        onConfirm={() => engine.confirmCheckpoint()}
      />
    );
  }

  // 生成 / 报价:中央 = 标书正文纸张(行内芯片 + 正文旁批注)
  if (!escalation) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {state.pricingRevealed && (
          <div className="shrink-0 bg-[#e9eef5] px-6 pt-6">
            <div className="mx-auto max-w-3xl">
              <PricingPanel pricing={scenario.pricing} />
            </div>
          </div>
        )}
        <PaperCanvas
          blocks={documentStore.blocks}
          lockedBlocks={documentStore.lockedBlocks}
          dirtyBlocks={documentStore.dirtyBlocks}
          writingBlockId={documentStore.writingBlockId}
          isStreaming={state.status === 'playing'}
          fileName={`${scenario.meta.项目名 || '投标文件'}.docx`}
          saveError={documentStore.saveError}
          onBlocksChange={documentStore.replaceBlocks}
          onToggleLock={documentStore.toggleLock}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--canvas)] p-5 md:p-8 scroll-smooth">
      <div className="mx-auto max-w-4xl space-y-6">
        {state.pricingRevealed && <PricingPanel pricing={scenario.pricing} />}

        {visibleBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 bg-[var(--paper)] border border-gray-100 rounded-2xl max-w-lg mx-auto px-6">
            <span className="text-3xl mb-3">📄</span>
            <p className="text-sm font-semibold text-gray-700 leading-snug">AI 正在自主编写标书正文…</p>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              后端逐章生成的内容、偏离表与承诺件将在此纸张上实时组装,资料匹配以行内证据芯片嵌入。
            </p>
          </div>
        ) : (
          visibleBlocks.map((b) => {
            const processed: DocBlockData = {
              ...b,
              prose: customProses[b.id] !== undefined ? customProses[b.id] : b.prose,
            };
            const chips = chipsForBlock(processed, scenario, state.matchedMaterials);
            const isInstant = state.status !== 'playing' || lockedBlocks.has(b.id);
            return (
              <div key={b.id} className="relative">
                <div className={escalation && anchorBlockId === b.id ? 'lg:pr-72' : ''}>
                  <DocBlock
                    block={processed}
                    instant={isInstant}
                    locked={lockedBlocks.has(b.id)}
                    onLock={() => handleLockToggle(b.id)}
                    onEditSave={(newProse) => setCustomProses((p) => ({ ...p, [b.id]: newProse }))}
                    chips={chips}
                    onChipClick={(materialId) => {
                      const missing = chips.find((c) => c.materialId === materialId)?.status === 'missing';
                      if (missing) onOpenLibrary();
                    }}
                  />
                </div>
                {/* 正文旁批注气泡:锚定在触发决策的段落右侧 */}
                {escalation && anchorBlockId === b.id && (
                  <div className="mt-3 lg:mt-0 lg:absolute lg:top-0 lg:right-0 lg:w-64">
                    <AnnotationBubble card={escalation} onChoose={(i) => engine.chooseOption(i)} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
