import { afterEach, expect, test } from 'bun:test';
import * as THREE from 'three';
import { MAPS } from '../src/data/maps';
import { loadMap, T } from '../src/data/world';
import { buildGround } from '../src/world3d/ground';
import { toWorld } from '../src/world3d/units';

afterEach(() => loadMap('M03'));

const meshes = (g: THREE.Object3D, name: string) => g.children.filter((c) => c.name === name);
const boxOf = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);

test('pixels map to world units, one tile per unit', () => {
  expect(toWorld(48, 32)).toEqual({ x: 3, z: 2 });
});

test('the ground has a floor plane the size of the map', () => {
  loadMap('M01');
  const b = boxOf(buildGround(T).getObjectByName('floor')!);
  expect([b.max.x - b.min.x, b.max.z - b.min.z].map((v) => Math.round(v * 1000) / 1000)).toEqual([20, 12]);
});

test('every wall tile is covered by exactly one wall; doors and air showers stay open', () => {
  for (const m of Object.values(MAPS)) {
    loadMap(m.id);
    const boxes = meshes(buildGround(T), 'wall').map(boxOf);
    for (let y = 0; y < T.length; y++)
      for (let x = 0; x < T[0]!.length; x++) {
        const ch = T[y]![x]!;
        if (ch !== '#' && ch !== 'D' && ch !== 'A') continue;
        const p = new THREE.Vector3(x + 0.5, 0.3, y + 0.5);
        const n = boxes.filter((b) => b.containsPoint(p)).length;
        expect({ map: m.id, tile: `${x},${y}`, ch, n }).toEqual({ map: m.id, tile: `${x},${y}`, ch, n: ch === '#' ? 1 : 0 });
      }
  }
});

test('back walls are tall and the others low, so the camera never loses the player', () => {
  loadMap('M03');
  const heights = new Set(meshes(buildGround(T), 'wall').map((w) => Math.round((boxOf(w).max.y - boxOf(w).min.y) * 10) / 10));
  expect([...heights].sort()).toEqual([0.6, 1.8]);
});

test('glass walls are see-through panes and air showers get a frame', () => {
  loadMap('M03');
  const g = buildGround(T);
  expect(meshes(g, 'glass').length).toBe(T.flat().filter((c) => c === 'g').length);
  expect(meshes(g, 'shower').length).toBe(1);
});

/* ---------- Task 3：機台 ---------- */
import { S, setState, ch2State } from '../src/core/state';
import { OBJ, syncEtch } from '../src/data/world';
import { buildTool, TOOL_H } from '../src/world3d/tools';
import { LedField } from '../src/world3d/leds';

const tools = () => {
  loadMap('M03');
  return OBJ.filter((o) => o.kind in TOOL_H);
};

test('every tool fits its footprint (plus the load port in front) and its body has the table height', () => {
  for (const o of tools()) {
    const m = buildTool(o);
    const b = boxOf(m.group);
    const ok = b.min.x >= o.x - 0.1 && b.max.x <= o.x + o.w + 0.1 && b.min.z >= o.y - 0.1 && b.max.z <= o.y + o.h + 0.6 && b.min.y >= -0.001;
    expect({ id: o.id, ok }).toEqual({ id: o.id, ok: true });
    const body = boxOf(m.group.getObjectByName('body')!);
    expect({ id: o.id, h: Math.round(body.max.y * 100) / 100 }).toEqual({ id: o.id, h: TOOL_H[o.kind as keyof typeof TOOL_H] });
  }
});

test('LEDs are deterministic, sit on the body surface, and only ETCH-07 has red ones', () => {
  for (const o of tools()) {
    const a = buildTool(o).leds;
    expect(buildTool(o).leds.map((l) => [l.pos.toArray(), l.col])).toEqual(a.map((l) => [l.pos.toArray(), l.col]));
    expect(a.length).toBeGreaterThan(20);
    const body = boxOf(buildTool(o).group.getObjectByName('body')!);
    const outer = body.clone().expandByScalar(0.05);
    const inner = body.clone().expandByScalar(-0.05);
    const off = a.filter((l) => !outer.containsPoint(l.pos) || inner.containsPoint(l.pos)).length;
    expect({ id: o.id, off }).toEqual({ id: o.id, off: 0 });
    expect(a.some((l) => l.col === 'r')).toBe(o.id === 'ETCH-07');
  }
});

test('ETCH-07 alarm blinks its PM-B window red, and Reduce motion freezes everything', () => {
  setState(ch2State());
  syncEtch('alarm');
  const o = tools().find((x) => x.id === 'ETCH-07')!;
  const m = buildTool(o);
  const win = m.group.getObjectByName('pm:B') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  m.update(0, false);
  expect(win.material.emissive.getHex()).toBe(0xff4d45);
  m.update(0.4, false);
  expect(win.material.emissive.getHex()).toBe(0x6a2329);
  const field = new LedField(m.leds);
  const colors = () => Array.from(field.mesh.instanceColor!.array);
  const stOf = () => o.st;
  field.update(0, true, stOf);
  m.update(0, true);
  const before = [colors(), win.material.emissive.getHex()];
  field.update(0.4, true, stOf);
  m.update(0.4, true);
  expect([colors(), win.material.emissive.getHex()]).toEqual(before);
  expect(S.etch).toBe('alarm');
});

