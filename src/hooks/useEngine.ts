import { useEffect, useMemo, useState } from 'react';
import type { EngineState } from '../engine/ScenarioEngine';
import { LiveSource, makeLiveScenario, type WorkspaceEngine } from '../engine/sources';

export function useEngine() {
  // scenario 必须是 LiveSource 内部持有的同一个对象引用——LiveSource 靠直接
  // mutate `this.scenario.blocks` 等字段落地后端数据（不经过 setState），
  // 渲染层如果另外 new 一份 scenario 传下去，会读到一份永远不会被更新的
  // 空快照（正文画布对着一份从没收到过 draft 的 scenario 永远显示"等待生成"，
  // 即使 state 本身通过 subscribe 正常同步——实际发生过，见 App.tsx 历史版本）。
  const scenario = useMemo(() => makeLiveScenario(), []);
  const engine = useMemo<WorkspaceEngine>(
    () => new LiveSource(scenario),
    [scenario],
  );
  const [state, setState] = useState<EngineState>(engine.getState());

  useEffect(() => {
    const unsub = engine.subscribe(setState);
    return () => {
      unsub();
      // reset() 而非 pause():pause() 不关闭 SSE 连接，组件真正卸载时会遗留悬挂的 EventSource。
      engine.reset();
    };
  }, [engine]);

  return { engine, state, scenario };
}
