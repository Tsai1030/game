import type { Bi } from '../core/i18n';
import type { EvidenceItem, EvidenceSource, NpcId, TacticId } from '../core/state';
import type { ResponseId } from '../systems/responses';
import type { Line } from './story';

/** 條件：列出的每一項都要成立。 */
export interface Cond {
  flag?: string;
  notFlag?: string;
  /** 這些證據全部到手。 */
  evidence?: string[];
  /** 這些證據至少到手 n 筆。 */
  evidenceMin?: { ids: string[]; n: number };
  /** 線索至少幾條。 */
  clues?: number;
  suit?: boolean;
  solved?: boolean;
  rel?: { npc: NpcId; min: number };
}

/** 效果：改變遊戲狀態。 */
export interface Effect {
  sanity?: number;
  rel?: Partial<Record<NpcId, number>>;
  flag?: string;
  unflag?: string;
  coffee?: number;
  clue?: string;
  suit?: boolean;
}

/** 一句台詞；可以標上話術（可辨識）、理智變化、自動記入證據簿。 */
export interface ScriptLine extends Line {
  id: string;
  tactic?: TacticId;
  sanity?: number;
  evidence?: true | EvidenceSource;
}

export interface ChoiceOption extends Bi {
  id: string;
  if?: Cond;
  do: Beat[];
}

/** 劇本段落。YAML 裡每一段是只有一個 key 的物件。 */
export type Beat =
  | { line: ScriptLine }
  | { choice: ChoiceOption[] }
  | { respond: { target: NpcId; ally?: NpcId; evidence?: string[]; after?: Partial<Record<ResponseId, Beat[]>> } }
  | { ask: { npc: NpcId; topic: string } }
  | { if: Cond; then: Beat[]; else?: Beat[] }
  | { effect: Effect }
  | { evidence: EvidenceItem }
  | { card: { kind: 'chapter' | 'notice' } & Bi }
  | { goto: string }
  | { include: string };

export type Scene = Beat[];

export interface AskAnswers {
  full: ScriptLine[];
  partial: ScriptLine[];
  refuse: ScriptLine[];
}

/** 一個問題主題：每位 NPC 各有三段回答。 */
export type AskTopic = Partial<Record<NpcId, AskAnswers>>;

/** 執行器自己產生的選項標籤（四種回應、問人方式）。 */
export interface Labels {
  resp: Record<ResponseId, Bi>;
  ask: { plain: Bi; checked: Bi };
}
