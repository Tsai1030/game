export type Dir = 'up' | 'down' | 'left' | 'right';
export type EtchState = 'alarm' | 'inhibit' | 'fixed';

/** 有關係值的角色。 */
export const NPC_IDS = ['boss', 'kevin', 'fse', 'fang', 'amy', 'bear'] as const;
export type NpcId = (typeof NPC_IDS)[number];

/** v0.1 的 7 張話術卡（順序即圖鑑順序）。 */
export const TACTIC_IDS = ['double_bind', 'personal_attack', 'comparison', 'family', 'for_your_good', 'credit_stealing', 'gaslighting'] as const;
export type TacticId = (typeof TACTIC_IDS)[number];

export type EvidenceSource = 'talk' | 'chat' | 'meeting';

/** 證據簿的一筆紀錄：遊戲內時間、來源、說話者、中英文內容。 */
export interface EvidenceItem {
  id: string;
  time: string;
  source: EvidenceSource;
  speaker: string;
  zh: string;
  en: string;
}

/** 需要存檔的遊戲狀態。暫時的移動與路徑狀態放在 Mover。 */
export interface GameState {
  v: 2;
  x: number;
  y: number;
  dir: Dir;
  suit: boolean;
  everSuit: boolean;
  coffee: number;
  clues: string[];
  solved: boolean;
  etch: EtchState;
  /** 遊戲內時間：午夜起算的秒數。 */
  sec: number;
  /** 理智值 0–100。 */
  sanity: number;
  /** 理智歸零過幾次（第一次強制請假，第二次燃盡）。 */
  zeroCount: number;
  rel: Record<NpcId, number>;
  codex: TacticId[];
  evidence: EvidenceItem[];
  flags: string[];
  /** 正在播的劇情；讀檔時從這段開頭重播。 */
  scene: string | null;
}

export const SHIFT_START = 2 * 3600 + 47 * 60;
export const SHIFT_END = 8 * 3600;
export const START_POS = { x: 3, y: 4 } as const;
export const REL_START: Record<NpcId, number> = { boss: 0, kevin: 10, fse: 10, fang: 20, amy: 0, bear: 0 };

export function newState(): GameState {
  return {
    v: 2,
    x: START_POS.x,
    y: START_POS.y,
    dir: 'up',
    suit: false,
    everSuit: false,
    coffee: 3,
    clues: [],
    solved: false,
    etch: 'alarm',
    sec: SHIFT_START,
    sanity: 80,
    zeroCount: 0,
    rel: { ...REL_START },
    codex: [],
    evidence: [],
    flags: [],
    scene: null,
  };
}

/** 目前的遊戲狀態。其他模組拿到的是即時綁定，setState 之後會看到新物件。 */
export let S: GameState = newState();

export function setState(next: GameState): void {
  S = next;
}

export const hasClue = (id: string): boolean => S.clues.includes(id);

export function fmtClock(sec: number): string {
  return [(sec / 3600) | 0, ((sec % 3600) / 60) | 0, sec % 60].map((n) => String(n).padStart(2, '0')).join(':');
}
