import * as THREE from 'three';
import { MH, MW, TS, type Thing } from '../data/world';

const ray = new THREE.Raycaster();
// 輪廓線不參與點選：three.js 預設線段的判定寬度是 1 單位（一整格），會把旁邊的地板點擊搶走。
ray.params.Line.threshold = 0;
ray.params.Points.threshold = 0;
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const thingOf = (o: THREE.Object3D | null): Thing | null => {
  while (o && !o.userData.thing) o = o.parent;
  return o ? (o.userData.thing as Thing) : null;
};

/**
 * 螢幕上的點（-1..1 的 NDC 座標）點到什麼。
 * 先看最近擋住視線的東西：是可互動的物件或 NPC 就回傳它；是牆或不能互動的家具就回傳 null（點了沒反應）。
 * 什麼都沒擋到就看地板落在哪裡（回傳像素座標給 Mover）；地圖外面回傳 null。
 */
export function pickAt(
  cam: THREE.Camera,
  ndcX: number,
  ndcY: number,
  pickables: THREE.Object3D[],
  blockers: THREE.Object3D[] = [],
): { thing: Thing } | { wx: number; wy: number } | null {
  ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
  const hit = ray.intersectObjects([...pickables, ...blockers], true).find((h) => !(h.object as THREE.LineSegments).isLineSegments);
  if (hit) {
    const thing = thingOf(hit.object);
    return thing ? { thing } : null;
  }
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(ground, p)) return null;
  if (p.x < 0 || p.z < 0 || p.x >= MW || p.z >= MH) return null;
  return { wx: p.x * TS, wy: p.z * TS };
}
