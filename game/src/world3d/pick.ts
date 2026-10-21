import * as THREE from 'three';
import { MH, MW, TS, type Thing } from '../data/world';

const ray = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * 螢幕上的點（-1..1 的 NDC 座標）點到什麼：先找可點選的模型（最近的優先），
 * 沒點到就看地板落在哪裡（回傳像素座標給 Mover）；點到地圖外面回傳 null。
 */
export function pickAt(cam: THREE.Camera, ndcX: number, ndcY: number, pickables: THREE.Object3D[]): { thing: Thing } | { wx: number; wy: number } | null {
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
  for (const hit of ray.intersectObjects(pickables, true)) {
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.thing) o = o.parent;
    if (o) return { thing: o.userData.thing as Thing };
  }
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(ground, p)) return null;
  if (p.x < 0 || p.z < 0 || p.x >= MW || p.z >= MH) return null;
  return { wx: p.x * TS, wy: p.z * TS };
}
