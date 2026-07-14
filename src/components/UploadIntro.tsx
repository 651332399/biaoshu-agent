import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RECENT_PROJECTS, RecentProjectRow } from './projects/ProjectsList';

interface Props {
  onStart: (file: File | string) => void;
  onOpenProject?: (id: string) => void;
}

export function UploadIntro({ onStart, onOpenProject }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSupportedFile = (file: File) => /\.(pdf|doc|docx)$/i.test(file.name);

  const startScanning = (file: File | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    setSelectedFile(fileName);
    setIsParsing(true);
    setParseProgress(0);

    if (file instanceof File) {
      setParseProgress(15);
      onStart(file);
      return;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!isSupportedFile(file)) {
        setToast('仅支持 PDF / DOC / DOCX 格式的招标文件');
        return;
      }
      setToast(null);
      startScanning(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!isSupportedFile(file)) {
        setToast('仅支持 PDF / DOC / DOCX 格式的招标文件');
        e.target.value = '';
        return;
      }
      setToast(null);
      startScanning(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // input.click() 派发的 click 事件会冒泡回外层 div,若外层 onClick 也调用
  // triggerFileSelect,会再次触发 .click() 形成死循环(表现为文件选择框
  // 点取消/关闭后又立刻重新弹出,像"关不掉")。这里挡掉冒泡上来的那次。
  const handleZoneClick = (e: React.MouseEvent) => {
    if (e.target === fileInputRef.current) return;
    triggerFileSelect();
  };

  const quickStart = () => {
    triggerFileSelect();
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center p-6 md:p-10 bg-[var(--canvas)] gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[var(--surface)] rounded-2xl shadow-lg border border-[var(--border)] p-8 max-w-xl w-full text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-2xl shadow-inner">
            📁
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 font-sans tracking-tight">
          智能标书编写 Agent 工作台
        </h1>
        <p className="text-xs md:text-sm text-[var(--muted)] mb-8 leading-relaxed max-w-md mx-auto">
          请上传招标文件（支持 PDF / DOC / DOCX / 扫描件 OCR），后端将自动解析、映射并生成投标响应文件与自检报告。
        </p>

        {toast && (
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-start justify-between gap-3 text-left">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-amber-400 hover:text-amber-600 shrink-0">✕</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isParsing ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handleZoneClick}
                className={`border-2 border-dashed rounded-2xl p-8 md:p-10 cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] scale-102'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/octet-stream"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="text-4xl block mb-3 animate-bounce">📤</span>
                <p className="text-sm font-semibold text-gray-700 mb-1 leading-snug">
                  拖拽招标文件到此处，或点击浏览文件
                </p>
                <p className="text-xs text-gray-400">
                  支持真实 PDF / Word 招标文件或扫描版文件
                </p>
              </div>

              <div className="h-px bg-gray-200 relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Or
                </span>
              </div>

              <button
                type="button"
                onClick={quickStart}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition active:scale-95 shadow-sm"
              >
                选择本地真实招标文件并接入后端
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="parsing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="border border-blue-100 bg-blue-50/30 rounded-2xl p-8 flex flex-col items-center"
            >
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin"></div>
              </div>

              <h3 className="font-bold text-sm text-gray-800 mb-1 leading-snug">
                AI 正在解构版面并提取关键控制红线...
              </h3>
              <p className="text-xs text-gray-500 mb-5 truncate max-w-xs font-mono">
                正在解析: {selectedFile}
              </p>

              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2 shadow-inner">
                <div
                  className="bg-[var(--accent)] h-full transition-all duration-100 ease-out"
                  style={{ width: `${parseProgress}%` }}
                ></div>
              </div>
              <span className="text-xs font-bold text-[var(--accent)] font-mono">
                {parseProgress}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isParsing && (
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-[var(--accent-soft)] border border-blue-100 px-4 py-3 text-left">
            <span className="text-base shrink-0">🗄️</span>
            <p className="text-[11px] leading-relaxed text-gray-600">
              编写将自动调用<b className="text-[var(--accent)]">企业资料库</b>(5 大底座)匹配资质、人员、业绩与模板。可先到「资料库」菜单补齐资料。
            </p>
          </div>
        )}
      </motion.div>

      {!isParsing && (
        <div className="w-full max-w-xl">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2.5 px-1">最近项目</h2>
          <div className="space-y-2.5">
            {RECENT_PROJECTS.map((p) => (
              <RecentProjectRow key={p.id} project={p} onOpen={onOpenProject} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