/* ---------- Task 4：家具 ---------- */
import type { Thing } from '../src/data/world';
import { buildFurniture, FURN_H } from '../src/world3d/furniture';

const FURN: Thing[] = [
  { id: 'pc', kind: 'desk', x: 2, y: 3, w: 3, h: 1, pc: true, act: 'pc' },
  { id: 'f_table', kind: 'table', x: 2, y: 3, w: 5, h: 2 },
  { id: 'f_bench', kind: 'bench', x: 2, y: 3, w: 4, h: 1 },
  { id: 'f_bed', kind: 'bed', x: 2, y: 3, w: 3, h: 2 },
  { id: 'f_sofa', kind: 'sofa', x: 2, y: 3, w: 4, h: 1 },
  { id: 'f_booth', kind: 'booth', x: 2, y: 3, w: 4, h: 2 },
  { id: 'f_vending', kind: 'vending', x: 2, y: 3, w: 2, h: 1 },
  { id: 'locker', kind: 'locker', x: 2, y: 3, w: 7, h: 1, act: 'locker' },
  { id: 'coffee', kind: 'coffee', x: 2, y: 3, w: 1, h: 1, act: 'coffee' },
  { id: 'f_plant', kind: 'plant', x: 2, y: 3, w: 1, h: 1 },
  { id: 'f_board', kind: 'board', x: 2, y: 3, w: 4, h: 1 },
  { id: 'f_screen', kind: 'screen', x: 2, y: 3, w: 6, h: 1 },
  { id: 'f_gate', kind: 'gate', x: 2, y: 3, w: 1, h: 1 },
];

test('every furniture kind has a model that fits its footprint at the table height', () => {
  for (const o of FURN) {
    const m = buildFurniture(o);
    expect({ id: o.id, built: !!m }).toEqual({ id: o.id, built: true });
    const b = boxOf(m!.group);
    const fits = b.min.x >= o.x - 0.1 && b.max.x <= o.x + o.w + 0.1 && b.min.z >= o.y - 0.1 && b.max.z <= o.y + o.h + 0.1 && b.min.y >= -0.001;
    expect({ id: o.id, fits }).toEqual({ id: o.id, fits: true });
    const top = o.kind === 'desk' ? FURN_H.deskMonitor : FURN_H[o.kind as keyof typeof FURN_H];
    expect({ id: o.id, top: Math.abs(b.max.y - top) <= 0.05 }).toEqual({ id: o.id, top: true });
  }
});

test('the PE workstation screen flashes red until the SPC clue is found', () => {
  setState(ch2State());
  const m = buildFurniture(FURN[0]!)!;
  const screen = m.group.getObjectByName('screen') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  m.update(0, false);
  expect(screen.material.emissive.getHex()).toBe(0xff4d45);
  S.clues = ['spc'];
  m.update(0, false);
  expect(screen.material.emissive.getHex()).not.toBe(0xff4d45);
});

test('the open locker shows the hanging suit until you put it on', () => {
  setState(ch2State());
  const m = buildFurniture(FURN.find((o) => o.id === 'locker')!)!;
  m.update(0, false);
  expect(m.group.getObjectByName('suit')!.visible).toBe(true);
  S.suit = true;
  m.update(0, false);
  expect(m.group.getObjectByName('suit')!.visible).toBe(false);
});

/* ---------- Task 5：人物 ---------- */
import { LOOK } from '../src/data/looks';
import { buildPerson } from '../src/world3d/person';

test('every look builds a person inside 0.7 × 0.7 × 1.4', () => {
  for (const [id, look] of Object.entries(LOOK)) {
    const b = boxOf(buildPerson(look).group);
    const ok = b.max.x - b.min.x <= 0.75 && b.max.z - b.min.z <= 0.75 && Math.abs(b.max.y - 1.4) <= 0.05 && b.min.y >= -0.001;
    expect({ id, ok }).toEqual({ id, ok: true });
  }
});

test('people turn to face where they walk, and stand still when not moving', () => {
  const p = buildPerson(LOOK.office);
  p.setDir('left');
  expect(p.group.rotation.y).toBeCloseTo(-Math.PI / 2);
  p.setDir('down');
  expect(p.group.rotation.y).toBeCloseTo(0);
  p.setWalk(0.25, true);
  expect(p.group.getObjectByName('legL')!.rotation.x).not.toBe(0);
  p.setWalk(0.25, false);
  expect(p.group.getObjectByName('legL')!.rotation.x).toBe(0);
});

