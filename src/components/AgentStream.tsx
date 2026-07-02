import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, FileText, Sparkles, X, Image, Table, ShieldCheck, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, UploadCloud, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { EngineState, ScenarioEngine } from '../engine/ScenarioEngine';
import type { Scenario } from '../engine/types';
import { DecisionCard } from './DecisionCard';
import { STAGES } from './PhaseStepper';

interface Props {
  state: EngineState;
  engine: ScenarioEngine;
  scenario: Scenario;
}

interface SimulatedFile {
  name: string;
  type: string;
  icon: any;
  desc: string;
}

const MOCK_FILES: SimulatedFile[] = [
  { name: '迈创精准_CMA计量检测资质证书.pdf', type: 'PDF 文档', icon: FileText, desc: '包含 200 余项牙科、高频电刀等精密器械计量资质' },
  { name: '项目组核心专家近3个月在保社保证明截图.png', type: '图片/扫描件', icon: Image, desc: '吴建刚、武文君等在册专家近3个月正常对公缴纳单据' },
  { name: '分项报价精算对标试算表.xlsx', type: '表格文件', icon: Table, desc: '多参数监护仪与放射类设备分项精算报价勾稽底单' },
  { name: '2026年上半年企业对公电子完税缴纳凭证截图.jpg', type: '图片/扫描件', icon: Image, desc: '海淀区税务局开具的正常电子完税缴存回账截图证明' }
];

