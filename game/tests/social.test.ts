import { expect, test } from 'bun:test';
import { REL_START, type EvidenceItem } from '../src/core/state';
import { addEvidence, countEvidence, hasEvidence } from '../src/systems/evidence';
import { addRel, ASK_BONUS, askOutcome } from '../src/systems/relations';
import { RESPONSES, responseEffect } from '../src/systems/responses';

const ev = (id: string, time: string): EvidenceItem => ({ id, time, source: 'chat', speaker: 'boss', zh: id, en: id });

test('evidence is de-duplicated by id and kept in time order', () => {
  let r = addEvidence([], ev('E2', '05:10'));
  r = addEvidence(r.list, ev('E1', '03:05'));
  expect(r.list.map((e) => e.id)).toEqual(['E1', 'E2']);
  const again = addEvidence(r.list, ev('E1', '03:05'));
  expect(again.added).toBe(false);
  expect(again.list.length).toBe(2);
});

test('hasEvidence needs every id; countEvidence counts only listed ids', () => {
  const list = [ev('E1', '03:05'), ev('E3', '04:32'), ev('X', '01:00')];
  expect(hasEvidence(list, ['E1', 'E3'])).toBe(true);
  expect(hasEvidence(list, ['E1', 'E2'])).toBe(false);
  expect(countEvidence(list, ['E1', 'E2', 'E3', 'E4'])).toBe(2);
});

test('relationships clamp at ±100', () => {
  expect(addRel(REL_START, 'boss', 500).boss).toBe(100);
  expect(addRel(REL_START, 'boss', -500).boss).toBe(-100);
  expect(addRel(REL_START, 'fang', 5).fang).toBe(25);
  expect(REL_START.fang).toBe(20);
});

test('asking resolves by effective relationship', () => {
  expect(ASK_BONUS).toBe(15);
  expect(askOutcome(5, true)).toBe('full');
  expect(askOutcome(5, false)).toBe('partial');
  expect(askOutcome(-1, false)).toBe('refuse');
  expect(askOutcome(-10, true)).toBe('partial');
  expect(askOutcome(20, false)).toBe('full');
});

test('response effects match the spec table', () => {
  expect([...RESPONSES]).toEqual(['swallow', 'clarify', 'boundary', 'talk']);
  expect(responseEffect('swallow', false)).toEqual({ sanity: -3, target: 5, ally: 0 });
  expect(responseEffect('clarify', true)).toEqual({ sanity: 0, target: -5, ally: 0 });
  expect(responseEffect('clarify', false)).toEqual({ sanity: -3, target: -5, ally: 0 });
  expect(responseEffect('boundary', false)).toEqual({ sanity: 5, target: -10, ally: 0 });
  expect(responseEffect('talk', false)).toEqual({ sanity: 5, target: 0, ally: 5 });
});
