export type BackendRequirementType = '资质' | '评分' | '废标' | '格式' | '技术参数' | '商务条款';

export interface BackendRequirement {
  id: string;
  type: BackendRequirementType;
  text: string;
  page: number | null;
  mandatory: boolean;
  score_weight: number | null;
}

export interface BackendSection {
  id?: string;
  title: string;
  volume_id?: string;
  maps_to_requirement_ids: string[];
  asset_refs: string[];
}

export interface BackendOutline {
  sections: BackendSection[];
}

export interface BackendSectionDraft {
  section_id?: string;
  volume_id?: string;
  title: string;
  content: string;
  maps_to_requirement_ids: string[];
}

export interface BackendDeviationItem {
  requirement_id: string;
  招标要求原文: string;
  应答内容: string;
  deviation: '正偏离' | '无偏离' | '负偏离';
  说明: string;
}

export interface BackendCoverageReport {
  total: number;
  responded: number;
  missing: string[];
  废标风险项: string[];
}

export interface BackendReport {
  coverage: BackendCoverageReport;
  deviations: BackendDeviationItem[];
}

export interface BackendAssetMatch {
  asset_id: string;
  requirement_id?: string | null;
  section_title?: string | null;
  score: number;
  content: string;
}

export interface BackendProjectMeta {
  项目名: string;
  采购人: string | null;
  限价: number | null;
}

export interface BackendVolumeSpec {
  volume_id: string;
  cover_title: string;
  file_name: string;
  section_ids: string[];
  sealed_separately: boolean;
  requires_toc: boolean;
  requires_seal_page: boolean;
  requires_index_table: boolean;
  evidence: string[];
}

export interface BackendExportPlan {
  output_mode: string;
  volumes: BackendVolumeSpec[];
  package_zip: boolean;
  naming_pattern: string;
}

export type BiaoshuEventName =
  | 'run_started'
  | 'node_started'
  | 'node_progress'
  | 'artifact_ready'
  | 'confirm_request'
  | 'escalate_request'
  | 'escalate_response'
  | 'node_completed'
  | 'run_failed'
  | 'run_completed';

export interface BiaoshuEvent {
  id: number;
  event: BiaoshuEventName;
  data: Record<string, unknown>;
}
