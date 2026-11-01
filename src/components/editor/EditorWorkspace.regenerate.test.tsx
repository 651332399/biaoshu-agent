import { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LiveSource, makeLiveScenario } from '../../engine/sources';
import { EditorWorkspace } from './EditorWorkspace';

function event(data: unknown, id: number) {
  return { data: JSON.stringify(data), lastEventId: String(id) } as MessageEvent<string>;
}
function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

test('a compliance exception during re-export must stop the spinner and offer recovery', async () => {
  const scenario = makeLiveScenario();
  scenario.blocks = [{ id: 'b1', chapterId: 'c1', render: 'prose', 标题: '测试正文', prose: '测试正文' }];
  const source = new LiveSource(scenario);
  await source.handleEvent('node_started', event({ node: 'export', stage_index: 9 }, 1));
  await source.handleEvent('run_failed', event({ error_type: 'RuntimeError', message: '服务器预检未通过' }, 2));
  source.getState().revealedBlocks = ['b1'];
  window.history.replaceState({}, '', '/?project_id=p1');
  vi.stubGlobal('EventSource', class { addEventListener() {} close() {} });
  let finishExport!: () => void;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/export') && init?.method === 'POST') {
      await source.handleEvent('node_started', event({ node: 'compliance', stage_index: 8 }, 3));
      await new Promise<void>((resolve) => { finishExport = resolve; });
      // Matches runner.regenerate_export: a compliance exception emits neither
      // style_check_report nor run_failed; POST /export returns 500.
      return new Response('Internal Server Error', { status: 500 });
    }
    if (String(url).endsWith('/state')) return json({ generation_id: 'g1' });
    if (String(url).endsWith('/acceptance')) return json({
      generation_id: 'g1', status: 'server_precheck_failed', final_delivery_approved: false,
      artifacts: [], required_evidence_slots: [], missing_evidence_slots: [], validation_issues: [], archiving_issues: [],
    });
    throw new Error(`Unexpected URL: ${url}`);
  }));
  function Workspace() {
    const [state, setState] = useState(source.getState());
    useEffect(() => source.subscribe(setState), []);
    return <EditorWorkspace scenario={scenario} state={state} engine={source} onOpenLibrary={() => {}} />;
  }
  render(<Workspace />);
  fireEvent.click(await screen.findByRole('button', { name: '重新导出' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: '重新导出' })).not.toBeInTheDocument());
  await act(async () => { finishExport(); });
  expect(screen.queryByText('合规校验进行中')).not.toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('重新导出未完成');
  expect(await screen.findByRole('button', { name: '重新导出' })).toBeEnabled();
});

test('a reload during re-export still observes a later compliance failure and offers recovery', async () => {
  class FakeEventSource {
    static all: FakeEventSource[] = [];
    listeners = new Map<string, (event: MessageEvent<string>) => void>();
    closed = false;
    constructor(public url: string) { FakeEventSource.all.push(this); }
    addEventListener(name: string, fn: (event: MessageEvent<string>) => void) { this.listeners.set(name, fn); }
    close() { this.closed = true; }
  }
  vi.stubGlobal('EventSource', FakeEventSource);
  window.history.replaceState({}, '', '/?project_id=p1');
  // The reloaded page owns no POST promise: its only state read happens while
  // runner.regenerate_export is still running compliance for generation g2.
  let backendStatus = 'generation_started';
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = String(url);
    if (path.endsWith('/state')) return json({
      project_id: 'p1', completed_nodes: ['generate'], current_node: 'compliance',
      awaiting_checkpoint: null, awaiting_escalation: null,
      artifacts: ['document_blocks.json'], generation_id: 'g2',
      generation_status: backendStatus, server_precheck_passed: false, final_delivery_approved: false,
    });
    if (path.endsWith('/document_blocks.json')) return json([
      { id: 'b1', chapterId: 'c1', render: 'prose', 标题: '测试正文', prose: '当前正文' },
    ]);
    if (path.includes('/chat')) return json({ turns: [], proposals: [], tail_state: 'idle' });
    if (path.endsWith('/acceptance')) return json({
      generation_id: 'g2', status: backendStatus, final_delivery_approved: false,
      artifacts: [], required_evidence_slots: [], missing_evidence_slots: [], validation_issues: [], archiving_issues: [],
    });
    throw new Error(`Unexpected URL: ${path}`);
  }));
  const scenario = makeLiveScenario();
  const source = new LiveSource(scenario);
  await source.restoreProject('p1');
  function Workspace() {
    const [state, setState] = useState(source.getState());
    useEffect(() => source.subscribe(setState), []);
    return <EditorWorkspace scenario={scenario} state={state} engine={source} onOpenLibrary={() => {}} />;
  }
  render(<Workspace />);
  await act(async () => {
    await source.handleEvent('node_started', event({ node: 'compliance', stage_index: 8 }, 20));
  });
  expect(screen.getByText('合规校验进行中')).toBeInTheDocument();

  // Compliance throws before any report: g2 is marked failed and only the
  // generation acceptance stream hears about it, not the pipeline stream.
  backendStatus = 'server_precheck_failed';
  await act(async () => {
    FakeEventSource.all
      .find((stream) => stream.url.includes('/generations/g2/acceptance/events'))!
      .listeners.get('server_precheck_failed')!(event({ generation_id: 'g2' }, 21));
  });

  expect(source.getState().status).not.toBe('playing');
  expect(screen.queryByText('合规校验进行中')).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: '重新导出' })).toBeEnabled();
  expect(screen.getByRole('alert')).toHaveTextContent('重新导出未完成');
});
