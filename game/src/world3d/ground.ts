import * as THREE from 'three';
import { floorTexture, GLASS, SHOWER, WALL, WALL_EDGE, WALL_TOP } from './materials';

/** 可以站或看得穿的格子（牆的南邊是這些時，那面牆是「後牆」）。 */
const OPEN = new Set(['.', ',', 'y', '=', 'D', 'A', 'l', 'w']);

/** 後牆（南邊緊鄰地板）高、其他牆矮，斜俯視的相機才不會被牆擋住玩家。 */
export const WALL_TALL = 1.8;
export const WALL_LOW = 0.6;

const wallMats = [WALL, WALL, WALL_TOP, WALL, WALL, WALL];

function wall(x0: number, len: number, y: number, h: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(len, h, 1);
  const m = new THREE.Mesh(geo, wallMats);
  m.name = 'wall';
  m.position.set(x0 + len / 2, h / 2, y + 0.5);
  m.castShadow = true;
  m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), WALL_EDGE));
  return m;
}

/** 地板、牆、玻璃、風淋室門框。同一列連續、同高度的牆合併成一塊，減少繪圖次數。 */
export function buildGround(tiles: string[][]): THREE.Group {
  const H = tiles.length;
  const W = tiles[0]!.length;
  const g = new THREE.Group();
  g.name = 'ground';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: floorTexture(tiles), roughness: 0.75, metalness: 0.15 }));
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, H / 2);
  floor.receiveShadow = true;
  g.add(floor);
  const at = (x: number, y: number) => tiles[y]?.[x] ?? '#';
  const heightOf = (x: number, y: number) => (OPEN.has(at(x, y + 1)) ? WALL_TALL : WALL_LOW);
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (at(x, y) !== '#') {
        x++;
        continue;
      }
      const h = heightOf(x, y);
      let len = 1;
      while (x + len < W && at(x + len, y) === '#' && heightOf(x + len, y) === h) len++;
      g.add(wall(x, len, y, h));
      x += len;
    }
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = at(x, y);
      if (ch === 'g') {
        // 玻璃牆：沿著上下相鄰的牆／玻璃走向擺放的薄板。
        const vertical = at(x, y - 1) === 'g' || at(x, y + 1) === 'g';
        const pane = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.1 : 1, 1.2, vertical ? 1 : 0.1), GLASS);
        pane.name = 'glass';
        pane.position.set(x + 0.5, 0.6, y + 0.5);
        g.add(pane);
      } else if (ch === 'A') {
        // 風淋室：兩根藍色立柱加一根橫樑。
        const frame = new THREE.Group();
        frame.name = 'shower';
        for (const dz of [-0.42, 0.42]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), SHOWER);
          post.position.set(0, 0.8, dz);
          post.castShadow = true;
          frame.add(post);
        }
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.96), SHOWER);
        lintel.position.set(0, 1.62, 0);
        frame.add(lintel);
        frame.position.set(x + 0.5, 0, y + 0.5);
        g.add(frame);
      }
    }
  return g;
}
