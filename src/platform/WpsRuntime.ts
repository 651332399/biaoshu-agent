// WPS 任务窗格运行时。**全项目唯一允许碰全局 `wps` 的地方。**
//
// 能力口径全部来自 2026-08-21 在兆芯信创机（UOS Desktop 20 Pro / WPS 12.8.2.21176）
// 的实测，见 tasks/todo-9-wps-addon-p1.md §1：
//   - `wps.FileSystem.ReadFileAsArrayBuffer(path)` 同步返回 ArrayBuffer，
//     245KB/69KB/13.3MB 三个文件 sha256 与主机逐字节相同，中文路径正常。
//   - `wps.FileSystem.ReadFile()` 名字像但**是文本模式**，docx 只返回 5 个字符
//     （撞 NUL 截断）——绝不能用。
//   - `file://` 的 XHR/fetch 被 CEF 拦，`ActiveXObject` 不存在。

import {
  RuntimeNotImplementedError,
  type ActiveDocumentBytes,
  type ClientCapabilities,
  type DocumentFingerprint,
  type DownloadDescriptor,
  type FieldUpdateResult,
  type InspectionResult,
  type LocalArtifact,
  type OpenDocumentResult,
  type RuntimeAdapter,
  type SaveTarget,
} from './RuntimeAdapter';
import type { WpsAcceptanceRequest } from '../lib/api';

/** 只声明本层实际用到的成员，不照抄整个 JSAPI。 */
export interface WpsFileSystemLike {
  Exists(path: string): boolean;
  ReadFileAsArrayBuffer(path: string): ArrayBuffer;
  stat(path: string): { size: number; mtimeMs: number; ino: number };
}

export interface WpsDocumentLike {
  Name: string;
  FullName: string;
  /** 把 URL 交给系统默认浏览器。见下方 openInBrowser 的实测记录。 */
  FollowHyperlink(url: string): void;
}

export interface WpsGlobalLike {
  FileSystem?: WpsFileSystemLike;
  ActiveDocument?: WpsDocumentLike | null;
  Version?: string;
  Build?: string;
}

export function getWpsGlobal(): WpsGlobalLike | null {
  const host = globalThis as { wps?: WpsGlobalLike; Application?: WpsGlobalLike };
  return host.wps ?? host.Application ?? null;
}

function requireWpsGlobal(): WpsGlobalLike {
  const wps = getWpsGlobal();
  if (!wps) throw new Error('当前不在 WPS 加载项环境中');
  return wps;
}

export class WpsRuntime implements RuntimeAdapter {
  async capabilities(): Promise<ClientCapabilities> {
    const wps = getWpsGlobal();
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    // Version/Build 是 COM 桥接属性，取不到时退回 UA——UA 里带
    // `WpsOfficeApp/12.8.2.21176`，够识别版本，不值得为它抛错。
    let appVersion = ua;
    try {
      const version = wps?.Version;
      const build = wps?.Build;
      if (version || build) appVersion = [version, build].filter(Boolean).join(' / ');
    } catch {
      appVersion = ua;
    }
    return {
      runtime: 'wps',
      readActiveDocumentBytes: typeof wps?.FileSystem?.ReadFileAsArrayBuffer === 'function',
      documentAutomation: false, // P2 落地更新域/另存/导 PDF 后翻为 true
      openInBrowser: typeof wps?.ActiveDocument?.FollowHyperlink === 'function',
      osVersion: ua,
      appVersion,
    };
  }

  async readActiveDocumentBytes(): Promise<ActiveDocumentBytes> {
    const wps = requireWpsGlobal();
    const doc = wps.ActiveDocument;
    if (!doc) throw new Error('当前没有打开任何文档');

    const fullName = doc.FullName;
    const fs = wps.FileSystem;
    if (typeof fs?.ReadFileAsArrayBuffer !== 'function') {
      throw new Error('当前 WPS 不提供 FileSystem.ReadFileAsArrayBuffer，无法读取文档字节');
    }
    // 未保存的新文档 FullName 只是文件名而非路径，Exists 会是 false。
    // 这里必须挡住——否则读到的是空字节或抛底层错，错因难查。
    if (!fullName || !fs.Exists(fullName)) {
      throw new Error('当前文档尚未保存到磁盘，请先保存后再上传');
    }

    // 实测同步返回，不是 Promise。签名保持 async 以免将来换实现要改调用方。
    const bytes = fs.ReadFileAsArrayBuffer(fullName);

    let fingerprint: DocumentFingerprint | null = null;
    try {
      const stat = fs.stat(fullName);
      fingerprint = { size: stat.size, mtimeMs: stat.mtimeMs, ino: stat.ino };
    } catch {
      fingerprint = null; // 指纹只是去重的快捷路径，拿不到就退回算 sha256
    }

    return { name: doc.Name, fullName, bytes, fingerprint };
  }

  /**
   * 2026-08-21 在兆芯 UOS + WPS 12.8.2.21176 上逐个实测，三条路只有一条通：
   *
   * | 手段 | 结果 |
   * |---|---|
   * | `OAAssist.ShellExecute(url)` | ⛔ 返回 null、不抛错、**什么都不做** |
   * | `window.open(url)` | ⛔ `handle=null`，CEF 拦掉 |
   * | `ActiveDocument.FollowHyperlink(url)` | ✅ 拉起系统默认浏览器 |
   *
   * `OAAssist` 整层成员是 `DownloadFile/UploadFile/ShellExecute/COMAddinsExecute/
   * CoCreateInstance/WebNotify`，全是 COM 味的 Windows 接口，Linux 上是空壳。
   * **官方脚手架 util.js 用的就是 ShellExecute——照抄会静默失效，别再换回去。**
   */
  async openInBrowser(url: string): Promise<void> {
    const doc = requireWpsGlobal().ActiveDocument;
    if (typeof doc?.FollowHyperlink !== 'function') {
      throw new Error('当前 WPS 不提供 Document.FollowHyperlink，无法打开浏览器');
    }
    doc.FollowHyperlink(url);
  }

  async openDocument(_source: DownloadDescriptor): Promise<OpenDocumentResult> {
    throw new RuntimeNotImplementedError('openDocument', 'wps');
  }

  async updateAllFields(): Promise<FieldUpdateResult> {
    throw new RuntimeNotImplementedError('updateAllFields', 'wps');
  }

  async saveFinalDocx(_target: SaveTarget): Promise<LocalArtifact> {
    throw new RuntimeNotImplementedError('saveFinalDocx', 'wps');
  }

  async exportFinalPdf(_target: SaveTarget): Promise<LocalArtifact> {
    throw new RuntimeNotImplementedError('exportFinalPdf', 'wps');
  }

  async reopenAndInspect(): Promise<InspectionResult> {
    throw new RuntimeNotImplementedError('reopenAndInspect', 'wps');
  }

  async collectWorkstationInventory(
    _docx: LocalArtifact[],
  ): Promise<WpsAcceptanceRequest['font_inventory']> {
    throw new RuntimeNotImplementedError('collectWorkstationInventory', 'wps');
  }
}
