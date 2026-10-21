import * as THREE from 'three';
import { C, LEDC, type LedColor } from '../render/palette';

/** 機台黑色金屬機身與頂面（平滑 3D，見 mockups/tools-threejs.html）。 */
export const BODY = new THREE.MeshStandardMaterial({ color: 0x0f1118, metalness: 0.6, roughness: 0.4 });
export const TOP = new THREE.MeshStandardMaterial({ color: 0x181b27, metalness: 0.5, roughness: 0.45 });
/** 物件輪廓線（讓黑色機身在暗處也看得出形狀）。 */
export const EDGE = new THREE.LineBasicMaterial({ color: 0x4a5170 });
export const POD = new THREE.MeshStandardMaterial({ color: 0x2fa39c, metalness: 0.2, roughness: 0.5 });
export const WALL = new THREE.MeshStandardMaterial({ color: 0x242136, metalness: 0.1, roughness: 0.85 });
export const WALL_TOP = new THREE.MeshStandardMaterial({ color: 0x34304a, metalness: 0.1, roughness: 0.8 });
export const WALL_EDGE = new THREE.LineBasicMaterial({ color: 0x4a4566 });
export const GLASS = new THREE.MeshStandardMaterial({ color: 0x7fd0e0, transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.9, depthWrite: false });
export const SHOWER = new THREE.MeshStandardMaterial({ color: 0x3d6fd6, metalness: 0.4, roughness: 0.5 });

/** LED 顏色（數值）。 */
export const ledColor = (k: LedColor): number => parseInt(LEDC[k].slice(1), 16);

/** 單色的標準材質（家具、人物用）。 */
export const solid = (hex: string | number, o: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: hex, metalness: 0.2, roughness: 0.7, ...o });

/** 每種地板一格 16×16 的畫法（沿用 2D 版的配色）。 */
function paintTile(g: CanvasRenderingContext2D, ch: string, X: number, Y: number, i: number, j: number): void {
  const rect = (col: string, x: number, y: number, w: number, h: number) => {
    g.fillStyle = col;
    g.fillRect(X + x, Y + y, w, h);
  };
  const floor = (base: string, seam: string, dot: string) => {
    rect(base, 0, 0, 16, 16);
    rect(seam, 0, 0, 16, 1);
    rect(seam, 0, 0, 1, 16);
    for (const a of [4, 8, 12]) for (const d of [4, 8, 12]) rect(dot, a, d, 1, 1);
  };
  switch (ch) {
    case '.':
      rect(C.carpet, 0, 0, 16, 16);
      rect(C.carpet2, 3, 3, 2, 2);
      rect(C.carpet2, 11, 11, 2, 2);
      return;
    case ',':
      return floor(C.fab, C.fab2, C.fabDot);
    case 'y':
      return floor(C.yel, C.yel2, C.yelDot);
    case 'l':
      return floor(C.lobby, C.lobby2, C.lobbyDot);
    case '=':
      rect(C.gown, 0, 0, 16, 16);
      rect(C.gown2, 0, 0, 16, 1);
      rect(C.gown2, 0, 0, 1, 16);
      return;
    case 'D':
      rect(C.gown, 0, 0, 16, 16);
      rect(C.wallEdge, 0, 0, 16, 2);
      rect(C.wallEdge, 0, 14, 16, 2);
      return;
    case 'A':
      rect(C.grate, 0, 0, 16, 16);
      for (let k = 1; k < 16; k += 3) rect(C.grate2, 0, k, 16, 1);
      return;
    case 'w':
      rect(C.floorW, 0, 0, 16, 16);
      for (const r of [0, 4, 8, 12]) rect(C.floorW2, 0, r, 16, 1);
      rect(C.floorW2, ((j * 7 + i * 5) % 12) + 2, 1, 1, 3);
      rect(C.floorW2, ((j * 3 + i * 11) % 12) + 2, 9, 1, 3);
      return;
    default:
      rect(C.wallTop, 0, 0, 16, 16);
  }
}

/** 整張地圖地板的貼圖：每格 16 px，最近點取樣保留像素感。沒有 2D 畫布時（測試）只建空貼圖。 */
export function floorTexture(tiles: string[][]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = tiles[0]!.length * 16;
  c.height = tiles.length * 16;
  const g = c.getContext('2d');
  if (g) for (let j = 0; j < tiles.length; j++) for (let i = 0; i < tiles[j]!.length; i++) paintTile(g, tiles[j]![i]!, i * 16, j * 16, i, j);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
