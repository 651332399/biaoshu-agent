// WPS 任务窗格入口。
//
// 形态锚定 tasks/wps-addon-end-to-end-flow-2026-08-18.md §8.3：**薄加载项**。
// 窗格只做「一键上传 + 只读进度 + 排版执行 + 证据回传」，对话 / 确认点 /
// 要求清单留在浏览器 Copilot 里。不要往这里搬编辑器组件，也不要加任何
// 推进流水线的按钮——确认点是浏览器的事。

import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getRuntime } from '../platform/capabilities';
import type { ClientCapabilities } from '../platform/RuntimeAdapter';
import { getProjectState, runProject, uploadProject } from '../lib/api';
import { setApiBase } from '../lib/apiBase';
import {
  readUploadMemo,
  sha256Hex,
  uploadCurrentDocument,
  writeUploadMemo,
  type UploadOutcome,
} from './uploadCurrentDocument';
import { initialProgress, subscribeProgress, type ProgressState } from './progress';

// 窗格与后端不同源（窗格在 3889），基地址必须显式给。
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://127.0.0.1:8000';
const BROWSER_BASE = (import.meta.env.VITE_BROWSER_BASE as string | undefined) ?? 'http://localhost:3000';

setApiBase(API_BASE);

const PANE_WIDTH_HINT = 360;

const CHECKPOINT_LABELS: Record<number, string> = {
  1: '核对要求清单',
  2: '确认大纲',
  3: '确认生成结果与合规报告',
  4: '确认交付结构',
};

type Phase = 'idle' | 'working' | 'done' | 'error';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12 }}>
      <span style={{ flex: '0 0 92px', color: '#666' }}>{label}</span>
      <span style={{ flex: 1, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function Banner({
  title,
  body,
  onGo,
}: {
  title: string;
  body: string;
  onGo: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        background: '#fff7e6',
        border: '1px solid #ffd591',
        borderRadius: 4,
      }}
    >
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ color: '#666', margin: '4px 0 8px' }}>{body}</div>
      <button
        type="button"
        onClick={onGo}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: 12,
          cursor: 'pointer',
          background: '#fa8c16',
          color: '#fff',
          border: 0,
          borderRadius: 4,
        }}
      >
        去浏览器处理
      </button>
    </div>
  );
}

function NodeList({ progress }: { progress: ProgressState }) {
  const marks = { done: '✓', running: '▶', pending: '·', failed: '✗' } as const;
  const colors = { done: '#0a0', running: '#1a56db', pending: '#bbb', failed: '#b00' } as const;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.9 }}>
      {progress.nodes.map((node) => (
        <div key={node.node} style={{ display: 'flex', gap: 8, color: colors[node.status] }}>
          <span style={{ width: 12 }}>{marks[node.status]}</span>
          <span>{node.label}</span>
        </div>
      ))}
    </div>
  );
}

function TaskPane() {
  const [caps, setCaps] = useState<ClientCapabilities | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<UploadOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const unsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    getRuntime()
      .capabilities()
      .then(setCaps)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => unsubscribe.current?.();
  }, []);

  const watch = useCallback((projectId: string) => {
    unsubscribe.current?.();
    setProgress(initialProgress());
    unsubscribe.current = subscribeProgress(projectId, setProgress);
  }, []);

  async function onUpload() {
    setPhase('working');
    setError(null);
    try {
      const result = await uploadCurrentDocument({
        runtime: getRuntime(),
        upload: uploadProject,
        run: (projectId) => runProject(projectId, 'llm'),
        onRunFailed: (e: unknown) =>
          setError(`流水线启动失败：${e instanceof Error ? e.message : String(e)}`),
        projectExists: async (projectId) => {
          try {
            await getProjectState(projectId);
            return true;
          } catch {
            return false;
          }
        },
        digest: sha256Hex,
        readMemo: readUploadMemo,
        writeMemo: writeUploadMemo,
      });
      setOutcome(result);
      setPhase('done');
      watch(result.projectId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  const browserUrl = outcome ? `${BROWSER_BASE}/?project_id=${outcome.projectId}` : '';

  async function onOpenBrowser() {
    try {
      await getRuntime().openInBrowser(browserUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const canUpload = caps?.readActiveDocumentBytes === true && phase !== 'working';

  return (
    <div
      style={{
        maxWidth: PANE_WIDTH_HINT,
        padding: 12,
        fontFamily: 'system-ui, sans-serif',
        color: '#111',
      }}
    >
      <h1 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>标书助手</h1>

      <button
        type="button"
        onClick={() => void onUpload()}
        disabled={!canUpload}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 13,
          cursor: canUpload ? 'pointer' : 'not-allowed',
          background: canUpload ? '#1a56db' : '#ccc',
          color: '#fff',
          border: 0,
          borderRadius: 4,
        }}
      >
        {phase === 'working' ? '上传中…' : '上传当前文档并开始解析'}
      </button>

      {phase === 'done' && outcome && (
        <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ color: '#0a0', fontWeight: 600 }}>
            {outcome.reused ? '这份文档已经传过，复用原项目' : '已创建项目并开始解析'}
          </div>
          <Row label="文档" value={outcome.name} />
          <Row label="项目" value={outcome.projectId} />

          <div style={{ marginTop: 10 }}>
            <NodeList progress={progress} />
          </div>

          {progress.message && (
            <div style={{ marginTop: 6, color: '#666' }}>{progress.message}</div>
          )}

          {progress.phase === 'awaiting_confirm' && (
            <Banner
              title={`确认点 ${progress.checkpoint ?? '?'} 待处理${
                progress.checkpoint ? ` · ${CHECKPOINT_LABELS[progress.checkpoint] ?? ''}` : ''
              }`}
              body="确认在浏览器里完成，本窗格不提供推进按钮。"
              onGo={() => void onOpenBrowser()}
            />
          )}

          {/* 升级请求不是确认点，但同样阻塞流水线。不显示它，用户看到的就是进度条卡住。 */}
          {progress.phase === 'awaiting_escalation' && progress.escalation && (
            <Banner
              title={`需要人工决定 · ${progress.escalation.title}`}
              body={`${progress.escalation.body}${
                progress.escalation.options.length
                  ? `（可选：${progress.escalation.options.join(' / ')}）`
                  : ''
              }`}
              onGo={() => void onOpenBrowser()}
            />
          )}

          {progress.phase === 'server_precheck_done' && (
            <div style={{ marginTop: 10, color: '#666' }}>
              服务器预检已结束。<b>尚未交付</b>——还需在 WPS 里更新域、导 PDF、回传证据，
              由服务器判定验收（P2）。
            </div>
          )}

          {progress.error && (
            <div style={{ marginTop: 10, color: '#b00' }}>{progress.error}</div>
          )}

          <div style={{ marginTop: 10, color: '#666', wordBreak: 'break-all' }}>{browserUrl}</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, color: '#b00', fontSize: 12, lineHeight: 1.6 }}>{error}</div>
      )}

      <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid #eee' }} />

      {caps && (
        <>
          <Row label="运行时" value={caps.runtime} />
          <Row label="可读文档字节" value={caps.readActiveDocumentBytes ? '是' : '否'} />
          <Row label="可开浏览器" value={caps.openInBrowser ? '是' : '否'} />
          <Row label="可驱动排版" value={caps.documentAutomation ? '是' : '否（P2）'} />
          <Row label="应用版本" value={caps.appVersion} />
          <Row label="后端" value={API_BASE} />
        </>
      )}

      {!caps && !error && <div style={{ fontSize: 12, color: '#666' }}>正在自检…</div>}
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <TaskPane />
    </StrictMode>,
  );
}
