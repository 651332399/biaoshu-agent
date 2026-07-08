export type ProjectStatus = 'active' | 'exported' | 'draft';

export interface RecentProject {
  id: string;
  name: string;
  status: ProjectStatus;
  meta: string;
}

export const RECENT_PROJECTS: RecentProject[] = [
  { id: 'kqyy', name: '北京口腔医院 2026 医用设备计量检测', status: 'active', meta: '阶段 6 / 9 · 生成中 · 综合评分法 · 限价 ¥27.0万' },
  { id: 'haidian-cdc', name: '海淀区疾控中心检验设备维保', status: 'exported', meta: '9 / 9 · 已打包 bid.docx · 最低价法' },
  { id: 'xiehe-img', name: '协和医院影像设备计量校准', status: 'draft', meta: '阶段 2 / 9 · 待确认要求清单' },
];

const STATUS_META: Record<ProjectStatus, { label: string; cls: string }> = {
  active: { label: '进行中', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  exported: { label: '已导出', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function RecentProjectRow({ project, onOpen }: { project: RecentProject; onOpen?: (id: string) => void }) {
  const st = STATUS_META[project.status];
  return (
    <button
      onClick={() => onOpen?.(project.id)}
      className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 hover:border-gray-300 hover:shadow-2xs transition cursor-pointer"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 truncate">{project.name}</span>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--muted)] truncate">{project.meta}</p>
      </div>
      <span className="shrink-0 text-[var(--muted)]">→</span>
    </button>
  );
}

/** 项目一级页面:最近项目列表 + 新建入口。 */
export function ProjectsList({ onOpen, onNew }: { onOpen?: (id: string) => void; onNew: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--canvas)] p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🕓 我的标书项目</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">继续未完成的标书,或新建一个项目。</p>
          </div>
          <button
            onClick={onNew}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition"
          >
            ＋ 新建标书
          </button>
        </header>
        <div className="space-y-2.5">
          {RECENT_PROJECTS.map((p) => (
            <RecentProjectRow key={p.id} project={p} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}
