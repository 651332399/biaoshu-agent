import type { EngineState } from '../engine/ScenarioEngine';
import { PhaseStepper } from './PhaseStepper';

interface Props {
  state: EngineState;
  项目名: string;
}

export function TopBar({ state, 项目名 }: Props) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-3.5 bg-[var(--surface)] border-b border-[var(--border)] gap-3.5 shadow-sm shrink-0 z-10">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--accent)] tracking-tight">
          <span className="text-lg">◆</span>
          <span className="text-base font-bold">智能标书编写 Agent</span>
          <span className="text-xs bg-[var(--accent-soft)] px-1.5 py-0.5 rounded text-[var(--accent)] font-medium font-mono">Live</span>
        </div>

        <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
          后端实时模式
        </div>

        <span className="text-xs text-[var(--muted)] truncate max-w-xs hidden md:inline" title={项目名}>
          当前项目: {项目名}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <PhaseStepper activeStage={state.activeStage} />
        <div className="h-5 w-px bg-gray-200 hidden sm:block"></div>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
            state.status === 'awaiting'
              ? 'bg-amber-100 text-amber-700'
              : state.status === 'playing'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {state.status === 'awaiting'
            ? '等待人工确认'
            : state.status === 'playing'
            ? '后端执行中…'
            : state.error
            ? '已中断'
            : '就绪'}
        </span>
      </div>
    </header>
  );
}
