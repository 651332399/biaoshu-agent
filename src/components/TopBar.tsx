import type { EngineState, ScenarioEngine } from '../engine/ScenarioEngine';
import { PhaseStepper } from './PhaseStepper';
import { PlaybackControls } from './PlaybackControls';

interface Props {
  state: EngineState;
  engine: ScenarioEngine;
  currentId: 'kqyy' | 'yy922';
  onSwitch: (id: 'kqyy' | 'yy922') => void;
  项目名: string;
}

export function TopBar({ state, engine, currentId, onSwitch, 项目名 }: Props) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-3.5 bg-[var(--surface)] border-b border-[var(--border)] gap-3.5 shadow-sm shrink-0 z-10">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--accent)] tracking-tight">
          <span className="text-lg">◆</span>
          <span className="text-base font-bold">智能标书编写 Agent</span>
          <span className="text-xs bg-[var(--accent-soft)] px-1.5 py-0.5 rounded text-[var(--accent)] font-medium font-mono">Demo</span>
        </div>

        <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

        <select
          aria-label="项目切换"
          value={currentId}
          onChange={(e) => onSwitch(e.target.value as 'kqyy' | 'yy922')}
          className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-white text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
        >
          <option value="kqyy">北京口腔医院 · 综合评分法</option>
          <option value="yy922">军队 922 医院 · 经评审最低价法</option>
        </select>

        <span className="text-xs text-[var(--muted)] truncate max-w-xs hidden md:inline" title={项目名}>
          当前项目: {项目名}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <PhaseStepper activeStage={state.activeStage} />
        <div className="h-5 w-px bg-gray-200 hidden sm:block"></div>
        <PlaybackControls
          status={state.status}
          speed={state.speed}
          onPlay={() => engine.play()}
          onPause={() => engine.pause()}
          onStep={() => engine.stepOnce()}
          onSpeed={(x) => engine.setSpeed(x)}
        />
      </div>
    </header>
  );
}
