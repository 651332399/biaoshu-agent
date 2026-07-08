export type AppView = 'editor' | 'library' | 'projects';

interface NavItem {
  view: AppView;
  icon: string;
  label: string;
}

const ITEMS: NavItem[] = [
  { view: 'editor', icon: '📝', label: '编辑' },
  { view: 'library', icon: '🗄️', label: '资料库' },
  { view: 'projects', icon: '🕓', label: '项目' },
];

interface Props {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

/** 全局左侧图标导航栏(1c 新增)——编辑 / 资料库 / 项目 三个一级页面 */
export function GlobalNav({ view, onNavigate }: Props) {
  return (
    <nav
      aria-label="全局导航"
      className="w-16 shrink-0 h-full bg-[var(--surface)] border-r border-[var(--border)] flex flex-col items-center py-4 gap-1 z-20"
    >
      <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center text-lg font-bold shadow-sm mb-4">
        ◆
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full items-center">
        {ITEMS.map((item) => {
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              aria-current={active ? 'page' : undefined}
              className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold shadow-sm">
        迈
      </div>
    </nav>
  );
}
