import type { EngineState } from '../../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../../engine/sources';
import type { Scenario } from '../../engine/demo/types';
import { StructurePanel } from './StructurePanel';
import { DocumentCanvas } from './DocumentCanvas';
import { CopilotPanel } from './CopilotPanel';
import { derivePhase, PHASE_LABEL } from './phase';

interface Props {
  state: EngineState;
  scenario: Scenario;
  engine: WorkspaceEngine;
  onOpenLibrary: () => void;
  onExport: () => void;
}

/** 1c 核心:文档为中心的三栏全屏编辑器。左=结构/分类,中=标书正文纸张,右=Copilot。 */
export function EditorWorkspace({ state, scenario, engine, onOpenLibrary, onExport }: Props) {
  const phase = derivePhase(state);
  const saving = state.status === 'playing';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 编辑器子头 */}
      <div className="h-11 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">📄</span>
          <span className="text-sm font-semibold text-gray-800 truncate">投标文件.docx</span>
          <span className="text-[11px] text-[var(--muted)] truncate hidden md:inline">· {scenario.meta.项目名}</span>
          <span className="ml-2 text-[10px] font-medium text-[var(--muted)] shrink-0">
            {saving ? '● AI 自动保存' : '○ 已保存'} · {PHASE_LABEL[phase]} · 阶段 {state.activeStage || 0}/9
          </span>
        </div>
        <button
          onClick={onExport}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition"
        >
          导出分册 →
        </button>
      </div>

      {/* 三栏 */}
      <div className="flex flex-1 overflow-hidden">
        <StructurePanel state={state} scenario={scenario} engine={engine} phase={phase} />
        <DocumentCanvas state={state} scenario={scenario} engine={engine} phase={phase} onOpenLibrary={onOpenLibrary} />
        <CopilotPanel state={state} scenario={scenario} engine={engine} phase={phase} onOpenLibrary={onOpenLibrary} />
      </div>
    </div>
  );
}
