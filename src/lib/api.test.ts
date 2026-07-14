import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, getArtifact, regenerateProjectExport, runProject } from './api';

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
      body: JSON.stringify({ blocks }),
    }));
  });
});
