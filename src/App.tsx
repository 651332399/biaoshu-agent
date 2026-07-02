import { useState, useEffect } from 'react';
import { useEngine } from './hooks/useEngine';
import { scenarios } from './scenarios';
import { TopBar } from './components/TopBar';
import { AgentStream } from './components/AgentStream';
import { DocCanvas } from './components/DocCanvas';
import { MaterialsDrawer } from './components/MaterialsDrawer';
import { ExportDialog } from './components/ExportDialog';
import { UploadIntro } from './components/UploadIntro';

export default function App() {
  const [currentScenarioId, setCurrentScenarioId] = useState<'kqyy' | 'yy922'>('kqyy');
  const scenario = scenarios[currentScenarioId];

  const { engine, state, load } = useEngine(scenario);
  const [hasStarted, setHasStarted] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Trigger loading state if we switch scenarios mid-session
  const handleScenarioChange = (id: 'kqyy' | 'yy922') => {
    setCurrentScenarioId(id);
    setHasStarted(false);
    setShowExportModal(false);
    load(scenarios[id]);
  };

  // Start executing the engine when uploaded/initiated
  const handleStartWorkspace = () => {
    setHasStarted(true);
    // Play automatically at start to kick off the AI workflow!
    setTimeout(() => {
      engine.play();
    }, 400);
  };

  // Watch for the Stage 9 'export' step to trigger the final download modal automatically
  useEffect(() => {
    if (state.pendingCard?.kind === 'export') {
      setShowExportModal(true);
    }
  }, [state.pendingCard]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-[var(--text)] font-sans antialiased">
      {/* 1. Global Workshop Top Bar */}
      <TopBar
        state={state}
        engine={engine}
        currentId={currentScenarioId}
        onSwitch={handleScenarioChange}
        项目名={scenario.meta.项目名}
      />

      {/* 2. Main Workspace Body */}
      <main className="flex flex-1 overflow-hidden relative">
        {!hasStarted ? (
          /* Landing page simulating the file upload parsing step */
          <UploadIntro
            projectName={scenario.meta.项目名}
            onStart={handleStartWorkspace}
          />
        ) : (
          /* Full Dual-Pane Interactive Dashboard */
          <div className="flex flex-1 overflow-hidden w-full">
            {/* Left Pane: Agent Workflow Log Feed */}
            <div className="w-80 md:w-96 shrink-0 h-full overflow-hidden">
              <AgentStream
                state={state}
                engine={engine}
                scenario={scenario}
              />
            </div>

            {/* Right Pane: Dynamic Document Preview Workspace */}
            <DocCanvas
              state={state}
              scenario={scenario}
              engine={engine}
            />
          </div>
        )}

        {/* Sliding corporate materials drawer (stays in memory on right edge) */}
        <MaterialsDrawer
          materials={scenario.materials}
          matched={state.matchedMaterials}
          focus={state.focus}
        />
      </main>

      {/* 3. Re-play & Utility Quick Actions Bar (Visible when started) */}
      {hasStarted && (
        <footer className="h-10 bg-gray-50 border-t border-[var(--border)] px-6 flex items-center justify-between text-[11px] text-[var(--muted)] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              连接节点: Client-Sandbox
            </span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">企业资料底库: 5大基准已建立</span>
          </div>

          <div className="flex items-center gap-3 font-semibold">
            <button
              onClick={() => {
                engine.reset();
                setHasStarted(false);
              }}
              className="text-red-700 hover:text-red-900 transition flex items-center gap-1 cursor-pointer"
            >
              🔄 重新载入文件
            </button>
            <span>|</span>
            <button
              onClick={() => {
                setShowExportModal(true);
              }}
              className="text-[var(--accent)] hover:text-opacity-80 transition flex items-center gap-1 cursor-pointer"
            >
              🏆 终审打包预览
            </button>
          </div>
        </footer>
      )}

      {/* 4. Stage 9 Packager Word Export Dialog */}
      {showExportModal && (
        <ExportDialog
          scenario={scenario}
          onClose={() => setShowExportModal(false)}
          onConfirm={() => {
            setShowExportModal(false);
            engine.confirmCheckpoint();
          }}
        />
      )}
    </div>
  );
}
