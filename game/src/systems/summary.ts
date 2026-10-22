import { NPC_IDS, TACTIC_IDS, type GameState, type NpcId, type TacticId } from '../core/state';

export interface ChapterSummary {
  /** 本章開始時的理智值。 */
  from: number;
  /** 現在的理智值。 */
  to: number;
  /** 每位有關係值的角色（依 NPC_IDS 順序）。 */
  rel: { id: NpcId; value: number }[];
  /** 已解鎖的話術卡（依圖鑑順序）。 */
  codex: TacticId[];
}

/** 試玩結束卡上的數字。 */
export function chapterSummary(s: GameState): ChapterSummary {
  return {
    from: s.chapterSanity,
    to: s.sanity,
    rel: NPC_IDS.map((id) => ({ id, value: s.rel[id] })),
    codex: TACTIC_IDS.filter((id) => s.codex.includes(id)),
  };
}

/** 帶正負號的數字：+18、−35（減號是 U+2212）、0。 */
export const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
