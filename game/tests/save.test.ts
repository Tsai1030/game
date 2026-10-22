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
  const bad = ['{', { ...good, v: 5 }, { ...good, coffee: 6 }, { ...good, dir: 'north' }, { ...good, clues: [1] }];
  for (const b of bad) {
    const store = memStore({ [SAVE_KEY]: typeof b === 'string' ? b : JSON.stringify(b) });
    expect(readSave(store)).toEqual({ kind: 'corrupt' });
  }
});

test('an M0 (v1) save migrates to v4 with defaults', () => {
  const v1 = { v: 1, x: 20, y: 5, dir: 'up', suit: true, everSuit: true, coffee: 2, clues: ['spc'], solved: false, etch: 'alarm', sec: 11000 };
  const r = readSave(memStore({ [SAVE_KEY]: JSON.stringify(v1) }));
  expect(r.kind).toBe('ok');
  if (r.kind !== 'ok') return;
  expect(r.state).toMatchObject({ v: 4, map: 'M03', chapter: 'ch2', name: '', x: 20, suit: true, clues: ['spc'], sanity: 80, chapterSanity: 80, zeroCount: 0, codex: [], evidence: [], flags: ['ev_unlocked'], scene: null });
  expect(r.state.rel).toEqual(REL_START);
});

const item: EvidenceItem = { id: 'E-C2-01', time: '03:05', source: 'chat', speaker: 'me', zh: '甲', en: 'A' };
const fullV4 = (): GameState => ({
  ...newState(),
  map: 'M02',
  chapter: 'prologue',
  name: '小明',
  sanity: 42,
  chapterSanity: 61,
  zeroCount: 1,
  rel: { ...REL_START, boss: -30 },
  codex: ['gaslighting'],
  evidence: [item],
  flags: ['ev_unlocked'],
  scene: 'intro',
});

test('an M1-1 (v2) save migrates to v4 in Chapter 2 on M03', () => {
  const { map: _m, chapter: _c, name: _n, chapterSanity: _cs, ...rest } = fullV4();
  const v2 = { ...rest, v: 2 };
  const r = readSave(memStore({ [SAVE_KEY]: JSON.stringify(v2) }));
  expect(r.kind).toBe('ok');
  if (r.kind !== 'ok') return;
  expect(r.state).toMatchObject({ v: 4, map: 'M03', chapter: 'ch2', name: '', sanity: 42, chapterSanity: 42, evidence: [item], flags: ['ev_unlocked'] });
});

test('an M1-2a (v3) save migrates to v4 with sanity at chapter start = current sanity', () => {
  const { chapterSanity: _cs, ...rest } = fullV4();
  const r = readSave(memStore({ [SAVE_KEY]: JSON.stringify({ ...rest, v: 3 }) }));
  expect(r).toEqual({ kind: 'ok', state: { ...fullV4(), chapterSanity: 42 } });
});

test('a full v4 state round-trips', () => {
  const store = memStore();
  writeSave(store, fullV4());
  expect(readSave(store)).toEqual({ kind: 'ok', state: fullV4() });
});

test('invalid v4 fields are reported as corrupt', () => {
  const bad = [
    { ...fullV4(), sanity: 101 },
    { ...fullV4(), chapterSanity: 101 },
    (({ chapterSanity: _cs, ...rest }) => rest)(fullV4()),
    { ...fullV4(), zeroCount: 3 },
    { ...fullV4(), rel: { ...REL_START, boss: 200 } },
    { ...fullV4(), codex: ['nope'] },
    { ...fullV4(), evidence: [{ ...item, en: undefined }] },
    { ...fullV4(), flags: [1] },
    { ...fullV4(), map: 'M99' },
    { ...fullV4(), chapter: 'ch9' },
    { ...fullV4(), name: 'x'.repeat(13) },
    { ...fullV4(), name: 'a\u0007' },
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
