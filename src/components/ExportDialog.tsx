import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  LoaderCircle,
  PackageCheck,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type {
  BackendExportPlan,
  BackendOutline,
  GenerationAcceptance,
  WpsAcceptanceChecks,
  WpsEvidenceType,
} from '../engine/types';
import type { Scenario } from '../engine/demo/types';
import {
  getGenerationAcceptance,
  getProjectState,
  submitWpsAcceptance,
  subscribeGenerationAcceptance,
  uploadWpsEvidence,
} from '../lib/api';
import { getDisplayVolumes } from '../lib/exportPlanView';
import { apiUrl } from '../lib/apiBase';


interface Props {
  scenario: Scenario;
  backendExportPlan?: BackendExportPlan | null;
  backendOutline?: BackendOutline | null;
}


interface EvidenceSlot {
  type: WpsEvidenceType;
  label: string;
  accept: string;
}


interface WorkstationFontInventory {
  os_version: string;
  wps_version: string;
  fonts: {
    requested_family: string;
    // PDF 里实际嵌入的 PostScript 名，空串表示批准字体没出现
    actual_family: string;
    embedded: boolean;
    matched: boolean;
  }[];
  unexpected_fonts?: string[];
}


const COMMON_EVIDENCE_SLOTS: EvidenceSlot[] = [
  { type: 'final_docx', label: '最终 DOCX', accept: '.docx' },
  { type: 'final_pdf', label: '最终 PDF', accept: '.pdf' },
  { type: 'cover', label: '封面截图', accept: '.png,.jpg,.jpeg' },
  { type: 'font_status', label: '字体状态', accept: '.png,.jpg,.jpeg' },
  { type: 'typography_color', label: '排版与颜色', accept: '.png,.jpg,.jpeg' },
];


const OPTIONAL_SLOT_LABELS: Partial<Record<WpsEvidenceType, string>> = {
  toc_pageref: '目录与页码域',
  representative_table: '代表性表格',
  landscape_section: '横向分节',
};


const WPS_CHECKLIST: { key: keyof WpsAcceptanceChecks; label: string }[] = [
  { key: 'local_fonts_confirmed', label: '已确认 WPS 工作站本地字体可用' },
  { key: 'all_fields_updated', label: '已更新全部域' },
  { key: 'toc_pageref_checked', label: '已检查 TOC/PAGEREF' },
  { key: 'pagination_checked', label: '已检查分页' },
  { key: 'tables_checked', label: '已检查表格' },
  { key: 'fonts_checked', label: '已检查字体' },
  { key: 'colors_checked', label: '已检查颜色' },
  { key: 'saved_reopened_checked', label: '已保存、关闭并重新打开抽检' },
  { key: 'final_pdf_exported', label: '已导出最终 PDF' },
  { key: 'evidence_slots_complete', label: '必需验收证据已齐全' },
];


const EMPTY_WPS_CHECKS: WpsAcceptanceChecks = {
  local_fonts_confirmed: false,
  all_fields_updated: false,
  toc_pageref_checked: false,
  pagination_checked: false,
  tables_checked: false,
  fonts_checked: false,
  colors_checked: false,
  saved_reopened_checked: false,
  final_pdf_exported: false,
  evidence_slots_complete: false,
};


const STATUS_VIEW = {
  generation_started: {
    label: '正在生成新版本',
    detail: '正文已发生变更，旧 generation 已失效，服务器正在生成新的预验收包。',
  },
  server_precheck_failed: {
    label: '服务器预检未通过',
    detail: '当前 generation 不可下载或验收，需修复问题后重新导出。',
  },
  awaiting_wps_acceptance: {
    label: '待 WPS 验收',
    detail: '服务器预检已通过，最终交付仍需 WPS 回传验证。',
  },
  wps_verification_failed: {
    label: 'WPS 验收未通过',
    detail: '请根据问题替换证据后重新提交。',
  },
  archiving: {
    label: '正在归档',
    detail: '验证已通过，正在生成不可变验收记录与最终包。',
  },
  accepted: {
    label: '已通过 WPS 验收',
    detail: '当前 generation 已归档，可下载最终交付包。',
  },
  superseded: {
    label: '当前版本已失效',
    detail: '检测到在线重新导出，正在切换到新 generation。',
  },
} as const;


