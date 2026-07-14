import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, getArtifact, runProject } from './api';

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
});
