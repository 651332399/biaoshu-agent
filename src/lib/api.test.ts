import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, getArtifact } from './api';

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
});