/* ---------- Task 6：整張地圖 ---------- */
import { ACTS, MAP, NPC, refreshNpcs } from '../src/data/world';
import type { NpcDef } from '../src/data/maps';
import { WorldModel } from '../src/world3d/model';

const view = (o: Partial<Parameters<WorldModel['update']>[2]> = {}) => ({ px: 48, py: 64, dir: 'down' as const, moving: false, walkT: 0, near: null, marker: null, reduce: true, ...o });

test('building M03 makes every interactable pickable, one person per NPC, and the OHT', () => {
  setState(ch2State());
  loadMap('M03');
  const w = new WorldModel();
  w.build();
  const things = new Set(w.pickables().map((p) => p.userData.thing));
  for (const o of ACTS) expect({ id: o.id, pickable: things.has(o) }).toEqual({ id: o.id, pickable: true });
  expect(NPC.every((n) => !!w.scene.getObjectByName(`npc:${n.id}`))).toBe(true);
  expect(w.scene.getObjectByName('oht')).toBeDefined();
  loadMap('M04');
  w.build();
  expect(w.scene.getObjectByName('oht')).toBeUndefined();
  expect(w.scene.getObjectByName('leds')).toBeUndefined();
  w.dispose();
});

test('NPCs come and go with story flags without leaving ghosts', () => {
  setState(ch2State());
  loadMap('M03');
  const def: NpcDef = { id: 't_npc', look: 'boss', x: 5, y: 5, dir: 'down', talk: 'boss', when: { flag: 't_flag' } };
  MAP.npcs.unshift(def);
  try {
    const w = new WorldModel();
    w.build();
    expect(w.scene.getObjectByName('npc:t_npc')).toBeUndefined();
    S.flags = ['t_flag'];
    refreshNpcs(S);
    w.syncNpcs();
    expect(w.scene.getObjectByName('npc:t_npc')).toBeDefined();
    S.flags = [];
    refreshNpcs(S);
    w.syncNpcs();
    const left: string[] = [];
    w.scene.traverse((o) => o.name.startsWith('npc:t_npc') && left.push(o.name));
    expect(left).toEqual([]);
    w.dispose();
  } finally {
    MAP.npcs.shift();
    refreshNpcs(S);
  }
});

test('the player stands where the mover is, and dispose empties the scene', () => {
  setState(ch2State());
  loadMap('M03');
  const w = new WorldModel();
  w.build();
  w.update(0, 0.016, view({ px: 48, py: 32 }));
  const p = w.scene.getObjectByName('player')!;
  expect([p.position.x, p.position.z]).toEqual([3.5, 2.5]);
  w.dispose();
  expect(w.scene.children.length).toBe(0);
});

/* ---------- Task 7：相機與點選 ---------- */
import { followTarget, makeCamera, placeCamera } from '../src/world3d/camera';
import { pickAt } from '../src/world3d/pick';
import { MH as MAPH, MW as MAPW } from '../src/data/world';

/** 在 M03 建好場景、相機對準 (tx, tz)，回傳點選某個世界座標點的結果。 */
function pickWorld(tx: number, tz: number, p: THREE.Vector3) {
  setState(ch2State());
  loadMap('M03');
  const w = new WorldModel();
  w.build();
  w.scene.updateMatrixWorld(true);
  const cam = makeCamera(16 / 9, false);
  placeCamera(cam, new THREE.Vector3(tx, 0, tz));
  const ndc = p.clone().project(cam);
  const r = pickAt(cam, ndc.x, ndc.y, w.pickables());
  w.dispose();
  return r;
}

test('clicking a tool picks the tool', () => {
  const r = pickWorld(27.5, 4.5, new THREE.Vector3(27.5, 1.45, 6.0));
  expect(r && 'thing' in r && r.thing.id).toBe('ETCH-07');
});

test('clicking the front of a tall stocker picks the stocker, not the floor behind it', () => {
  const r = pickWorld(41, 12, new THREE.Vector3(41, 1.5, 15.0));
  expect(r && 'thing' in r && r.thing.id).toBe('STK-01');
});

test('clicking the floor gives that tile, and outside the map gives nothing', () => {
  const r = pickWorld(10, 7, new THREE.Vector3(10.5, 0, 7.5));
  expect(r && 'wx' in r && [Math.floor(r.wx / 16), Math.floor(r.wy / 16)]).toEqual([10, 7]);
  expect(pickWorld(4, 4, new THREE.Vector3(-3, 0, -3))).toBeNull();
});

test('the camera target never leaves the map', () => {
  loadMap('M03');
  const lo = followTarget(new THREE.Vector3(0, 0, 0), -999, -999, MAPW, MAPH, 1);
  const hi = followTarget(new THREE.Vector3(0, 0, 0), 99999, 99999, MAPW, MAPH, 1);
  expect([lo.x >= 0, lo.z >= 0, hi.x <= MAPW, hi.z <= MAPH]).toEqual([true, true, true, true]);
});
