import * as THREE from 'three';
import { TS } from '../data/world';

/** 3D 世界座標：1 格 = 1 單位。地圖的 x → +x、地圖的 y → +z、高度 → +y，地板在 y = 0。 */
export const toWorld = (px: number, py: number): { x: number; z: number } => ({ x: px / TS, z: py / TS });

/** 格子 (x, y) 中心點的地板位置。 */
export const tileCenter = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x + 0.5, 0, y + 0.5);
