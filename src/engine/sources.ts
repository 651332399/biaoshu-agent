import {
  confirmProject,
  escalateProject,
  getArtifact,
  getProjectState,
  runProject,
  uploadProject,
  type ProjectEscalation,
} from '../lib/api';
import type { EngineState } from './ScenarioEngine';
import type {
  BackendAssetMatch,
  BackendExportPlan,
  BackendOutline,
  BackendProjectMeta,
  BackendReport,
  BackendRequirement,
  BackendSectionDraft,
} from './types';
import type {
  DocBlockData,
  Scenario,
  Step,
  Volume,
} from './demo/types';

export interface WorkspaceEngine {
  getState(): EngineState;
  subscribe(fn: (s: EngineState) => void): () => void;
  reset(): void;
  startWithFile?(file: File): Promise<void>;
  restoreProject?(projectId: string): Promise<void>;
  stepOnce(): void;
  setSpeed(x: number): void;
  play(): void;
  pause(): void;
  confirmCheckpoint(artifact?: unknown): void;
  chooseOption(index: number): void;
  provideSupplement(type: 'social' | 'pricing' | 'tax'): void;
  revealChapterManually(chapterId: string): void;
  revealVolumeManually(volumeId: string): void;
  addCustomUserMessage(text: string, files?: { name: string; type: string }[]): void;
}

export type EventSourceFactory = (url: string) => EventSource;

export function makeLiveScenario(): Scenario {
  return {
    id: 'kqyy',
    meta: {
      项目名: 'Live 招标文件集成项目',
      采购人: '待解析',
      采购方式: '待解析',
      评审办法: '待解析',
      限价: 0,
      报价: 0,
      报价利用率: '0%',
      保证金: 0,
      服务周期: '待解析',
    },
    strategy: { method: 'composite', 基调: '后端实时解析', 报价基调: '待后端生成' },
    volumes: [],
    requirements: [],
    mapping: [],
    materials: [],
    blocks: [],
    redlines: [],
    pricing: { lines: [], 限价: 0, 报价: 0, 利用率: '0%' },
    steps: [],
  };
}

function liveInitialState(): EngineState {
  return {
    status: 'idle',
    cursor: 0,
    speed: 1,
    activeStage: 0,
    logs: [],
    grownVolumes: [],
    revealedBlocks: [],
    matchedMaterials: [],
    revealedRedlines: [],
    pricingRevealed: false,
    focus: null,
    pendingCard: null,
    redlineOverrides: {},
    backendRequirements: [],
    backendExportPlan: null,
    backendOutline: null,
    backendCoverage: null,
    backendReport: null,
    serverDocxUrl: null,
    serverPackageUrl: null,
    error: null,
    mode: 'live',
  };
}

export class LiveSource implements WorkspaceEngine {
  private state = liveInitialState();
  private listeners = new Set<(s: EngineState) => void>();
  private projectId: string | null = null;
  private eventSource: EventSource | null = null;
  private lastEventId = 0;
  private currentEscalation: ProjectEscalation | null = null;

  constructor(
    private scenario: Scenario,
    private eventSourceFactory: EventSourceFactory = (url) => new EventSource(url),
  ) {}

  getState() {
    return this.state;
  }

  subscribe(fn: (s: EngineState) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.state = { ...this.state };
    this.listeners.forEach((listener) => listener(this.state));
  }

  reset() {
    this.eventSource?.close();
    this.eventSource = null;
    this.projectId = null;
    this.lastEventId = 0;
    this.currentEscalation = null;
    this.scenario.volumes = [];
    this.scenario.blocks = [];
    this.scenario.redlines = [];
    this.state = liveInitialState();
    this.emit();
  }

  async startWithFile(file: File) {
    this.reset();
    this.state.status = 'playing';
    this.state.logs = [{ id: 'upload', text: `上传招标文件：${file.name}`, stage: 1 }];
    this.emit();
    try {
      const created = await uploadProject(file);
      this.projectId = created.project_id;
      const params = new URLSearchParams(window.location.search);
      params.set('project_id', created.project_id);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
      this.connectEvents();
      await runProject(created.project_id, 'recorded');
    } catch (error) {
      this.reportFailure('上传或启动流程失败', error);
    }
  }

