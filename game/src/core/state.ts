export type Dir = 'up' | 'down' | 'left' | 'right';
export type EtchState = 'alarm' | 'inhibit' | 'fixed';

/** 地圖 id（M01 警衛室、M02 新訓教室、M03 廠區、M04 租屋處）。 */
export const MAP_IDS = ['M01', 'M02', 'M03', 'M04'] as const;
export type MapId = (typeof MAP_IDS)[number];

/** 章節：序章（第一天，白天）、第 2 章（Case 03 之夜，夜班）。 */
export const CHAPTERS = ['prologue', 'ch2'] as const;
export type Chapter = (typeof CHAPTERS)[number];

/** 名字最多幾個字。 */
export const NAME_MAX = 12;

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
  v: 4;
  /** 目前所在的地圖。 */
  map: MapId;
  chapter: Chapter;
  /** 玩家取的名字；空字串表示用預設名。 */
  name: string;
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
  /** 這一章開始時的理智值（試玩結束卡顯示本章變化）。 */
  chapterSanity: number;
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
/** 第 2 章開場站的位置（M03 的 PE 工作站前）。 */
export const START_POS = { x: 3, y: 4 } as const;
/** 序章開場：M01 警衛室門口、早上 07:20。 */
export const PROLOGUE_START = { map: 'M01', x: 10, y: 10, sec: 7 * 3600 + 20 * 60 } as const;
export const REL_START: Record<NpcId, number> = { boss: 0, kevin: 10, fse: 10, fang: 20, amy: 0, bear: 0 };

/** 新遊戲：序章開場。 */
export function newState(): GameState {
  return {
    v: 4,
    map: PROLOGUE_START.map,
    chapter: 'prologue',
    name: '',
    x: PROLOGUE_START.x,
    y: PROLOGUE_START.y,
    dir: 'up',
    suit: false,
    everSuit: false,
    coffee: 3,
    clues: [],
    solved: false,
    etch: 'fixed',
    sec: PROLOGUE_START.sec,
    sanity: 80,
    chapterSanity: 80,
    zeroCount: 0,
    rel: { ...REL_START },
    codex: [],
    evidence: [],
    flags: [],
    scene: null,
  };
}

/** 第 2 章開場（02:47，ETCH-07 告警）；舊存檔與只測第 2 章的測試用。 */
export function ch2State(): GameState {
  return { ...newState(), map: 'M03', chapter: 'ch2', x: START_POS.x, y: START_POS.y, dir: 'up', sec: SHIFT_START, etch: 'alarm' };
}

/** 夜班才有咖啡遞減和「距下班」倒數。 */
export const isNightShift = (s: GameState): boolean => s.chapter === 'ch2';

/** 目前的遊戲狀態。其他模組拿到的是即時綁定，setState 之後會看到新物件。 */
export let S: GameState = newState();

export function setState(next: GameState): void {
  S = next;
}

export const hasClue = (id: string): boolean => S.clues.includes(id);

export function fmtClock(sec: number): string {
  return [(sec / 3600) | 0, ((sec % 3600) / 60) | 0, sec % 60].map((n) => String(n).padStart(2, '0')).join(':');
}
