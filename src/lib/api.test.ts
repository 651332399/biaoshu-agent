import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  ApiError,
  getArtifact,
  getGenerationAcceptance,
  regenerateProjectExport,
  runProject,
  submitWpsAcceptance,
  uploadWpsEvidence,
} from './api';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(getArtifact('/x')).resolves.toEqual({ ok: true });
  });

  test('normalizes backend JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'bad upload' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(getArtifact('/x')).rejects.toMatchObject(new ApiError('bad upload', 400));
  });

  test('renders structured backend validation errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      detail: [{ code: 'critical_meta_unconfirmed', message: 'critical metadata unconfirmed: 采购人' }],
    }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(getArtifact('/x')).rejects.toMatchObject(
      new ApiError('critical metadata unconfirmed: 采购人', 422),
    );
  });

  test('starts runs in llm mode by default', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'started' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await runProject('project-1');

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ mode: 'llm' });
  });

  test('regenerates export from the current editor blocks', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      status: 'exported', url: '/api/projects/p1/artifacts/export/package.zip',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const blocks = [{
      id: 'b1', chapterId: 's1', render: 'prose' as const, 标题: '正文', prose: '人工编辑',
    }];

    await regenerateProjectExport('p1', blocks);

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/export', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ blocks, dirty_block_ids: [] }),
    }));
  });

  test('loads generation acceptance from its dedicated endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      generation_id: 'g1', status: 'awaiting_wps_acceptance', missing_evidence_slots: [],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getGenerationAcceptance('p1', 'g1');

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/generations/g1/acceptance');
  });

  test('uploads WPS evidence with a bound slot, digest, and idempotency key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'stored' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['docx'], 'technical.final.docx');

    await uploadWpsEvidence('p1', 'g1', {
      artifactId: 'technical',
      evidenceType: 'final_docx',
      sha256: 'a'.repeat(64),
      idempotencyKey: 'upload-1',
      file,
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = options?.body as FormData;
    expect(fetchMock.mock.calls[0][0]).toBe('/api/projects/p1/generations/g1/wps-evidence');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({ 'Idempotency-Key': 'upload-1' });
    expect(body.get('artifact_id')).toBe('technical');
    expect(body.get('evidence_type')).toBe('final_docx');
    expect(body.get('sha256')).toBe('a'.repeat(64));
    expect(body.get('file')).toBe(file);
  });

  test('uses controlled presigned flow for evidence larger than 200 MiB', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        upload_id: 'f'.repeat(32),
        upload_url: 'https://objects.example.invalid/upload',
        required_headers: {
          'if-none-match': '*',
          'x-amz-meta-sha256': 'a'.repeat(64),
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'stored' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['docx'], 'technical.final.docx');
    Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 + 1 });

    await uploadWpsEvidence('p1', 'g1', {
      artifactId: 'technical',
      evidenceType: 'final_docx',
      sha256: 'a'.repeat(64),
      idempotencyKey: 'large-upload-1',
      file,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/projects/p1/generations/g1/wps-evidence/presign',
    );
    expect(fetchMock.mock.calls[1]).toEqual([
      'https://objects.example.invalid/upload',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'if-none-match': '*',
          'x-amz-meta-sha256': 'a'.repeat(64),
        },
        body: file,
      }),
    ]);
    expect(fetchMock.mock.calls[2][0]).toContain(
      `/wps-evidence/presign/${'f'.repeat(32)}/complete`,
    );
  });

  test('submits WPS acceptance checklist and workstation inventory', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'archiving' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = {
      checks: {
        local_fonts_confirmed: true,
        all_fields_updated: true,
        toc_pageref_checked: true,
        pagination_checked: true,
        tables_checked: true,
        fonts_checked: true,
        colors_checked: true,
        saved_reopened_checked: true,
        final_pdf_exported: true,
        evidence_slots_complete: true,
      },
      font_inventory: {
        os_version: 'Windows 11', wps_version: '12.1',
        fonts: [{ requested_family: 'SimSun', actual_family: 'SimSun', embedded: true, matched: true }],
      },
    };

    await submitWpsAcceptance('p1', 'g1', request);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/p1/generations/g1/wps-acceptance',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }),
    );
  });
});
