import { saveAs } from 'file-saver';
import { buildDocx } from '../lib/exportDocx';
import type { Scenario } from '../engine/types';

interface Props {
  scenario: Scenario;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportDialog({ scenario, onClose, onConfirm }: Props) {
  const handleDownload = async () => {
    try {
      const blob = await buildDocx(scenario);
      saveAs(blob, `${scenario.meta.项目名}-投标文件.docx`);
    } catch (e) {
      console.error('Failed to generate docx', e);
      window.alert('生成 Word 失败，请重试');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-lg p-6 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-gray-800">
            <span className="text-xl">🏆</span>
            <h3 className="font-bold text-base font-sans">
              ⑨ 智能标书最终终审与打包导出
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto space-y-4 mb-5 pr-1">
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            AI 标书编写 Agent 已顺利跑通三幕九阶段流水线！投标文件已按招标公告规范完成逆向工程装配。以下为自动生成的标书卷册结构大纲预览：
          </p>

          <ul className="space-y-3" role="list">
            {scenario.volumes.map((v) => (
              <li
                key={v.id}
                className={`border rounded-xl p-3.5 shadow-3xs relative transition-all ${
                  v.单独密封
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-gray-200 bg-gray-50/30'
                }`}
              >
                <div className="flex items-start gap-2 justify-between">
                  <span className="font-semibold text-xs md:text-sm text-gray-800 leading-snug">
                    📕 {v.名称}
                  </span>
                  {v.单独密封 && (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.2 rounded uppercase tracking-wider shrink-0 scale-90 origin-right">
                      ★ 须单独密封
                    </span>
                  )}
                </div>

                <ul className="pl-6 mt-2 text-xs text-[var(--muted)] space-y-1 border-l border-gray-200/80 ml-2">
                  {v.chapters.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span>· {c.标题}</span>
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                        ({c.类型})
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2.5 shrink-0 pt-3 border-t border-gray-100">
          <button
            onClick={handleDownload}
            className="px-4.5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-opacity-90 active:scale-95 transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>💾</span> 下载完整 Word (.docx)
          </button>
          <button
            onClick={onConfirm}
            className="px-4.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition shadow-2xs cursor-pointer"
          >
            完成终审
          </button>
        </div>
      </div>
    </div>
  );
}