export function AgentStream({ state, engine, scenario }: Props) {
  const containerRef = useRef<HTMLOListElement>(null);
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SimulatedFile[]>([]);
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  // Auto-scroll to the bottom of the log list when new logs or states occur
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [state.logs, state.status]);

  const handleSend = () => {
    const textToSend = inputText.trim();
    if (!textToSend && selectedFiles.length === 0) return;

    // Call ScenarioEngine with custom input
    engine.addCustomUserMessage(
      textToSend || `处理已上传的 ${selectedFiles.length} 个多模态附件`,
      selectedFiles.map(f => ({ name: f.name, type: f.type }))
    );

    // Clear state
    setInputText('');
    setSelectedFiles([]);
    setShowFileDropdown(false);
  };

  const handleQuickAction = (text: string, filesToAttach: SimulatedFile[] = []) => {
    setInputText(text);
    if (filesToAttach.length > 0) {
      setSelectedFiles(filesToAttach);
    }
  };

  const toggleAttachFile = (file: SimulatedFile) => {
    if (selectedFiles.some(f => f.name === file.name)) {
      setSelectedFiles(selectedFiles.filter(f => f.name !== file.name));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
    setShowFileDropdown(false);
  };

  return (
    <section className="flex flex-col border-r border-[var(--border)] bg-[var(--surface)] h-full overflow-hidden" id="agent-stream-panel">
      {/* Panel Header */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-gray-50 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <span>🤖</span>
          <span>Agent 智能对话 & 工作流控制台</span>
        </h2>
        <span className="text-xs font-mono font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
          STAGES {state.activeStage || 0} / 9
        </span>
      </div>

      {/* Steps and Logs Area */}
      <ol
        ref={containerRef}
        role="list"
        className="flex-1 overflow-auto p-5 space-y-4 scroll-smooth min-h-0 bg-gray-50/30"
      >
        <AnimatePresence initial={false}>
          {state.logs.map((l, idx) => {
            const stageName = STAGES[l.stage - 1]?.名 ?? '未知';
            const isUserMsg = l.text.startsWith('👤 用户指示:');
            const isAgentDynamicReply = l.text.startsWith('🎯') || l.text.startsWith('💰') || l.text.startsWith('✍️') || l.text.startsWith('🤖');

            return (
              <motion.li
                key={l.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex gap-3 text-sm items-start"
              >
                <div className="flex flex-col items-center shrink-0 mt-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                    isUserMsg
                      ? 'bg-amber-100 border border-amber-300 text-amber-800'
                      : isAgentDynamicReply
                      ? 'bg-blue-100 border border-blue-300 text-blue-800'
                      : 'bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent)]'
                  }`}>
                    {isUserMsg ? '👤' : isAgentDynamicReply ? '💡' : l.stage}
                  </div>
                  <div className="w-0.5 h-full min-h-[16px] bg-gray-200/60 mt-1"></div>
                </div>

                <div className={`flex-1 border rounded-xl p-3.5 shadow-2xs transition-all ${
                  isUserMsg
                    ? 'bg-amber-50/80 border-amber-200/60'
                    : isAgentDynamicReply
                    ? 'bg-blue-50/60 border-blue-100'
                    : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isUserMsg
                        ? 'bg-amber-100 text-amber-800'
                        : isAgentDynamicReply
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    }`}>
                      {isUserMsg ? '补充指示' : isAgentDynamicReply ? '优先响应' : stageName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {isUserMsg ? 'User Input' : isAgentDynamicReply ? 'Real-time Override' : `Step #${idx + 1}`}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-line text-xs md:text-sm">
                    {l.text}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {state.status === 'playing' && (
          <li className="flex items-center gap-2 text-xs text-[var(--muted)] pl-8 pt-1" id="agent-processing-indicator">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]"></span>
            </span>
            <span className="font-medium animate-pulse font-sans text-blue-600">AI 正在自主研判、多模态解析并优先合规组装材料中...</span>
          </li>
        )}

        {state.status === 'awaiting' && state.pendingCard && (
          <li className="pl-8 pt-1" id="agent-decision-card-container">
            {state.pendingCard.kind === 'supplement' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100 rounded-bl-full -z-10 opacity-30 flex items-start justify-end p-2" />

                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
                  <h3 className="font-bold text-amber-900 text-sm">{state.pendingCard.supplementTitle}</h3>
                </div>

                <p className="text-xs text-amber-800 leading-relaxed font-sans">
                  {state.pendingCard.supplementBody}
                </p>

                <div className="bg-white/80 border border-amber-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <UploadCloud className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-800 truncate">
                        {state.pendingCard.supplementType === 'social' && '项目组核心专家近3个月在保社保证明截图.png'}
                        {state.pendingCard.supplementType === 'pricing' && '分项报价精算对标试算表.xlsx'}
                        {state.pendingCard.supplementType === 'tax' && '2026年上半年企业对公电子完税缴纳凭证截图.jpg'}
                      </p>
                      <p className="text-[9px] text-gray-400">系统发现本地缺失该文件要件，需多模态补充</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (state.pendingCard?.supplementType) {
                        engine.provideSupplement(state.pendingCard.supplementType);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition shadow-sm shrink-0 hover:scale-[1.02] active:scale-[0.98] text-center"
                  >
                    🚀 一键补充资料并让 AI 解析
                  </button>
                </div>
              </motion.div>
            ) : (
              <DecisionCard
                card={state.pendingCard}
                onConfirm={() => engine.confirmCheckpoint()}
                onChoose={(i) => engine.chooseOption(i)}
              />
            )}
          </li>
        )}
      </ol>

      {/* Interactive Command & Simulated Multimodal Area */}
      <div className="p-4 border-t border-[var(--border)] bg-white shrink-0 space-y-3">
        {/* Selected Attachments Badge Bar */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-100 rounded-xl">
            {selectedFiles.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium shadow-2xs">
                  <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[160px]">{f.name}</span>
                  <button
                    onClick={() => setSelectedFiles(selectedFiles.filter(item => item.name !== f.name))}
                    className="text-gray-400 hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Message Input Bar */}
        <div className="relative flex items-center gap-2">
          {/* Paperclip upload simulation trigger button */}
          <div className="relative">
            <button
              onClick={() => setShowFileDropdown(!showFileDropdown)}
              type="button"
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                showFileDropdown || selectedFiles.length > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title="模拟上传多模态资料 (资质、社保、报价底单)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Simulated file choices dropdown */}
            <AnimatePresence>
              {showFileDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFileDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-12 left-0 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg p-3 z-50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">选择模拟上传的标书证明附件</span>
                      <span className="text-[10px] text-blue-600 font-medium">支持多模态解析</span>
                    </div>
                    <div className="space-y-1">
                      {MOCK_FILES.map((file) => {
                        const Icon = file.icon;
                        const isAttached = selectedFiles.some(f => f.name === file.name);
                        return (
                          <button
                            key={file.name}
                            onClick={() => toggleAttachFile(file)}
                            className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer text-xs ${
                              isAttached
                                ? 'bg-blue-50/80 border border-blue-100 text-blue-900'
                                : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                            }`}
                          >
                            <div className="mt-0.5 p-1 bg-gray-100 rounded-lg text-gray-600 shrink-0">
                              <Icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold truncate text-[11px] text-gray-900">{file.name}</p>
                                {isAttached && (
                                  <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.1 rounded-full font-bold">已选</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{file.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-gray-400 bg-gray-50 p-2 rounded-xl text-center leading-relaxed">
                      💡 点击选择文件载入发送框，点击「发送」即可触发 Agent 进行多模态深度识别与自适应生成。
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea Input */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              placeholder="向 AI 补充说明（如：'用北京口腔报价章节' 或 上传文件）..."
              className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-sans text-xs md:text-sm text-gray-800"
            />
            {inputText && (
              <button
                onClick={() => setInputText('')}
                className="absolute right-9 p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() && selectedFiles.length === 0}
              className={`absolute right-1.5 p-2 rounded-lg transition-all ${
                inputText.trim() || selectedFiles.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
