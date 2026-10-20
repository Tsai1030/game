import type { NpcId } from '../core/state';

/** 選「先說我查過什麼」時加到有效關係值的分數。 */
export const ASK_BONUS = 15;

export function addRel(rel: Record<NpcId, number>, npc: NpcId, delta: number): Record<NpcId, number> {
  return { ...rel, [npc]: Math.max(-100, Math.min(100, rel[npc] + delta)) };
}

export type AskResult = 'full' | 'partial' | 'refuse';

/** 問人的結果：有效關係值 ≥20 完整回答、0–19 部分回答、<0 拒答。 */
export function askOutcome(rel: number, checkedFirst: boolean): AskResult {
  const eff = rel + (checkedFirst ? ASK_BONUS : 0);
  return eff >= 20 ? 'full' : eff >= 0 ? 'partial' : 'refuse';
}