  async restoreProject(projectId: string) {
    this.reset();
    this.projectId = projectId;
    this.state.status = 'paused';
    this.state.logs = [{ id: 'restore', text: `从后端恢复项目：${projectId}`, stage: 1 }];
    this.emit();
    try {
      const remoteState = await getProjectState(projectId);
      if (remoteState.artifacts.includes('requirements.json')) {
        await this.applyArtifact('requirements', `/api/projects/${projectId}/artifacts/requirements.json`);
      }
      if (remoteState.artifacts.includes('export_plan.json')) {
        await this.applyArtifact('export_plan', `/api/projects/${projectId}/artifacts/export_plan.json`);
      }
      if (remoteState.artifacts.includes('outline.json')) {
        await this.applyArtifact('outline', `/api/projects/${projectId}/artifacts/outline.json`);
      }
      for (const artifact of remoteState.artifacts.filter((item) => item.startsWith('draft/')).sort()) {
        await this.applyArtifact('section_draft', `/api/projects/${projectId}/artifacts/${artifact}`);
      }
      if (remoteState.artifacts.includes('document_blocks.json')) {
        await this.applyArtifact('document_blocks', `/api/projects/${projectId}/artifacts/document_blocks.json`);
      }
      if (remoteState.artifacts.includes('report.json')) {
        await this.applyArtifact('coverage', `/api/projects/${projectId}/artifacts/report.json`);
      }
      if (remoteState.artifacts.includes('bid.docx')) {
        this.state.serverDocxUrl = `/api/projects/${projectId}/artifacts/bid.docx`;
      }
      const packageArtifact = remoteState.artifacts.find((item) => item.endsWith('bid-package.zip'));
      if (packageArtifact) {
        this.state.serverPackageUrl = `/api/projects/${projectId}/artifacts/${packageArtifact}`;
      }
      if (remoteState.awaiting_checkpoint) {
        this.state.pendingCard = {
          id: `confirm-${remoteState.awaiting_checkpoint}`,
          kind: 'checkpoint',
          stage: remoteState.awaiting_checkpoint === 2 ? 3 : remoteState.awaiting_checkpoint === 3 ? 8 : remoteState.awaiting_checkpoint === 4 ? 3 : 2,
          duration: 0,
          checkpointTitle: this.confirmTitle(remoteState.awaiting_checkpoint),
          checkpointBody: '页面已从后端 state 恢复，请核对当前产物后继续。',
        } as Step;
        this.state.status = 'awaiting';
      } else if (remoteState.awaiting_escalation) {
        this.currentEscalation = remoteState.awaiting_escalation;
        this.state.pendingCard = this.escalationToCard(this.currentEscalation);
        this.state.status = 'awaiting';
      }
      this.connectEvents();
      this.emit();
    } catch (error) {
      this.reportFailure('从后端恢复项目失败', error);
    }
  }

  /** 直接调用类 API(非 SSE 事件流)失败时的统一兜底：记录日志、暂停、让用户可见。 */
  private reportFailure(context: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.state.error = `${context}：${message}`;
    this.state.status = 'paused';
    this.state.logs = [
      ...this.state.logs,
      { id: `client-err-${Date.now()}`, text: this.state.error, stage: this.state.activeStage || 1 },
    ];
    this.emit();
  }

  private connectEvents() {
    if (!this.projectId) return;
    const suffix = this.lastEventId > 0 ? `?last_event_id=${this.lastEventId}` : '';
    this.eventSource?.close();
    this.eventSource = this.eventSourceFactory(`/api/projects/${this.projectId}/events${suffix}`);
    const names = [
      'run_started',
      'node_started',
      'node_progress',
      'artifact_ready',
      'confirm_request',
      'escalate_request',
      'escalate_response',
      'node_completed',
      'run_failed',
      'run_completed',
    ];
    names.forEach((name) => {
      this.eventSource?.addEventListener(name, (event) => {
        void this.handleEvent(name, event as MessageEvent<string>);
      });
    });
    this.eventSource.onerror = () => {
      this.state.status = 'paused';
      this.state.error = 'SSE 连接中断，刷新页面后可从后端事件日志恢复。';
      this.emit();
    };
  }

