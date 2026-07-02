import type { PlaybackStatus } from '../engine/ScenarioEngine';

interface Props {
  status: PlaybackStatus;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onSpeed: (x: number) => void;
}

export function PlaybackControls({ status, speed, onPlay, onPause, onStep, onSpeed }: Props) {
  const isPlaying = status === 'playing';
  const isAwaiting = status === 'awaiting';

  return (
    <div className="flex items-center gap-2 shrink-0">
      {isPlaying ? (
        <button
          aria-label="暂停"
          onClick={onPause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-sm font-medium hover:bg-gray-50 transition active:scale-95 shadow-sm"
        >
          <span>⏸</span> 暂停
        </button>
      ) : (
        <button
          aria-label="播放"
          onClick={onPlay}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-opacity-90 transition active:scale-95 shadow-sm"
        >
          <span>▶</span> 播放
        </button>
      )}

      <button
        aria-label="单步"
        onClick={onStep}
        disabled={isAwaiting || isPlaying}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition active:scale-95 shadow-sm"
      >
        <span>⏭</span> 单步
      </button>

      <div className="flex items-center gap-1 text-xs border border-[var(--border)] bg-white rounded-lg px-2 py-1.5 shadow-sm shrink-0">
        <span className="text-[var(--muted)]">倍速:</span>
        <select
          aria-label="倍速"
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          className="font-medium bg-transparent focus:outline-none cursor-pointer text-gray-700"
        >
          {[0.5, 1, 2, 4].map((x) => (
            <option key={x} value={x}>
              {x}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
