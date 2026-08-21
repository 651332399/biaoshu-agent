// 浏览器运行时：没有本机文档，也没有真排版引擎。
// 文档类能力一律抛错——浏览器里这些操作压根不存在，不是「还没做」。

import {
  RuntimeNotImplementedError,
  type ActiveDocumentBytes,
  type ClientCapabilities,
  type DownloadDescriptor,
  type FieldUpdateResult,
  type InspectionResult,
  type LocalArtifact,
  type OpenDocumentResult,
  type RuntimeAdapter,
  type SaveTarget,
} from './RuntimeAdapter';
import type { WpsAcceptanceRequest } from '../lib/api';

export class BrowserRuntime implements RuntimeAdapter {
  async capabilities(): Promise<ClientCapabilities> {
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    return {
      runtime: 'browser',
      readActiveDocumentBytes: false,
      documentAutomation: false,
      openInBrowser: true,
      osVersion: ua,
      appVersion: ua,
    };
  }

  async readActiveDocumentBytes(): Promise<ActiveDocumentBytes> {
    throw new RuntimeNotImplementedError('readActiveDocumentBytes', 'browser');
  }

  async openInBrowser(url: string): Promise<void> {
    window.open(url, '_blank', 'noopener');
  }

  async openDocument(_source: DownloadDescriptor): Promise<OpenDocumentResult> {
    throw new RuntimeNotImplementedError('openDocument', 'browser');
  }

  async updateAllFields(): Promise<FieldUpdateResult> {
    throw new RuntimeNotImplementedError('updateAllFields', 'browser');
  }

  async saveFinalDocx(_target: SaveTarget): Promise<LocalArtifact> {
    throw new RuntimeNotImplementedError('saveFinalDocx', 'browser');
  }

  async exportFinalPdf(_target: SaveTarget): Promise<LocalArtifact> {
    throw new RuntimeNotImplementedError('exportFinalPdf', 'browser');
  }

  async reopenAndInspect(): Promise<InspectionResult> {
    throw new RuntimeNotImplementedError('reopenAndInspect', 'browser');
  }

  async collectWorkstationInventory(
    _docx: LocalArtifact[],
  ): Promise<WpsAcceptanceRequest['font_inventory']> {
    throw new RuntimeNotImplementedError('collectWorkstationInventory', 'browser');
  }
}
