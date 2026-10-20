export type Dir = 'up' | 'down' | 'left' | 'right';
export type EtchState = 'alarm' | 'inhibit' | 'fixed';

/** 需要存檔的遊戲狀態。暫時的移動與路徑狀態放在 Mover。 */
export interface GameState {
  v: 1;
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
}

export const SHIFT_START = 2 * 3600 + 47 * 60;
export const SHIFT_END = 8 * 3600;
export const START_POS = { x: 3, y: 4 } as const;

export function newState(): GameState {
  return {
    v: 1,
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
