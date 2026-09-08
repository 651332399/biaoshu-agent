import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ban, ClipboardList, FlaskConical, Paperclip, ScrollText, Search, Trophy, UserRound, X, type LucideIcon } from 'lucide-react';
import type { Material, MaterialCategory } from '../../engine/demo/types';
import type { BackendMaterial } from '../../engine/types';
import { listMaterials, uploadMaterial, deleteMaterial, ApiError } from '../../lib/api';

interface Props {
  materials: Material[];
  matched: string[];
}

const CATEGORIES: { key: MaterialCategory; icon: LucideIcon; label: string }[] = [
  { key: 'qual', icon: ScrollText, label: '资质' },
  { key: 'people', icon: UserRound, label: '人员' },
  { key: 'device', icon: FlaskConical, label: '仪器' },
  { key: 'record', icon: Trophy, label: '业绩' },
  { key: 'template', icon: ClipboardList, label: '模板' },
];
const CAT_TITLE: Record<MaterialCategory, string> = {
  qual: '企业核心资质库',
  people: '专业团队人员库',
  device: '测量仪器与标准器库',
  record: '历史同类业绩库',
  template: '标书专项模板库',
};

/** 后端 Material → 本页展示用最小结构(demo Material 的子集,复用卡片渲染)。 */
interface DisplayMaterial {
  id: string;
  category: MaterialCategory;
  名称: string;
  hasFile: boolean;
}

function fromBackend(m: BackendMaterial): DisplayMaterial {
  return { id: m.id, category: m.category, 名称: m.name, hasFile: Boolean(m.file_path) };
}

/** P7 企业资料库:接后端 /api/materials(todo-6)——真实加载 / 上传 / 删除;
 * 后端不可达时回退传入的 demo materials,保证 DevPreview/演示路径不破。 */
