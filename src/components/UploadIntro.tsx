import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onStart: (fileName: string) => void;
  projectName: string;
}

export function UploadIntro({ onStart, projectName }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScanning = (fileName: string) => {
    setSelectedFile(fileName);
    setIsParsing(true);
    setParseProgress(0);

    // Simulate AI parsing progress
    let currentProgress = 0;
    const interval = window.setInterval(() => {
      currentProgress += 5;
      setParseProgress(currentProgress);
      if (currentProgress >= 100) {
        window.clearInterval(interval);
        setTimeout(() => {
          onStart(fileName);
        }, 300);
      }
    }, 80);
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
      startScanning(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      startScanning(file.name);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const quickStart = () => {
    startScanning(
      projectName.includes('922')
        ? '922医院计量检测采购文件_RFQ-Final.pdf'
        : '北京口腔医院医用设备计量检测公告_v2.docx'
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-100 min-h-[500px]">
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
          请上传招标文件（支持 PDF/Docx/Scanner-OCR），AI 将自动实施逆向工程，映射并完成整套投标响应文件的自主起草与自检。
        </p>

        <AnimatePresence mode="wait">
          {!isParsing ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-8 md:p-10 cursor-pointer transition-all ${
                isDragActive
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] scale-102'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-4xl block mb-3 animate-bounce">📤</span>
              <p className="text-sm font-semibold text-gray-700 mb-1 leading-snug">
                拖拽招标文件到此处，或点击浏览文件
              </p>
              <p className="text-xs text-gray-400">
                支持拖入任何 PDF / Word 文档或扫描版资质底件
              </p>

              <div className="h-px bg-gray-200 my-5 relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Or
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  quickStart();
                }}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition active:scale-95 shadow-sm"
              >
                直接加载预置的：{projectName.split(' ')[0]} 招标文件
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
      </motion.div>
    </div>
  );
}
