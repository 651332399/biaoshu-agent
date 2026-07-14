import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Requirement, Volume, Focus } from '../engine/demo/types';
import { ScenarioEngine } from '../engine/ScenarioEngine';
import type { WorkspaceEngine } from '../engine/sources';

interface Props {
  volumes: (Volume & { fileName?: string })[];
  requirements?: Requirement[];
  grownVolumes: string[];
  focus: Focus | null;
  engine: ScenarioEngine | WorkspaceEngine;
}

export function DocTree({ volumes, requirements = [], grownVolumes, focus, engine }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const visibleVolumes = volumes.filter((v) => grownVolumes.includes(v.id));

  const handleChapterClick = (chapterId: string, title: string) => {
    // 1. Instantly trigger the engine to pre-generate/reveal this chapter's blocks
    engine.revealChapterManually(chapterId);

    // 2. Wait for a short paint frame so the DOM nodes are fully rendered by React
    setTimeout(() => {
      const element = document.querySelector(`[data-chapter="${chapterId}"]`) as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.remove('chapter-highlight');
        // Trigger a reflow to restart CSS animation
        void element.offsetWidth;
        element.classList.add('chapter-highlight');
      }
    }, 50);

    // 3. Briefly notify the user that AI has pre-generated this chapter for immediate audit
    setToast(`⚡️ AI 已优先组装《${title}》并加载至画布，您现在可以进行人工审核和修改。`);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleVolumeClick = (volume: Volume) => {
    if (volume.chapters && volume.chapters.length > 0) {
      // 1. Instantly trigger the engine to pre-generate/reveal this volume's chapters
      engine.revealVolumeManually(volume.id);

      const firstChapterId = volume.chapters[0].id;
      // 2. Wait for a short paint frame so the DOM nodes are fully rendered by React
      setTimeout(() => {
        const element = document.querySelector(`[data-chapter="${firstChapterId}"]`) as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.remove('chapter-highlight');
          void element.offsetWidth;
          element.classList.add('chapter-highlight');
        }
      }, 50);

      setToast(`⚡️ AI 已为您优先组装《${volume.名称}》全部分册，您可以上下滑动查看和审计。`);
      setTimeout(() => {
        setToast(null);
      }, 4000);
    }
  };

  return (
    <nav className="w-60 shrink-0 border-r border-[var(--border)] p-4 bg-gray-50 h-full overflow-y-auto relative flex flex-col justify-between" aria-label="文件导航">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
          <span>📂</span>
          <span>标书分册结构树</span>
        </div>

        {visibleVolumes.length === 0 ? (
          <div className="text-center py-8 px-2 border border-dashed border-gray-200 rounded-xl bg-white shadow-2xs">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              正在等待策略分析研判...<br />确定结构后此处长出大纲文件树
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleVolumes.map((v) => {
              const isVolFocused = focus?.volume === v.id;
              return (
                <div key={v.id} className="group">
                  <div
                    onClick={() => handleVolumeClick(v)}
                    className={`flex items-start gap-1.5 p-2 rounded-lg transition-all cursor-pointer ${
                      isVolFocused
                        ? 'bg-blue-50 text-[var(--accent)] font-semibold ring-1 ring-blue-100'
                        : 'text-gray-800 font-medium hover:bg-gray-100/70 hover:text-gray-950'
                    }`}
                  >
                    <span className="text-sm animate-pulse">📁</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm truncate leading-snug" title={v.名称}>
                        {v.名称}
                      </p>
                      {v.单独密封 && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded uppercase tracking-wider scale-90 origin-left">
                          ★ 独立密封
                        </span>
                      )}
                      {v.fileName && (
                        <p className="mt-0.5 truncate text-[9px] font-mono text-gray-400" title={v.fileName}>
                          {v.fileName}
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="pl-6 mt-1.5 space-y-1.5 border-l border-gray-200 ml-3.5">
                    {v.chapters.map((c) => {
                      const isChapterFocused = focus?.chapter === c.id;
                      return (
                        <li key={c.id}>
                          <div
                            onClick={() => handleChapterClick(c.id, c.标题)}
                            className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-all cursor-pointer ${
                              isChapterFocused
                                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs ring-1 ring-blue-100/50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                          >
                            <span className="truncate flex-1" title={c.标题}>
                              · {c.标题}
                            </span>
                            <span className="text-[9px] bg-gray-200/60 px-1.5 py-0.5 rounded-full text-gray-500 scale-90 shrink-0">
                              {c.类型}
                            </span>
                          </div>
                          {c.maps_to_requirement_ids && c.maps_to_requirement_ids.length > 0 && (
                            <div className="ml-2 mt-1 rounded-md bg-white/70 px-2 py-1 text-[10px] text-gray-500">
                              <div className="font-semibold text-gray-600">
                                映射要求 {c.maps_to_requirement_ids.length} 条
                              </div>
                              {focus?.chapter === c.id && (
                                <ul className="mt-1 space-y-1">
                                  {c.maps_to_requirement_ids.slice(0, 5).map((reqId) => {
                                    const req = requirements.find((item) => item.id === reqId);
                                    return (
                                      <li key={reqId} className={req?.标识 ? 'text-red-700' : ''}>
                                        {req?.标识 ? `${req.标识} ` : ''}
                                        {reqId}
                                        {req ? ` · ${req.文本}` : ''}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Floating Feedback Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-4 p-3 rounded-xl bg-blue-900/95 text-white border border-blue-800 shadow-md text-[11px] leading-relaxed whitespace-pre-line relative z-50 shrink-0"
          >
            <div className="absolute top-1.5 right-1.5">
              <button
                onClick={() => setToast(null)}
                className="text-white/60 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
