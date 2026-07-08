import type { EngineState } from '../../engine/ScenarioEngine';

export type EditorPhase = 'requirements' | 'generate' | 'pricing' | 'selfcheck' | 'export';

/** 由引擎 activeStage / pendingCard 推导当前编辑器阶段(设计 P2–P6)。 */
export function derivePhase(state: EngineState): EditorPhase {
  const card = state.pendingCard;
  if (card?.kind === 'export') return 'export';
  const cid = card?.id ?? '';
  if (cid === 'confirm-1') return 'requirements';
  if (cid === 'confirm-3') return 'selfcheck';

  const stage = state.activeStage;
  if (stage >= 9) return 'export';
  if (stage === 8 || state.revealedRedlines.length > 0) return 'selfcheck';
  if (stage === 7 || state.pricingRevealed) return 'pricing';
  if (stage >= 3) return 'generate';
  return 'requirements';
}

export const PHASE_LABEL: Record<EditorPhase, string> = {
  requirements: '要求确认 · 把关',
  generate: '生成中 · 核心编辑器',
  pricing: '报价测算',
  selfcheck: '合规自检 · 防废标',
  export: '导出打包',
};
