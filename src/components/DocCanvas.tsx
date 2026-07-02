import { useState } from 'react';
import { ScenarioEngine, type EngineState } from '../engine/ScenarioEngine';
import type { Scenario, DocBlockData } from '../engine/types';
import { DocTree } from './DocTree';
import { DocBlock } from './DocBlock';
import { PricingPanel } from './PricingPanel';
import { SelfCheckReport } from './SelfCheckReport';

interface DocCanvasProps {
  state: EngineState;
  scenario: Scenario;
  engine: ScenarioEngine;
}

export function DocCanvas({ state, scenario, engine }: DocCanvasProps) {
  const [lockedBlocks, setLockedBlocks] = useState<Set<string>>(new Set());
  const [customProses, setCustomProses] = useState<Record<string, string>>({});

  const visibleBlocks = scenario.blocks.filter((b) => state.revealedBlocks.includes(b.id));

  const handleLockToggle = (id: string) => {
    setLockedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEditSave = (id: string, newProse: string) => {
    setCustomProses((prev) => ({
      ...prev,
      [id]: newProse,
    }));
  };

  return (
    <section className="flex flex-1 overflow-hidden bg-gray-100" id="document-canvas-panel">
      {/* File Structure Tree on left side of the Canvas */}
      <DocTree
        volumes={scenario.volumes}
        grownVolumes={state.grownVolumes}
        focus={state.focus}
        engine={engine}
      />

      {/* Main Document Preview & Generation Canvas */}
      <div className="flex-1 overflow-auto p-5 md:p-6 space-y-6 scroll-smooth">
        {/* Step 7: Pricing Panel (if revealed) */}
        {state.pricingRevealed && (
          <PricingPanel pricing={scenario.pricing} />
        )}

        {/* Step 8: Compliance & Self Check Redline Report */}
        {state.revealedRedlines.length > 0 && (
          <SelfCheckReport
            redlines={scenario.redlines}
            revealed={state.revealedRedlines}
            overrides={state.redlineOverrides}
          />
        )}

        {/* Main Doc Block Stream */}
        <div className="space-y-4">
          {visibleBlocks.length === 0 && !state.pricingRevealed ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl shadow-3xs max-w-lg mx-auto px-6">
              <span className="text-3xl mb-3">📄</span>
              <p className="text-sm font-semibold text-gray-700 leading-snug">
                等待 AI 自主编写装配标书...
              </p>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                招标大纲与响应证据生成后，双击或单步推动左栏 Agent，标书内容、偏离表及承诺件将在此实时打字机组装展示。
              </p>
            </div>
          ) : (
            visibleBlocks.map((b) => {
              // Override block prose if customized by user
              const processedBlock: DocBlockData = {
                ...b,
                prose: customProses[b.id] !== undefined ? customProses[b.id] : b.prose,
              };

              // Prevent typewriter effect if the step is finished or if it was locked/pre-existing
              const isInstant = state.status !== 'playing' || lockedBlocks.has(b.id);

              return (
                <DocBlock
                  key={b.id}
                  block={processedBlock}
                  instant={isInstant}
                  locked={lockedBlocks.has(b.id)}
                  onLock={() => handleLockToggle(b.id)}
                  onEditSave={(newProse) => handleEditSave(b.id, newProse)}
                />
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
