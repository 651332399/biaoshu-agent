import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cx } from "./cx";

export type BadgeTone = "blue" | "green" | "amber" | "red" | "grey" | "purple" | "teal";

/** 状态 / 标签小块，复用 design.css 的 zy-chip 色板。 */
export function Badge({ tone = "grey", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cx("zy-chip", `zy-chip--${tone}`, className)}>{children}</span>;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "green",
  published: "green",
  succeeded: "green",
  running: "blue",
  pending: "amber",
  draft: "grey",
  disabled: "grey",
  failed: "red",
  error: "red",
};

/** 按状态键着色的 Badge；label 为展示文案，未知状态落灰色。 */
export function StatusBadge({ status, label }: { status: string; label: ReactNode }) {
  return <Badge tone={STATUS_TONE[status] ?? "grey"}>{label}</Badge>;
}

export type Column<Row> = {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  /** CSS grid 轨道，如 "2fr" / "120px"。 */
  width?: string | undefined;
  align?: "start" | "end" | undefined;
};

export type Pagination = { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };

export type DataTableProps<Row> = {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  "aria-label": string;
  loading?: boolean | undefined;
  empty?: ReactNode;
  pagination?: Pagination | undefined;
};

/** 基础表格：表头、加载、空状态、分页。沿用 zy-thead / zy-tr 的 grid 行样式。 */
export function DataTable<Row>({ columns, rows, rowKey, loading, empty, pagination, ...aria }: DataTableProps<Row>) {
  const template = columns.map((column) => column.width ?? "1fr").join(" ");
  const pages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  return (
    <div className="zy-ui-table" role="table" aria-label={aria["aria-label"]} aria-busy={loading || undefined}>
      <div className="zy-thead" role="row" style={{ gridTemplateColumns: template }}>
        {columns.map((column) => (
          <span key={column.key} role="columnheader" className={cx(column.align === "end" && "zy-ui-cell--end")}>{column.header}</span>
        ))}
      </div>
      {loading ? (
        <div className="zy-skeleton" role="status" aria-label="加载中">
          {[0, 1, 2].map((index) => (
            <div key={index} className="zy-skeleton-row" style={{ gridTemplateColumns: template }}>{columns.map((column) => <i key={column.key} />)}</div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="zy-empty zy-ui-table-empty">{empty ?? "暂无数据"}</div>
      ) : (
        rows.map((row) => (
          <div key={rowKey(row)} className="zy-tr" role="row" style={{ gridTemplateColumns: template }}>
            {columns.map((column) => (
              <span key={column.key} role="cell" className={cx(column.align === "end" && "zy-ui-cell--end")}>{column.render(row)}</span>
            ))}
          </div>
        ))
      )}
      {pagination && pagination.total > pagination.pageSize ? (
        <nav className="zy-ui-pager" aria-label="分页">
          <span className="zy-ui-pager-info">共 {pagination.total} 条 · 第 {pagination.page} / {pages} 页</span>
          <button type="button" className="zy-ui-icon-action" aria-label="上一页" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button type="button" className="zy-ui-icon-action" aria-label="下一页" disabled={pagination.page >= pages} onClick={() => pagination.onPageChange(pagination.page + 1)}>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
