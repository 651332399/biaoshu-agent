import { useEffect, useMemo, useState, useCallback } from 'react';
import { ScenarioEngine, type EngineState } from '../engine/ScenarioEngine';
import type { Scenario } from '../engine/types';

export function useEngine(initial: Scenario) {
  const engine = useMemo(() => new ScenarioEngine(initial), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [state, setState] = useState<EngineState>(engine.getState());

  useEffect(() => {
    const unsub = engine.subscribe(setState);
    return () => {
      unsub();
      engine.pause();
    };
  }, [engine]);

  const load = useCallback((s: Scenario) => {
    engine.pause();
    engine.loadScenario(s);
  }, [engine]);

  return { engine, state, load };
}
