import { Check } from 'lucide-react';

export const STAGES = [
  { n: 1, 名: '解析' },
  { n: 2, 名: '策略' },
  { n: 3, 名: '搭结构' },
  { n: 4, 名: '映射' },
  { n: 5, 名: '匹配' },
  { n: 6, 名: '生成' },
  { n: 7, 名: '报价' },
  { n: 8, 名: '自检' },
  { n: 9, 名: '导出' },
];

interface Props {
  activeStage: number;
}

export function PhaseStepper({ activeStage }: Props) {
  return (
    <ol className="flex items-center gap-1.5 md:gap-2 text-xs overflow-x-auto py-1" role="list">
      {STAGES.map((s) => {
        const isDone = s.n < activeStage;
        const isActive = s.n === activeStage;
        return (
          <li
            key={s.n}
            data-active={isActive}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors shrink-0 ${
              isActive
                ? 'bg-[var(--zy-blue)] text-white font-bold'
                : isDone
                ? 'bg-[var(--zy-blue-bg)] text-[var(--zy-blue)] font-bold'
                : 'bg-[var(--zy-bg)] text-[var(--zy-muted)]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                isActive
                  ? 'bg-white text-[var(--zy-blue)]'
                  : isDone
                  ? 'bg-[var(--zy-blue)] text-white'
                  : 'bg-[var(--zy-input)] text-[var(--zy-text-2)]'
              }`}
            >
              {isDone ? <Check aria-hidden="true" size={10} strokeWidth={3} /> : s.n}
            </span>
            <span>{s.名}</span>
          </li>
        );
      })}
    </ol>
  );
}
