import { afterEach, expect, test } from 'bun:test';
import { saveNow, setAutosave } from '../src/core/autosave';
import { parseSave, readSave, SAVE_KEY, writeSave } from '../src/core/save';
import { fmtClock, newState, setState } from '../src/core/state';
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
  const bad = ['{', { ...good, v: 2 }, { ...good, coffee: 6 }, { ...good, dir: 'north' }, { ...good, clues: [1] }];
  for (const b of bad) {
    const store = memStore({ [SAVE_KEY]: typeof b === 'string' ? b : JSON.stringify(b) });
    expect(readSave(store)).toEqual({ kind: 'corrupt' });
  }
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
