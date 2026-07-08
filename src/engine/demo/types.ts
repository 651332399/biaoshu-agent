import type { BackendRequirementType } from '../types';

export type ReviewMethod = 'composite' | 'lowest-price'; // 综合评分 | 经评审最低价

export interface ScenarioMeta {
  项目名: string;
  采购人: string;
  采购方式: string;
  评审办法: string;
  限价: number;
  报价: number;
  报价利用率: string;
  保证金: number;
  服务周期: string;
}

export interface Strategy {
  method: ReviewMethod;
  基调: string;
  报价基调: string;
}

export interface Chapter {
  id: string;
  标题: string;
  类型: '填空区' | '自撰区';
  maps_to_requirement_ids?: string[];
}

export interface Volume {
  id: string;
  名称: string;
  单独密封: boolean;
  chapters: Chapter[];
}

export interface Requirement {
  id: string;
  文本: string;
  标识?: '★' | '▲' | '*';
  分值?: number;
  类型?: BackendRequirementType;
  page?: number | null;
}

export interface MapRow {
  id: string;
  requirementId: string;
  volumeId: string;
  chapterId: string;
  证据类型: string;
}

export type MaterialCategory = 'qual' | 'people' | 'device' | 'record' | 'template';

export interface Material {
  id: string;
  category: MaterialCategory;
  名称: string;
  命中?: boolean;
  口径警告?: string;
  /** 前端模拟上传后处于待审核状态,尚未参与命中匹配 */
  pending?: boolean;
}

export interface Focus {
  material?: string;
  mapRow?: string;
  docBlock?: string;
  drawer?: MaterialCategory;
  requirement?: string;
  chapter?: string;
  volume?: string;
}

export type BlockRender = 'prose' | 'table' | 'form' | 'attachment';

/** 行内证据芯片：正文里某段文字锚定到一份企业资料(命中/需补) */
export interface EvidenceChipData {
  text: string;
  materialId: string;
  status?: 'hit' | 'missing';
}

export interface DocBlockData {
  id: string;
  chapterId: string;
  render: BlockRender;
  标题: string;
  prose?: string;
  table?: { headers: string[]; rows: string[][] };
  form?: { label: string; value: string }[];
  attachment?: { 名称: string; materialId: string };
  /** 可选：行内证据芯片。缺省时 DocumentCanvas 会按 materials 名称子串自动推导 */
  chips?: EvidenceChipData[];
}

export interface RedlineCheck {
  id: string;
  项: string;
  结果: 'pass' | 'warn' | 'fail';
  说明?: string;
}

export interface PricingLine {
  项目: string;
  数量: number;
  单价: number;
  小计: number;
}

export interface PricingWarning {
  level: 'high' | 'medium';
  title: string;
  detail: string;
}

export interface Pricing {
  lines: PricingLine[];
  限价: number;
  报价: number;
  利用率: string;
  压线告警?: string;
  warnings?: PricingWarning[];
}

export type StepKind =
  | 'log'
  | 'growTree'
  | 'matchMaterial'
  | 'genBlock'
  | 'redlineResult'
  | 'pricing'
  | 'checkpoint'
  | 'escalate'
  | 'export'
  | 'supplement';

export interface EscalateEffect {
  type: 'continue' | 'insert' | 'patch';
  steps?: Step[];
  set?: {
    redlineId?: string;
    结果?: RedlineCheck['结果'];
    materialSwap?: { id: string; 名称: string };
  };
}

export interface EscalateOption {
  label: string;
  effect: EscalateEffect;
}

export interface Step {
  id: string;
  stage: number;
  kind: StepKind;
  duration: number;
  log?: string;
  focus?: Focus;
  blockId?: string;
  treeVolumeId?: string;
  redlineId?: string;
  pricingReveal?: boolean;
  checkpointTitle?: string;
  checkpointBody?: string;
  escalateTitle?: string;
  escalateBody?: string;
  confidence?: number;
  options?: EscalateOption[];
  supplementType?: 'social' | 'pricing' | 'tax';
  supplementTitle?: string;
  supplementBody?: string;
}

export interface Scenario {
  id: 'kqyy' | 'yy922';
  meta: ScenarioMeta;
  strategy: Strategy;
  volumes: Volume[];
  requirements: Requirement[];
  mapping: MapRow[];
  materials: Material[];
  blocks: DocBlockData[];
  redlines: RedlineCheck[];
  pricing: Pricing;
  steps: Step[];
}
