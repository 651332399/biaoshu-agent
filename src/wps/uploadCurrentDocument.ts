// P1.4：把 WPS 里当前打开的招标文件送进流水线。
//
// 上传的是**原始文件字节**，不做任何 JSAPI 文本抽取——parser/extract.py 吃的是
// docx/pdf 文件，直通区深拷贝依赖原始 OOXML 包（样式、编号、图片关系、表格合并），
// 逐段读文本会把这些丢光。见 tasks/wps-addon-end-to-end-flow-2026-08-18.md §5.1。
//
// 依赖全部注入，方便在没有 WPS 的环境里测。

import type { DocumentFingerprint, RuntimeAdapter } from '../platform/RuntimeAdapter';

export interface UploadMemo {
  fullName: string;
  sha256: string;
  fingerprint: DocumentFingerprint | null;
  projectId: string;
}

export interface UploadDeps {
  runtime: RuntimeAdapter;
  upload: (file: File) => Promise<{ project_id: string }>;
  /**
   * 起流水线。**返回的 promise 要等到确认点①才 resolve，可能几分钟**
   * （`POST /run` 里 await 的是 `runner.run_until_confirm`），所以这里只触发不等待，
   * 失败经 onRunFailed 回报。进度由 SSE 推（P1.5），不靠这个 promise。
   */
  run: (projectId: string) => Promise<unknown>;
  onRunFailed?: (error: unknown) => void;
  digest: (bytes: ArrayBuffer) => Promise<string>;
  readMemo: () => UploadMemo | null;
  writeMemo: (memo: UploadMemo) => void;
}

export interface UploadOutcome {
  projectId: string;
  name: string;
  sha256: string;
  /** true = 同一份文档已经传过，直接复用原项目，没有重复创建。 */
  reused: boolean;
}

const MEMO_KEY = 'biaoshu.wps.lastUpload';

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function readUploadMemo(): UploadMemo | null {
  try {
    const raw = localStorage.getItem(MEMO_KEY);
    return raw ? (JSON.parse(raw) as UploadMemo) : null;
  } catch {
    return null; // 存储不可用时退化成「每次都重新算」，不影响正确性
  }
}

export function writeUploadMemo(memo: UploadMemo): void {
  try {
    localStorage.setItem(MEMO_KEY, JSON.stringify(memo));
  } catch {
    /* 同上 */
  }
}

function sameFingerprint(a: DocumentFingerprint | null, b: DocumentFingerprint | null): boolean {
  // null 一律不算命中——拿不到指纹就老实去算 sha256，不能把「不知道」当成「一样」
  if (!a || !b) return false;
  return a.size === b.size && a.mtimeMs === b.mtimeMs && a.ino === b.ino;
}

export async function uploadCurrentDocument(deps: UploadDeps): Promise<UploadOutcome> {
  const doc = await deps.runtime.readActiveDocumentBytes();
  const memo = deps.readMemo();

  // 廉价路径：stat 指纹一致就直接复用，连 sha256 都不用算。
  // 13.3MB 的册子算一次哈希不贵（实测读取 15ms），但重复点击是高频操作，能省则省。
  if (memo && memo.fullName === doc.fullName && sameFingerprint(memo.fingerprint, doc.fingerprint)) {
    return { projectId: memo.projectId, name: doc.name, sha256: memo.sha256, reused: true };
  }

  const sha256 = await deps.digest(doc.bytes);

  // 指纹变了但内容没变（复制、touch、另存回原位）也算同一份文档
  if (memo && memo.sha256 === sha256) {
    deps.writeMemo({ ...memo, fullName: doc.fullName, fingerprint: doc.fingerprint });
    return { projectId: memo.projectId, name: doc.name, sha256, reused: true };
  }

  const file = new File([doc.bytes], doc.name);
  const { project_id: projectId } = await deps.upload(file);
  // 不 await：见 UploadDeps.run 的说明。catch 是为了不产生 unhandled rejection。
  deps.run(projectId).catch((error: unknown) => deps.onRunFailed?.(error));

  deps.writeMemo({ fullName: doc.fullName, sha256, fingerprint: doc.fingerprint, projectId });
  return { projectId, name: doc.name, sha256, reused: false };
}