export function MaterialsLibrary({ materials }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MaterialCategory | 'all'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [items, setItems] = useState<DisplayMaterial[]>([]);
  const [offline, setOffline] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const demoFallback = useMemo(
    () => materials.map((m) => ({ id: m.id, category: m.category, 名称: m.名称, hasFile: false })),
    [materials],
  );

  const refresh = React.useCallback(async () => {
    try {
      const backend = await listMaterials();
      setItems(backend.map(fromBackend));
      setOffline(false);
    } catch {
      // 后端不可达(演示/离线):回退 demo 素材
      setItems(demoFallback);
      setOffline(true);
    }
  }, [demoFallback]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return items.filter(
      (m) => (filter === 'all' || m.category === filter) && (!q || m.名称.includes(q)),
    );
  }, [items, query, filter]);

  const catCount = (c: MaterialCategory) => items.filter((m) => m.category === c).length;
  const shownCategories = CATEGORIES.filter((c) => filter === 'all' || c.key === filter);

  const handleDelete = async (id: string) => {
    try {
      await deleteMaterial(id);
      setToast(`已删除素材 ${id}。`);
      await refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? `删除失败:${err.message}` : '删除失败。');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--canvas)] p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-[22px] font-black text-[var(--zy-text)] flex items-center gap-2">
            迈创企业资料库
            <span className="text-xs font-medium text-[var(--muted)]">5 大底座 · 共 {items.length} 项</span>
            {offline && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">演示数据(后端未连接)</span>}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">编写标书时自动检索匹配;缺失要件会提示补充,避免废标。</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 rounded-lg border border-[var(--zy-input)] bg-white px-3 py-2">
            <Search aria-hidden="true" size={14} className="text-[var(--zy-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索资质 / 人员 / 业绩…"
              className="flex-1 text-[13px] outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            disabled={offline}
            title={offline ? '后端未连接,无法上传' : undefined}
            className="px-4 py-2 rounded-lg bg-[var(--zy-blue)] text-white text-[13px] font-bold hover:bg-[var(--zy-blue-dark)] active:scale-[0.98] transition disabled:opacity-45 disabled:cursor-not-allowed"
          >
            ＋ 上传资料
          </button>
        </div>

        {showForm && !offline && (
          <UploadForm
            defaultCategory={filter === 'all' ? 'qual' : filter}
            onDone={async (msg) => {
              setShowForm(false);
              setToast(msg);
              await refresh();
            }}
            onError={(msg) => setToast(msg)}
          />
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`全部`} />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c.key}
              active={filter === c.key}
              onClick={() => setFilter(c.key)}
              icon={c.icon}
              label={`${c.label} ${catCount(c.key)}`}
            />
          ))}
        </div>

        {toast && (
          <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-start justify-between gap-3">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} aria-label="关闭提示" className="text-blue-400 hover:text-blue-600">
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--zy-input)] bg-white py-16 text-center text-[13px] text-[var(--muted)]">
            资料库为空。上传企业资质 / 人员 / 业绩 / 模板后,编写时会自动检索匹配。
          </div>
        ) : (
          <div className="space-y-7">
            {shownCategories.map((c) => {
              const catItems = filtered.filter((m) => m.category === c.key);
              if (catCount(c.key) === 0) {
                return (
                  <section key={c.key}>
                    <h2 className="text-[13.5px] font-black text-[var(--zy-text)] mb-3 flex items-center gap-2">
                      <c.icon aria-hidden="true" size={15} strokeWidth={1.75} className="text-[var(--zy-muted)]" />
                      {CAT_TITLE[c.key]}
                      <span className="text-[11px] font-medium text-[var(--muted)]">0 项</span>
                    </h2>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 flex items-center gap-1.5">
                      <Ban aria-hidden="true" size={13} />
                      <span className="font-bold">缺失</span> — 暂无该分类资料,请上传补充,避免因材料缺失导致废标。
                    </div>
                  </section>
                );
              }
              if (catItems.length === 0) return null;
              return (
                <section key={c.key}>
                  <h2 className="text-[13.5px] font-black text-[var(--zy-text)] mb-3 flex items-center gap-2">
                    <c.icon aria-hidden="true" size={15} strokeWidth={1.75} className="text-[var(--zy-muted)]" />
                    {CAT_TITLE[c.key]}
                    <span className="text-[11px] font-medium text-[var(--muted)]">{catItems.length} 项</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catItems.map((m) => (
                      <div key={m.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          {m.hasFile && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                              <Paperclip aria-hidden="true" size={11} />
                              含文件
                            </span>
                          )}
                          {!offline && (
                            <button
                              onClick={() => handleDelete(m.id)}
                              aria-label={`删除 ${m.名称}`}
                              className="ml-auto text-[11px] text-gray-300 hover:text-red-500 transition"
                            >
                              删除
                            </button>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{m.名称}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadForm({
  defaultCategory,
  onDone,
  onError,
}: {
  defaultCategory: MaterialCategory;
  onDone: (msg: string) => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [category, setCategory] = useState<MaterialCategory>(defaultCategory);
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!name.trim()) {
      onError('请填写素材名称。');
      return;
    }
    setBusy(true);
    try {
      const file = fileRef.current?.files?.[0] ?? null;
      await uploadMaterial(
        {
          category,
          name: name.trim(),
          keywords: keywords.split(/[,，\s]+/).filter(Boolean),
        },
        file,
      );
      await onDone(`已上传「${name.trim()}」。`);
      setName('');
      setKeywords('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      onError(err instanceof ApiError ? `上传失败:${err.message}` : '上传失败。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MaterialCategory)}
          aria-label="素材分类"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="素材名称(如 CMA 资质证书)"
          aria-label="素材名称"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        />
      </div>
      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="关键词,逗号分隔(供召回匹配)"
        aria-label="关键词"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
      />
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" aria-label="证照/图片文件" className="text-xs" />
        <button
          onClick={submit}
          disabled={busy}
          className="ml-auto px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {busy ? '上传中…' : '提交'}
        </button>
      </div>
    </div>
  );
}

/* 同平台 .zy-pill:白底细边,选中态蓝底蓝字加粗 */
function FilterChip({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon?: LucideIcon }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12.5px] transition-colors cursor-pointer ${
        active
          ? 'bg-[var(--zy-blue-bg)] border-[var(--zy-blue-bg)] text-[var(--zy-blue)] font-bold'
          : 'bg-white border-[var(--zy-input)] text-[var(--zy-text-2)] hover:border-[var(--zy-muted-2)]'
      }`}
    >
      {Icon && <Icon aria-hidden="true" size={13} strokeWidth={1.75} />}
      {label}
    </button>
  );
}
