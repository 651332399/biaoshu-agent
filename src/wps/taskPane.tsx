// WPS 任务窗格入口。
//
// 形态锚定 tasks/wps-addon-end-to-end-flow-2026-08-18.md §8.3：**薄加载项**。
// 窗格只做「一键上传 + 只读进度 + 排版执行 + 证据回传」，对话 / 确认点 /
// 要求清单留在浏览器 Copilot 里。不要往这里搬编辑器组件。
//
// P1.1 只落地能力自检——它在真机上验证 RuntimeAdapter 边界确实通，
// 比 vitest 里的 stub 更有说服力。上传按钮是 P1.4。

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getRuntime } from '../platform/capabilities';
import type { ClientCapabilities } from '../platform/RuntimeAdapter';

const PANE_WIDTH_HINT = 360;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12 }}>
      <span style={{ flex: '0 0 96px', color: '#666' }}>{label}</span>
      <span style={{ flex: 1, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function TaskPane() {
  const [caps, setCaps] = useState<ClientCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRuntime()
      .capabilities()
      .then(setCaps)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

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

      {error && <div style={{ color: '#b00', fontSize: 12 }}>能力自检失败：{error}</div>}

      {caps && (
        <>
          <Row label="运行时" value={caps.runtime} />
          <Row label="可读文档字节" value={caps.readActiveDocumentBytes ? '是' : '否'} />
          <Row label="可驱动排版" value={caps.documentAutomation ? '是' : '否（P2）'} />
          <Row label="应用版本" value={caps.appVersion} />
          <Row label="系统" value={caps.osVersion} />
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
