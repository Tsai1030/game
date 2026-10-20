import type { Dir, EtchState, GameState } from './state';
import type { KV } from './storage';

export const SAVE_KEY = 'fabns.save.v1';

const DIRS: readonly unknown[] = ['up', 'down', 'left', 'right'];
const ETCH: readonly unknown[] = ['alarm', 'inhibit', 'fixed'];

const isInt = (n: unknown, lo: number, hi: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;

/** 解析存檔字串；任何欄位不合法就回傳 null，不讓遊戲帶著壞資料執行。 */
export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  let d: unknown;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (!isInt(o.x, 0, 999) || !isInt(o.y, 0, 999)) return null;
  if (!DIRS.includes(o.dir) || !ETCH.includes(o.etch)) return null;
  if (typeof o.suit !== 'boolean' || typeof o.everSuit !== 'boolean' || typeof o.solved !== 'boolean') return null;
  if (!isInt(o.coffee, 0, 5) || !isInt(o.sec, 0, 86400)) return null;
  if (!Array.isArray(o.clues) || !o.clues.every((c) => typeof c === 'string')) return null;
  return {
    v: 1,
    x: o.x,
    y: o.y,
    dir: o.dir as Dir,
    suit: o.suit,
    everSuit: o.everSuit,
    coffee: o.coffee,
    clues: [...new Set(o.clues as string[])],
    solved: o.solved,
    etch: o.etch as EtchState,
    sec: o.sec,
  };
}

export type ReadResult = { kind: 'none' } | { kind: 'corrupt' } | { kind: 'ok'; state: GameState };

export function readSave(store: KV | null): ReadResult {
  let raw: string | null = null;
  try {
    raw = store?.getItem(SAVE_KEY) ?? null;
  } catch {
    return { kind: 'none' };
  }
  if (raw == null) return { kind: 'none' };
  const state = parseSave(raw);
  return state ? { kind: 'ok', state } : { kind: 'corrupt' };
}

export function writeSave(store: KV | null, s: GameState): boolean {
  try {
    if (!store) return false;
    store.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(store: KV | null): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* 略過 */
  }
}
