import { beforeEach, expect, test } from 'bun:test';
import { newState, type GameState } from '../src/core/state';
import type { AskTopic, Labels, Scene, ScriptLine } from '../src/data/script';
import { applyEffect, evalCond, ScriptRunner, type RunnerEvent } from '../src/systems/script';

const L = (id: string, extra: Partial<ScriptLine> = {}): { line: ScriptLine } => ({
  line: { id, speaker: 'boss', zh: `${id}-zh`, en: `${id}-en`, ...extra },
});

const labels: Labels = {
  resp: {
    swallow: { zh: '吞', en: 'Swallow' },
    clarify: { zh: '澄', en: 'Clarify' },
    boundary: { zh: '界', en: 'Boundary' },
    talk: { zh: '談', en: 'Talk' },
  },
  ask: { plain: { zh: '直', en: 'Plain' }, checked: { zh: '查', en: 'Checked' } },
};

const asks: Record<string, AskTopic> = {
  t: { fang: { full: [L('F').line], partial: [L('P').line], refuse: [L('R').line] } },
};

let s: GameState;
let r: ScriptRunner;
const run = (scenes: Record<string, Scene>) =>
  (r = new ScriptRunner({ state: () => s, clock: () => '03:05', scenes, asks, labels }));
const lineId = () => {
  const f = r.current();
  return f.kind === 'line' ? f.line.id : f.kind;
};
const kinds = (ev: RunnerEvent[]) => ev.map((e) => e.kind);

beforeEach(() => {
  s = newState();
});

test('the runner walks line → effect → line → end', () => {
  run({ a: [L('a1'), { effect: { flag: 'f' } }, L('a2')] });
  r.start('a');
  expect(lineId()).toBe('a1');
  r.advance();
  expect(lineId()).toBe('a2');
  expect(s.flags).toContain('f');
  r.advance();
  expect(r.current().kind).toBe('end');
});

test('a gated choice option is disabled and cannot be chosen', () => {
  run({ a: [{ choice: [{ id: 'locked', zh: '鎖', en: 'Locked', if: { flag: 'x' }, do: [L('no')] }, { id: 'open', zh: '開', en: 'Open', do: [L('yes')] }] }, L('after')] });
  const f = r.start('a');
  expect(f.kind === 'choice' && f.options.map((o) => [o.id, o.enabled])).toEqual([['locked', false], ['open', true]]);
  expect(r.choose('locked').kind).toBe('choice');
  r.choose('open');
  expect(lineId()).toBe('yes');
  r.advance();
  expect(lineId()).toBe('after');
});

test('a tactic line costs sanity, halved when recognized, with one attempt per line', () => {
  run({ a: [L('t', { tactic: 'gaslighting', sanity: -10 }), L('u', { tactic: 'family', sanity: -10 })] });
  r.start('a');
  expect(r.recognize('gaslighting')).toBe(true);
  expect(kinds(r.events())).toEqual(['codex']);
  expect(s.codex).toEqual(['gaslighting']);
  expect(r.recognize('gaslighting')).toBe(false);
  r.advance();
  expect(s.sanity).toBe(75);
  expect(r.recognize('comparison')).toBe(false);
  expect(r.recognize('family')).toBe(false);
  r.advance();
  expect(s.sanity).toBe(65);
});

test('evidence lines are logged when shown; note() logs the current line', () => {
  run({ a: [L('m', { evidence: 'chat' }), L('n')] });
  r.start('a');
  expect(s.evidence).toEqual([{ id: 'm', time: '03:05', source: 'chat', speaker: 'boss', zh: 'm-zh', en: 'm-en' }]);
  expect(kinds(r.events())).toEqual(['evidence']);
  r.advance();
  expect(r.note()?.id).toBe('note:n');
  expect(s.evidence.map((e) => e.id)).toEqual(['m', 'note:n']);
});

test('goto jumps, include runs another scene inline, if/else branches on clues', () => {
  run({
    a: [L('a1'), { goto: 'b' }, L('never')],
    b: [{ include: 'c' }, { if: { clues: 3 }, then: [L('ready')], else: [L('more')] }],
    c: [L('c1')],
  });
  r.start('a');
  r.advance();
  expect(lineId()).toBe('c1');
  r.advance();
  expect(lineId()).toBe('more');
  s.clues = ['a', 'b', 'c'];
  r.start('b');
  r.advance();
  expect(lineId()).toBe('ready');
});

