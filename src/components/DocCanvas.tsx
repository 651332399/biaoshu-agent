import { ScenarioEngine, type EngineState } from '../engine/ScenarioEngine';
import type { Scenario } from '../engine/demo/types';
import type { WorkspaceEngine } from '../engine/sources';
import { useDocumentStore } from '../hooks/useDocumentStore';
import { DocTree } from './DocTree';
import { PricingPanel } from './PricingPanel';
import { SelfCheckReport } from './SelfCheckReport';
import { PaperCanvas } from './PaperCanvas';

interface DocCanvasProps {
  state: EngineState;
  scenario: Scenario;
  engine: ScenarioEngine | WorkspaceEngine;
}

export function DocCanvas({ state, scenario, engine }: DocCanvasProps) {
  const documentStore = useDocumentStore(scenario, state);

  return (
    <section className="flex flex-1 overflow-hidden bg-gray-100" id="document-canvas-panel">
      {/* File Structure Tree on left side of the Canvas */}
      <DocTree
        volumes={scenario.volumes}
        requirements={scenario.requirements}
        grownVolumes={state.grownVolumes}
        focus={state.focus}
        engine={engine}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Step 7: Pricing Panel (if revealed) */}
        {state.pricingRevealed && (
          <div className="w-80 shrink-0 overflow-auto border-r border-slate-200 bg-white p-4">
            <PricingPanel pricing={scenario.pricing} />
          </div>
        )}

        {/* Step 8: Compliance & Self Check Redline Report */}
        {state.revealedRedlines.length > 0 && (
          <div className="w-80 shrink-0 overflow-auto border-r border-slate-200 bg-white p-4">
            <SelfCheckReport
              redlines={scenario.redlines}
              revealed={state.revealedRedlines}
              overrides={state.redlineOverrides}
            />
          </div>
        )}

        <PaperCanvas
          blocks={documentStore.blocks}
          lockedBlocks={documentStore.lockedBlocks}
          dirtyBlocks={documentStore.dirtyBlocks}
          writingBlockId={documentStore.writingBlockId}
          isStreaming={state.status === 'playing'}
          fileName={`${scenario.meta.项目名 || '投标文件'}.docx`}
          onBlocksChange={documentStore.replaceBlocks}
          onToggleLock={documentStore.toggleLock}
        />
      </div>
    </section>
  );
}
