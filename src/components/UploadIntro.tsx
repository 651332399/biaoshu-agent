import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudUpload, Database, FolderOpen, X } from 'lucide-react';
import { RecentProjects } from './projects/ProjectsList';

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
        className="bg-[var(--surface)] rounded-2xl border border-[var(--zy-line)] p-8 max-w-xl w-full text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--zy-blue-bg)] text-[var(--zy-blue)] flex items-center justify-center">
            <FolderOpen aria-hidden="true" size={26} strokeWidth={1.75} />
          </div>
        </div>

        <h1 className="text-[22px] font-black text-[var(--zy-text)] mb-2">
          智能标书编写 Agent 工作台
        </h1>
        <p className="text-xs md:text-sm text-[var(--muted)] mb-8 leading-relaxed max-w-md mx-auto">
          请上传招标文件（支持 PDF / DOC / DOCX / 扫描件 OCR），后端将自动解析、映射并生成投标响应文件与自检报告。
        </p>

        {toast && (
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-start justify-between gap-3 text-left">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} aria-label="关闭提示" className="text-amber-400 hover:text-amber-600 shrink-0">
              <X aria-hidden="true" size={14} />
            </button>
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
                    ? 'border-[var(--zy-blue)] bg-[var(--zy-blue-bg)]'
                    : 'border-[var(--zy-input)] hover:border-[var(--zy-muted-2)] hover:bg-[var(--zy-bg)]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/octet-stream"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <CloudUpload aria-hidden="true" size={36} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--zy-blue)]" />
                <p className="text-sm font-semibold text-gray-700 mb-1 leading-snug">
                  拖拽招标文件到此处，或点击浏览文件
                </p>
                <p className="text-xs text-gray-400">
                  支持真实 PDF / Word 招标文件或扫描版文件
                </p>
              </div>

              <div className="h-px bg-gray-200 relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] px-3 text-[11px] text-[var(--zy-muted)]">
                  或
                </span>
              </div>

              <button
                type="button"
                onClick={quickStart}
                className="w-full py-2.5 rounded-lg bg-[var(--zy-blue)] text-white text-[13px] font-bold hover:bg-[var(--zy-blue-dark)] transition active:scale-[0.98]"
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
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-[var(--zy-bg)] px-4 py-3 text-left">
            <Database aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--zy-blue)]" />
            <p className="text-[11.5px] leading-relaxed text-[var(--zy-text-2)]">
              编写将自动调用<b className="text-[var(--accent)]">企业资料库</b>(5 大底座)匹配资质、人员、业绩与模板。可先到「资料库」菜单补齐资料。
            </p>
          </div>
        )}
      </motion.div>

      {!isParsing && (
        <div className="w-full max-w-xl">
          <h2 className="text-[13.5px] font-black text-[var(--zy-text)] mb-2.5 px-1">最近项目</h2>
          <RecentProjects onOpen={onOpenProject} />
        </div>
      )}
    </div>
  );
}