async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}


function issueMessage(issue: GenerationAcceptance['validation_issues'][number] | string): string {
  return typeof issue === 'string' ? issue : issue.message;
}


export function ExportDialog({ scenario, backendExportPlan, backendOutline }: Props) {
  const displayVolumes = useMemo(
    () => getDisplayVolumes(scenario, backendExportPlan, backendOutline),
    [scenario, backendExportPlan, backendOutline],
  );
  const projectId = new URLSearchParams(window.location.search).get('project_id');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [acceptance, setAcceptance] = useState<GenerationAcceptance | null>(null);
  const [uploadedSlots, setUploadedSlots] = useState<Set<string>>(new Set());
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fontInventory, setFontInventory] = useState<WorkstationFontInventory | null>(null);
  const [checks, setChecks] = useState<WpsAcceptanceChecks>(EMPTY_WPS_CHECKS);
  const [error, setError] = useState<string | null>(null);

  const refreshAcceptance = useCallback(async (project: string, generation: string) => {
    const next = await getGenerationAcceptance(project, generation);
    setAcceptance(next);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    let switchingGeneration = false;
    let unsubscribe: (() => void) | undefined;

    const bindCurrentGeneration = async () => {
      try {
        const state = await getProjectState(projectId);
        if (!active || !state.generation_id) return;
        const currentGeneration = state.generation_id;
        unsubscribe?.();
        unsubscribe = undefined;
        setGenerationId(currentGeneration);
        setUploadedSlots(new Set());
        setBusySlot(null);
        setSubmitting(false);
        setFontInventory(null);
        setChecks(EMPTY_WPS_CHECKS);
        await refreshAcceptance(projectId, currentGeneration);
        if (!active) return;
        unsubscribe = subscribeGenerationAcceptance(
          projectId,
          currentGeneration,
          (event) => {
            if (event.event === 'superseded') {
              if (switchingGeneration) return;
              switchingGeneration = true;
              setAcceptance((previous) => previous ? {
                ...previous,
                status: 'superseded',
                final_delivery_approved: false,
              } : previous);
              unsubscribe?.();
              unsubscribe = undefined;
              void bindCurrentGeneration()
                .catch((reason: unknown) => {
                  if (active) setError(reason instanceof Error ? reason.message : String(reason));
                })
                .finally(() => {
                  switchingGeneration = false;
                });
              return;
            }
            if (event.event === 'evidence_received') {
              const artifactId = String(event.data.artifact_id ?? '');
              const evidenceType = String(event.data.evidence_type ?? '');
              if (artifactId && evidenceType) {
                setUploadedSlots((previous) => new Set(previous).add(`${artifactId}:${evidenceType}`));
              }
            }
            void refreshAcceptance(projectId, currentGeneration).catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : String(reason));
            });
          },
        );
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      }
    };

    void bindCurrentGeneration();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [projectId, refreshAcceptance]);

  const missingSlots = useMemo(
    () => new Set(acceptance?.missing_evidence_slots ?? []),
    [acceptance?.missing_evidence_slots],
  );
  const artifactRows = useMemo(() => {
    if (acceptance?.artifacts?.length) {
      return acceptance.artifacts.map((artifact) => {
        const display = displayVolumes.find((volume) => (
          volume.fileName === artifact.file_name || volume.id === artifact.artifact_id
        ));
        return {
          id: artifact.artifact_id,
          name: display?.名称 ?? artifact.file_name.replace(/\.docx$/i, ''),
          fileName: artifact.file_name,
          evidenceTypes: artifact.required_evidence_types,
        };
      });
    }
    return displayVolumes.map((volume) => ({
      id: volume.id,
      name: volume.名称,
      fileName: volume.fileName,
      evidenceTypes: COMMON_EVIDENCE_SLOTS.map((slot) => slot.type),
    }));
  }, [acceptance?.artifacts, displayVolumes]);

  const slotFor = (type: WpsEvidenceType): EvidenceSlot => (
    COMMON_EVIDENCE_SLOTS.find((slot) => slot.type === type) ?? {
      type,
      label: OPTIONAL_SLOT_LABELS[type] ?? type,
      accept: '.png,.jpg,.jpeg',
    }
  );

  const handleUpload = async (artifactId: string, type: WpsEvidenceType, file?: File) => {
    if (!file || !projectId || !generationId) return;
    const slot = `${artifactId}:${type}`;
    setBusySlot(slot);
    setError(null);
    try {
      const fileDigest = await sha256(file);
      await uploadWpsEvidence(projectId, generationId, {
        artifactId,
        evidenceType: type,
        sha256: fileDigest,
        idempotencyKey: `${generationId}:${slot}:${fileDigest}`,
        file,
      });
      setUploadedSlots((previous) => new Set(previous).add(slot));
      await refreshAcceptance(projectId, generationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusySlot(null);
    }
  };

  const handleSubmit = async () => {
    if (!projectId || !generationId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitWpsAcceptance(projectId, generationId, {
        checks,
        font_inventory: fontInventory!,
      });
      await refreshAcceptance(projectId, generationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveRetry = async () => {
    if (!projectId || !generationId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitWpsAcceptance(projectId, generationId);
      await refreshAcceptance(projectId, generationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      await refreshAcceptance(projectId, generationId).catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const status = acceptance?.status;
  const statusView = status && status in STATUS_VIEW
    ? STATUS_VIEW[status as keyof typeof STATUS_VIEW]
    : null;
  const canUpload = status === 'awaiting_wps_acceptance' || status === 'wps_verification_failed';
  const canRetryArchive = status === 'archiving' && acceptance?.archive_retryable === true;
  const checklistComplete = WPS_CHECKLIST.every(({ key }) => checks[key]);
  const canSubmit = canUpload
    && missingSlots.size === 0
    && fontInventory !== null
    && checklistComplete
    && !submitting;

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--canvas)] p-4 md:p-8">
      <div className="mx-auto max-w-4xl min-w-0 rounded-lg border border-gray-200 bg-[var(--surface)] shadow-sm">
        <header className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-gray-900">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              <h3 className="text-base font-bold">WPS 最终验收</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              服务器流水线结束不代表最终交付通过。
            </p>
          </div>
          {statusView && (
            <div className="flex min-w-0 items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 md:max-w-sm">
              {status === 'accepted' && acceptance?.final_delivery_approved === true ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : status === 'archiving' ? (
                <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800">{statusView.label}</div>
                <div className="mt-0.5 text-[11px] leading-4 text-gray-500">{statusView.detail}</div>
              </div>
            </div>
          )}
        </header>

        <div className="space-y-6 p-5">
          {!projectId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              当前页面未绑定项目，无法进入 WPS 验收。
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {generationId && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-500">
              <span className="font-mono break-all">Generation: {generationId}</span>
              {status === 'accepted' && acceptance?.final_delivery_approved === true ? (
                <a
                  href={apiUrl(`/api/projects/${projectId}/generations/${generationId}/delivery-bundle`)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-2 font-semibold text-white"
                >
                  <PackageCheck className="h-4 w-4" />
                  下载最终交付包
                </a>
              ) : canUpload ? (
                <a
                  href={apiUrl(`/api/projects/${projectId}/generations/${generationId}/server-precheck-package`)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  下载预验收包
                </a>
              ) : null}
            </div>
          )}

          <section aria-labelledby="volume-evidence-title">
            <div className="mb-3 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-gray-500" />
              <h4 id="volume-evidence-title" className="text-sm font-semibold text-gray-800">分册验收证据</h4>
            </div>
            <ul className="space-y-3">
              {artifactRows.map((artifact) => (
                <li key={artifact.id} className="min-w-0 rounded-md border border-gray-200 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-800" title={artifact.name}>
                        {artifact.name}
                      </div>
                      <div className="mt-0.5 break-all font-mono text-[10px] text-gray-400">{artifact.fileName}</div>
                    </div>
                    {canUpload && projectId && generationId && (
                      <a
                        href={apiUrl(`/api/projects/${projectId}/generations/${generationId}/artifacts/${encodeURIComponent(artifact.id)}/server-docx`)}
                        download={artifact.fileName}
                        aria-label={`下载 ${artifact.name} DOCX`}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        下载
                      </a>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {artifact.evidenceTypes.map((type) => {
                      const slot = slotFor(type);
                      const slotId = `${artifact.id}:${slot.type}`;
                      const uploaded = uploadedSlots.has(slotId)
                        || (acceptance !== null && !missingSlots.has(slotId));
                      const busy = busySlot === slotId;
                      return (
                        <label
                          key={slot.type}
                          className={`flex h-10 min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 text-xs ${
                            canUpload ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                          } ${uploaded ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}
                        >
                          <span className="min-w-0 truncate text-gray-700">{slot.label}</span>
                          {busy ? (
                            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                          ) : uploaded ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Upload className="h-4 w-4 shrink-0 text-gray-500" />
                          )}
                          <input
                            type="file"
                            accept={slot.accept}
                            disabled={!canUpload || busy}
                            aria-label={`上传 ${artifact.name} ${slot.label}`}
                            className="sr-only"
                            onChange={(event) => {
                              void handleUpload(artifact.id, slot.type, event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {canUpload && (
            <section aria-labelledby="font-inventory-title" className="border-t border-gray-200 pt-4">
              <h4 id="font-inventory-title" className="text-sm font-semibold text-gray-800">WPS 工作站字体清单</h4>
              <label className="mt-2 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                {fontInventory ? '字体清单已加载' : '上传字体清单 JSON'}
                <input
                  type="file"
                  accept="application/json,.json"
                  aria-label="上传 WPS 工作站字体清单"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const parsed = JSON.parse(String(reader.result)) as WorkstationFontInventory;
                        setFontInventory(parsed);
                        setError(null);
                      } catch (reason) {
                        setFontInventory(null);
                        setError(reason instanceof Error ? reason.message : String(reason));
                      }
                    };
                    reader.onerror = () => {
                      setFontInventory(null);
                      setError('字体清单读取失败');
                    };
                    reader.readAsText(file);
                    event.target.value = '';
                  }}
                />
              </label>
            </section>
          )}

          <section aria-labelledby="wps-checklist-title" className="border-t border-gray-200 pt-4">
            <h4 id="wps-checklist-title" className="text-sm font-semibold text-gray-800">WPS 人工检查清单</h4>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WPS_CHECKLIST.map((item) => (
                <label
                  key={item.key}
                  className={`flex min-h-10 items-start gap-2 rounded-md border px-3 py-2 text-xs leading-5 ${
                    canUpload ? 'cursor-pointer border-gray-200 bg-white hover:bg-gray-50' : 'cursor-default border-gray-100 bg-gray-50 text-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    disabled={!canUpload}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setChecks((previous) => ({ ...previous, [item.key]: checked }));
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          {acceptance?.validation_issues.length ? (
            <section aria-labelledby="validation-issues-title">
              <h4 id="validation-issues-title" className="mb-2 text-sm font-semibold text-red-700">验收问题</h4>
              <ul className="space-y-1.5">
                {acceptance.validation_issues.map((issue, index) => (
                  <li key={`${typeof issue === 'string' ? issue : issue.code}-${index}`} className="rounded-md bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                    {issueMessage(issue)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {acceptance?.archiving_issues?.length ? (
            <section aria-labelledby="archiving-issues-title">
              <h4 id="archiving-issues-title" className="mb-2 text-sm font-semibold text-red-700">归档问题</h4>
              <ul className="space-y-1.5">
                {acceptance.archiving_issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className="rounded-md bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                    {issueMessage(issue)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {canRetryArchive && (
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleArchiveRetry()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                重试不可变归档
              </button>
            </div>
          )}

          {canUpload && (
            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
              <div className="text-xs text-gray-500">
                {missingSlots.size > 0
                  ? `尚缺 ${missingSlots.size} 个必需证据槽位`
                  : !fontInventory
                    ? '请上传 WPS 工作站字体清单'
                    : checklistComplete ? '必需证据、字体清单与人工检查已齐全' : '请完成全部 WPS 人工检查'}
              </div>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                提交 WPS 验收
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
