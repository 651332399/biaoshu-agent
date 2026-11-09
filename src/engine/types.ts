export type BackendRequirementType = '资质' | '评分' | '废标' | '格式' | '技术参数' | '商务条款';

export type JsonPointer = string;
export type EntityRef = string;

export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace';
  path: JsonPointer;
  value?: unknown;
}

export interface OpTarget {
  op_index: number;
  kind: 'existing' | 'new' | 'scalar';
  entity_id: EntityRef | null;
  parent_pointer: JsonPointer;
  anchor_prev_id?: EntityRef | null;
  anchor_next_id?: EntityRef | null;
  collection_digest?: string | null;
}

export interface FieldDiff {
  op: 'add' | 'remove' | 'replace';
  path: JsonPointer;
  label: string;
  before: unknown | null;
  after: unknown | null;
}

export interface EscalationDecisionProposal {
  escalation_id: string;
  option_index: number;
  rationale: string;
}

export type ChatIntent =
  | 'answer'
  | 'clarify'
  | 'proposal'
  | 'material'
  | 'escalation_decision'
  | 'error';

export interface ChatTurn {
  turn_id: string;
  client_message_id: string | null;
  request_digest?: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: ChatIntent | null;
  pipeline_state: string;
  context_fingerprint: string;
  context_turn_ids: string[];
  context_stale: boolean;
  citations: string[];
  proposal_id?: string | null;
  escalation_proposal?: EscalationDecisionProposal | null;
  material_ids: string[];
  created_by: string;
  model_id?: string | null;
  llm_response_digest?: string | null;
  ts: string;
}

export interface ChatProposal {
  proposal_id: string;
  turn_id: string;
  target_artifact: 'requirements' | 'outline' | 'tender_spec';
  checkpoint: 1 | 2 | 4;
  base_fingerprint: string;
  result_fingerprint: string;
  patch: JsonPatchOp[];
  op_targets: OpTarget[];
  diff: FieldDiff[];
  summary: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'stale';
  created_by: string;
  created_at: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
}

export type ProposalCard = ChatProposal;
export type ChatTailState = 'answered' | 'processing' | 'interrupted';

export interface ChatState {
  messages: ChatTurn[];
  proposals: ProposalCard[];
  sending: boolean;
  tailState: ChatTailState;
  pendingClientMessageId: string | null;
}

export function createEmptyChatState(): ChatState {
  return {
    messages: [],
    proposals: [],
    sending: false,
    tailState: 'answered',
    pendingClientMessageId: null,
  };
}

