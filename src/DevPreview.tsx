/* eslint-disable */
// TEMP visual-QA harness for the 1c redesign — NOT shipped, deleted after manual verification.
import { useMemo } from 'react';
import { EditorWorkspace } from './components/editor/EditorWorkspace';
import { kqyy } from './scenarios/kqyy';
import type { EngineState } from './engine/ScenarioEngine';
import type { WorkspaceEngine } from './engine/sources';
import type { BackendRequirement, BackendReport, BackendExportPlan } from './engine/types';
import { createEmptyChatState } from './engine/types';

const REQS: BackendRequirement[] = [
  { id: 'req.price', type: '废标', text: '投标报价不得超过最高限价 ¥270,000', page: 12, mandatory: true, score_weight: 10 },
  { id: 'req.send', type: '废标', text: '承诺协助强制检定及强检送检申报', page: 18, mandatory: true, score_weight: null },
  { id: 'req.people', type: '废标', text: '拟任技术负责人须具备二级及以上注册计量师资格', page: 21, mandatory: true, score_weight: 13 },
  { id: 'req.perf', type: '评分', text: '京津冀同类三甲医院计量检测业绩，每例 3 分，最高 10 分', page: 24, mandatory: false, score_weight: 10 },
  { id: 'req.need', type: '评分', text: '采购需求参数及条款响应，无负偏离', page: 26, mandatory: false, score_weight: 22 },
  { id: 'req.plan', type: '评分', text: '整体检测服务方案（方案 / 流程 / 报告质量控制）', page: 28, mandatory: false, score_weight: 15 },
  { id: 'req.cnas', type: '评分', text: '具有 CNAS 国家认可证书', page: 30, mandatory: false, score_weight: 5 },
  { id: 'req.qc', type: '技术参数', text: '质量保障管理与检测设备溯源、校准证书完备性', page: 33, mandatory: false, score_weight: null },
  { id: 'req.emg', type: '技术参数', text: '应急预案及突发故障处置机制', page: 35, mandatory: false, score_weight: null },
  { id: 'req.tax', type: '商务条款', text: '近半年依法纳税，无失信记录', page: 40, mandatory: false, score_weight: null },
  { id: 'req.fmt', type: '格式', text: '投标文件按目录顺序装订并加盖骑缝章', page: 3, mandatory: false, score_weight: null },
];

const REPORT: BackendReport = {
  coverage: { total: 27, responded: 27, missing: [], 废标风险项: [] },
  deviations: [
    { requirement_id: 'req.perf', 招标要求原文: '京津冀同类三甲医院业绩', 应答内容: '现为北京 3 例', deviation: '正偏离', 说明: '业绩口径存疑，置信度 62%' },
  ],
};

const EXPORT_PLAN: BackendExportPlan = {
  output_mode: '单分册',
  package_zip: false,
  naming_pattern: '{公司}_{项目}_{分册}',
  volumes: [
    {
      volume_id: 'vol.1',
      cover_title: '投标文件（响应分册）',
      file_name: '迈创精准_北京口腔医院_投标文件.docx',
      section_ids: kqyy.volumes[0].chapters.map((c) => c.id),
      sealed_separately: false,
      requires_toc: true,
      requires_seal_page: true,
      requires_index_table: true,
      evidence: ['9 章 · 27 项要求全覆盖'],
    },
  ],
};

function baseState(): EngineState {
  return {
    status: 'paused',
    cursor: 0,
    speed: 1,
    activeStage: 6,
    logs: [
      { id: 'l1', text: '组装整体服务方案与质量控制体系…', stage: 6 },
      { id: 'l2', text: '库检索命中：CNAS 认可证书 (编号 L48532) 满足「实验室国家认可」5 分项 ✅', stage: 5 },
    ],
    grownVolumes: ['vol.1'],
    revealedBlocks: kqyy.blocks.map((b) => b.id),
    matchedMaterials: ['mat.cnas', 'mat.cma', 'mat.wjg', 'mat.wwj', 'mat.tpl-plan'],
    revealedRedlines: [],
    pricingRevealed: false,
    focus: { docBlock: 'blk.plan', chapter: 'chap.9', volume: 'vol.1' },
    pendingCard: null,
    redlineOverrides: {},
    backendRequirements: REQS,
    backendTenderSpec: null,
    backendExportPlan: null,
    backendOutline: null,
    backendCoverage: null,
    backendReport: null,
    serverDocxUrl: null,
    serverPackageUrl: null,
    error: null,
    mode: 'live',
    chat: createEmptyChatState(),
  };
}

