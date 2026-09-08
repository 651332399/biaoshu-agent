import { FilePenLine, FolderClock, Library, type LucideIcon } from 'lucide-react';

export type AppView = 'editor' | 'library' | 'projects';

interface NavItem {
  view: AppView;
  icon: LucideIcon;
  label: string;
}

const ITEMS: NavItem[] = [
  { view: 'editor', icon: FilePenLine, label: '编辑' },
  { view: 'library', icon: Library, label: '资料库' },
  { view: 'projects', icon: FolderClock, label: '项目' },
];

interface Props {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

/** 全局左侧图标导航栏——编辑 / 资料库 / 项目 三个一级页面。
 * 视觉沿用归序AI 平台侧栏(白底 + 右边线 + 蓝底选中态),宽度保持 64px:平台经 iframe 嵌入本页,不再重复一条宽侧栏。 */
export function GlobalNav({ view, onNavigate }: Props) {
  return (
    <nav
      aria-label="全局导航"
      className="w-16 shrink-0 h-full bg-white border-r border-[var(--zy-line)] flex flex-col items-center py-4 gap-1 z-20"
    >
      <div
        aria-hidden="true"
        className="w-9 h-9 rounded-[10px] bg-[linear-gradient(135deg,#2f5fd0,#7a5fd0)] text-white flex items-center justify-center text-[15px] font-black mb-4"
      >
        标
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full items-center">
        {ITEMS.map((item) => {
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              aria-current={active ? 'page' : undefined}
              className={`w-12 py-2 rounded-[10px] flex flex-col items-center gap-1 text-[10px] transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--zy-blue-bg)] text-[var(--zy-blue)] font-bold'
                  : 'text-[var(--zy-text-2)] font-medium hover:bg-[var(--zy-bg)]'
              }`}
            >
              <item.icon
                aria-hidden="true"
                size={18}
                strokeWidth={1.75}
                className={active ? 'text-current' : 'text-[var(--zy-muted)]'}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-9 h-9 rounded-[9px] bg-[var(--zy-blue-bg)] text-[var(--zy-blue)] flex items-center justify-center text-sm font-black">
        迈
      </div>
    </nav>
  );
}
