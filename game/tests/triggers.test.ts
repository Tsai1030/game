import { expect, test } from 'bun:test';
import { newState } from '../src/core/state';
import type { Beat } from '../src/data/script';
import { SCENES, TRIGGERS } from '../src/data/story';
import { walkBeats } from '../src/systems/script';
import { triggerAt, type Trigger } from '../src/systems/triggers';

const list: Trigger[] = [
  { scene: 'a', map: 'M02', at: [1, 1, 2, 2], if: { notFlag: 'seen_a' } },
  { scene: 'b', map: 'M02' },
];

test('triggerAt returns the first trigger whose map, area and condition match', () => {
  const s = newState();
  expect(triggerAt(list, 'M02', 1, 1, s)).toBe('a');
  expect(triggerAt(list, 'M02', 5, 5, s)).toBe('b');
  s.flags = ['seen_a'];
  expect(triggerAt(list, 'M02', 2, 2, s)).toBe('b');
  expect(triggerAt(list, 'M03', 1, 1, s)).toBeNull();
});

test('every story trigger sets a flag that stops it firing again', () => {
  for (const t of TRIGGERS) {
    const blockers = t.if?.notFlag === undefined ? [] : Array.isArray(t.if.notFlag) ? t.if.notFlag : [t.if.notFlag];
    const sets: string[] = [];
    walkBeats(SCENES[t.scene]!, (b: Beat) => {
      if ('effect' in b && b.effect.flag) sets.push(b.effect.flag);
    });
    expect({ scene: t.scene, once: blockers.some((f) => sets.includes(f)) }).toEqual({ scene: t.scene, once: true });
  }
});
