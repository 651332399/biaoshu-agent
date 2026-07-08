import { useState, useEffect } from 'react';
import { useEngine } from './hooks/useEngine';
import { makeLiveScenario } from './engine/sources';
import { TopBar } from './components/TopBar';
import { GlobalNav, type AppView } from './components/GlobalNav';
import { EditorWorkspace } from './components/editor/EditorWorkspace';
import { MaterialsLibrary } from './components/library/MaterialsLibrary';
import { ProjectsList } from './components/projects/ProjectsList';
import { ExportDialog } from './components/ExportDialog';
import { UploadIntro } from './components/UploadIntro';

export default function App() {
  const [liveScenario] = useState(() => makeLiveScenario());
  const scenario = liveScenario;

  const { engine, state } = useEngine();
  const [view, setView] = useState<AppView>('editor');
  const [hasStarted, setHasStarted] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [seenExportCardId, setSeenExportCardId] = useState<string | null>(null);

  const handleStartWorkspace = (file: File | string) => {
    if (!(file instanceof File)) return;
    setHasStarted(true);
    setView('editor');
    void engine.startWithFile?.(file);
  };

  // Stage 9 'export' step auto-opens the packager dialog
  useEffect(() => {
    if (state.pendingCard?.kind === 'export' && state.pendingCard.id !== seenExportCardId) {
      setShowExportModal(true);
      setSeenExportCardId(state.pendingCard.id);
    }
  }, [state.pendingCard, seenExportCardId]);

  // Restore an in-flight project from ?project_id
  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get('project_id');
    if (!projectId || !engine.restoreProject) return;
    setHasStarted(true);
    setView('editor');
    void engine.restoreProject(projectId);
  }, [engine]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas)] text-[var(--text)] font-sans antialiased">
      <GlobalNav view={view} onNavigate={setView} />

      <div className="flex flex-col flex-1 overflow-hidden">
        {view === 'editor' && hasStarted && (
          <TopBar state={state} 项目名={scenario.meta.项目名} />
        )}

        <main className="flex flex-1 overflow-hidden">
          {view === 'library' ? (
            <MaterialsLibrary materials={scenario.materials} matched={state.matchedMaterials} />
          ) : view === 'projects' ? (
            <ProjectsList onNew={() => { setHasStarted(false); setView('editor'); }} onOpen={() => setView('editor')} />
          ) : !hasStarted ? (
            <UploadIntro onStart={handleStartWorkspace} onOpenProject={() => setView('editor')} />
          ) : (
            <EditorWorkspace
              state={state}
              scenario={scenario}
              engine={engine}
              onOpenLibrary={() => setView('library')}
              onExport={() => setShowExportModal(true)}
            />
          )}
        </main>
      </div>

      {showExportModal && (
        <ExportDialog
          scenario={scenario}
          serverDocxUrl={state.serverPackageUrl || state.serverDocxUrl}
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
