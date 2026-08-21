import type {
  AcceptanceEventData,
  BackendMaterial,
  BackendRequirement,
  ChatProposal,
  ChatTailState,
  ChatTurn,
  GenerationAcceptance,
  GenerationStatus,
  WpsAcceptanceChecks,
  WpsEvidenceType,
} from '../engine/types';
import type { DocBlockData } from '../engine/demo/types';
import { apiUrl } from './apiBase';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof body === 'object' && body && 'detail' in body
      ? formatErrorDetail(body.detail)
      : String(body);
    throw new ApiError(detail || response.statusText, response.status);
  }
  return body as T;
}

function formatErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(formatErrorDetail).filter(Boolean).join('；');
  }
  if (detail && typeof detail === 'object') {
    const value = detail as Record<string, unknown>;
    return String(value.message ?? value.msg ?? value.detail ?? JSON.stringify(value));
  }
  return String(detail);
}

export async function uploadProject(file: File): Promise<{ project_id: string }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(apiUrl('/api/projects'), {
    method: 'POST',
    body: form,
  });
  return readResponse(response);
}

export async function runProject(projectId: string, mode: 'recorded' | 'rules' | 'llm' = 'llm') {
  const response = await fetch(apiUrl(`/api/projects/${projectId}/run`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  return readResponse<{ status: string }>(response);
}

export async function confirmProject(
  projectId: string,
  artifact: unknown,
  action: 'approve' | 'edit' = 'edit',
  checkpoint = 1,
  confirmedFields: ('项目名' | '项目编号' | '采购人')[] = [],
  saveAsTemplate = false,
) {
  const body: Record<string, unknown> = {
    checkpoint,
    action,
    edited_artifact: action === 'edit' ? artifact : undefined,
  };
  if (confirmedFields.length > 0) body.confirmed_fields = confirmedFields;
  if (saveAsTemplate) body.save_as_template = true;
  const response = await fetch(apiUrl(`/api/projects/${projectId}/confirm`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readResponse<{ status: string; template_id?: string }>(response);
}

export async function escalateProject(
  projectId: string,
  escalationId: string,
  optionIndex: number,
) {
  const response = await fetch(apiUrl(`/api/projects/${projectId}/escalate`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ escalation_id: escalationId, option_index: optionIndex }),
  });
  return readResponse<{ status: string }>(response);
}

export async function getArtifact<T>(url: string): Promise<T> {
  const response = await fetch(apiUrl(url));
  return readResponse<T>(response);
}

export interface ChatPostResponse {
  status: 'done';
  user_turn: ChatTurn;
  assistant_turn: ChatTurn;
  proposal: ChatProposal | null;
}

export interface ChatProcessingResponse {
  status: 'processing' | 'interrupted';
  phase?: 'checking' | 'running';
  turn_id: string | null;
}

export type ChatSendResponse = ChatPostResponse | ChatProcessingResponse;

export interface ChatHistoryResponse {
  turns: ChatTurn[];
  proposals?: ChatProposal[];
  tail_state: ChatTailState;
}

export interface ChatProposalResolveResponse {
  status: 'accepted' | 'rejected';
  proposal: ChatProposal;
}

export async function sendProjectChat(
  projectId: string,
  text: string,
  clientMessageId: string,
  materialIds: string[] = [],
): Promise<ChatSendResponse> {
  const response = await fetch(apiUrl(`/api/projects/${projectId}/chat`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, client_message_id: clientMessageId, material_ids: materialIds }),
  });
  if (response.status === 409) {
    const body = await response.json() as { detail?: ChatProcessingResponse };
    if (body.detail?.status === 'interrupted') return body.detail;
    throw new ApiError(JSON.stringify(body.detail ?? body), response.status);
  }
  return readResponse<ChatSendResponse>(response);
}

export async function getProjectChat(
  projectId: string,
  after?: string,
): Promise<ChatHistoryResponse> {
  const suffix = after ? `?after=${encodeURIComponent(after)}` : '';
  const response = await fetch(apiUrl(`/api/projects/${projectId}/chat${suffix}`));
  return readResponse<ChatHistoryResponse>(response);
}

