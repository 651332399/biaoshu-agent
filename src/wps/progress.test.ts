import { describe, expect, test, vi } from 'vitest';
import {
  initialProgress,
  reduceProgress,
  subscribeProgress,
  type ProgressState,
} from './progress';

function apply(events: [string, Record<string, unknown>][]): ProgressState {
  return events.reduce((state, [name, data], i) => reduceProgress(state, name, data, i + 1), initialProgress());
}

function statusOf(state: ProgressState, node: string) {
  return state.nodes.find((item) => item.node === node)?.status;
}

describe('reduceProgress', () => {
  test('初始态：七个节点全 pending，retrieve 不展示（当前流水线不跑它）', () => {
    const state = initialProgress();
    expect(state.phase).toBe('idle');
    expect(state.nodes).toHaveLength(7);
    expect(state.nodes.map((n) => n.node)).not.toContain('retrieve');
  });

  test('node_started / node_completed 推进状态', () => {
    const state = apply([
      ['run_started', {}],
      ['node_started', { node: 'ingest', stage_index: 1 }],
      ['node_progress', { node: 'ingest', message: '读取文件 tender.docx' }],
      ['node_completed', { node: 'ingest' }],
      ['node_started', { node: 'analyze', stage_index: 2 }],
    ]);
    expect(state.phase).toBe('running');
    expect(statusOf(state, 'ingest')).toBe('done');
    expect(statusOf(state, 'analyze')).toBe('running');
    expect(statusOf(state, 'export_plan')).toBe('pending');
  });

  test('重连补发不全时，node_started 把前序补成 done，进度条不留空洞', () => {
    const state = apply([['node_started', { node: 'generate' }]]);
    expect(statusOf(state, 'ingest')).toBe('done');
    expect(statusOf(state, 'outline')).toBe('done');
    expect(statusOf(state, 'generate')).toBe('running');
    expect(statusOf(state, 'compliance')).toBe('pending');
  });

  test('confirm_request 挂起确认点并记编号', () => {
    const state = apply([
      ['node_started', { node: 'analyze' }],
      ['confirm_request', { checkpoint: 1, artifact_url: '/api/projects/x/artifacts/requirements.json' }],
    ]);
    expect(state.phase).toBe('awaiting_confirm');
    expect(state.checkpoint).toBe(1);
  });

  test('确认点过了之后新节点开跑，挂起状态清掉', () => {
    const state = apply([
      ['confirm_request', { checkpoint: 1 }],
      ['node_started', { node: 'export_plan' }],
    ]);
    expect(state.phase).toBe('running');
    expect(state.checkpoint).toBeNull();
  });

  test('run_completed 不是「完成」——事件自带 final_delivery_approved:false', () => {
    const state = apply([
      ['node_started', { node: 'export' }],
      ['run_completed', { generation_id: 'g1', server_precheck_passed: true, final_delivery_approved: false }],
    ]);
    expect(state.phase).toBe('server_precheck_done');
    expect(state.phase).not.toBe('done');
  });

  test('run_failed 记错误类型与消息', () => {
    const state = apply([['run_failed', { node: 'analyze', error_type: 'ValueError', message: '缺少 API key' }]]);
    expect(state.phase).toBe('failed');
    expect(state.error).toBe('ValueError：缺少 API key');
  });

  test('lastEventId 单调递增，乱序事件不会把它拉回去', () => {
    let state = reduceProgress(initialProgress(), 'node_started', { node: 'ingest' }, 7);
    state = reduceProgress(state, 'node_progress', { message: 'x' }, 3);
    expect(state.lastEventId).toBe(7);
  });

  test('未知事件名原样返回，不炸', () => {
    const before = initialProgress();
    expect(reduceProgress(before, 'artifact_ready', { node: 'ingest' })).toMatchObject({ phase: 'idle' });
  });
});

describe('subscribeProgress', () => {
  function fakeSource() {
    const handlers: Record<string, (e: MessageEvent<string>) => void> = {};
    const source = {
      addEventListener: (name: string, fn: (e: MessageEvent<string>) => void) => {
        handlers[name] = fn;
      },
      close: vi.fn(),
    };
    return { source, handlers };
  }

  test('订阅全部事件名，续传带 last_event_id，退订会 close', () => {
    const { source, handlers } = fakeSource();
    const urls: string[] = [];
    const states: ProgressState[] = [];

    const unsubscribe = subscribeProgress('p1', (s) => states.push(s), {
      lastEventId: 42,
      eventSourceFactory: (url) => {
        urls.push(url);
        return source as unknown as EventSource;
      },
    });

    expect(urls[0]).toBe('/api/projects/p1/events?last_event_id=42');
    expect(Object.keys(handlers)).toContain('confirm_request');

    handlers.node_started({ data: JSON.stringify({ node: 'analyze' }), lastEventId: '43' } as MessageEvent<string>);
    expect(states.at(-1)?.nodes.find((n) => n.node === 'analyze')?.status).toBe('running');
    expect(states.at(-1)?.lastEventId).toBe(43);

    unsubscribe();
    expect(source.close).toHaveBeenCalledTimes(1);
  });

  test('没有 lastEventId 时不带 query', () => {
    const { source } = fakeSource();
    const urls: string[] = [];
    subscribeProgress('p1', () => {}, {
      eventSourceFactory: (url) => {
        urls.push(url);
        return source as unknown as EventSource;
      },
    });
    expect(urls[0]).toBe('/api/projects/p1/events');
  });
});
