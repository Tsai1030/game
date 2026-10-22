import * as THREE from 'three';
import { TS } from '../data/world';
import { WALL_TALL } from './ground';

/** 相機從目標點往這個方向偏移：固定的斜俯視，略從右前方看（看得到機台右側面）。 */
export const CAM_OFFSET = new THREE.Vector3(6, 20, 16);

/** 正交相機的半高（單位）：寬畫面 6.5、手機 5.5。 */
export const halfHeight = (narrow: boolean): number => (narrow ? 5.5 : 6.5);

export function makeCamera(aspect: number, narrow: boolean): THREE.OrthographicCamera {
  const h = halfHeight(narrow);
  return new THREE.OrthographicCamera(-h * aspect, h * aspect, h, -h, 0.1, 200);
}

/** 相機的畫面右方、畫面上方（世界座標的單位向量）。畫面軸跟地圖軸差了約 20°，夾範圍要用這兩個方向。 */
const FWD = CAM_OFFSET.clone().negate().normalize();
const RIGHT = new THREE.Vector3().crossVectors(FWD, new THREE.Vector3(0, 1, 0)).normalize();
const UP = new THREE.Vector3().crossVectors(RIGHT, FWD).normalize();

/** 畫面的半寬、半高（相機空間的單位）。 */
export function viewHalf(cam: THREE.OrthographicCamera): { w: number; h: number } {
  return { w: cam.right, h: cam.top };
}

/** 地圖整個立體範圍（含高牆頂端）投影到畫面上的邊界。 */
function screenBounds(mapW: number, mapH: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const x of [0, mapW])
    for (const z of [0, mapH])
      for (const y of [0, WALL_TALL]) {
        const p = new THREE.Vector3(x, y, z);
        minX = Math.min(minX, p.dot(RIGHT));
        maxX = Math.max(maxX, p.dot(RIGHT));
        minY = Math.min(minY, p.dot(UP));
        maxY = Math.max(maxY, p.dot(UP));
      }
  return { minX, maxX, minY, maxY };
}

/** 畫面座標 (sx, sy) 對到地面（y = 0）的哪一點。 */
function groundAt(sx: number, sy: number): THREE.Vector3 {
  const det = RIGHT.x * UP.z - RIGHT.z * UP.x;
  return new THREE.Vector3((sx * UP.z - RIGHT.z * sy) / det, 0, (RIGHT.x * sy - sx * UP.x) / det);
}

/**
 * 鏡頭目標平滑跟著玩家（像素座標 px, py）。
 * 給了 half（畫面半寬、半高）時在「畫面座標」裡夾範圍：地圖比畫面大就讓畫面停在地圖內，比畫面小就置中；
 * 地圖範圍包含高牆頂端，所以玩家從腳到頭都一定在畫面裡。沒給 half 時只把目標夾在地圖矩形內。
 */
export function followTarget(cur: THREE.Vector3, px: number, py: number, mapW: number, mapH: number, k = 0.15, half?: { w: number; h: number }): THREE.Vector3 {
  const goal = new THREE.Vector3(px / TS + 0.5, 0, py / TS + 0.5);
  if (!half) {
    const c = (v: number, size: number) => Math.min(Math.max(v, 0), size);
    return new THREE.Vector3(c(cur.x + (goal.x - cur.x) * k, mapW), 0, c(cur.z + (goal.z - cur.z) * k, mapH));
  }
  const b = screenBounds(mapW, mapH);
  const clamp = (v: number, lo: number, hi: number, h: number) => (hi - lo <= h * 2 ? (lo + hi) / 2 : Math.min(Math.max(v, lo + h), hi - h));
  const gx = clamp(goal.dot(RIGHT), b.minX, b.maxX, half.w);
  const gy = clamp(goal.dot(UP), b.minY, b.maxY, half.h);
  const sx = clamp(cur.dot(RIGHT) + (gx - cur.dot(RIGHT)) * k, b.minX, b.maxX, half.w);
  const sy = clamp(cur.dot(UP) + (gy - cur.dot(UP)) * k, b.minY, b.maxY, half.h);
  return groundAt(sx, sy);
}

export function placeCamera(cam: THREE.Camera, target: THREE.Vector3): void {
  cam.position.copy(target).add(CAM_OFFSET);
  cam.lookAt(target);
  cam.updateMatrixWorld();
}
