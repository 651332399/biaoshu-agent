import { afterEach, describe, expect, test, vi } from 'vitest';
import { BrowserRuntime } from './BrowserRuntime';
import { WpsRuntime } from './WpsRuntime';
import { createRuntime, detectRuntime, getRuntime, resetRuntime } from './capabilities';
import { RuntimeNotImplementedError } from './RuntimeAdapter';

/** 造一个最小 WPS 桥，形态照 2026-08-21 兆芯实测（同步返回 ArrayBuffer，非 Promise）。 */
function stubWps(overrides: Record<string, unknown> = {}) {
  const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00]).buffer;
  const wps = {
    Version: '12.0',
    Build: '12.8.2.21176',
    ActiveDocument: {
      Name: 'tender.docx',
      FullName: '/home/CMCC/tender.docx',
      FollowHyperlink: vi.fn(),
    },
    FileSystem: {
      Exists: () => true,
      ReadFileAsArrayBuffer: () => bytes,
      stat: () => ({ size: 8, mtimeMs: 1787045609635, ino: 270443 }),
    },
    ...overrides,
  };
  vi.stubGlobal('wps', wps);
  return { wps, bytes };
}

const DOC_METHODS = [
  'openDocument',
  'updateAllFields',
  'saveFinalDocx',
  'exportFinalPdf',
  'reopenAndInspect',
  'collectWorkstationInventory',
] as const;

afterEach(() => {
  vi.unstubAllGlobals();
  resetRuntime();
});

describe('BrowserRuntime', () => {
  test('capabilities 声明没有本机文档能力', async () => {
    const caps = await new BrowserRuntime().capabilities();
    expect(caps.runtime).toBe('browser');
    expect(caps.readActiveDocumentBytes).toBe(false);
    expect(caps.documentAutomation).toBe(false);
  });

  test('读文档字节与全部文档操作都显式抛错，不静默降级', async () => {
    const runtime = new BrowserRuntime();
    await expect(runtime.readActiveDocumentBytes()).rejects.toBeInstanceOf(
      RuntimeNotImplementedError,
    );
    for (const method of DOC_METHODS) {
      await expect(
        (runtime[method] as () => Promise<unknown>).call(runtime, undefined),
      ).rejects.toBeInstanceOf(RuntimeNotImplementedError);
    }
  });
});

describe('WpsRuntime', () => {
  test('capabilities 取 Version/Build，并声明可读文档字节', async () => {
    stubWps();
    const caps = await new WpsRuntime().capabilities();
    expect(caps.runtime).toBe('wps');
    expect(caps.readActiveDocumentBytes).toBe(true);
    expect(caps.appVersion).toBe('12.0 / 12.8.2.21176');
    expect(caps.openInBrowser).toBe(true);
    // P2 才落地更新域/另存/导 PDF，现在必须还是 false
    expect(caps.documentAutomation).toBe(false);
  });

  test('readActiveDocumentBytes 返回原始字节 + stat 指纹', async () => {
    const { bytes } = stubWps();
    const result = await new WpsRuntime().readActiveDocumentBytes();
    expect(result.name).toBe('tender.docx');
    expect(result.fullName).toBe('/home/CMCC/tender.docx');
    expect(result.bytes).toBe(bytes);
    expect(new Uint8Array(result.bytes).slice(0, 4)).toEqual(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    );
    expect(result.fingerprint).toEqual({ size: 8, mtimeMs: 1787045609635, ino: 270443 });
  });

  test('未保存的新文档被挡下——FullName 不是磁盘路径时 Exists 为 false', async () => {
    stubWps({
      ActiveDocument: { Name: '文档1', FullName: '文档1' },
      FileSystem: {
        Exists: () => false,
        ReadFileAsArrayBuffer: () => new ArrayBuffer(0),
        stat: () => ({ size: 0, mtimeMs: 0, ino: 0 }),
      },
    });
    await expect(new WpsRuntime().readActiveDocumentBytes()).rejects.toThrow('尚未保存到磁盘');
  });

  test('没有打开文档时报错', async () => {
    stubWps({ ActiveDocument: null });
    await expect(new WpsRuntime().readActiveDocumentBytes()).rejects.toThrow('没有打开任何文档');
  });

  test('stat 失败只丢指纹，不影响读字节', async () => {
    const { bytes } = stubWps({
      FileSystem: {
        Exists: () => true,
        ReadFileAsArrayBuffer: () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
        stat: () => {
          throw new Error('stat failed');
        },
      },
    });
    const result = await new WpsRuntime().readActiveDocumentBytes();
    expect(result.fingerprint).toBeNull();
    expect(result.bytes.byteLength).toBe(4);
    expect(bytes.byteLength).toBe(8); // stub 的默认 buffer 没被用到
  });

  // OAAssist.ShellExecute 在 Linux 上静默失效（实测），只有 FollowHyperlink 通
  test('openInBrowser 走 Document.FollowHyperlink', async () => {
    const { wps } = stubWps();
    await new WpsRuntime().openInBrowser('http://localhost:3000/?project_id=p1');
    const doc = (wps as { ActiveDocument: { FollowHyperlink: ReturnType<typeof vi.fn> } }).ActiveDocument;
    expect(doc.FollowHyperlink).toHaveBeenCalledWith('http://localhost:3000/?project_id=p1');
  });

  test('没有打开文档时报错，不静默吞掉', async () => {
    stubWps({ ActiveDocument: null });
    await expect(new WpsRuntime().openInBrowser('http://x')).rejects.toThrow('FollowHyperlink');
  });

  test('P2 的文档操作仍是显式未实现', async () => {
    stubWps();
    const runtime = new WpsRuntime();
    for (const method of DOC_METHODS) {
      await expect(
        (runtime[method] as () => Promise<unknown>).call(runtime, undefined),
      ).rejects.toBeInstanceOf(RuntimeNotImplementedError);
    }
  });
});

describe('detectRuntime', () => {
  test('没有 wps 桥时是 browser', () => {
    expect(detectRuntime()).toBe('browser');
    expect(createRuntime()).toBeInstanceOf(BrowserRuntime);
  });

  test('有 FileSystem.ReadFileAsArrayBuffer 时是 wps', () => {
    stubWps();
    expect(detectRuntime()).toBe('wps');
    expect(createRuntime()).toBeInstanceOf(WpsRuntime);
  });

  test('光有 UA 不算——WPS 里打开的普通网页没有 JSAPI 桥', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/104 WpsOfficeApp/12.8.2.21176',
    });
    expect(detectRuntime()).toBe('browser');
  });

  test('getRuntime 是单例，resetRuntime 能清掉', () => {
    const first = getRuntime();
    expect(getRuntime()).toBe(first);
    resetRuntime();
    expect(getRuntime()).not.toBe(first);
  });
});
