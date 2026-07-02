import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Material, MaterialCategory, Focus } from '../engine/types';

interface Props {
  materials: Material[];
  matched: string[];
  focus: Focus | null;
}

export const CATEGORY_LABEL: Record<MaterialCategory, string> = {
  qual: '📜 企业核心资质库',
  people: '👤 专业团队人员库',
  device: '🔬 测量仪器与标准器库',
  record: '🏆 历史同类业绩库',
  template: '📝 标书专项模板库',
};

const CATEGORIES: MaterialCategory[] = ['qual', 'people', 'device', 'record', 'template'];

export function MaterialsDrawer({ materials, matched, focus }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const itemsRef = useRef<Record<string, HTMLLIElement | null>>({});

  // Auto-open drawer and scroll to targeted material when focused
  useEffect(() => {
    if (focus?.drawer) {
      setIsOpen(true);
    }
    if (focus?.material) {
      const el = itemsRef.current[focus.material];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [focus?.drawer, focus?.material]);

  return (
    <>
      {/* Floating pull-out toggle button on right side */}
      <button
        aria-label="资料库"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[var(--accent)] hover:bg-opacity-90 text-white text-xs px-2 py-4.5 rounded-l-xl shadow-lg hover:shadow-xl transition-all active:scale-95 z-35 flex items-center gap-1 cursor-pointer font-bold select-none [writing-mode:vertical-rl]"
      >
        <span>📁</span> 公司资料库
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: 340 }}
            animate={{ x: 0 }}
            exit={{ x: 340 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed right-0 top-0 h-full w-80 md:w-88 bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col z-35"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-gray-800">
                <span className="text-base">🗄️</span>
                <h3 className="font-bold text-sm font-sans">迈创企业资质库 (5 大底座)</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-5 space-y-5">
              {CATEGORIES.map((cat) => {
                const catMaterials = materials.filter((m) => m.category === cat);
                if (catMaterials.length === 0) return null;

                const isCatFocused = focus?.drawer === cat;

                return (
                  <div
                    key={cat}
                    className={`rounded-xl transition-all ${
                      isCatFocused
                        ? 'bg-blue-50/20 p-2.5 ring-1 ring-blue-100'
                        : 'p-0.5'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-gray-500 mb-2 leading-none">
                      {CATEGORY_LABEL[cat]}
                    </h4>

                    <ul className="space-y-2" role="list">
                      {catMaterials.map((m) => {
                        const isHit = focus?.material === m.id;
                        const isMatched = matched.includes(m.id);

                        return (
                          <motion.li
                            key={m.id}
                            ref={(el) => {
                              itemsRef.current[m.id] = el;
                            }}
                            data-material={m.id}
                            data-hit={isHit}
                            animate={
                              isHit
                                ? {
                                    scale: [1, 1.03, 1],
                                    borderColor: 'var(--accent)',
                                    backgroundColor: 'var(--accent-soft)',
                                  }
                                : { scale: 1 }
                            }
                            transition={{ duration: 0.3 }}
                            className={`border rounded-xl p-3 shadow-3xs flex flex-col gap-1 transition-all ${
                              isHit
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span
                                className={`text-xs font-semibold leading-relaxed ${
                                  isHit ? 'text-[var(--accent)]' : 'text-gray-700'
                                }`}
                              >
                                {m.名称}
                              </span>
                              {isMatched && (
                                <span className="text-xs font-bold text-emerald-600 shrink-0 select-none">
                                  ✓ 选中
                                </span>
                              )}
                            </div>

                            {m.口径警告 && (
                              <div className="mt-1 bg-amber-50 border border-amber-100 text-[10px] text-amber-800 rounded px-2 py-1 leading-normal font-medium flex gap-1 items-start">
                                <span className="shrink-0 text-xs mt-0.2">⚠️</span>
                                <span>{m.口径警告}</span>
                              </div>
                            )}
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