  async handleEvent(name: string, event: MessageEvent<string>) {
    const numericId = Number(event.lastEventId || 0);
    if (numericId > 0) this.lastEventId = numericId;
    const data = event.data ? JSON.parse(event.data) as Record<string, unknown> : {};
    if (name === 'node_started') {
      this.state.activeStage = Number(data.stage_index ?? this.state.activeStage);
      this.state.status = 'playing';
    } else if (name === 'node_progress') {
      this.state.logs = [
        ...this.state.logs,
        {
          id: `evt-${this.lastEventId}`,
          text: String(data.message ?? ''),
          stage: this.state.activeStage || 1,
        },
      ];
    } else if (name === 'artifact_ready') {
      await this.applyArtifact(String(data.artifact_type ?? ''), String(data.url ?? ''), data);
    } else if (name === 'confirm_request') {
      this.state.pendingCard = {
        id: `confirm-${data.checkpoint}`,
        kind: 'checkpoint',
        stage: this.state.activeStage || 2,
        duration: 0,
        checkpointTitle: this.confirmTitle(Number(data.checkpoint)),
        checkpointBody: `请抽查、编辑后确认继续。产物：${data.artifact_url}`,
      } as Step;
      this.state.status = 'awaiting';
    } else if (name === 'escalate_request') {
      this.currentEscalation = data as unknown as ProjectEscalation;
      this.state.pendingCard = this.escalationToCard(this.currentEscalation);
      this.state.status = 'awaiting';
    } else if (name === 'escalate_response') {
      this.currentEscalation = null;
      if (this.state.pendingCard?.kind === 'escalate') {
        this.state.pendingCard = null;
      }
      this.state.logs = [
        ...this.state.logs,
        {
          id: `esc-${this.lastEventId}`,
          text: `升级决策已应答：${String(data.label ?? `选项 ${data.option_index}`)}`,
          stage: this.state.activeStage || 5,
        },
      ];
    } else if (name === 'run_failed') {
      this.state.error = `${data.error_type}: ${data.message}`;
      this.state.status = 'paused';
      this.state.logs = [
        ...this.state.logs,
        { id: `err-${this.lastEventId}`, text: this.state.error, stage: this.state.activeStage || 1 },
      ];
    } else if (name === 'run_completed') {
      this.state.status = 'idle';
      this.state.pendingCard = {
        id: 'export-live',
        kind: 'export',
        stage: 9,
        duration: 0,
        checkpointTitle: '全流程完成',
        checkpointBody: '后端已生成 bid.docx，可从产物接口下载正式 Word 文件。',
      } as Step;
    }
    this.emit();
  }

