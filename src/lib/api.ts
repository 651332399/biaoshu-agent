import type { BackendRequirement } from '../engine/types';
import type { DocBlockData } from '../engine/demo/types';

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
    const detail = typeof body === 'object' && body && 'detail' in body ? String(body.detail) : String(body);
    throw new ApiError(detail || response.statusText, response.status);
  }
  return body as T;
}

export async function uploadProject(file: File): Promise<{ project_id: string }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/projects', {
    method: 'POST',
    body: form,
  });
  return readResponse(response);
}

export async function runProject(projectId: string, mode: 'recorded' | 'rules' | 'llm' = 'recorded') {
  const response = await fetch(`/api/projects/${projectId}/run`, {
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
) {
  const response = await fetch(`/api/projects/${projectId}/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      checkpoint,
      action,
      edited_artifact: action === 'edit' ? artifact : undefined,
    }),
  });
  return readResponse<{ status: string }>(response);
}

export async function escalateProject(
  projectId: string,
  escalationId: string,
  optionIndex: number,
) {
  const response = await fetch(`/api/projects/${projectId}/escalate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ escalation_id: escalationId, option_index: optionIndex }),
  });
  return readResponse<{ status: string }>(response);
}

export async function getArtifact<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return readResponse<T>(response);
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
}

export async function getProjectState(projectId: string): Promise<ProjectState> {
  const response = await fetch(`/api/projects/${projectId}/state`);
  return readResponse<ProjectState>(response);
}

export async function saveDocumentBlocks(projectId: string, blocks: DocBlockData[]) {
  const response = await fetch(`/api/projects/${projectId}/document-blocks`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });
  return readResponse<{ status: string }>(response);
}
