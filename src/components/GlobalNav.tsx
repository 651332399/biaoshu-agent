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
 * 视觉沿用智员平台侧栏(白底 + 右边线 + 蓝底选中态),宽度保持 64px。
 * 品牌、账号区与「返回智员平台」在顶栏 AppTopbar。 */
export function GlobalNav({ view, onNavigate }: Props) {
  return (
    <nav
      aria-label="全局导航"
      className="w-16 shrink-0 h-full overflow-y-auto bg-white border-r border-[var(--zy-line)] flex flex-col items-center py-4 gap-1 z-20"
    >
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

    </nav>
  );
}
