// WPS 任务窗格入口。
//
// 形态锚定 tasks/wps-addon-end-to-end-flow-2026-08-18.md §8.3：**薄加载项**。
// 窗格只做「一键上传 + 只读进度 + 排版执行 + 证据回传」，对话 / 确认点 /
// 要求清单留在浏览器 Copilot 里。不要往这里搬编辑器组件。

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getRuntime } from '../platform/capabilities';
import type { ClientCapabilities } from '../platform/RuntimeAdapter';
import { runProject, uploadProject } from '../lib/api';
import { setApiBase } from '../lib/apiBase';
import {
  readUploadMemo,
  sha256Hex,
  uploadCurrentDocument,
  writeUploadMemo,
  type UploadOutcome,
} from './uploadCurrentDocument';

// 窗格与后端不同源（窗格在 3889），基地址必须显式给。
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://127.0.0.1:8000';
const BROWSER_BASE = (import.meta.env.VITE_BROWSER_BASE as string | undefined) ?? 'http://localhost:3000';

setApiBase(API_BASE);

const PANE_WIDTH_HINT = 360;

type Phase = 'idle' | 'working' | 'done' | 'error';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12 }}>
      <span style={{ flex: '0 0 92px', color: '#666' }}>{label}</span>
      <span style={{ flex: 1, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function TaskPane() {
  const [caps, setCaps] = useState<ClientCapabilities | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [outcome, setOutcome] = useState<UploadOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRuntime()
      .capabilities()
      .then(setCaps)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
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
        digest: sha256Hex,
        readMemo: readUploadMemo,
        writeMemo: writeUploadMemo,
      });
      setOutcome(result);
      setPhase('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
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
          <Row label="sha256" value={`${outcome.sha256.slice(0, 16)}…`} />
          <div style={{ marginTop: 8, color: '#666' }}>
            去浏览器过确认点：
            <div style={{ wordBreak: 'break-all' }}>{`${BROWSER_BASE}/?project=${outcome.projectId}`}</div>
          </div>
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
          <Row label="可驱动排版" value={caps.documentAutomation ? '是' : '否（P2）'} />
          <Row label="应用版本" value={caps.appVersion} />
          <Row label="后端" value={API_BASE} />
        </>
      )}

      {!caps && !error && <div style={{ fontSize: 12, color: '#666' }}>正在自检…</div>}

      <p style={{ fontSize: 12, color: '#666', marginTop: 16, lineHeight: 1.6 }}>
        对话、要求确认与合规报告在浏览器里完成，本窗格只负责上传当前文档、显示进度，
        以及后续的排版落地与证据回传。
      </p>
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
