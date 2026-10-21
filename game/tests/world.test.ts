import { expect, test } from 'bun:test';
import { bfs } from '../src/systems/path';
import { ACTS, adj, loadMap, MAP, MH, MW, NPC, OBJ, refreshNpcs, region, syncEtch, TOOL_INFO, walkable } from '../src/data/world';
import { ch2State, newState } from '../src/core/state';
import type { NpcDef } from '../src/data/maps';
import { MAPS } from '../src/data/maps';
import { SCENES } from '../src/data/story';

const start = { x: 3, y: 4 };
const etch07 = () => OBJ.find((o) => o.id === 'ETCH-07')!;

const TILE_CHARS = new Set(['#', '.', ',', 'y', '=', 'D', 'A', 'g', 'l', 'w']);

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

test('every map connects its start to every exit and every interactable', () => {
  for (const m of Object.values(MAPS)) {
    loadMap(m.id);
    const walk = (x: number, y: number) => walkable(x, y, true);
    for (const e of m.exits) {
      const ok = bfs(MW, MH, m.start.x, m.start.y, walk, (x, y) => x === e.x && y === e.y) !== null;
      expect({ map: m.id, exit: `${e.x},${e.y}`, ok }).toEqual({ map: m.id, exit: `${e.x},${e.y}`, ok: true });
    }
    for (const o of ACTS) {
      const ok = bfs(MW, MH, m.start.x, m.start.y, walk, (x, y) => adj(o, x, y)) !== null;
      expect({ map: m.id, id: o.id, ok }).toEqual({ map: m.id, id: o.id, ok: true });
    }
  }
  loadMap('M03');
});

test('exits land on walkable tiles of their target maps', () => {
  for (const m of Object.values(MAPS))
    for (const e of m.exits) {
      loadMap(e.to);
      expect({ from: m.id, to: e.to, ok: walkable(e.at.x, e.at.y, false) }).toEqual({ from: m.id, to: e.to, ok: true });
    }
  loadMap('M03');
});

test('the site has a corridor, a meeting room, a break room and the unchanged fab', () => {
  loadMap('M03');
  expect(MAP.id).toBe('M03');
  expect([MW, MH]).toEqual([46, 30]);
  expect(region(1, 13)).toBe('loc.corridor');
  expect(region(5, 13)).toBe('loc.meeting');
  expect(region(7, 26)).toBe('loc.break');
  expect(OBJ.filter((o) => o.st).map((o) => [o.id, o.x, o.y])).toEqual([
    ['ETCH-05', 17, 3], ['ETCH-07', 25, 3], ['CVD-11', 33, 3], ['MET-02', 17, 11],
    ['WET-02', 25, 11], ['STK-01', 39, 10], ['LITHO-03', 20, 21], ['TRACK-03', 30, 21],
  ]);
});

test('NPCs on the site depend on the chapter', () => {
  loadMap('M03');
  refreshNpcs(newState());
  expect(NPC.map((n) => n.id).sort()).toEqual(['fang', 'kevin']);
  refreshNpcs(ch2State());
  expect(NPC.map((n) => n.id).sort()).toEqual(['boss', 'fang', 'fse', 'kevin']);
});

test('a conditional NPC appears once its flag is set and never blocks the player’s own tile', () => {
  loadMap('M03');
  const def: NpcDef = { id: 't_npc', look: 'boss', x: 5, y: 5, dir: 'down', talk: 'boss', when: { flag: 't_flag' } };
  MAP.npcs.unshift(def);
  try {
    const s = { ...ch2State(), x: 5, y: 5 };
    refreshNpcs(s);
    expect(NPC.some((n) => n.id === 't_npc')).toBe(false);
    s.flags = ['t_flag'];
    refreshNpcs(s);
    expect(NPC.some((n) => n.id === 't_npc')).toBe(true);
    expect(walkable(5, 5, false)).toBe(true);
    s.y = 6;
    refreshNpcs(s);
    expect(walkable(5, 5, false)).toBe(false);
  } finally {
    MAP.npcs.shift();
    refreshNpcs(ch2State());
  }
});

test('every scene a map names exists', () => {
  for (const m of Object.values(MAPS)) {
    const names = [...m.objects.flatMap((o) => (o.say ? [o.say] : [])), ...m.npcs.map((n) => n.talk), ...m.exits.flatMap((e) => (e.locked ? [e.locked] : []))];
    for (const n of names) expect({ map: m.id, scene: n, ok: !!SCENES[n] }).toEqual({ map: m.id, scene: n, ok: true });
  }
});

test('start tile is walkable and the air shower needs a suit', () => {
  expect(walkable(start.x, start.y, false)).toBe(true);
  expect(walkable(14, 18, false)).toBe(false);
  expect(walkable(14, 18, true)).toBe(true);
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
  expect(region(14, 18)).toBe('loc.airShower');
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
