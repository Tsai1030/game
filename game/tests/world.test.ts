import { expect, test } from 'bun:test';
import { bfs } from '../src/systems/path';
import { ACTS, adj, loadMap, MAP, MH, MW, OBJ, region, syncEtch, TOOL_INFO, walkable } from '../src/data/world';
import { MAPS } from '../src/data/maps';

const start = { x: 3, y: 4 };
const etch07 = () => OBJ.find((o) => o.id === 'ETCH-07')!;

const TILE_CHARS = new Set(['#', '.', ',', 'y', '=', 'D', 'A', 'g']);

test('every map is well formed', () => {
  for (const m of Object.values(MAPS)) {
    loadMap(m.id);
    const w = m.tiles[0]!.length;
    expect({ id: m.id, rect: m.tiles.every((r) => r.length === w) }).toEqual({ id: m.id, rect: true });
    expect([...m.tiles.join('')].filter((c) => !TILE_CHARS.has(c))).toEqual([]);
    expect(walkable(m.start.x, m.start.y, false)).toBe(true);
    const used = new Set<string>();
    for (const o of m.objects)
      for (let j = o.y; j < o.y + o.h; j++)
        for (let i = o.x; i < o.x + o.w; i++) {
          expect(i >= 0 && j >= 0 && i < w && j < m.tiles.length).toBe(true);
          expect({ obj: o.id, at: `${i},${j}`, overlap: used.has(`${i},${j}`) }).toEqual({ obj: o.id, at: `${i},${j}`, overlap: false });
          used.add(`${i},${j}`);
        }
    for (const e of m.exits) expect(m.tiles[e.y]![e.x]).toBe('D');
  }
  loadMap('M03');
});

test('M03 keeps the prototype layout until the maps task', () => {
  loadMap('M03');
  expect(MAP.id).toBe('M03');
  expect([MW, MH]).toEqual([46, 28]);
});

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
