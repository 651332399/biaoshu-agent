import { describe, expect, test, vi } from 'vitest';
import { uploadCurrentDocument, type UploadDeps, type UploadMemo } from './uploadCurrentDocument';
import type { ActiveDocumentBytes, RuntimeAdapter } from '../platform/RuntimeAdapter';

const FINGERPRINT = { size: 245290, mtimeMs: 1787045609635, ino: 270443 };

function makeDeps(
  doc: Partial<ActiveDocumentBytes>,
  memo: UploadMemo | null,
  digest = 'sha-new',
): UploadDeps & { written: UploadMemo[] } {
  const written: UploadMemo[] = [];
  const runtime = {
    readActiveDocumentBytes: async () => ({
      name: 'tender.docx',
      fullName: '/home/CMCC/tender.docx',
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
      fingerprint: FINGERPRINT,
      ...doc,
    }),
  } as unknown as RuntimeAdapter;

  return {
    runtime,
    upload: vi.fn(async () => ({ project_id: 'p-new' })),
    run: vi.fn(async () => ({})),
    digest: vi.fn(async () => digest),
    readMemo: () => memo,
    writeMemo: (m: UploadMemo) => void written.push(m),
    written,
  };
}

const MEMO: UploadMemo = {
  fullName: '/home/CMCC/tender.docx',
  sha256: 'sha-old',
  fingerprint: FINGERPRINT,
  projectId: 'p-old',
};

describe('uploadCurrentDocument', () => {
  test('首次上传：建项目并起流水线', async () => {
    const deps = makeDeps({}, null);
    const result = await uploadCurrentDocument(deps);

    expect(result).toEqual({
      projectId: 'p-new',
      name: 'tender.docx',
      sha256: 'sha-new',
      reused: false,
    });
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(deps.run).toHaveBeenCalledWith('p-new');

    // 上传的必须是原始字节（§5.1），文件名取 Document.Name
    const file = (deps.upload as unknown as { mock: { calls: [File][] } }).mock.calls[0][0];
    expect(file.name).toBe('tender.docx');
    expect(file.size).toBe(4);
  });

  test('不等待 run 完成——/run 要跑到确认点①才返回，窗格不能卡在上传中', async () => {
    const deps = makeDeps({}, null);
    let settled = false;
    deps.run = vi.fn(
      () => new Promise((resolve) => setTimeout(() => { settled = true; resolve({}); }, 50)),
    );

    const result = await uploadCurrentDocument(deps);
    expect(result.reused).toBe(false);
    expect(deps.run).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false); // upload 已返回，run 还在跑
  });

  test('run 失败经 onRunFailed 回报，不把上传本身判成失败', async () => {
    const deps = makeDeps({}, null);
    const onRunFailed = vi.fn();
    deps.run = vi.fn(async () => { throw new Error('429 项目数量已达上限'); });
    deps.onRunFailed = onRunFailed;

    const result = await uploadCurrentDocument(deps);
    expect(result.projectId).toBe('p-new');
    await new Promise((r) => setTimeout(r, 0)); // 让 catch 跑完
    expect(onRunFailed).toHaveBeenCalledTimes(1);
  });

  test('指纹一致就复用，连 sha256 都不算', async () => {
    const deps = makeDeps({}, MEMO);
    const result = await uploadCurrentDocument(deps);

    expect(result).toMatchObject({ projectId: 'p-old', reused: true, sha256: 'sha-old' });
    expect(deps.digest).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
  });

  test('指纹变了但内容没变（touch/另存回原位）仍算同一份，并刷新指纹', async () => {
    const deps = makeDeps({ fingerprint: { ...FINGERPRINT, mtimeMs: 999 } }, MEMO, 'sha-old');
    const result = await uploadCurrentDocument(deps);

    expect(result).toMatchObject({ projectId: 'p-old', reused: true });
    expect(deps.digest).toHaveBeenCalledTimes(1);
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.written[0].fingerprint).toEqual({ ...FINGERPRINT, mtimeMs: 999 });
  });

  test('内容变了就重新建项目', async () => {
    const deps = makeDeps({ fingerprint: { ...FINGERPRINT, size: 1 } }, MEMO, 'sha-changed');
    const result = await uploadCurrentDocument(deps);

    expect(result.reused).toBe(false);
    expect(result.projectId).toBe('p-new');
    expect(deps.upload).toHaveBeenCalledTimes(1);
  });

  test('换了文档但指纹碰巧相同——路径不同就不复用', async () => {
    const deps = makeDeps({ fullName: '/home/CMCC/另一份.docx' }, MEMO, 'sha-other');
    const result = await uploadCurrentDocument(deps);
    expect(result.reused).toBe(false);
  });

  test('拿不到指纹时不当成命中，老实算 sha256', async () => {
    const deps = makeDeps({ fingerprint: null }, { ...MEMO, fingerprint: null }, 'sha-old');
    const result = await uploadCurrentDocument(deps);

    expect(deps.digest).toHaveBeenCalledTimes(1);
    expect(result.reused).toBe(true); // 靠 sha256 命中，不是靠指纹
  });

  test('读文档失败直接抛出，不建空项目', async () => {
    const deps = makeDeps({}, null);
    deps.runtime.readActiveDocumentBytes = async () => {
      throw new Error('当前文档尚未保存到磁盘，请先保存后再上传');
    };
    await expect(uploadCurrentDocument(deps)).rejects.toThrow('尚未保存到磁盘');
    expect(deps.upload).not.toHaveBeenCalled();
  });
});
