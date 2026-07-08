import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { buildDocx } from '../lib/exportDocx';
import type { Scenario, Volume } from '../engine/demo/types';

interface Props {
  scenario: Scenario;
  serverDocxUrl?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const CHECKLIST_ITEMS = [
  { id: 'format', label: '格式合规自检已通过' },
  { id: 'deviation', label: '偏离表已核对' },
  { id: 'materials', label: '资料库缺失项已清零' },
  { id: 'seal', label: '密封/签章要求已逐册确认' },
] as const;

/**
 * 规则化文件命名占位：真实项目应由后端 naming_pattern 字段驱动
 * （例如"{序号}-{项目名}-{卷册名}-{版本}.docx"），此处仅用于终审预览。
 */
function buildFileName(scenario: Scenario, volume: Volume, index: number): string {
  return `${index + 1}-${scenario.meta.项目名}-${volume.名称}.docx`;
}

export function ExportDialog({ scenario, serverDocxUrl, onClose, onConfirm }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allChecked = useMemo(
    () => CHECKLIST_ITEMS.every((item) => checked[item.id]),
    [checked],
  );

  const toggleChecked = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownload = async () => {
    try {
      if (serverDocxUrl) {
        window.open(serverDocxUrl, '_blank', 'noopener,noreferrer');
        return;
      }
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
        className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-3xl p-6 overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn border border-gray-100"
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

        <div className="flex-1 overflow-auto space-y-5 mb-5 pr-1">
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            AI 标书编写 Agent 已顺利跑通三幕九阶段流水线！投标文件已按招标公告规范完成逆向工程装配。以下为自动生成的分册方案、索引表与导出前终检清单：
          </p>

          <section>
            <h4 className="text-xs font-bold text-gray-600 mb-2 font-sans">分册方案</h4>
            <ul className="space-y-3" role="list">
              {scenario.volumes.map((v, index) => (
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

                  <div className="mt-1.5 text-[10px] text-gray-400 font-mono">
                    文件命名：{buildFileName(scenario, v, index)}
                  </div>

                  {v.单独密封 && (
                    <div className="mt-2 text-[10px] text-amber-800 bg-amber-100/60 border border-amber-200 rounded px-2 py-1">
                      需单独签章密封
                    </div>
                  )}

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
          </section>

          <section>
            <h4 className="text-xs font-bold text-gray-600 mb-2 font-sans">索引表（章节 → 页码）</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">章节</th>
                    <th className="text-right px-3 py-1.5 font-medium">页码</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.volumes.flatMap((v) => v.chapters).map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-gray-700">{c.标题}</td>
                      {/* 页码待接后端排版结果，此处为占位符，非真实数据 */}
                      <td className="px-3 py-1.5 text-right text-gray-400 font-mono">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold text-gray-600 mb-2 font-sans">导出前终检清单</h4>
            <ul className="space-y-1.5">
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item.id}>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label={item.label}
                      checked={Boolean(checked[item.id])}
                      onChange={() => toggleChecked(item.id)}
                      className="cursor-pointer"
                    />
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2.5 shrink-0 pt-3 border-t border-gray-100">
          <button
            onClick={handleDownload}
            className="px-4.5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-opacity-90 active:scale-95 transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>💾</span> {serverDocxUrl?.endsWith('.zip') ? '下载分册打包 ZIP' : serverDocxUrl ? '下载服务端 Word (.docx)' : '下载草稿 Word (.docx)'}
          </button>
          <button
            onClick={onConfirm}
            disabled={!allChecked}
            className="px-4.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            完成终审
          </button>
        </div>
      </div>
    </div>
  );
}
