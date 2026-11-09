import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { BackendExportPlan, BackendOutline, BackendReport, BackendRequirement, BackendTenderSpec } from '../engine/types';
import type { Step } from '../engine/demo/types';

interface Props {
  card: Step;
  requirements?: BackendRequirement[];
  artifact?: { label: string; value: unknown };
  onConfirm: (
    artifact?: unknown,
    confirmedFields?: ('项目编号' | '采购人')[],
    saveAsTemplate?: boolean,
  ) => void;
  onChoose: (index: number) => void;
}

const DRAFT_WINDOW = 12;

/** 把编辑框(仅载入前 DRAFT_WINDOW 条)的改动按 id 合并回全量清单：
 *  窗口内条目——编辑生效、从草稿中删除即删除；窗口外条目原样保留；新 id 追加到末尾。 */
export function mergeDraftIntoRequirements(
  full: BackendRequirement[],
  parsed: BackendRequirement[],
): BackendRequirement[] {
  const windowIds = new Set(full.slice(0, DRAFT_WINDOW).map((item) => item.id));
  const parsedById = new Map(parsed.map((item) => [item.id, item]));
  const merged = full.flatMap((item) => {
    const edited = parsedById.get(item.id);
    if (edited) return [edited];
    if (windowIds.has(item.id)) return [];
    return [item];
  });
  const added = parsed.filter((item) => !full.some((existing) => existing.id === item.id));
  return [...merged, ...added];
}

