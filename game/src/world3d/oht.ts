import * as THREE from 'three';
import { solid } from './materials';

/**
 * 天車（OHT）：Fab 走道上方一圈軌道，兩台車沿著跑。範圍沿用 2D 版（像素 264–696 × 136–264）。
 * 減少動態時車停在固定位置。
 */
export function buildOht(): { group: THREE.Group; update(t: number, reduce: boolean): void } {
  const g = new THREE.Group();
  g.name = 'oht';
  const x0 = 16.5;
  const x1 = 43.5;
  const z0 = 8.5;
  const z1 = 16.5;
  const y = 2.6;
  const rail = solid(0x5a5574, { metalness: 0.6, roughness: 0.4 });
  const seg = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), rail);
    m.position.set(x, y, z);
    g.add(m);
  };
  seg(x1 - x0, 0.08, (x0 + x1) / 2, z0);
  seg(x1 - x0, 0.08, (x0 + x1) / 2, z1);
  seg(0.08, z1 - z0, x0, (z0 + z1) / 2);
  seg(0.08, z1 - z0, x1, (z0 + z1) / 2);
  const w = x1 - x0;
  const h = z1 - z0;
  const L = 2 * (w + h);
  const carMat = solid(0xd9dbe6, { metalness: 0.3, roughness: 0.5 });
  const cars = [0, L / 2].map((off) => {
    const car = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.45), carMat);
    bodyM.position.y = -0.2;
    bodyM.castShadow = true;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x5ff0ff, toneMapped: false }));
    lamp.position.set(0, -0.2, 0.235);
    car.add(bodyM, lamp);
    g.add(car);
    return { car, off };
  });
  const place = (dist: number, car: THREE.Group) => {
    let d = ((dist % L) + L) % L;
    if (d < w) car.position.set(x0 + d, y, z0);
    else if ((d -= w) < h) car.position.set(x1, y, z0 + d);
    else if ((d -= h) < w) car.position.set(x1 - d, y, z1);
    else car.position.set(x0, y, z1 - (d - w));
  };
  return {
    group: g,
    update(t, reduce) {
      for (const { car, off } of cars) place((reduce ? 7.5 : t * 1.75) + off, car);
    },
  };
}
