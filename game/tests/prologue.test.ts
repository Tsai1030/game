import { afterEach, beforeEach, expect, test } from 'bun:test';
import { setAutosave } from '../src/core/autosave';
import { setLang } from '../src/core/i18n';
import { S } from '../src/core/state';
import { loadMap } from '../src/data/world';
import { stopScene } from '../src/ui/scene';
import { newGame, play, prologue, resetWorld, setCheckText, talk, use, walkTo } from './drive';

beforeEach(resetWorld);

afterEach(() => {
  stopScene();
  setAutosave(false);
  setLang('zh-TW');
  loadMap('M03');
});

test('the prologue runs from the gate to Chapter 2 with the spec’s numbers', () => {
  prologue();
  expect([S.chapter, S.map]).toEqual(['ch2', 'M03']);
  expect(S.sanity).toBe(80 - 8 - 5 - 6 - 5 + 8 - 5);
  expect(S.flags).toEqual(expect.arrayContaining(['skill_asking_well', 'ev_unlocked', 'p_left_on_time']));
  expect(S.codex).toEqual(['personal_attack']);
  expect(S.rel.boss).toBe(-10);
  expect(S.rel.fang).toBe(25);
  const ids = S.evidence.map((e) => e.id);
  expect(ids.filter((id) => id.startsWith('p_s4-')).length).toBe(2);
  expect(S.evidence.some((e) => e.id.startsWith('p_s8-') && e.source === 'chat')).toBe(true);
  expect(S.etch).toBe('alarm');
});

test('asking Wang or Kevin about holding a lot only costs once', () => {
  newGame();
  talk('guard');
  play();
  walkTo(10, 0);
  play();
  talk('amy');
  play();
  walkTo(15, 11);
  play();
  use('pc');
  play();
  talk('kevin');
  play();
  talk('boss');
  play();
  expect(S.sanity).toBe(72);
  talk('boss');
  play();
  expect(S.sanity).toBe(72);
  talk('kevin');
  play();
  expect(S.rel.kevin).toBe(8);
  talk('kevin');
  play();
  expect(S.rel.kevin).toBe(8);
});

test('staying late costs sanity and pleases Wang', () => {
  prologue(true);
  expect(S.sanity).toBe(46);
  expect(S.rel.boss).toBe(5);
  expect(S.flags).toContain('p_stayed');
});

test('the doors stay locked until the badge and the end of orientation', () => {
  newGame();
  walkTo(10, 0);
  expect(S.map).toBe('M01');
  play();
  talk('guard');
  play();
  walkTo(10, 0);
  stopScene();
  S.flags = S.flags.filter((f) => f !== 'p_orient_done');
  walkTo(15, 11);
  expect(S.map).toBe('M02');
});

test('the whole prologue in English shows no Chinese text', () => {
  setLang('en');
  setCheckText(true);
  try {
    prologue();
  } finally {
    setCheckText(false);
  }
  expect(S.chapter).toBe('ch2');
});
