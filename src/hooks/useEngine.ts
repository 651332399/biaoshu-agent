import { useEffect, useMemo, useState } from 'react';
import type { EngineState } from '../engine/ScenarioEngine';
import { LiveSource, makeLiveScenario, type WorkspaceEngine } from '../engine/sources';

export function useEngine() {
  const engine = useMemo<WorkspaceEngine>(
    () => new LiveSource(makeLiveScenario()),
    [],
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

  return { engine, state };
}
