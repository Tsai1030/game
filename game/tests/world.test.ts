import { expect, test } from 'bun:test';
import { bfs } from '../src/systems/path';
import { ACTS, adj, MH, MW, OBJ, region, syncEtch, TOOL_INFO, walkable } from '../src/data/world';

const start = { x: 3, y: 4 };
const etch07 = () => OBJ.find((o) => o.id === 'ETCH-07')!;

test('start tile is walkable and the air shower needs a suit', () => {
  expect(walkable(start.x, start.y, false)).toBe(true);
  expect(walkable(14, 17, false)).toBe(false);
  expect(walkable(14, 17, true)).toBe(true);
});

test('every interactable can be reached when suited', () => {
  for (const o of ACTS) {
    const p = bfs(MW, MH, start.x, start.y, (x, y) => walkable(x, y, true), (x, y) => adj(o, x, y));
    expect({ id: o.id, reachable: p !== null }).toEqual({ id: o.id, reachable: true });
  }
});

test('the fab cannot be reached without a suit', () => {
  expect(bfs(MW, MH, start.x, start.y, (x, y) => walkable(x, y, false), (x) => x >= 15)).toBeNull();
});

test('regions map to location keys', () => {
  expect(region(3, 4)).toBe('loc.office');
  expect(region(5, 20)).toBe('loc.gown');
  expect(region(14, 17)).toBe('loc.airShower');
  expect(region(30, 8)).toBe('loc.fabEtch');
  expect(region(30, 25)).toBe('loc.fabLitho');
});

test('adjacency excludes diagonals and the footprint itself', () => {
  const o = etch07();
  expect(adj(o, 27, 6)).toBe(true);
  expect(adj(o, 30, 6)).toBe(false);
  expect(adj(o, 26, 4)).toBe(false);
});

test('syncEtch maps the etch state onto ETCH-07', () => {
  syncEtch('fixed');
  expect(etch07().st).toBe('run');
  syncEtch('inhibit');
  expect(etch07().st).toBe('inhibit');
  syncEtch('alarm');
  expect(etch07().st).toBe('alarm');
});

test('tool info is bilingual', () => {
  for (const info of Object.values(TOOL_INFO)) {
    for (const b of [info.type, info.note, ...info.rows.flat()]) {
      expect(b.zh.trim().length).toBeGreaterThan(0);
      expect(b.en.trim().length).toBeGreaterThan(0);
    }
  }
});