export async function acceptChatProposal(
  projectId: string,
  proposalId: string,
): Promise<ChatProposalResolveResponse> {
  const response = await fetch(
    apiUrl(`/api/projects/${projectId}/chat/proposals/${proposalId}/accept`),
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
  );
  return readResponse<ChatProposalResolveResponse>(response);
}

export async function rejectChatProposal(
  projectId: string,
  proposalId: string,
): Promise<ChatProposalResolveResponse> {
  const response = await fetch(
    apiUrl(`/api/projects/${projectId}/chat/proposals/${proposalId}/reject`),
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
  );
  return readResponse<ChatProposalResolveResponse>(response);
}

export interface ProjectEscalation {
  escalation_id: string;
  node: string;
  title: string;
  body?: string;
  confidence?: number;
  options: { label: string }[];
}

export interface ProjectState {
  project_id: string;
  completed_nodes: string[];
  current_node: string | null;
  awaiting_checkpoint: number | null;
  awaiting_escalation: ProjectEscalation | null;
  artifacts: string[];
  generation_id: string | null;
  generation_status: GenerationStatus | null;
  server_precheck_passed: boolean;
  final_delivery_approved: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: 'active' | 'draft' | GenerationStatus;
  completed_steps: number;
  total_steps: number;
  current_node: string | null;
  updated_at: number;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const response = await fetch(apiUrl('/api/projects'));
  return readResponse<ProjectSummary[]>(response);
}

export async function getProjectState(projectId: string): Promise<ProjectState> {
  const response = await fetch(apiUrl(`/api/projects/${projectId}/state`));
  return readResponse<ProjectState>(response);
}

export async function saveDocumentBlocks(
  projectId: string,
  blocks: DocBlockData[],
  dirtyBlockIds?: string[],
) {
  const response = await fetch(apiUrl(`/api/projects/${projectId}/document-blocks`), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blocks, dirty_block_ids: dirtyBlockIds }),
  });
  return readResponse<{ status: string }>(response);
}

export async function regenerateProjectExport(
  projectId: string,
  blocks: DocBlockData[],
  dirtyBlockIds: string[] = [],
) {
  const response = await fetch(apiUrl(`/api/projects/${projectId}/export`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blocks, dirty_block_ids: dirtyBlockIds }),
  });
  return readResponse<{ status: string; url: string }>(response);
}

export async function getGenerationAcceptance(
  projectId: string,
  generationId: string,
): Promise<GenerationAcceptance> {
  const response = await fetch(
    apiUrl(`/api/projects/${projectId}/generations/${generationId}/acceptance`),
  );
  return readResponse<GenerationAcceptance>(response);
}

export interface WpsEvidenceUpload {
  artifactId: string;
  evidenceType: WpsEvidenceType;
  sha256: string;
  idempotencyKey: string;
  file: File;
}

const DIRECT_WPS_EVIDENCE_LIMIT = 200 * 1024 * 1024;

interface PresignedEvidenceReservation {
  upload_id: string;
  upload_url: string;
  required_headers: Record<string, string>;
}

