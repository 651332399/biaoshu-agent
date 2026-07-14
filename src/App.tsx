import { useState, useEffect } from 'react';
import { useEngine } from './hooks/useEngine';
import { TopBar } from './components/TopBar';
import { GlobalNav, type AppView } from './components/GlobalNav';
import { EditorWorkspace } from './components/editor/EditorWorkspace';
import { MaterialsLibrary } from './components/library/MaterialsLibrary';
import { ProjectsList } from './components/projects/ProjectsList';
import { UploadIntro } from './components/UploadIntro';

export default function App() {
  const { engine, state, scenario } = useEngine();
  const [view, setView] = useState<AppView>('editor');
  const [hasStarted, setHasStarted] = useState(false);

  const handleStartWorkspace = (file: File | string) => {
    if (!(file instanceof File)) return;
    setHasStarted(true);
    setView('editor');
    void engine.startWithFile?.(file);
  };

  const handleOpenProject = (projectId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('project_id', projectId);
    window.history.replaceState({}, '', url);
    setHasStarted(true);
    setView('editor');
    void engine.restoreProject?.(projectId);
  };

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
            <ProjectsList onNew={() => { setHasStarted(false); setView('editor'); }} onOpen={handleOpenProject} />
          ) : !hasStarted ? (
            <UploadIntro onStart={handleStartWorkspace} onOpenProject={handleOpenProject} />
          ) : (
            <EditorWorkspace
              state={state}
              scenario={scenario}
              engine={engine}
              onOpenLibrary={() => setView('library')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
