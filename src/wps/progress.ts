// P1.5：任务窗格的**只读**进度。
//
// 只读是设计约束不是省事：确认点 ①②③④ 全部在浏览器 Copilot 里过
// （tasks/wps-addon-end-to-end-flow-2026-08-18.md §8.3），窗格里不能出现任何
// 推进流水线的按钮，只能把用户送去浏览器。
//
// 没有复用 `src/engine/sources.ts` 的 LiveSource：那是整个演示引擎的状态机
// （场景、正文块、素材、对话），薄窗格只要八个节点的进度条。它已有的
// eventSourceFactory 与 ?last_event_id= 续传做法在这里照抄。

import { apiUrl } from '../lib/apiBase';

export type ProgressPhase =
  | 'idle'
  | 'running'
  | 'awaiting_confirm'
  | 'awaiting_escalation'
  | 'server_precheck_done'
  | 'failed';

export type NodeStatus = 'pending' | 'running' | 'done' | 'failed';

export interface NodeProgress {
  node: string;
  label: string;
  status: NodeStatus;
}

/**
 * 升级请求。**不是确认点 ①②③④**，但同样阻塞流水线——2026-08-21 P1.6 端到端
 * 实测撞上：retrieve 完成后发 `escalate_request`（企业资料库匹配不完整），
 * generate 不会开始。窗格不显示它，用户看到的就是进度条卡在原地。
 */
export interface EscalationPrompt {
  id: string;
  title: string;
  body: string;
  options: string[];
}

export interface ProgressState {
  phase: ProgressPhase;
  nodes: NodeProgress[];
  /** 最近一条 node_progress 的文本。 */
  message: string;
  /** 挂起的确认点编号，1..4；null = 没有挂起。 */
  checkpoint: number | null;
  /** 挂起的升级请求；null = 没有挂起。 */
  escalation: EscalationPrompt | null;
  error: string | null;
  lastEventId: number;
}

const NODE_LABELS: Record<string, string> = {
  ingest: '读取文件',
  analyze: '解析要求',
  export_plan: '交付结构',
  outline: '生成大纲',
  retrieve: '素材召回',
  generate: '撰写正文',
  compliance: '合规检查',
  export: '导出分册',
};

// 八个节点全展示。CLAUDE.md 说 `retrieve` 在 CLI 路径未实现，但 **API 路径确实会跑**
// （2026-08-21 P1.6 端到端实测，confirm② 之后 completed_nodes 里出现了 retrieve）——
// 按 CLI 的口径藏起来会漏掉一个真实阶段。事件里出现未知节点也会被动态补进来。
const DISPLAY_NODES = [
  'ingest',
  'analyze',
  'export_plan',
  'outline',
  'retrieve',
  'generate',
  'compliance',
  'export',
];

export function initialProgress(): ProgressState {
  return {
    phase: 'idle',
    nodes: DISPLAY_NODES.map((node) => ({
      node,
      label: NODE_LABELS[node] ?? node,
      status: 'pending' as NodeStatus,
    })),
    message: '',
    checkpoint: null,
    escalation: null,
    error: null,
    lastEventId: 0,
  };
}

function withNode(state: ProgressState, node: string, status: NodeStatus): NodeProgress[] {
  const known = state.nodes.some((item) => item.node === node);
  const nodes = known
    ? state.nodes.map((item) => (item.node === node ? { ...item, status } : item))
    : [...state.nodes, { node, label: NODE_LABELS[node] ?? node, status }];
  // node_started 也意味着它前面的节点都已经过去了——重连补发时事件可能不全，
  // 靠这条把前序补成 done，进度条才不会出现空洞。
  if (status !== 'running') return nodes;
  const index = nodes.findIndex((item) => item.node === node);
  return nodes.map((item, i) => (i < index && item.status === 'pending' ? { ...item, status: 'done' } : item));
}

/**
 * 纯函数 reducer。事件名与载荷取自 `engine/app/runner.py`。
 */
export function reduceProgress(
  state: ProgressState,
  name: string,
  data: Record<string, unknown>,
  eventId = 0,
): ProgressState {
  const next: ProgressState = {
    ...state,
    lastEventId: eventId > state.lastEventId ? eventId : state.lastEventId,
  };
  const node = typeof data.node === 'string' ? data.node : '';

  switch (name) {
    case 'run_started':
      return { ...next, phase: 'running', error: null, checkpoint: null, escalation: null };
    case 'node_started':
      return {
        ...next,
        phase: 'running',
        error: null,
        checkpoint: null,
        escalation: null,
        nodes: withNode(next, node, 'running'),
        message: '',
      };
    case 'node_progress':
      return { ...next, message: typeof data.message === 'string' ? data.message : next.message };
    case 'node_completed':
      return { ...next, nodes: withNode(next, node, 'done') };
    case 'confirm_request':
      return {
        ...next,
        phase: 'awaiting_confirm',
        checkpoint: typeof data.checkpoint === 'number' ? data.checkpoint : null,
        escalation: null,
        message: '',
      };
    case 'escalate_request':
      return {
        ...next,
        phase: 'awaiting_escalation',
        message: '',
        escalation: {
          id: String(data.escalation_id ?? ''),
          title: String(data.title ?? '需要人工决定'),
          body: String(data.body ?? ''),
          options: Array.isArray(data.options)
            ? data.options.map((o) =>
                String((o as { label?: unknown })?.label ?? o),
              )
            : [],
        },
      };
    case 'escalate_response':
      return { ...next, phase: 'running', escalation: null };
    case 'run_failed':
      // 失败节点要标出来。只置 phase 不动节点，出错的那个会一直显示成「进行中」，
      // 和红色错误文案自相矛盾（2026-08-21 P1.6 实测看到）。
      return {
        ...next,
        phase: 'failed',
        nodes: node ? withNode(next, node, 'failed') : next.nodes,
        error: `${String(data.error_type ?? '错误')}：${String(data.message ?? '')}`,
      };
    case 'run_completed':
      // **不能显示成「完成」**。事件自带 final_delivery_approved:false——服务器预检
      // 结束只代表可以进 WPS 验收，最终交付要等更新域、回传证据、服务器判定。
      return { ...next, phase: 'server_precheck_done', checkpoint: null, escalation: null };
    default:
      return next;
  }
}

export const PROGRESS_EVENT_NAMES = [
  'run_started',
  'node_started',
  'node_progress',
  'node_completed',
  'confirm_request',
  'escalate_request',
  'escalate_response',
  'run_failed',
  'run_completed',
];

export type EventSourceFactory = (url: string) => EventSource;

export interface SubscribeOptions {
  eventSourceFactory?: EventSourceFactory;
  lastEventId?: number;
}

/** 订阅项目事件流，返回退订函数。断线由浏览器用 Last-Event-ID 自动续，不自己重连。 */
export function subscribeProgress(
  projectId: string,
  onState: (state: ProgressState) => void,
  options: SubscribeOptions = {},
): () => void {
  const factory = options.eventSourceFactory ?? ((url: string) => new EventSource(url));
  const suffix = options.lastEventId ? `?last_event_id=${options.lastEventId}` : '';
  const source = factory(apiUrl(`/api/projects/${projectId}/events${suffix}`));

  let state = initialProgress();
  for (const name of PROGRESS_EVENT_NAMES) {
    source.addEventListener(name, (event) => {
      const message = event as MessageEvent<string>;
      const data = message.data ? (JSON.parse(message.data) as Record<string, unknown>) : {};
      state = reduceProgress(state, name, data, Number(message.lastEventId || 0));
      onState(state);
    });
  }
  return () => source.close();
}
