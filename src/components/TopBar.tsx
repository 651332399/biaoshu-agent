import { Sparkles } from 'lucide-react';
import type { EngineState } from '../engine/ScenarioEngine';
import { PhaseStepper } from './PhaseStepper';

interface Props {
  state: EngineState;
  项目名: string;
}

const STATUS_CHIP = {
  awaiting: 'bg-[var(--zy-amber-bg)] text-[var(--zy-amber)]',
  playing: 'bg-[var(--zy-blue-bg)] text-[var(--zy-blue)]',
  idle: 'bg-[var(--zy-grey-bg)] text-[var(--zy-grey)]',
} as const;

export function TopBar({ state, 项目名 }: Props) {
  const chip = state.status === 'awaiting' ? 'awaiting' : state.status === 'playing' ? 'playing' : 'idle';
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-3.5 bg-[var(--surface)] border-b border-[var(--zy-line)] gap-3.5 shrink-0 z-10">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[var(--zy-text)]">
          <Sparkles aria-hidden="true" size={18} strokeWidth={1.75} className="text-[var(--zy-blue)]" />
          <span className="text-[15px] font-black">智能标书编写 Agent</span>
          <span className="rounded-md bg-[var(--zy-blue-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--zy-blue)] font-mono">Live</span>
        </div>

        <div className="h-4 w-px bg-[var(--zy-line)] hidden sm:block"></div>

        <div className="rounded-full border border-[var(--zy-input)] bg-white px-3 py-1 text-xs font-medium text-[var(--zy-text-2)]">
          后端实时模式
        </div>

        <span className="text-xs text-[var(--zy-muted)] truncate max-w-xs hidden md:inline" title={项目名}>
          当前项目: {项目名}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <PhaseStepper activeStage={state.activeStage} />
        <div className="h-5 w-px bg-[var(--zy-line)] hidden sm:block"></div>
        <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_CHIP[chip]}`}>
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