export function DecisionCard({ card, requirements = [], artifact, onConfirm, onChoose }: Props) {
  const isEscalate = card.kind === 'escalate';
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [manualMeta, setManualMeta] = useState<Partial<Record<'项目编号' | '采购人', string>>>({});
  const [manualConfirmed, setManualConfirmed] = useState<Partial<Record<'项目编号' | '采购人', boolean>>>({});
  const [candidateDecisions, setCandidateDecisions] = useState<Record<string, 'required' | 'excluded'>>({});
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const grouped = useMemo(() => {
    const order = ['废标', '资质', '评分', '技术参数', '商务条款', '格式'];
    return order
      .map((type) => ({
        type,
        items: requirements.filter((item) => item.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [requirements]);
  const initialDraft = useMemo(
    () => JSON.stringify(requirements.slice(0, DRAFT_WINDOW), null, 2),
    [requirements],
  );
  const artifactDraft = useMemo(
    () => JSON.stringify(artifact?.value ?? null, null, 2),
    [artifact],
  );
  const outline = isOutlineArtifact(artifact?.value) ? artifact.value : null;
  const report = isReportArtifact(artifact?.value) ? artifact.value : null;
  const tenderSpec = isTenderSpecArtifact(artifact?.value) ? artifact.value : null;
  const exportPlan = tenderSpec?.export_plan ?? (isExportPlanArtifact(artifact?.value) ? artifact.value : null);
  const unverifiedMetaFields = tenderSpec
    ? (['项目编号', '采购人'] as const).filter((field) => !tenderSpec.project_meta.evidence_by_field?.[field]?.length)
    : [];
  const requiredFormKeys = new Set(
    tenderSpec?.export_plan.volumes.flatMap((volume) =>
      (volume.required_forms ?? []).map((title) => `${volume.volume_id}:${title}`),
    ) ?? [],
  );
  const unresolvedForms = tenderSpec?.forms.filter(
    (form) => requiredFormKeys.has(`${form.volume_id}:${form.title}`)
      && form.fill_mode === 'copy_verbatim'
      && form.source_status !== 'available',
  ) ?? [];
  const pendingFormCandidates = tenderSpec?.form_candidates?.filter(
    (candidate) => candidate.status === 'pending',
  ) ?? [];
  const registryForms = tenderSpec?.forms.filter((form) => form.source_kind === 'registry') ?? [];
  const negativeDeviations = report?.deviations.filter((item) => item.deviation === '负偏离') ?? [];
  const warnDeviations = report?.deviations.filter((item) => item.deviation !== '无偏离') ?? [];
  const pendingMaterials = report?.pending_materials ?? [];

  const confirmWithDraft = () => {
    if (tenderSpec) {
      let editedTenderSpec = tenderSpec;
      if (draft && draft !== artifactDraft) {
        try {
          const parsed = JSON.parse(draft) as unknown;
          if (!isTenderSpecArtifact(parsed)) {
            setError('原始 JSON 必须保持完整 TenderSpec 结构。');
            return;
          }
          editedTenderSpec = parsed;
        } catch {
          setError('JSON 格式不正确，请修正后再确认。');
          return;
        }
      }
      if (editedTenderSpec.form_candidates?.some(
        (candidate) => candidate.status === 'pending' && !candidateDecisions[candidate.candidate_id],
      )) {
        setError('请逐项确认所有候选表单是否属于本次投标文件。');
        return;
      }
      const decidedCandidates = (editedTenderSpec.form_candidates ?? []).map((candidate) => ({
        ...candidate,
        status: candidate.status === 'pending'
          ? candidateDecisions[candidate.candidate_id] ?? candidate.status
          : candidate.status,
      }));
      const decidedByVolume = new Map<string, Map<string, 'required' | 'excluded' | 'pending'>>();
      for (const candidate of decidedCandidates) {
        const decisions = decidedByVolume.get(candidate.volume_id) ?? new Map();
        decisions.set(candidate.title, candidate.status);
        decidedByVolume.set(candidate.volume_id, decisions);
      }
      editedTenderSpec = {
        ...editedTenderSpec,
        form_candidates: decidedCandidates,
        export_plan: {
          ...editedTenderSpec.export_plan,
          volumes: editedTenderSpec.export_plan.volumes.map((volume) => {
            const decisions = decidedByVolume.get(volume.volume_id);
            if (!decisions) return volume;
            const retained = (volume.required_forms ?? []).filter(
              (title) => decisions.get(title) !== 'excluded',
            );
            const additions = [...decisions.entries()]
              .filter(([, status]) => status === 'required')
              .map(([title]) => title);
            return { ...volume, required_forms: [...new Set([...retained, ...additions])] };
          }),
        },
      };
      const editedRequiredFormKeys = new Set(
        editedTenderSpec.export_plan.volumes.flatMap((volume) =>
          (volume.required_forms ?? []).map((title) => `${volume.volume_id}:${title}`),
        ),
      );
      const editedUnresolvedForms = editedTenderSpec.forms.filter(
        (form) => editedRequiredFormKeys.has(`${form.volume_id}:${form.title}`)
          && form.fill_mode === 'copy_verbatim'
          && form.source_status !== 'available',
      );
      if (editedUnresolvedForms.length > 0) {
        setError(`缺少可验证的原样表单：${editedUnresolvedForms.map((form) => form.title).join('、')}。`);
        return;
      }
      const projectMeta = { ...editedTenderSpec.project_meta };
      for (const field of unverifiedMetaFields) {
        const value = (manualMeta[field] ?? projectMeta[field] ?? '').trim();
        if (!value) {
          setError(`请补录${field}后再确认，不能用空值放行。`);
          return;
        }
        if (!manualConfirmed[field]) {
          setError(`请确认${field}为人工补录的真实信息。`);
          return;
        }
        projectMeta[field] = value;
      }
      const confirmedArtifact = { ...editedTenderSpec, project_meta: projectMeta };
      if (saveAsTemplate) {
        onConfirm(confirmedArtifact, unverifiedMetaFields, true);
      } else {
        onConfirm(confirmedArtifact, unverifiedMetaFields);
      }
      return;
    }
    if (artifact) {
      if (!draft || draft === artifactDraft) {
        onConfirm();
        return;
      }
      try {
        onConfirm(JSON.parse(draft));
      } catch {
        setError('JSON 格式不正确，请修正后再确认。');
      }
      return;
    }
    if (requirements.length === 0 || !draft || draft === initialDraft) {
      onConfirm();
      return;
    }
    try {
      const parsed = JSON.parse(draft) as BackendRequirement[];
      if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item.id !== 'string')) {
        setError('JSON 需为带 id 字段的要求数组。');
        return;
      }
      onConfirm(mergeDraftIntoRequirements(requirements, parsed));
    } catch {
      setError('JSON 格式不正确，请修正后再确认。');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-xl border p-4 shadow-md ${
        isEscalate
          ? 'border-[var(--bad)] bg-red-50/50 text-[var(--text)]'
          : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm flex items-center gap-1.5 leading-snug">
          <span>{isEscalate ? '🔴 ' : '⏸ '}</span>
          <span>{isEscalate ? card.escalateTitle : card.checkpointTitle}</span>
        </h4>
        {isEscalate && typeof card.confidence === 'number' && (
          <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-[var(--bad)] shrink-0">
            置信度 {Math.round(card.confidence * 100)}%
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 mb-3.5 leading-relaxed">
        {isEscalate ? card.escalateBody : card.checkpointBody}
      </p>

      {!isEscalate && requirements.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="rounded-lg border border-blue-100 bg-white p-2 text-[11px] text-gray-600">
            共抽取 {requirements.length} 条要求。编辑框载入前 {DRAFT_WINDOW} 条，改动按 id 合并回全量清单
            （窗口内删除条目即删除该条，未载入的 {Math.max(requirements.length - DRAFT_WINDOW, 0)} 条保持不变）；
            不改动直接确认则原样放行。
          </div>
          <div className="max-h-44 overflow-auto rounded-lg border border-blue-100 bg-white p-2 text-[11px] text-gray-700">
            {grouped.map((group) => (
              <div key={group.type} className="mb-2 last:mb-0">
                <div className="mb-1 font-bold text-gray-800">
                  {group.type} · {group.items.length} 条
                </div>
                <ul className="space-y-1">
                  {group.items.slice(0, 4).map((item) => (
                    <li key={item.id} className={item.mandatory ? 'text-red-700' : 'text-gray-600'}>
                      {item.mandatory ? '★ ' : ''}
                      [{item.id}] {item.text}
                      {item.page !== null ? ` · 第 ${item.page} 页` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowJsonEditor((value) => !value)}
            className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
          >
            {showJsonEditor ? '收起原始 JSON' : '高级：编辑原始 JSON'}
          </button>
          {showJsonEditor && (
            <textarea
              value={draft || initialDraft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              className="h-40 w-full resize-y rounded-lg border border-blue-100 bg-white p-2 font-mono text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          )}
          {error && <p className="text-[11px] font-semibold text-red-700">{error}</p>}
        </div>
      )}

      {!isEscalate && artifact && (
        <div className="mb-3 space-y-2">
          <div className="rounded-lg border border-blue-100 bg-white p-3 text-[11px] text-gray-600">
            当前确认产物：{artifact.label}。页面已转成人能审核的摘要；需要精修结构时再展开原始 JSON。
          </div>

          {outline && (
            <div className="max-h-64 overflow-auto rounded-lg border border-blue-100 bg-white p-3 text-xs text-gray-700 space-y-2">
              {outline.sections.map((section, index) => (
                <div key={`${section.title}-${index}`} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                  <div className="font-semibold text-gray-900">
                    {index + 1}. {section.title}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    覆盖要求 {section.maps_to_requirement_ids.length} 条；素材引用 {section.asset_refs.length} 项
                  </div>
                </div>
              ))}
            </div>
          )}

          {report && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="覆盖率" value={`${report.coverage.responded}/${report.coverage.total}`} tone={report.coverage.missing.length ? 'warn' : 'pass'} />
                <Metric label="漏响应" value={`${report.coverage.missing.length} 项`} tone={report.coverage.missing.length ? 'warn' : 'pass'} />
                <Metric label="废标风险" value={`${report.coverage.废标风险项.length} 项`} tone={report.coverage.废标风险项.length ? 'fail' : 'pass'} />
                <Metric label="负偏离" value={`${negativeDeviations.length} 项`} tone={negativeDeviations.length ? 'fail' : 'pass'} />
              </div>

              {report.coverage.missing.length === 0 && report.coverage.废标风险项.length === 0 && negativeDeviations.length === 0 ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                  未发现漏响应、废标风险或负偏离。可直接确认继续导出。
                </div>
              ) : (
                <div className="max-h-56 overflow-auto rounded-lg border border-amber-100 bg-white p-3 text-xs text-gray-700 space-y-2">
                  {report.coverage.missing.slice(0, 8).map((reqId) => (
                    <div key={`missing-${reqId}`}>
                      <ReviewRow tone="warn" title={`漏响应：${reqId}`} body="该要求没有映射到任何应答章节，导出前应补齐。" />
                    </div>
                  ))}
                  {report.coverage.废标风险项.slice(0, 8).map((reqId) => (
                    <div key={`risk-${reqId}`}>
                      <ReviewRow tone="fail" title={`废标风险：${reqId}`} body="强制性要求未响应，可能导致无效投标。" />
                    </div>
                  ))}
                  {negativeDeviations.slice(0, 8).map((item) => (
                    <div key={`negative-${item.requirement_id}`}>
                      <ReviewRow tone="fail" title={`负偏离：${item.requirement_id}`} body={item.招标要求原文} />
                    </div>
                  ))}
                </div>
              )}

              {warnDeviations.length > 0 && (
                <div className="rounded-lg border border-blue-100 bg-white p-3 text-[11px] text-gray-600">
                  另有 {warnDeviations.length} 条非“无偏离”记录。这里优先展示会影响放行的漏项、废标风险和负偏离。
                </div>
              )}

              {pendingMaterials.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-gray-700">
                    待补充素材清单 · {pendingMaterials.length} 项
                  </div>
                  <div className="max-h-56 overflow-auto rounded-lg border border-amber-100 bg-white p-3 text-xs text-gray-700 space-y-2">
                    {pendingMaterials.slice(0, 8).map((item, index) => (
                      <div key={`pending-material-${item.section_title}-${index}`}>
                        <ReviewRow
                          tone="warn"
                          title={item.section_title}
                          body={`关联 ${item.maps_to_requirement_ids.length} 条要求，尚未匹配到素材库中的证明材料。`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {exportPlan && (
            <div className="max-h-64 overflow-auto rounded-lg border border-blue-100 bg-white p-3 text-xs text-gray-700 space-y-2">
              <div className="font-semibold text-gray-900">
                导出模式：{exportPlan.output_mode}；{exportPlan.volumes.length} 个文件{exportPlan.package_zip ? '，并打包 ZIP' : ''}
              </div>
              {exportPlan.volumes.map((volume, index) => (
                <div key={volume.volume_id} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                  <div className="font-semibold text-gray-900">
                    {index + 1}. {volume.cover_title}
                    {volume.sealed_separately && <span className="ml-2 text-amber-700">单独密封</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    文件名：{volume.file_name}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    目录：{volume.requires_toc ? '需要' : '不需要'}；索引表：{volume.requires_index_table ? '需要' : '不需要'}；签章页：{volume.requires_seal_page ? '需要' : '不需要'}
                  </div>
                  {volume.evidence[0] && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                      依据：{volume.evidence[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tenderSpec && (
            <div className="space-y-2 border-y border-blue-100 py-2 text-xs text-gray-700">
              <div className="font-semibold text-gray-900">
                表单 {tenderSpec.forms.length} 项：原文可用 {tenderSpec.forms.filter((form) => form.source_kind === 'tender').length} 项，
                系统生成 {tenderSpec.forms.filter((form) => form.source_kind === 'generated').length} 项，
                缺失 {unresolvedForms.length} 项
              </div>
              {registryForms.length > 0 && (
                <p className="text-amber-700">
                  模板库匹配：{registryForms.map((form) => form.title).join('、')}。确认后将记录模板指纹和文件摘要。
                </p>
              )}
              {unresolvedForms.length > 0 && (
                <p className="font-semibold text-red-700">
                  缺少可编辑原样表单：{unresolvedForms.map((form) => form.title).join('、')}。当前禁止继续生成。
                </p>
              )}
              {pendingFormCandidates.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-amber-800">
                    发现 {pendingFormCandidates.length} 个附件表单候选，需逐项确认
                  </p>
                  {pendingFormCandidates.map((candidate) => (
                    <div key={candidate.candidate_id} className="rounded-md border border-amber-100 bg-white p-2">
                      <div className="font-semibold text-gray-900">{candidate.title}</div>
                      <div className="mt-1 text-[11px] text-gray-500">{candidate.evidence[0] ?? candidate.reason}</div>
                      <div className="mt-2 inline-flex overflow-hidden rounded-md border border-amber-200">
                        {(['required', 'excluded'] as const).map((decision) => (
                          <button
                            key={decision}
                            type="button"
                            onClick={() => {
                              setCandidateDecisions((current) => ({
                                ...current,
                                [candidate.candidate_id]: decision,
                              }));
                              setError(null);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold ${
                              candidateDecisions[candidate.candidate_id] === decision
                                ? 'bg-amber-600 text-white'
                                : 'bg-white text-gray-700'
                            }`}
                          >
                            {decision === 'required' ? '列为必需' : '确认非必需'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-[11px] text-gray-700">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(event) => setSaveAsTemplate(event.target.checked)}
                  className="mt-0.5"
                />
                <span>保存为结构模板（仅保存分册、样式和表单结构，不保存项目名称、编号或采购人）</span>
              </label>
            </div>
          )}

          {tenderSpec && unverifiedMetaFields.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-gray-700">
              <div className="font-semibold text-amber-800">关键项未在原文中可靠定位，需人工补录并确认</div>
              {unverifiedMetaFields.map((field) => (
                <label key={field} className="block space-y-1">
                  <span className="font-medium text-gray-800">{field}</span>
                  <input
                    value={manualMeta[field] ?? tenderSpec.project_meta[field] ?? ''}
                    onChange={(event) => {
                      setManualMeta((current) => ({ ...current, [field]: event.target.value }));
                      setError(null);
                    }}
                    placeholder={`请输入${field}`}
                    className="w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={Boolean(manualConfirmed[field])}
                      onChange={(event) => {
                        setManualConfirmed((current) => ({ ...current, [field]: event.target.checked }));
                        setError(null);
                      }}
                    />
                    我确认该值由人工核对补录，将写入正式交付文件。
                  </span>
                </label>
              ))}
            </div>
          )}

          {!outline && !report && !exportPlan && (
            <div className="rounded-lg border border-blue-100 bg-white p-3 text-xs text-gray-700">
              该产物暂未配置专用审核视图，可展开原始 JSON 检查。
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowJsonEditor((value) => !value)}
            className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
          >
            {showJsonEditor ? '收起原始 JSON' : '高级：编辑原始 JSON'}
          </button>

          {showJsonEditor && (
            <textarea
              value={draft || artifactDraft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              className="h-48 w-full resize-y rounded-lg border border-blue-100 bg-white p-2 font-mono text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          )}
          {error && <p className="text-[11px] font-semibold text-red-700">{error}</p>}
        </div>
      )}

      {isEscalate ? (
        <div className="flex flex-wrap gap-2">
          {card.options?.map((o, i) => (
            <button
              key={i}
              onClick={() => onChoose(i)}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--bad)] text-white text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition shadow-sm"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={confirmWithDraft}
          className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition shadow-sm"
        >
          确认继续
        </button>
      )}
    </motion.div>
  );
}

function isOutlineArtifact(value: unknown): value is BackendOutline {
  return Boolean(
    value
      && typeof value === 'object'
      && Array.isArray((value as BackendOutline).sections),
  );
}

function isReportArtifact(value: unknown): value is BackendReport {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as BackendReport).coverage
      && Array.isArray((value as BackendReport).deviations),
  );
}

function isExportPlanArtifact(value: unknown): value is BackendExportPlan {
  return Boolean(
    value
      && typeof value === 'object'
      && Array.isArray((value as BackendExportPlan).volumes),
  );
}

function isTenderSpecArtifact(value: unknown): value is BackendTenderSpec {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as BackendTenderSpec).project_meta
      && (value as BackendTenderSpec).export_plan,
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'pass' | 'warn' | 'fail' }) {
  const toneClass = tone === 'pass'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : tone === 'warn'
    ? 'border-amber-100 bg-amber-50 text-amber-700'
    : 'border-red-100 bg-red-50 text-red-700';
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold opacity-75">{label}</div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}

function ReviewRow({ tone, title, body }: { tone: 'warn' | 'fail'; title: string; body: string }) {
  return (
    <div className={`rounded-md border p-2 ${tone === 'fail' ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50'}`}>
      <div className={`font-semibold ${tone === 'fail' ? 'text-red-700' : 'text-amber-700'}`}>{title}</div>
      <div className="mt-1 line-clamp-3 text-[11px] text-gray-600">{body}</div>
    </div>
  );
}
