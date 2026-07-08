import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Extension, Mark, mergeAttributes, Node, type JSONContent } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { LocateFixed, Lock, Unlock, ZoomIn, ZoomOut } from 'lucide-react';
import type { DocBlockData, EvidenceChipData, Step } from '../engine/demo/types';
import {
  attachmentCardNodeName,
  blocksToTiptapDoc,
  evidenceChipMarkName,
  formCardNodeName,
  tiptapDocToBlocks,
} from '../lib/blockDoc';
import { AnnotationBubble } from './editor/AnnotationBubble';

interface PaperCanvasProps {
  blocks: DocBlockData[];
  lockedBlocks: Set<string>;
  dirtyBlocks: Set<string>;
  writingBlockId: string | null;
  isStreaming: boolean;
  fileName: string;
  saveError?: string | null;
  /** 按 blockId 归类的行内证据芯片(命中/缺失企业资料),点击缺失项可跳转资料库 */
  chips?: Record<string, EvidenceChipData[]>;
  onChipClick?(materialId: string): void;
  /** 正文旁 AI 审阅·待决断卡片,锚定在纸面右上角(Tiptap 单文档流下不做逐段落像素锚定) */
  escalation?: Step | null;
  onChooseEscalation?(index: number): void;
  onBlocksChange(blocks: DocBlockData[], dirtyIds: string[]): void;
  onToggleLock(blockId: string): void;
}

const blockAttrs = Extension.create({
  name: 'blockAttrs',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph', 'table'],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attrs) => attrs.blockId ? { 'data-block-id': attrs.blockId } : {},
          },
          chapterId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-chapter-id'),
            renderHTML: (attrs) => attrs.chapterId ? { 'data-chapter-id': attrs.chapterId } : {},
          },
        },
      },
    ];
  },
});

const AttachmentCard = Node.create({
  name: attachmentCardNodeName,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      blockId: { default: null },
      chapterId: { default: null },
      title: { default: '' },
      materialId: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="attachment-card"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'attachment-card' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentCardView);
  },
});

function AttachmentCardView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-chapter-id={node.attrs.chapterId}
      className="my-4 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded bg-white text-sm shadow-xs">DOC</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{node.attrs.title}</div>
        <div className="text-xs text-emerald-700">已自动关联企业资质库 [{node.attrs.materialId}]</div>
      </div>
      <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700">
        合规插入
      </span>
    </NodeViewWrapper>
  );
}

interface FormItem {
  label: string;
  value: string;
}

const FormCard = Node.create({
  name: formCardNodeName,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      blockId: { default: null },
      chapterId: { default: null },
      items: { default: [] },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="form-card"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'form-card' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FormCardView);
  },
});

function FormCardView({ node }: NodeViewProps) {
  const items = (node.attrs.items ?? []) as FormItem[];
  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-chapter-id={node.attrs.chapterId}
      className="my-4 grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2"
    >
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
          <span className="text-sm font-semibold text-slate-800">{item.value}</span>
        </div>
      ))}
    </NodeViewWrapper>
  );
}

