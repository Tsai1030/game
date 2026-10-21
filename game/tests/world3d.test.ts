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