test('effects set the time, chapter and ETCH-07 state', () => {
  applyEffect(s, { time: '15:00', chapter: 'ch2', etch: 'alarm' });
  expect([s.sec, s.chapter, s.etch]).toEqual([54000, 'ch2', 'alarm']);
});

test('starting a chapter remembers the sanity it started with', () => {
  s.sanity = 59;
  applyEffect(s, { chapter: 'ch2' });
  expect(s.chapterSanity).toBe(59);
  s.sanity = 70;
  applyEffect(s, { chapter: 'ch2', sanity: 5 });
  expect([s.chapterSanity, s.sanity]).toEqual([70, 75]);
});

test('a warp moves the player and emits exactly one warp event', () => {
  const ev = applyEffect(s, { warp: { map: 'M04', x: 5, y: 4 } });
  expect([s.map, s.x, s.y, s.dir]).toEqual(['M04', 5, 4, 'up']);
  expect(ev).toEqual([{ kind: 'warp', map: 'M04', x: 5, y: 4, dir: 'up' }]);
});

test('flag lists need every flag; notFlag lists need none; chapter must match', () => {
  s.flags = ['a'];
  expect(evalCond(s, { flag: ['a', 'b'] })).toBe(false);
  s.flags = ['a', 'b'];
  expect(evalCond(s, { flag: ['a', 'b'] })).toBe(true);
  expect(evalCond(s, { notFlag: ['c', 'b'] })).toBe(false);
  expect(evalCond(s, { chapter: 'prologue' })).toBe(true);
  expect(evalCond(s, { chapter: 'ch2' })).toBe(false);
});

test('evalCond checks every present key', () => {
  s.flags = ['f'];
  s.rel.fang = 25;
  expect(evalCond(s, { flag: 'f', rel: { npc: 'fang', min: 20 } })).toBe(true);
  expect(evalCond(s, { flag: 'f', notFlag: 'f' })).toBe(false);
  expect(evalCond(s, { evidence: ['E1'] })).toBe(false);
});

test('respond offers the four responses; clarify without evidence costs sanity', () => {
  run({ a: [{ respond: { target: 'boss', evidence: ['E1'] } }] });
  const f = r.start('a');
  expect(f.kind === 'choice' && f.options.map((o) => o.en)).toEqual(['Swallow', 'Clarify', 'Boundary', 'Talk']);
  r.choose('clarify');
  expect(s.sanity).toBe(77);
  expect(s.rel.boss).toBe(-5);
});

test('ask resolves by relationship, and the asking skill adds a checked option', () => {
  s.rel.fang = 5;
  run({ a: [{ ask: { npc: 'fang', topic: 't' } }] });
  r.start('a');
  expect(lineId()).toBe('P');
  r.advance();
  expect(s.flags).toContain('half_t');
  s.flags.push('skill_asking_well');
  const f = r.start('a');
  expect(f.kind === 'choice' && f.options.map((o) => o.id)).toEqual(['plain', 'checked']);
  r.choose('checked');
  expect(lineId()).toBe('F');
  r.advance();
  expect(s.flags).toContain('knows_t');
});

test('hitting zero once is forced leave; the second time ends the scene in burnout', () => {
  run({ a: [L('hit', { sanity: -10 }), L('next')] });
  s.sanity = 5;
  r.start('a');
  r.advance();
  expect(r.events()).toEqual([{ kind: 'zero', outcome: 'forcedLeave' }]);
  expect(s.sanity).toBe(40);
  expect(s.zeroCount).toBe(1);
  expect(lineId()).toBe('next');
  s.sanity = 5;
  r.start('a');
  r.advance();
  expect(r.events()).toEqual([{ kind: 'zero', outcome: 'burnout' }]);
  expect(r.current().kind).toBe('end');
});

test('a goto loop with no player-facing beat ends the scene instead of hanging', () => {
  const err = console.error;
  console.error = () => {};
  try {
    expect(run({ t_loop: [{ goto: 't_loop' }] }).start('t_loop')).toEqual({ kind: 'end' });
  } finally {
    console.error = err;
  }
});