  private async applyArtifact(type: string, url: string, data?: Record<string, unknown>) {
    if (type === 'requirements') {
      const requirements = await getArtifact<BackendRequirement[]>(url);
      this.state.backendRequirements = requirements;
      this.scenario.requirements = requirements.map((item) => ({
        id: item.id,
        文本: item.text,
        标识: item.mandatory ? '★' : undefined,
        分值: item.score_weight ?? undefined,
        类型: item.type,
        page: item.page,
      }));
      this.state.logs = [
        ...this.state.logs,
        { id: `requirements-${this.lastEventId}`, text: `要求清单已生成：${requirements.length} 条`, stage: 2 },
      ];
    } else if (type === 'outline') {
      const outline = await getArtifact<BackendOutline>(url);
      this.state.backendOutline = outline;
      const volume: Volume = {
        id: 'live-outline',
        名称: '后端生成标书大纲',
        单独密封: false,
        chapters: outline.sections.map((section, index) => ({
          id: section.id || `live-chapter-${index + 1}`,
          标题: section.title,
          类型: '自撰区',
          maps_to_requirement_ids: section.maps_to_requirement_ids,
        })),
      };
      this.scenario.volumes = [volume];
      this.state.grownVolumes = [volume.id];
    } else if (type === 'export_plan') {
      const exportPlan = await getArtifact<BackendExportPlan>(url);
      this.state.backendExportPlan = exportPlan;
      this.scenario.volumes = exportPlan.volumes.map((volume) => ({
        id: volume.volume_id,
        名称: volume.cover_title,
        单独密封: volume.sealed_separately,
        chapters: volume.section_ids.map((sectionId) => ({
          id: sectionId,
          标题: sectionId,
          类型: '自撰区',
          maps_to_requirement_ids: [],
        })),
      }));
      this.state.grownVolumes = this.scenario.volumes.map((volume) => volume.id);
    } else if (type === 'section_draft') {
      const draft = await getArtifact<BackendSectionDraft>(url);
      const index = this.resolveSectionIndex(draft, data);
      const block: DocBlockData = {
        id: `live-block-${index}`,
        chapterId: draft.section_id || `live-chapter-${index}`,
        render: 'prose',
        标题: draft.title,
        prose: draft.content,
      };
      // 按 index 幂等落位：断线补发/重跑同一章节时覆盖旧块而非追加
      const existing = this.scenario.blocks.findIndex((item) => item.id === block.id);
      this.scenario.blocks = existing >= 0
        ? this.scenario.blocks.map((item, i) => (i === existing ? block : item))
        : [...this.scenario.blocks, block];
      this.state.revealedBlocks = this.state.revealedBlocks.includes(block.id)
        ? this.state.revealedBlocks
        : [...this.state.revealedBlocks, block.id];
    } else if (type === 'document_blocks') {
      const blocks = await getArtifact<DocBlockData[]>(url);
      this.scenario.blocks = blocks;
      this.state.revealedBlocks = blocks.map((block) => block.id);
    } else if (type === 'coverage') {
      const report = await getArtifact<BackendReport>(url);
      this.state.backendReport = report;
      this.state.backendCoverage = report.coverage;
      const negatives = report.deviations.filter((item) => item.deviation === '负偏离');
      this.scenario.redlines = [
        {
          id: 'coverage',
          项: `覆盖率 ${report.coverage.responded}/${report.coverage.total}`,
          结果: report.coverage.missing.length === 0 ? 'pass' : 'warn',
          说明: `缺失 ${report.coverage.missing.length} 项，负偏离 ${negatives.length} 项`,
        },
        ...report.coverage.废标风险项.map((reqId) => ({
          id: `risk-${reqId}`,
          项: `废标风险：${reqId} 未响应`,
          结果: 'fail' as const,
          说明: '强制性要求未在任何章节中响应，导出前必须处理。',
        })),
        ...negatives.map((item) => ({
          id: `deviation-${item.requirement_id}`,
          项: `负偏离：${item.requirement_id}`,
          结果: 'warn' as const,
          说明: `${item.招标要求原文} → ${item.说明}`,
        })),
      ];
      this.state.revealedRedlines = this.scenario.redlines.map((item) => item.id);
    } else if (type === 'assets') {
      const assets = await getArtifact<BackendAssetMatch[]>(url);
      this.scenario.materials = assets.map((item) => ({
        id: item.asset_id,
        category: 'record' as const,
        名称: item.section_title ?? item.content.slice(0, 24) ?? item.asset_id,
        命中: true,
      }));
      this.state.matchedMaterials = assets.map((item) => item.asset_id);
    } else if (type === 'project_meta') {
      const meta = await getArtifact<BackendProjectMeta>(url);
      this.scenario.meta = {
        ...this.scenario.meta,
        项目名: meta.项目名 || this.scenario.meta.项目名,
        采购人: meta.采购人 ?? this.scenario.meta.采购人,
        限价: meta.限价 ?? this.scenario.meta.限价,
      };
    } else if (type === 'docx') {
      this.state.serverDocxUrl = url;
    } else if (type === 'zip') {
      this.state.serverPackageUrl = url;
    }
  }

