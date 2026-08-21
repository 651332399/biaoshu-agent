// 运行时边界：业务代码只依赖这个接口，不直接碰全局 `wps`、本机路径或平台命令。
//
// 为什么现在就要这层：交互形态已定为「薄加载项 + 浏览器 Copilot」
// （tasks/wps-addon-end-to-end-flow-2026-08-18.md §8.3）。薄不等于永远薄——
// P4 之后要按实测重估是否把 Copilot 移进任务窗格。签名现在一次性定死，
// 那次重估就不用重写；散落的 `wps.xxx` 调用会让重估变成重做。
//
// 方法集来自 .omx/plans/wps-cross-platform-addon-plan.md §4，另加 P1 需要的
// readActiveDocumentBytes()。P1 只实现 capabilities() + readActiveDocumentBytes()，
// 其余抛 RuntimeNotImplementedError，P2 填。

import type { WpsAcceptanceRequest } from '../lib/api';

export type RuntimeKind = 'browser' | 'wps';

/** 未实现的运行时能力。显式抛出，不返回假值——静默降级会让 P2 的缺口拖到验收才暴露。 */
export class RuntimeNotImplementedError extends Error {
  constructor(method: string, runtime: RuntimeKind) {
    super(`${runtime} 运行时尚未实现 ${method}()`);
    this.name = 'RuntimeNotImplementedError';
  }
}

export interface ClientCapabilities {
  runtime: RuntimeKind;
  /** 能读到当前打开文档的原始字节（§5.1 要求上传原始 OOXML 包，不是抽取的文本）。 */
  readActiveDocumentBytes: boolean;
  /** 能驱动真排版引擎：更新域 / 另存 / 按真实分页导 PDF。 */
  documentAutomation: boolean;
  /** 取自 UA；进 font_inventory.os_version。 */
  osVersion: string;
  /** WPS 是 `Application.Version`/`Build`；浏览器是 UA。进 font_inventory.wps_version。 */
  appVersion: string;
}

/** `wps.FileSystem.stat()` 的廉价指纹，用于重复点击去重，先于算 sha256。 */
export interface DocumentFingerprint {
  size: number;
  mtimeMs: number;
  ino: number;
}

export interface ActiveDocumentBytes {
  /** `Document.Name`，作为上传文件名。 */
  name: string;
  /** `Document.FullName`，本机绝对路径。 */
  fullName: string;
  bytes: ArrayBuffer;
  fingerprint: DocumentFingerprint | null;
}

/** 服务器分册产物的下载描述，绑定 generation 防止旧文件混进新 generation。 */
export interface DownloadDescriptor {
  artifactId: string;
  url: string;
  filename: string;
  serverSha256: string;
}

export interface LocalArtifact {
  path: string;
  sha256: string;
  size: number;
}

export interface OpenDocumentResult {
  localPath: string;
  name: string;
}

/** 只采集，不判定——判定全在服务器（§5.3）。 */
export interface FieldUpdateResult {
  fieldsTotal: number;
  fieldErrors: string[];
  tocEntries: number;
}

export interface SaveTarget {
  path: string;
}

/** 关闭重开后的抽检观测值，同样只采集不判定。 */
export interface InspectionResult {
  pages: number;
  pagerefTotal: number;
  pagerefResolved: number;
  fieldErrors: string[];
}

export interface RuntimeAdapter {
  capabilities(): Promise<ClientCapabilities>;
  /** P1：一键上传当前打开的招标文件。 */
  readActiveDocumentBytes(): Promise<ActiveDocumentBytes>;
  openDocument(source: DownloadDescriptor): Promise<OpenDocumentResult>;
  updateAllFields(): Promise<FieldUpdateResult>;
  saveFinalDocx(target: SaveTarget): Promise<LocalArtifact>;
  exportFinalPdf(target: SaveTarget): Promise<LocalArtifact>;
  reopenAndInspect(): Promise<InspectionResult>;
  collectWorkstationInventory(
    docx: LocalArtifact[],
  ): Promise<WpsAcceptanceRequest['font_inventory']>;
}
