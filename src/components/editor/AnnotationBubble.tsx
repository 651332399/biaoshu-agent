import { motion } from 'motion/react';
import type { Step } from '../../engine/demo/types';

interface Props {
  card: Step;
  onChoose: (index: number) => void;
}

/** 正文旁批注气泡:Agent 决策以气泡形式锚定在正文段落右侧,取代流式决策卡。
 *  只处理 escalate(AI 审阅·待决断);checkpoint/export 走 Copilot/弹窗。 */
export function AnnotationBubble({ card, onChoose }: Props) {
  if (card.kind !== 'escalate') return null;
  const options = card.options ?? [];

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="annotation-glow rounded-xl border border-[var(--bad)]/40 bg-red-50/60 p-3.5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--bad)]">
          <span className="text-sm">🤖</span> AI 审阅 · 待决断
        </span>
        {typeof card.confidence === 'number' && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-[var(--bad)]">
            置信度 {Math.round(card.confidence * 100)}%
          </span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-gray-700 mb-3">
        {card.escalateBody}
      </p>

      <div className="flex flex-col gap-1.5">
        {options.map((o, i) => (
          <button
            key={i}
            onClick={() => onChoose(i)}
            className={`w-full px-3 py-1.5 rounded-lg text-[11px] font-semibold transition active:scale-95 ${
              i === 0
                ? 'bg-[var(--bad)] text-white hover:bg-opacity-90 shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </motion.aside>
  );
}