  /** 章节定位优先级：事件 section_index > outline 标题匹配 > 追加序。到达顺序不可靠。 */
  private resolveSectionIndex(draft: BackendSectionDraft, data?: Record<string, unknown>): number {
    const fromEvent = Number(data?.section_index);
    if (Number.isInteger(fromEvent) && fromEvent >= 1) return fromEvent;
    const chapters = this.scenario.volumes[0]?.chapters ?? [];
    const byTitle = chapters.findIndex((chapter) => chapter.标题 === draft.title);
    if (byTitle >= 0) return byTitle + 1;
    return this.scenario.blocks.length + 1;
  }

  stepOnce() {}
  setSpeed(x: number) { this.state.speed = x; this.emit(); }
  play() {}
  pause() { this.state.status = 'paused'; this.emit(); }

  async confirmCheckpoint(artifact?: unknown) {
    if (!this.projectId) return;
    if (this.state.pendingCard?.kind === 'export') {
      this.state.pendingCard = null;
      this.state.status = 'idle';
      this.emit();
      return;
    }
    const checkpoint = Number(this.state.pendingCard?.id.replace('confirm-', '')) || 1;
    this.state.pendingCard = null;
    this.state.status = 'playing';
    if (checkpoint === 1 && artifact) {
      this.state.backendRequirements = artifact as BackendRequirement[];
    } else if (checkpoint === 2 && artifact) {
      this.state.backendOutline = artifact as BackendOutline;
    } else if (checkpoint === 3 && artifact) {
      this.state.backendReport = artifact as BackendReport;
    } else if (checkpoint === 4 && artifact) {
      this.state.backendExportPlan = artifact as BackendExportPlan;
    }
    this.emit();
    try {
      if (artifact) {
        await confirmProject(this.projectId, artifact, 'edit', checkpoint);
      } else {
        await confirmProject(this.projectId, null, 'approve', checkpoint);
      }
    } catch (error) {
      this.reportFailure('提交确认点失败', error);
    }
  }

  async chooseOption(index: number) {
    if (!this.projectId || !this.currentEscalation) return;
    const escalation = this.currentEscalation;
    this.currentEscalation = null;
    this.state.pendingCard = null;
    this.state.status = 'playing';
    this.emit();
    try {
      await escalateProject(this.projectId, escalation.escalation_id, index);
    } catch (error) {
      this.reportFailure('提交升级决策失败', error);
    }
  }

  /** 后端 escalate_request 负载 → DecisionCard 已支持的升级决策卡结构 */
  private escalationToCard(escalation: ProjectEscalation): Step {
    return {
      id: `escalate-${escalation.escalation_id}`,
      kind: 'escalate',
      stage: this.state.activeStage || 5,
      duration: 0,
      escalateTitle: escalation.title,
      escalateBody: escalation.body,
      confidence: escalation.confidence,
      options: escalation.options.map((option) => ({
        label: option.label,
        effect: { type: 'continue' as const },
      })),
    } as Step;
  }

  private confirmTitle(checkpoint: number): string {
    if (checkpoint === 2) return '确认点 2: 标书大纲核对';
    if (checkpoint === 3) return '确认点 3: 合规自检核对';
    if (checkpoint === 4) return '确认点 4: 分册导出方案核对';
    return '确认点 1: 招标要求核对';
  }

  provideSupplement() {}
  revealChapterManually(chapterId: string) {
    this.state.focus = { ...this.state.focus, chapter: chapterId };
    this.emit();
  }
  revealVolumeManually(volumeId: string) {
    this.state.focus = { ...this.state.focus, volume: volumeId };
    this.emit();
  }
  addCustomUserMessage(text: string) {
    this.state.logs = [
      ...this.state.logs,
      { id: `user-${Date.now()}`, text: `用户指示: ${text}`, stage: this.state.activeStage || 1 },
    ];
    this.emit();
  }
}
