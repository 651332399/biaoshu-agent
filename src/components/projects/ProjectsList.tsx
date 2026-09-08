import { useEffect, useState } from 'react';
import { listProjects, type ProjectSummary } from '../../lib/api';

export type ProjectStatus = ProjectSummary['status'];

export interface RecentProject {
  id: string;
  name: string;
  status: ProjectStatus;
  meta: string;
}

const STATUS_META: Record<ProjectStatus, { label: string; cls: string }> = {
  active: { label: '进行中', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  generation_started: { label: '生成中', cls: 'bg-blue-50 text-blue-600' },
  generated: { label: '已生成', cls: 'bg-blue-50 text-blue-600' },
  server_precheck_failed: { label: '预检失败', cls: 'bg-red-50 text-red-700 border-red-200' },
  server_precheck_passed: { label: '预检通过', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  awaiting_wps_acceptance: { label: '待 WPS 验收', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  wps_verification_failed: { label: 'WPS 验收失败', cls: 'bg-red-50 text-red-600' },
  archiving: { label: '归档中', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  accepted: { label: '已验收', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  superseded: { label: '已失效', cls: 'bg-gray-100 text-gray-600' },
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

function toRecentProject(project: ProjectSummary): RecentProject {
  const detail = project.status === 'accepted'
    ? '最终交付已通过'
    : project.status === 'awaiting_wps_acceptance'
      ? '服务器预检已通过，等待 WPS 验收'
      : project.current_node ? `当前节点：${project.current_node}` : STATUS_META[project.status].label;
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    meta: `阶段 ${project.completed_steps} / ${project.total_steps} · ${detail}`,
  };
}

export function RecentProjects({ onOpen }: { onOpen?: (id: string) => void }) {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listProjects()
      .then((items) => {
        if (!cancelled) setProjects(items.map(toRecentProject));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '项目加载失败');
      });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="text-xs text-red-600">项目加载失败：{error}</p>;
  if (projects.length === 0) return <p className="text-xs text-[var(--muted)]">暂无项目</p>;
  return (
    <div className="space-y-2.5">
      {projects.map((project) => (
        <RecentProjectRow key={project.id} project={project} onOpen={onOpen} />
      ))}
    </div>
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
        <RecentProjects onOpen={onOpen} />
      </div>
    </div>
  );
}