const EvidenceChip = Mark.create({
  name: evidenceChipMarkName,
  addAttributes() {
    return {
      materialId: { default: null },
      status: { default: 'hit' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-material-id]' }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    const missing = mark.attrs.status === 'missing';
    const cls = missing
      ? 'cursor-pointer underline decoration-amber-500 decoration-dashed decoration-2 underline-offset-2'
      : 'cursor-pointer underline decoration-emerald-500 decoration-2 underline-offset-2';
    return ['span', mergeAttributes(HTMLAttributes, { class: cls, 'data-material-id': mark.attrs.materialId }), 0];
  },
});

export function PaperCanvas({
  blocks,
  lockedBlocks,
  dirtyBlocks,
  writingBlockId,
  isStreaming,
  fileName,
  saveError,
  chips,
  onChipClick,
  escalation,
  onChooseEscalation,
  onBlocksChange,
  onToggleLock,
}: PaperCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [streamText, setStreamText] = useState<string | null>(null);
  const blocksRef = useRef(blocks);
  const lastDocRef = useRef('');
  // 用户正在编辑器内输入时收到的外部(Agent 流式/其它块)更新暂存于此,失焦后再应用,
  // 避免整文档 setContent 打断当前光标/选区。
  const pendingSyncRef = useRef<{ doc: JSONContent; key: string } | null>(null);
  const extensions = useMemo(() => [
    StarterKit,
    blockAttrs,
    Highlight.configure({ multicolor: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    AttachmentCard,
    FormCard,
    EvidenceChip,
  ], []);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const displayBlocks = useMemo(() => {
    if (!isStreaming || !writingBlockId || streamText === null) return blocks;
    return blocks.map((block) => {
      if (block.id !== writingBlockId || block.render !== 'prose') return block;
      return { ...block, prose: streamText };
    });
  }, [blocks, isStreaming, streamText, writingBlockId]);

  useEffect(() => {
    const block = blocks.find((item) => item.id === writingBlockId);
    if (!isStreaming || !block || block.render !== 'prose' || !block.prose || dirtyBlocks.has(block.id)) {
      setStreamText(null);
      return;
    }
    let index = 0;
    setStreamText('');
    const handle = window.setInterval(() => {
      index = Math.min(block.prose!.length, index + 4);
      setStreamText(block.prose!.slice(0, index));
      if (index >= block.prose!.length) {
        window.clearInterval(handle);
      }
    }, 18);
    return () => window.clearInterval(handle);
  }, [blocks, dirtyBlocks, isStreaming, writingBlockId]);

  const editor = useEditor({
    extensions,
    content: blocksToTiptapDoc(displayBlocks, { highlightedBlockId: writingBlockId, chips }),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'paper-editor doc-serif focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const previous = blocksRef.current;
      const next = tiptapDocToBlocks(editor.getJSON(), previous);
      const dirtyIds = next
        .filter((block) => {
          const before = previous.find((item) => item.id === block.id);
          return before && JSON.stringify(before) !== JSON.stringify(block);
        })
        .map((block) => block.id);
      lastDocRef.current = JSON.stringify(editor.getJSON());
      onBlocksChange(next, dirtyIds);
    },
    onBlur: ({ editor }) => {
      // 失焦后再补上编辑期间被搁置的外部更新,不打断刚才的输入
      const pending = pendingSyncRef.current;
      if (!pending) return;
      pendingSyncRef.current = null;
      editor.commands.setContent(pending.doc, { emitUpdate: false });
      lastDocRef.current = pending.key;
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextDoc = blocksToTiptapDoc(displayBlocks, { highlightedBlockId: writingBlockId, chips });
    const nextKey = JSON.stringify(nextDoc);
    const currentKey = JSON.stringify(editor.getJSON());
    if (nextKey === currentKey || nextKey === lastDocRef.current) {
      lastDocRef.current = nextKey;
      return;
    }
    if (editor.isFocused) {
      // 用户正在编辑器里输入/选中内容:先记下最新外部文档,失焦后再同步,避免重置其光标/选区。
      pendingSyncRef.current = { doc: nextDoc, key: nextKey };
      return;
    }
    editor.commands.setContent(nextDoc, { emitUpdate: false });
    lastDocRef.current = nextKey;
  }, [displayBlocks, editor, writingBlockId, chips]);

  const focusWritingBlock = () => {
    if (!writingBlockId) return;
    document.querySelector(`[data-block-id="${writingBlockId}"]`)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  };

  const handlePaperClick = (event: MouseEvent<HTMLDivElement>) => {
    const chipEl = (event.target as HTMLElement).closest('[data-material-id]');
    const materialId = chipEl?.getAttribute('data-material-id');
    if (materialId) onChipClick?.(materialId);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#e9eef5]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-[#f7f9fc] px-6 text-xs text-slate-600">
        <div className="truncate">
          <span className="font-medium">{fileName}</span>
          <span className="px-2 text-slate-300">·</span>
          <span>A4</span>
          <span className="px-2 text-slate-300">·</span>
          <span>宋体</span>
          {dirtyBlocks.size > 0 && <span className="ml-3 text-amber-700">已人工修改 {dirtyBlocks.size} 处</span>}
          {saveError && <span className="ml-3 text-red-600">{saveError}</span>}
        </div>
        <div className="flex items-center gap-2">
          {writingBlockId && (
            <button
              type="button"
              onClick={focusWritingBlock}
              className="flex h-8 items-center gap-1 rounded-md border border-blue-100 bg-white px-3 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-50"
            >
              <LocateFixed size={14} />
              定位到编写处
            </button>
          )}
          <button
            type="button"
            aria-label="缩小"
            onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50"
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="放大"
            onClick={() => setZoom((value) => Math.min(1.25, Number((value + 0.1).toFixed(2))))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div
          className="mx-auto min-h-[1123px] w-[794px] origin-top rounded-sm bg-white px-[58px] py-[54px] shadow-[0_20px_80px_rgba(15,23,42,0.15)]"
          style={{ transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 1123}px` }}
        >
          {displayBlocks.length === 0 ? (
            <div className="flex h-[760px] items-center justify-center text-sm text-slate-400">
              等待 Agent 生成标书正文
            </div>
          ) : (
            <>
              <EditorContent editor={editor} />
              <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {displayBlocks.map((block) => (
                  <button
                    type="button"
                    key={block.id}
                    onClick={() => onToggleLock(block.id)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      lockedBlocks.has(block.id)
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {lockedBlocks.has(block.id) ? <Lock size={12} /> : <Unlock size={12} />}
                    {block.标题}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
