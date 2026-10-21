import { NPC_IDS, REL_START, TACTIC_IDS, type Dir, type EtchState, type EvidenceItem, type GameState, type NpcId, type TacticId } from './state';
import type { KV } from './storage';

export const SAVE_KEY = 'fabns.save.v1';

const DIRS: readonly unknown[] = ['up', 'down', 'left', 'right'];
const ETCH: readonly unknown[] = ['alarm', 'inhibit', 'fixed'];
const SOURCES: readonly unknown[] = ['talk', 'chat', 'meeting'];

const isInt = (n: unknown, lo: number, hi: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

function isEvidence(v: unknown): v is EvidenceItem {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return isStr(e.id) && isStr(e.time) && SOURCES.includes(e.source) && isStr(e.speaker) && isStr(e.zh) && isStr(e.en);
}

function isRel(v: unknown): v is Record<NpcId, number> {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return NPC_IDS.every((k) => isInt(r[k], -100, 100));
}

/**
 * 解析存檔字串；任何欄位不合法就回傳 null，不讓遊戲帶著壞資料執行。
 * v1（M0）存檔沒有劇情欄位，自動補上預設值升級成 v2。
 */
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
  if (o.v !== 1 && o.v !== 2) return null;
  if (!isInt(o.x, 0, 999) || !isInt(o.y, 0, 999)) return null;
  if (!DIRS.includes(o.dir) || !ETCH.includes(o.etch)) return null;
  if (typeof o.suit !== 'boolean' || typeof o.everSuit !== 'boolean' || typeof o.solved !== 'boolean') return null;
  if (!isInt(o.coffee, 0, 5) || !isInt(o.sec, 0, 86400)) return null;
  if (!isStrList(o.clues)) return null;
  const base: GameState = {
    v: 2,
    x: o.x,
    y: o.y,
    dir: o.dir as Dir,
    suit: o.suit,
    everSuit: o.everSuit,
    coffee: o.coffee,
    clues: [...new Set(o.clues)],
    solved: o.solved,
    etch: o.etch as EtchState,
    sec: o.sec,
    sanity: 80,
    zeroCount: 0,
    rel: { ...REL_START },
    codex: [],
    evidence: [],
    flags: [],
    scene: null,
  };
  // M0 存檔一定已經過了開場，證據簿要直接解鎖（開場劇情才會設這個旗標）。
  if (o.v === 1) return { ...base, flags: ['ev_unlocked'] };
  if (!isInt(o.sanity, 0, 100) || !isInt(o.zeroCount, 0, 2) || !isRel(o.rel)) return null;
  if (!Array.isArray(o.codex) || !o.codex.every((c) => (TACTIC_IDS as readonly unknown[]).includes(c))) return null;
  if (!Array.isArray(o.evidence) || !o.evidence.every(isEvidence)) return null;
  if (!isStrList(o.flags) || !(o.scene === null || isStr(o.scene))) return null;
  const rel = o.rel as Record<NpcId, number>;
  return {
    ...base,
    sanity: o.sanity,
    zeroCount: o.zeroCount,
    rel: Object.fromEntries(NPC_IDS.map((k) => [k, rel[k]])) as Record<NpcId, number>,
    codex: [...new Set(o.codex as TacticId[])],
    evidence: o.evidence,
    flags: [...new Set(o.flags)],
    scene: o.scene,
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
