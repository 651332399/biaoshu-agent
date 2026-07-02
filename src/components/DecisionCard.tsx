import { motion } from 'motion/react';
import type { Step } from '../engine/types';

interface Props {
  card: Step;
  onConfirm: () => void;
  onChoose: (index: number) => void;
}

export function DecisionCard({ card, onConfirm, onChoose }: Props) {
  const isEscalate = card.kind === 'escalate';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-xl border p-4 shadow-md ${
        isEscalate
          ? 'border-[var(--bad)] bg-red-50/50 text-[var(--text)]'
          : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm flex items-center gap-1.5 leading-snug">
          <span>{isEscalate ? '🔴 ' : '⏸ '}</span>
          <span>{isEscalate ? card.escalateTitle : card.checkpointTitle}</span>
        </h4>
        {isEscalate && typeof card.confidence === 'number' && (
          <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-[var(--bad)] shrink-0">
            置信度 {Math.round(card.confidence * 100)}%
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 mb-3.5 leading-relaxed">
        {isEscalate ? card.escalateBody : card.checkpointBody}
      </p>

      {isEscalate ? (
        <div className="flex flex-wrap gap-2">
          {card.options?.map((o, i) => (
            <button
              key={i}
              onClick={() => onChoose(i)}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--bad)] text-white text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition shadow-sm"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition shadow-sm"
        >
          确认继续
        </button>
      )}
    </motion.div>
  );
}