function stateForPhase(p: string): EngineState {
  const s = baseState();
  if (p === 'chat') {
    s.activeStage = 2;
    s.status = 'awaiting';
    s.chat = {
      messages: [
        {
          turn_id: 't-0001',
          client_message_id: '123e4567-e89b-42d3-a456-426614174000',
          role: 'user',
          text: '把技术服务方案的标题改得更贴合招标要求，并说明依据。',
          intent: null,
          pipeline_state: 'checkpoint:2',
          context_fingerprint: 'preview-context',
          context_turn_ids: [],
          context_stale: false,
          citations: [],
          material_ids: ['mat.tpl-plan'],
          created_by: 'preview@example.com',
          ts: '2026-07-21T08:00:00+00:00',
        },
        {
          turn_id: 't-0002',
          client_message_id: '123e4567-e89b-42d3-a456-426614174000',
          role: 'assistant',
          text: '建议将标题调整为“计量检测服务实施方案与质量保障”，覆盖服务实施与质量控制两类评分点。',
          intent: 'proposal',
          pipeline_state: 'checkpoint:2',
          context_fingerprint: 'preview-context',
          context_turn_ids: [],
          context_stale: true,
          citations: ['req.plan', '/sections/0/title'],
          proposal_id: 'p-0001',
          material_ids: ['mat.tpl-plan'],
          created_by: 'copilot',
          model_id: 'deepseek-v4-flash',
          ts: '2026-07-21T08:00:02+00:00',
        },
      ],
      proposals: [
        {
          proposal_id: 'p-0001',
          turn_id: 't-0002',
          target_artifact: 'outline',
          checkpoint: 2,
          base_fingerprint: 'base-preview',
          result_fingerprint: 'result-preview',
          patch: [{ op: 'replace', path: '/sections/0/title', value: '计量检测服务实施方案与质量保障' }],
          op_targets: [{ op_index: 0, kind: 'existing', entity_id: 'sec-001', parent_pointer: '/sections' }],
          diff: [{
            op: 'replace',
            path: '/sections/0/title',
            label: 'sec-001 · title',
            before: '技术服务方案',
            after: '计量检测服务实施方案与质量保障',
          }],
          summary: '标题更贴合实施方案与质量保障评分点',
          status: 'proposed',
          created_by: 'preview@example.com',
          created_at: '2026-07-21T08:00:02+00:00',
          resolved_by: null,
          resolved_at: null,
        },
      ],
      sending: false,
      tailState: 'interrupted',
      pendingClientMessageId: null,
    };
  } else if (p === '2') {
    s.activeStage = 2;
    s.revealedBlocks = [];
    s.grownVolumes = [];
    s.pendingCard = {
      id: 'confirm-1',
      kind: 'checkpoint',
      stage: 2,
      duration: 0,
      checkpointTitle: '确认点 1：招标要求核对',
      checkpointBody: '请抽查、编辑后确认继续。',
    } as any;
    s.status = 'awaiting';
  } else if (p === '3') {
    s.pendingCard = {
      id: 'escalate-perf',
      kind: 'escalate',
      stage: 5,
      duration: 0,
      escalateTitle: '业绩条款口径匹配警告',
      escalateBody: '业绩口径存疑：招标要求「京津冀」，现为北京 3 例。建议补充津冀业绩，置信度 62%。',
      confidence: 0.62,
      options: [
        { label: '采纳 · 补充津冀业绩', effect: { type: 'continue' } },
        { label: '保持现状', effect: { type: 'continue' } },
      ],
    } as any;
    s.status = 'awaiting';
    // 手工加一个可靠命中的行内芯片，验证 EvidenceChip 渲染
    const plan = kqyy.blocks.find((b) => b.id === 'blk.plan');
    if (plan) (plan as any).chips = [
      { text: 'CNAS 实验室认可准则', materialId: 'mat.cnas', status: 'hit' },
      { text: '数字多功能计量标准器', materialId: 'mat.rad', status: 'missing' },
    ];
  } else if (p === '4') {
    s.activeStage = 7;
    s.pricingRevealed = true;
  } else if (p === '5') {
    s.activeStage = 8;
    s.revealedRedlines = kqyy.redlines.map((r) => r.id);
    s.backendCoverage = REPORT.coverage;
    s.backendReport = REPORT;
  } else if (p === '6') {
    s.activeStage = 9;
    s.backendExportPlan = EXPORT_PLAN;
    s.pendingCard = { id: 'export-live', kind: 'export', stage: 9, duration: 0, checkpointTitle: '全流程完成', checkpointBody: '' } as any;
  }
  return s;
}

const noopEngine: WorkspaceEngine = {
  getState: () => baseState(),
  subscribe: () => () => {},
  reset: () => {},
  stepOnce: () => {},
  setSpeed: () => {},
  play: () => {},
  pause: () => {},
  confirmCheckpoint: () => console.log('confirmCheckpoint'),
  chooseOption: (i) => console.log('chooseOption', i),
  provideSupplement: () => {},
  revealChapterManually: (id) => console.log('revealChapter', id),
  revealVolumeManually: (id) => console.log('revealVolume', id),
  addCustomUserMessage: (t) => console.log('userMsg', t),
};

export default function DevPreview() {
  const phase = new URLSearchParams(window.location.search).get('p') || '3';
  const state = useMemo(() => stateForPhase(phase), [phase]);
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--canvas)] font-sans">
      <EditorWorkspace state={state} scenario={kqyy} engine={noopEngine} onOpenLibrary={() => {}} />
    </div>
  );
}
