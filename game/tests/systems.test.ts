import { expect, test } from 'bun:test';
import { newState } from '../src/core/state';
import { addClue } from '../src/systems/clues';
import { COFFEE_DECAY_MS, COFFEE_MAX, decay, drink } from '../src/systems/coffee';
import { judge } from '../src/systems/conclusion';
import { bfs } from '../src/systems/path';
import { QUEST } from '../src/systems/quest';

test('bfs walks around a wall one tile at a time', () => {
  const wall = (x: number, y: number) => x === 2 && y <= 1;
  const p = bfs(5, 3, 0, 0, (x, y) => !wall(x, y), (x, y) => x === 4 && y === 0);
  expect(p).not.toBeNull();
  expect(p!.length).toBe(8);
  let prev = { x: 0, y: 0 };
  for (const q of p!) {
    expect(Math.abs(q.x - prev.x) + Math.abs(q.y - prev.y)).toBe(1);
    expect(wall(q.x, q.y)).toBe(false);
    prev = q;
  }
  expect(prev).toEqual({ x: 4, y: 0 });
});

test('bfs returns null when the goal is walled off', () => {
  expect(bfs(5, 3, 0, 0, (x) => x < 3, (x, y) => x === 4 && y === 0)).toBeNull();
});

test('bfs returns an empty path when already at the goal', () => {
  expect(bfs(5, 3, 1, 1, () => true, (x, y) => x === 1 && y === 1)).toEqual([]);
});

test('addClue does not duplicate a clue', () => {
  const first = addClue([], 'a');
  expect(first).toEqual({ added: true, list: ['a'] });
  expect(addClue(first.list, 'a')).toEqual({ added: false, list: ['a'] });
});

test('judge covers all four verdicts', () => {
  const ans = { tool: 'ETCH-07', ch: 'PM-B', cause: 'focus_ring_eol' };
  expect(judge(ans, { tool: 'ETCH-07', ch: 'PM-B' }, 5, 3)).toBe('incomplete');
  expect(judge(ans, ans, 2, 3)).toBe('need-evidence');
  expect(judge(ans, { ...ans, cause: 'recipe_changed' }, 5, 3)).toBe('wrong');
  expect(judge(ans, ans, 3, 3)).toBe('solved');
});

test('coffee caps at the maximum and never goes negative', () => {
  expect(COFFEE_MAX).toBe(5);
  expect(COFFEE_DECAY_MS).toBe(120000);
  expect(drink(5)).toEqual({ coffee: 5, ok: false });
  expect(drink(2)).toEqual({ coffee: 3, ok: true });
  expect(decay(0)).toBe(0);
  expect(decay(3)).toBe(2);
});

test('quest progress follows the game state', () => {
  expect(QUEST.map((q) => q.key)).toEqual(['quest.q1', 'quest.q2', 'quest.q3', 'quest.q4', 'quest.q5']);
  expect(QUEST.filter((q) => q.done(newState())).length).toBe(0);
  const done = { ...newState(), clues: ['spc', 'fdc', 'ring', 'map'], everSuit: true, solved: true };
  expect(QUEST.filter((q) => q.done(done)).length).toBe(5);
  expect(QUEST[2]!.done({ ...newState(), clues: ['fdc'] })).toBe(false);
});
