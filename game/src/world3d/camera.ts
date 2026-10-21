import * as THREE from 'three';
import { TS } from '../data/world';

/** 相機從目標點往這個方向偏移：固定的斜俯視，略從右前方看（看得到機台右側面）。 */
export const CAM_OFFSET = new THREE.Vector3(6, 20, 16);

/** 正交相機的半高（單位）：寬畫面 6.5、手機 5.5。 */
export const halfHeight = (narrow: boolean): number => (narrow ? 5.5 : 6.5);

export function makeCamera(aspect: number, narrow: boolean): THREE.OrthographicCamera {
  const h = halfHeight(narrow);
  return new THREE.OrthographicCamera(-h * aspect, h * aspect, h, -h, 0.1, 200);
}

/** 畫面在地上大約涵蓋的半寬、半深（單位）；用來讓大地圖的鏡頭停在牆內。 */
export function viewHalf(cam: THREE.OrthographicCamera): { w: number; d: number } {
  const elev = Math.atan2(CAM_OFFSET.y, Math.hypot(CAM_OFFSET.x, CAM_OFFSET.z));
  return { w: cam.right, d: cam.top / Math.sin(elev) };
}

/**
 * 鏡頭目標平滑跟著玩家（像素座標 px, py），並限制在地圖範圍內。
 * half 有給時：地圖比畫面大的方向，目標再往內收，畫面才不會露出地圖外；比畫面小就置中。
 */
export function followTarget(cur: THREE.Vector3, px: number, py: number, mapW: number, mapH: number, k = 0.15, half = { w: 0, d: 0 }): THREE.Vector3 {
  const clamp = (v: number, size: number, h: number) => (size <= h * 2 ? size / 2 : Math.min(Math.max(v, h), size - h));
  const gx = clamp(px / TS + 0.5, mapW, half.w);
  const gz = clamp(py / TS + 0.5, mapH, half.d);
  const x = clamp(cur.x + (gx - cur.x) * k, mapW, half.w);
  const z = clamp(cur.z + (gz - cur.z) * k, mapH, half.d);
  return new THREE.Vector3(x, 0, z);
}

export function placeCamera(cam: THREE.Camera, target: THREE.Vector3): void {
  cam.position.copy(target).add(CAM_OFFSET);
  cam.lookAt(target);
  cam.updateMatrixWorld();
}
