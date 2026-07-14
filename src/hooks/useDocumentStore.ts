import { useEffect, useMemo, useRef, useState } from 'react';
import type { EngineState } from '../engine/ScenarioEngine';
import type { DocBlockData, Scenario } from '../engine/demo/types';
import { saveDocumentBlocks } from '../lib/api';
import { mergeBlocks } from '../lib/blockDoc';

interface DocumentStore {
  blocks: DocBlockData[];
  lockedBlocks: Set<string>;
  dirtyBlocks: Set<string>;
  writingBlockId: string | null;
  storageKey: string;
  replaceBlocks(blocks: DocBlockData[], dirtyIds?: string[]): void;
  toggleLock(blockId: string): void;
}

export function useDocumentStore(scenario: Scenario, state: EngineState): DocumentStore {
  // 每次渲染都重新读 URL（不用 useMemo 空依赖冻结）：同一 tab 内不刷新页面切换项目时，
  // project_id 会变，这里必须跟着变，否则 storageKey 卡在第一次挂载时的旧项目上，
  // 旧项目缓存的 blocks 会串到新项目页面里。
  const projectId = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('project_id');
  const storageKey = useMemo(() => {
    return `biaoshu.doc.${projectId ?? scenario.id}`;
  }, [projectId, scenario.id]);

  const visibleBlocks = useMemo(
    () => scenario.blocks.filter((block) => state.revealedBlocks.includes(block.id)),
    [scenario.blocks, state.revealedBlocks],
  );
  const [blocks, setBlocks] = useState<DocBlockData[]>(() => loadBlocks(storageKey) ?? visibleBlocks);
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<string>>(() => loadSet(storageKey, 'dirty'));
  const [lockedBlocks, setLockedBlocks] = useState<Set<string>>(() => loadSet(storageKey, 'locked'));

  // storageKey 真正变化（项目切换），说明上面的 state 是上一个项目遗留在内存里的，
  // 不能让 mergeBlocks 把它们当"用户手改内容"保留下去——改读新项目自己的缓存。
  const previousStorageKey = useRef(storageKey);
  useEffect(() => {
    if (previousStorageKey.current === storageKey) return;
    previousStorageKey.current = storageKey;
    setBlocks(loadBlocks(storageKey) ?? visibleBlocks);
    setDirtyBlocks(loadSet(storageKey, 'dirty'));
    setLockedBlocks(loadSet(storageKey, 'locked'));
  }, [storageKey, visibleBlocks]);

  useEffect(() => {
    const protectedIds = new Set([...dirtyBlocks, ...lockedBlocks]);
    setBlocks((current) => {
      const next = mergeBlocks(current, visibleBlocks, protectedIds);
      return sameBlocks(current, next) ? current : next;
    });
  }, [visibleBlocks, dirtyBlocks, lockedBlocks]);

  useEffect(() => {
    const allBlocks = scenario.blocks.map((block) => (
      blocks.find((item) => item.id === block.id) ?? block
    ));
    for (const block of blocks) {
      if (!allBlocks.some((item) => item.id === block.id)) allBlocks.push(block);
    }
    if (!sameBlocks(scenario.blocks, allBlocks)) {
      scenario.blocks = allBlocks;
    }
  }, [blocks, scenario]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({
        blocks,
        dirty: [...dirtyBlocks],
        locked: [...lockedBlocks],
      }));
      if (projectId && blocks.length > 0) {
        void saveDocumentBlocks(projectId, blocks).catch(() => undefined);
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [blocks, dirtyBlocks, lockedBlocks, projectId, storageKey]);

  const writingBlockId = state.focus?.docBlock
    ?? state.revealedBlocks[state.revealedBlocks.length - 1]
    ?? null;

  return {
    blocks,
    lockedBlocks,
    dirtyBlocks,
    writingBlockId,
    storageKey,
    replaceBlocks(nextBlocks, dirtyIds = []) {
      setBlocks(nextBlocks);
      if (dirtyIds.length) {
        setDirtyBlocks((prev) => new Set([...prev, ...dirtyIds]));
      }
    },
    toggleLock(blockId) {
      setLockedBlocks((prev) => {
        const next = new Set(prev);
        if (next.has(blockId)) next.delete(blockId);
        else next.add(blockId);
        return next;
      });
    },
  };
}

function sameBlocks(a: DocBlockData[], b: DocBlockData[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((block, index) => JSON.stringify(block) === JSON.stringify(b[index]));
}

function loadBlocks(key: string): DocBlockData[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { blocks?: DocBlockData[] };
    return Array.isArray(parsed.blocks) ? parsed.blocks : null;
  } catch {
    return null;
  }
}

function loadSet(key: string, field: 'dirty' | 'locked'): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const values = parsed[field];
    return new Set(Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}
