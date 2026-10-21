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