export interface BackendRequirement {
  id: string;
  type: BackendRequirementType;
  text: string;
  page: number | null;
  mandatory: boolean;
  score_weight: number | null;
  summary?: string | null;
  needs_manual_screenshot?: boolean;
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

export interface BackendTextSpan {
  text: string;
  emphasis: 'none' | 'strong' | 'emphasis';
}

export interface BackendParagraphBlock {
  kind: 'paragraph';
  level: 'body' | 'heading1' | 'heading2' | 'heading3';
  spans: BackendTextSpan[];
  maps_to_requirement_ids: string[];
}

export interface BackendTableBlock {
  kind: 'table';
  header: string[];
  rows: string[][];
  col_widths_cm: number[] | null;
  style_id: string;
}

export interface BackendImageBlock {
  kind: 'image';
  asset_ref: string;
  full_page: boolean;
  caption: string | null;
}

export type BackendBlock = BackendParagraphBlock | BackendTableBlock | BackendImageBlock;

export interface BackendSectionDraft {
  section_id?: string;
  volume_id?: string;
  title: string;
  // content：旧的纯文本正文兜底路径。blocks 非空时（llm 模式真实生成）优先用
  // blocks 拼正文，两者与后端 schemas.py::SectionDraft 的并存约定保持一致。
  content: string;
  blocks: BackendBlock[];
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

export interface BackendPendingMaterialItem {
  section_title: string;
  maps_to_requirement_ids: string[];
}

export interface BackendReport {
  coverage: BackendCoverageReport;
  deviations: BackendDeviationItem[];
  pending_materials?: BackendPendingMaterialItem[];
}

export interface BackendAssetMatch {
  asset_id: string;
  requirement_id?: string | null;
  section_title?: string | null;
  category?: BackendMaterialCategory;
  material_name?: string;
  score: number;
  content: string;
}

export interface BackendProjectMeta {
  项目名: string | null;
  项目编号?: string | null;
  包号?: string | null;
  采购人: string | null;
  供应商占位?: string;
  服务周期?: string | null;
  限价: number | null;
  evidence?: string[];
  evidence_by_field?: Partial<Record<'项目名' | '项目编号' | '采购人', string[]>>;
  confirmed_fields?: ('项目名' | '项目编号' | '采购人')[];
}

export interface BackendVolumeSpec {
  volume_id: string;
  role?: 'response' | 'price' | 'qualification' | 'business' | 'technical' | 'tech_business' | 'attachments' | 'general';
  cover_title: string;
  file_name: string;
  section_ids: string[];
  sealed_separately: boolean;
  requires_toc: boolean;
  requires_seal_page: boolean;
  requires_index_table: boolean;
  evidence: string[];
  required_forms?: string[];
}

export interface BackendExportPlan {
  output_mode: string;
  volumes: BackendVolumeSpec[];
  package_zip: boolean;
  naming_pattern: string;
  template_family?: 'single_response' | 'military_three_volume' | 'military_four_volume' | 'dynamic_response';
}

export interface BackendStyleSpec {
  body_font: string;
  body_size_pt: number;
  body_color: string;
  heading_fonts: Record<string, string>;
  heading_sizes_pt: Record<string, number>;
  heading_colors: Record<string, string>;
  line_spacing: number;
  line_spacing_pt: number | null;
  margins_cm: Record<string, number>;
  page_size: string;
  toc_levels: string;
  header_text: string | null;
  page_number: string | null;
  binding: string | null;
  evidence: string[];
}

export interface BackendSubmissionSpec {
  copies: Record<string, number>;
  original_copy_marking: boolean;
  sealing_groups: string[];
  cross_page_seal: string | null;
  binding: string | null;
  e_version: string | null;
  evidence: string[];
}

export interface BackendFormSpec {
  form_id: string;
  volume_id: string;
  title: string;
  fill_mode: 'copy_verbatim' | 'skeleton_rows' | 'skeleton_fill';
  source_status: 'available' | 'generated' | 'missing';
  source_evidence: string[];
  header_snapshot: string[];
  structure_fingerprint: string | null;
  fingerprint_anchor: string | null;
  source_kind: 'tender' | 'registry' | 'generated' | 'missing';
  template_source: string | null;
  template_source_sha256: string | null;
  template_confirmed: boolean;
  template_confirmed_at: string | null;
  template_confirmation_digest: string | null;
}

export interface BackendFormCandidate {
  candidate_id: string;
  volume_id: string;
  title: string;
  evidence: string[];
  confidence: number;
  status: 'required' | 'excluded' | 'pending';
  reason: string;
}

export interface BackendTenderSpec {
  project_meta: BackendProjectMeta;
  export_plan: BackendExportPlan;
  style_spec: BackendStyleSpec;
  submission_spec: BackendSubmissionSpec;
  forms: BackendFormSpec[];
  form_candidates?: BackendFormCandidate[];
  required_form_baseline: Record<string, string[]>;
  needs_confirmation: boolean;
  confirmation_reasons: string[];
  confirmation_status: 'pending' | 'confirmed';
  confirmed_reasons: string[];
  confirmed_at: string | null;
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

export type GenerationStatus =
  | 'generation_started'
  | 'generated'
  | 'server_precheck_failed'
  | 'server_precheck_passed'
  | 'awaiting_wps_acceptance'
  | 'wps_verification_failed'
  | 'archiving'
  | 'accepted'
  | 'superseded';

export type WpsEvidenceType =
  | 'final_docx'
  | 'final_pdf'
  | 'cover'
  | 'font_status'
  | 'typography_color'
  | 'toc_pageref'
  | 'representative_table'
  | 'landscape_section';

export interface WpsValidationIssue {
  code: string;
  message: string;
  artifact_id?: string | null;
  evidence_type?: string | null;
}

export interface GenerationAcceptance {
  project_id: string;
  generation_id: string;
  artifact_set_digest: string | null;
  status: GenerationStatus;
  server_precheck_passed: boolean;
  final_delivery_approved: boolean;
  artifacts: {
    artifact_id: string;
    file_name: string;
    required_evidence_types: WpsEvidenceType[];
  }[];
  required_evidence_slots: string[];
  missing_evidence_slots: string[];
  validation_issues: WpsValidationIssue[];
  archiving_issues: WpsValidationIssue[];
  archive_retryable: boolean;
  archive_location: {
    backend: string;
    objects: Record<string, {
      key: string;
      version_id: string;
      etag: string;
      size: number;
      sha256: string;
      retention: string;
      object_lock_mode: string;
    }>;
  } | null;
}

export interface WpsAcceptanceChecks {
  local_fonts_confirmed: boolean;
  all_fields_updated: boolean;
  toc_pageref_checked: boolean;
  pagination_checked: boolean;
  tables_checked: boolean;
  fonts_checked: boolean;
  colors_checked: boolean;
  saved_reopened_checked: boolean;
  final_pdf_exported: boolean;
  evidence_slots_complete: boolean;
}

export type AcceptanceEventName =
  | 'generation_started'
  | 'awaiting_wps_acceptance'
  | 'evidence_received'
  | 'verification_failed'
  | 'verification_passed'
  | 'archiving'
  | 'accepted'
  | 'delivery_accepted'
  | 'interrupted_retryable'
  | 'interruption_resolved'
  | 'server_render_started'
  | 'server_precheck_failed'
  | 'superseded';

export interface AcceptanceEventData {
  id: number;
  event: AcceptanceEventName;
  data: Record<string, unknown>;
}

/** 后端素材库 Material(knowledge/schema.py)——与前端 demo Material 区分。 */
export type BackendMaterialCategory = 'qual' | 'people' | 'device' | 'record' | 'template';

export interface BackendQualificationDetail {
  certificate_name: string;
  issuing_authority: string;
  amount?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface BackendMaterial {
  id: string;
  category: BackendMaterialCategory;
  name: string;
  description?: string;
  keywords?: string[];
  qualification?: BackendQualificationDetail | null;
  library_id?: string;
  file_path?: string | null;
}
