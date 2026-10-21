import { beforeEach, expect, test } from 'bun:test';
import { ch2State, S, setState, type Dir } from '../src/core/state';
import { adj, OBJ, TS, type Thing } from '../src/data/world';
import { Mover } from '../src/game/movement';

let calls: { arrive: number[]; interact: Thing[]; warn: number; unreachable: number };
let m: Mover;

beforeEach(() => {
  setState(ch2State());
  calls = { arrive: [], interact: [], warn: 0, unreachable: 0 };
  m = new Mover({
    onArrive: (px) => calls.arrive.push(px),
    onInteract: (o) => calls.interact.push(o),
    onWarnSuit: () => calls.warn++,
    onUnreachable: () => calls.unreachable++,
  });
});

const free = () => false;

/** 以 10 ms 為一格推進時間。 */
function run(seconds: number, dir?: Dir) {
  for (let i = 0; i < Math.round(seconds / 0.01); i++) m.tick(0.01, dir, free);
}

test('the interact target never flickers between tiles on a continuous walk', () => {
  for (let i = 0; i < 90; i++) {
    m.tick(0.01, 'right', free);
    expect(m.nearObj()).toBeNull();
  }
  expect(S.x).toBeGreaterThanOrEqual(8);
});

test('clicking your own tile does not leave a marker behind', () => {
  m.click(3 * TS + 8, 4 * TS + 8);
  expect(m.marker).toBeNull();
});

test('holding a direction walks one tile in 0.15 s', () => {
  run(0.16, 'down');
  expect([S.x, S.y]).toEqual([3, 5]);
});

test('walking into a desk does not move the player', () => {
  run(0.5, 'up');
  expect([S.x, S.y]).toEqual([3, 4]);
  expect(S.dir).toBe('up');
});

test('with no coffee a step takes 0.15 / 0.7 s', () => {
  S.coffee = 0;
  run(0.16, 'down');
  expect([S.x, S.y]).toEqual([3, 4]);
  m.reset();
  setState({ ...ch2State(), coffee: 0 });
  run(0.22, 'down');
  expect([S.x, S.y]).toEqual([3, 5]);
});

test('clicking the fab while unsuited warns about the suit', () => {
  expect(m.click(30 * TS + 8, 8 * TS + 8)).toBe('blocked-suit');
  expect(calls.warn).toBe(1);
  expect(m.path).toEqual([]);
});

test('clicking a wall does nothing', () => {
  expect(m.click(8, 8)).toBe('none');
  expect(m.path).toEqual([]);
  expect(calls.warn + calls.unreachable).toBe(0);
});

test('clicking a tool walks next to it and interacts once', () => {
  S.suit = true;
  const etch = OBJ.find((o) => o.id === 'ETCH-07')!;
  expect(m.click(27 * TS + 8, 4 * TS + 8)).toBe('path');
  for (let i = 0; i < 4000 && (m.path.length || m.step || m.pending); i++) m.tick(0.05, undefined, free);
  expect(calls.interact).toEqual([etch]);
  expect(adj(etch, S.x, S.y)).toBe(true);
});

test('stepping east into the air shower reports the previous x', () => {
  setState({ ...ch2State(), suit: true, x: 13, y: 18 });
  m.reset();
  run(0.16, 'right');
  expect([S.x, S.y]).toEqual([14, 18]);
  expect(calls.arrive).toContain(13);
});