export async function uploadWpsEvidence(
  projectId: string,
  generationId: string,
  upload: WpsEvidenceUpload,
): Promise<Record<string, unknown>> {
  if (upload.file.size > DIRECT_WPS_EVIDENCE_LIMIT) {
    const reservationResponse = await fetch(
      apiUrl(`/api/projects/${projectId}/generations/${generationId}/wps-evidence/presign`),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': upload.idempotencyKey,
        },
        body: JSON.stringify({
          artifact_id: upload.artifactId,
          evidence_type: upload.evidenceType,
          filename: upload.file.name,
          sha256: upload.sha256,
          size: upload.file.size,
        }),
      },
    );
    const reservation = await readResponse<PresignedEvidenceReservation>(
      reservationResponse,
    );
    const objectResponse = await fetch(reservation.upload_url, {
      method: 'PUT',
      headers: reservation.required_headers,
      body: upload.file,
    });
    if (!objectResponse.ok) {
      throw new ApiError('大文件证据上传到对象存储失败', objectResponse.status);
    }
    const completeResponse = await fetch(
      apiUrl(`/api/projects/${projectId}/generations/${generationId}/wps-evidence/`)
      + `presign/${reservation.upload_id}/complete`,
      { method: 'POST' },
    );
    return readResponse<Record<string, unknown>>(completeResponse);
  }
  const form = new FormData();
  form.append('artifact_id', upload.artifactId);
  form.append('evidence_type', upload.evidenceType);
  form.append('sha256', upload.sha256);
  form.append('file', upload.file);
  const response = await fetch(
    apiUrl(`/api/projects/${projectId}/generations/${generationId}/wps-evidence`),
    {
      method: 'POST',
      headers: { 'Idempotency-Key': upload.idempotencyKey },
      body: form,
    },
  );
  return readResponse<Record<string, unknown>>(response);
}

export interface WpsAcceptanceRequest {
  checks: WpsAcceptanceChecks;
  font_inventory: {
    os_version: string;
    wps_version: string;
    fonts: {
      requested_family: string;
      // PDF 里实际嵌入的 PostScript 名，空串表示批准字体没出现
      actual_family: string;
      embedded: boolean;
      matched: boolean;
    }[];
    unexpected_fonts?: string[];
  };
}

export async function submitWpsAcceptance(
  projectId: string,
  generationId: string,
  request?: WpsAcceptanceRequest,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    apiUrl(`/api/projects/${projectId}/generations/${generationId}/wps-acceptance`),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: request === undefined ? undefined : JSON.stringify(request),
    },
  );
  return readResponse<Record<string, unknown>>(response);
}

const ACCEPTANCE_EVENT_NAMES = [
  'generation_started',
  'awaiting_wps_acceptance',
  'evidence_received',
  'verification_failed',
  'verification_passed',
  'archiving',
  'accepted',
  'delivery_accepted',
  'interrupted_retryable',
  'interruption_resolved',
  'server_render_started',
  'server_precheck_failed',
  'superseded',
] as const;

export function subscribeGenerationAcceptance(
  projectId: string,
  generationId: string,
  onEvent: (event: AcceptanceEventData) => void,
): () => void {
  const source = new EventSource(
    apiUrl(`/api/projects/${projectId}/generations/${generationId}/acceptance/events`),
  );
  for (const eventName of ACCEPTANCE_EVENT_NAMES) {
    source.addEventListener(eventName, (event) => {
      const message = event as MessageEvent<string>;
      const data = message.data ? JSON.parse(message.data) as Record<string, unknown> : {};
      onEvent({ id: Number(message.lastEventId || 0), event: eventName, data });
    });
  }
  return () => source.close();
}

// ── 素材库(todo-6)─────────────────────────────────────────────
export async function listMaterials(libraryId = 'default'): Promise<BackendMaterial[]> {
  const response = await fetch(apiUrl(`/api/materials?library_id=${encodeURIComponent(libraryId)}`));
  return readResponse<BackendMaterial[]>(response);
}

/** 上传素材:metadata(Material JSON,含 id/category/name/keywords/…)+ 可选证照/图片文件。 */
export async function uploadMaterial(
  metadata: Omit<BackendMaterial, 'id' | 'file_path'>,
  file?: File | null,
): Promise<BackendMaterial> {
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  if (file) form.append('file', file);
  const response = await fetch(apiUrl('/api/materials'), { method: 'POST', body: form });
  return readResponse<BackendMaterial>(response);
}

export async function deleteMaterial(materialId: string, libraryId = 'default'): Promise<{ status: string }> {
  const response = await fetch(
    apiUrl(`/api/materials/${encodeURIComponent(materialId)}?library_id=${encodeURIComponent(libraryId)}`),
    { method: 'DELETE' },
  );
  return readResponse<{ status: string }>(response);
}
