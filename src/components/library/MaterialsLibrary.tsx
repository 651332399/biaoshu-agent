import React, { useMemo, useRef, useState } from 'react';
import type { Material, MaterialCategory } from '../../engine/demo/types';

interface Props {
  materials: Material[];
  matched: string[];
}

const CATEGORIES: { key: MaterialCategory; icon: string; label: string }[] = [
  { key: 'qual', icon: '📜', label: '资质' },
  { key: 'people', icon: '👤', label: '人员' },
  { key: 'device', icon: '🔬', label: '仪器' },
  { key: 'record', icon: '🏆', label: '业绩' },
  { key: 'template', icon: '📝', label: '模板' },
];
const CAT_TITLE: Record<MaterialCategory, string> = {
  qual: '📜 企业核心资质库',
  people: '👤 专业团队人员库',
  device: '🔬 测量仪器与标准器库',
  record: '🏆 历史同类业绩库',
  template: '📝 标书专项模板库',
};

type StatusKind = 'used' | 'available' | 'warn' | 'pending';
function statusOf(m: Material, matched: string[]): StatusKind {
  if (m.pending) return 'pending';
  if (m.口径警告) return 'warn';
  if (m.命中 || matched.includes(m.id)) return 'used';
  return 'available';
}
const STATUS_META: Record<StatusKind, { label: string; cls: string }> = {
  used: { label: '本项目已用', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  available: { label: '可用', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  warn: { label: '⚠️ 口径警告', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  pending: { label: '待审核', cls: 'border-purple-200 bg-purple-50 text-purple-700' },
};

/** P7 企业资料库独立菜单页:5 大底座卡片化 + 搜索 / 筛选 / 上传。 */
export function MaterialsLibrary({ materials, matched }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MaterialCategory | 'all'>('all');
  const [toast, setToast] = useState<string | null>(null);
  // 本地可变副本:纯前端模拟上传新增素材,不回写 props。
  const [localMaterials, setLocalMaterials] = useState<Material[]>(materials);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    return localMaterials.filter(
      (m) => (filter === 'all' || m.category === filter) && (!q || m.名称.includes(q)),
    );
  }, [localMaterials, query, filter]);

  const catCount = (c: MaterialCategory) => localMaterials.filter((m) => m.category === c).length;
  const shownCategories = CATEGORIES.filter((c) => filter === 'all' || c.key === filter);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    const category = filter === 'all' ? 'qual' : filter;
    const newMaterial: Material = {
      id: `upload-${Date.now()}`,
      category,
      名称: file.name,
      pending: true,
    };
    setLocalMaterials((prev) => [...prev, newMaterial]);
    setToast(`已上传「${file.name}」,进入待审核状态,审核通过后自动参与本项目匹配。`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--canvas)] p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* 页头 */}
        <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🗄️ 迈创企业资料库
            <span className="text-xs font-medium text-[var(--muted)]">5 大底座 · 共 {localMaterials.length} 项</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">编写标书时自动检索匹配;缺失要件会提示补充,避免废标。</p>
        </header>

        {/* 搜索 + 上传 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <span className="text-gray-400">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索资质 / 人员 / 业绩…"
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black active:scale-95 transition"
          >
            ＋ 上传资料
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            aria-label="上传资料文件"
            onChange={handleFileSelected}
          />
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`全部`} />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c.key}
              active={filter === c.key}
              onClick={() => setFilter(c.key)}
              label={`${c.icon} ${c.label} ${catCount(c.key)}`}
            />
          ))}
        </div>

        {toast && (
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-start justify-between gap-3">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-blue-400 hover:text-blue-600">✕</button>
          </div>
        )}

        {/* 5 底座分区 */}
        {localMaterials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-sm text-[var(--muted)]">
            资料库为空。上传企业资质 / 人员 / 业绩 / 模板后,编写时会自动检索匹配。
          </div>
        ) : (
          <div className="space-y-7">
            {shownCategories.map((c) => {
              const totalInCat = catCount(c.key);
              // 该分类在企业资料库中完全没有资料 → 渲染「缺失」占位卡片,而非跳过整个 section。
              if (totalInCat === 0) {
                return (
                  <section key={c.key}>
                    <h2 className="text-sm font-bold text-gray-800 mb-3">
                      {CAT_TITLE[c.key]}
                      <span className="ml-2 text-[11px] font-medium text-[var(--muted)]">0 项</span>
                    </h2>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                      <span className="font-semibold">⛔ 缺失</span> — 暂无该分类资料,请上传补充,避免因材料缺失导致废标。
                    </div>
                  </section>
                );
              }
              const items = filtered.filter((m) => m.category === c.key);
              if (items.length === 0) return null;
              const used = items.filter((m) => statusOf(m, matched) === 'used').length;
              return (
                <section key={c.key}>
                  <h2 className="text-sm font-bold text-gray-800 mb-3">
                    {CAT_TITLE[c.key]}
                    <span className="ml-2 text-[11px] font-medium text-[var(--muted)]">
                      {items.length} 项{used > 0 ? ` · ${used} 项已用于本项目` : ''}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((m) => {
                      const st = STATUS_META[statusOf(m, matched)];
                      return (
                        <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-2xs">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 leading-snug">{m.名称}</p>
                          {m.口径警告 && (
                            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-[11px] text-amber-700 leading-relaxed">
                              {m.口径警告}
                            </p>
                          )}
                        </div>
                      );
                    })}
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

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
        active ? 'bg-[var(--accent)] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
