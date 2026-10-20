import { afterEach, expect, test } from 'bun:test';
import { saveNow, setAutosave } from '../src/core/autosave';
import { parseSave, readSave, SAVE_KEY, writeSave } from '../src/core/save';
import { fmtClock, newState, REL_START, setState, type EvidenceItem, type GameState } from '../src/core/state';
import { memStore, throwingStore } from './helpers';

afterEach(() => {
  setAutosave(false);
  setState(newState());
});

test('fmtClock formats seconds since midnight', () => {
  expect(fmtClock(10020)).toBe('02:47:00');
});

test('a written save reads back identically', () => {
  const store = memStore();
  const s = { ...newState(), x: 20, clues: ['spc'] };
  expect(writeSave(store, s)).toBe(true);
  expect(readSave(store)).toEqual({ kind: 'ok', state: s });
});

test('malformed or out-of-range saves are reported as corrupt', () => {
  const good = newState();
  const bad = ['{', { ...good, v: 3 }, { ...good, coffee: 6 }, { ...good, dir: 'north' }, { ...good, clues: [1] }];
  for (const b of bad) {
    const store = memStore({ [SAVE_KEY]: typeof b === 'string' ? b : JSON.stringify(b) });
    expect(readSave(store)).toEqual({ kind: 'corrupt' });
  }
});

test('an M0 (v1) save migrates to v2 with defaults', () => {
  const v1 = { v: 1, x: 20, y: 5, dir: 'up', suit: true, everSuit: true, coffee: 2, clues: ['spc'], solved: false, etch: 'alarm', sec: 11000 };
  const r = readSave(memStore({ [SAVE_KEY]: JSON.stringify(v1) }));
  expect(r.kind).toBe('ok');
  if (r.kind !== 'ok') return;
  expect(r.state).toMatchObject({ v: 2, x: 20, suit: true, clues: ['spc'], sanity: 80, zeroCount: 0, codex: [], evidence: [], flags: [], scene: null });
  expect(r.state.rel).toEqual(REL_START);
});

const item: EvidenceItem = { id: 'E-C2-01', time: '03:05', source: 'chat', speaker: 'me', zh: '甲', en: 'A' };
const fullV2 = (): GameState => ({
  ...newState(),
  sanity: 42,
  zeroCount: 1,
  rel: { ...REL_START, boss: -30 },
  codex: ['gaslighting'],
  evidence: [item],
  flags: ['ev_unlocked'],
  scene: 'intro',
});

test('a full v2 state round-trips', () => {
  const store = memStore();
  writeSave(store, fullV2());
  expect(readSave(store)).toEqual({ kind: 'ok', state: fullV2() });
});

test('invalid v2 fields are reported as corrupt', () => {
  const bad = [
    { ...fullV2(), sanity: 101 },
    { ...fullV2(), zeroCount: 3 },
    { ...fullV2(), rel: { ...REL_START, boss: 200 } },
    { ...fullV2(), codex: ['nope'] },
    { ...fullV2(), evidence: [{ ...item, en: undefined }] },
    { ...fullV2(), flags: [1] },
  ];
  for (const b of bad) expect(readSave(memStore({ [SAVE_KEY]: JSON.stringify(b) }))).toEqual({ kind: 'corrupt' });
});

test('duplicate clues are removed when loading', () => {
  const raw = JSON.stringify({ ...newState(), clues: ['spc', 'spc'] });
  expect(parseSave(raw)?.clues).toEqual(['spc']);
});

test('no save gives kind none', () => {
  expect(readSave(memStore())).toEqual({ kind: 'none' });
});

test('blocked storage never throws', () => {
  expect(writeSave(throwingStore, newState())).toBe(false);
  expect(readSave(throwingStore)).toEqual({ kind: 'none' });
});

test('saveNow writes only after autosave is enabled', () => {
  const store = memStore();
  saveNow(store);
  expect(store.data[SAVE_KEY]).toBeUndefined();
  setAutosave(true);
  saveNow(store);
  expect(store.data[SAVE_KEY]).toBeDefined();
});
