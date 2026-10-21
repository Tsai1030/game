import * as THREE from 'three';
import { hasClue, S } from '../core/state';
import type { Thing } from '../data/world';
import { C } from '../render/palette';
import { EDGE, solid } from './materials';

/** 家具頂端高度（單位）。桌子有電腦時以螢幕頂為準（deskMonitor）。 */
export const FURN_H = {
  desk: 0.75,
  deskMonitor: 1.25,
  table: 0.75,
  bench: 0.45,
  bed: 0.5,
  sofa: 0.8,
  booth: 1.4,
  vending: 1.9,
  locker: 1.9,
  coffee: 1.5,
  plant: 0.9,
  board: 1.6,
  screen: 1.8,
  gate: 1.0,
} as const;

export interface FurnModel {
  group: THREE.Group;
  /** 會變的部分：工作站告警畫面、置物櫃的無塵衣、咖啡機的燈。 */
  update(t: number, reduce: boolean): void;
}

const hex = (css: string) => parseInt(css.slice(1), 16);
const WOOD_TOP = solid(0x83593b, { roughness: 0.6 });
const WOOD = solid(0x5e3f2b, { roughness: 0.7 });
const METAL = solid(0x4a5372, { metalness: 0.6, roughness: 0.4 });
const METAL_DARK = solid(0x2c3246, { metalness: 0.5, roughness: 0.45 });
const FABRIC = solid(0x3a3550, { roughness: 0.95 });
const FABRIC_DARK = solid(0x2a2640, { roughness: 0.95 });
const BLACK = solid(0x0a0b10, { roughness: 0.5 });

function box(g: THREE.Group, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, name = '', edges = false): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), EDGE));
  g.add(m);
  return m;
}

/** 四隻腳加一塊頂板。 */
function slab(g: THREE.Group, x0: number, z0: number, w: number, d: number, top: number, thick: number, mat: THREE.Material, legMat: THREE.Material): void {
  box(g, w - 0.1, thick, d - 0.1, mat, x0 + w / 2, top - thick / 2, z0 + d / 2, '', true);
  for (const [dx, dz] of [
    [0.1, 0.1],
    [w - 0.1, 0.1],
    [0.1, d - 0.1],
    [w - 0.1, d - 0.1],
  ] as const)
    box(g, 0.06, top - thick, 0.06, legMat, x0 + dx, (top - thick) / 2, z0 + dz);
}

export function buildFurniture(o: Thing): FurnModel | null {
  const g = new THREE.Group();
  g.name = `furn:${o.id}`;
  g.userData.thing = o;
  const x0 = o.x;
  const z0 = o.y;
  const w = o.w;
  const d = o.h;
  let update: FurnModel['update'] = () => {};
  switch (o.kind) {
    case 'desk': {
      const top = FURN_H.desk;
      box(g, w - 0.1, 0.05, d - 0.15, WOOD_TOP, x0 + w / 2, top - 0.025, z0 + d / 2, '', true);
      box(g, 0.05, top - 0.05, d - 0.25, WOOD, x0 + 0.1, (top - 0.05) / 2, z0 + d / 2);
      box(g, 0.05, top - 0.05, d - 0.25, WOOD, x0 + w - 0.1, (top - 0.05) / 2, z0 + d / 2);
      box(g, w - 0.25, 0.4, 0.04, WOOD, x0 + w / 2, top - 0.3, z0 + 0.15);
      if (o.id === 'desk2') for (let k = 0; k < 3; k++) box(g, 0.2, 0.03, 0.28, solid(0xffffff), x0 + 0.3 + k * 0.25, top + 0.015, z0 + 0.6);
      if (!o.pc) break;
      const cx = x0 + w / 2;
      box(g, 0.55, 0.03, 0.18, solid(hex(C.keyboard)), cx, top + 0.015, z0 + 0.7);
      box(g, 0.06, 0.18, 0.06, BLACK, cx, top + 0.09, z0 + 0.2);
      const scrMat = new THREE.MeshStandardMaterial({ color: 0x0a1418, emissive: hex(C.screen), emissiveIntensity: 0.55 });
      box(g, 0.56, 0.32, 0.05, solid(hex(C.mon)), cx, FURN_H.deskMonitor - 0.16, z0 + 0.2, '', true);
      const screen = box(g, 0.48, 0.24, 0.01, scrMat, cx, FURN_H.deskMonitor - 0.16, z0 + 0.23, 'screen');
      screen.castShadow = false;
      // PE 工作站：拿到 SPC 線索前，螢幕閃紅色告警。
      if (o.id === 'pc')
        update = (t, reduce) => {
          const alert = !hasClue('spc') && (reduce || Math.floor(t * 2) % 2 === 0);
          scrMat.emissive.setHex(alert ? hex(C.red) : hex(C.screen));
          scrMat.emissiveIntensity = alert ? 1.4 : 0.55;
        };
      break;
    }
    case 'table':
      slab(g, x0, z0, w, d, FURN_H.table, 0.06, WOOD_TOP, WOOD);
      break;
    case 'bench':
      slab(g, x0, z0, w, d * 0.6, FURN_H.bench, 0.08, WOOD_TOP, WOOD);
      break;
    case 'bed':
      box(g, w - 0.1, 0.28, d - 0.1, WOOD, x0 + w / 2, 0.14, z0 + d / 2, '', true);
      box(g, w - 0.2, 0.15, d - 0.2, solid(0xd9dbe6), x0 + w / 2, 0.355, z0 + d / 2);
      box(g, w - 0.18, 0.06, (d - 0.2) * 0.62, solid(hex(C.blanket)), x0 + w / 2, 0.45, z0 + d - 0.1 - ((d - 0.2) * 0.62) / 2);
      box(g, 0.9, 0.07, 0.35, solid(hex(C.pillow)), x0 + w / 2, FURN_H.bed - 0.035, z0 + 0.35);
      break;
    case 'sofa':
      box(g, w - 0.1, 0.42, d - 0.3, FABRIC, x0 + w / 2, 0.21, z0 + d / 2 + 0.05, '', true);
      box(g, w - 0.1, FURN_H.sofa, 0.2, FABRIC_DARK, x0 + w / 2, FURN_H.sofa / 2, z0 + 0.2, '', true);
      for (const ax of [x0 + 0.12, x0 + w - 0.12]) box(g, 0.14, 0.58, d - 0.3, FABRIC_DARK, ax, 0.29, z0 + d / 2 + 0.05);
      break;
    case 'booth': {
      const h = FURN_H.booth;
      box(g, w - 0.1, h, d - 0.1, METAL, x0 + w / 2, h / 2, z0 + d / 2, '', true);
      box(g, w - 0.5, 0.45, 0.02, new THREE.MeshStandardMaterial({ color: 0x24485a, emissive: 0x0d2a36, transparent: true, opacity: 0.85 }), x0 + w / 2, 0.95, z0 + d - 0.04);
      box(g, w - 0.3, 0.05, 0.2, METAL_DARK, x0 + w / 2, 0.68, z0 + d - 0.1);
      break;
    }
    case 'vending': {
      const h = FURN_H.vending;
      box(g, w - 0.1, h, d - 0.2, METAL, x0 + w / 2, h / 2, z0 + d / 2, '', true);
      box(g, w - 0.6, 1.0, 0.02, solid(0x08141b, { emissive: 0x0a1a24 }), x0 + w / 2 - 0.15, 1.2, z0 + d - 0.09);
      const cans = [hex(C.can1), hex(C.can2), hex(C.can3)];
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 4; k++)
          box(g, 0.12, 0.2, 0.03, new THREE.MeshBasicMaterial({ color: cans[(r + k) % 3]! }), x0 + 0.35 + k * 0.3, 0.9 + r * 0.3, z0 + d - 0.07);
      box(g, 0.25, 0.4, 0.03, METAL_DARK, x0 + w - 0.35, 1.25, z0 + d - 0.08);
      break;
    }
    case 'locker': {
      const h = FURN_H.locker;
      box(g, w - 0.05, h, d - 0.3, METAL, x0 + w / 2, h / 2, z0 + (d - 0.3) / 2 + 0.05, '', true);
      const front = z0 + d - 0.25;
      for (let k = 1; k < w; k++) box(g, 0.02, h - 0.1, 0.02, METAL_DARK, x0 + k, h / 2, front + 0.01);
      // 打開的那一格：裡面掛著一件無塵衣（還沒穿上時）。
      box(g, 0.8, h - 0.25, 0.04, BLACK, x0 + 2.5, h / 2, front + 0.02);
      const suit = new THREE.Group();
      suit.name = 'suit';
      box(suit, 0.42, 1.25, 0.08, solid(hex(C.suit), { roughness: 0.9 }), 0, 0.85, 0);
      box(suit, 0.3, 0.08, 0.02, solid(hex(C.visor)), 0, 1.38, 0.05);
      suit.position.set(x0 + 2.5, 0, front + 0.06);
      g.add(suit);
      update = () => {
        suit.visible = !S.suit;
      };
      break;
    }
    case 'coffee': {
      const h = FURN_H.coffee;
      box(g, w - 0.2, h, d - 0.3, METAL, x0 + w / 2, h / 2, z0 + d / 2 - 0.05, '', true);
      const front = z0 + d - 0.2;
      box(g, 0.4, 0.2, 0.02, new THREE.MeshBasicMaterial({ color: hex(C.screen) }), x0 + w / 2, 1.2, front + 0.01);
      box(g, 0.35, 0.3, 0.06, BLACK, x0 + w / 2, 0.55, front);
      box(g, 0.12, 0.14, 0.12, solid(0xffffff), x0 + w / 2, 0.47, front);
      const ledMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, emissive: hex(C.red), emissiveIntensity: 0.3 });
      box(g, 0.06, 0.06, 0.02, ledMat, x0 + w / 2 + 0.25, 0.95, front + 0.01, 'coffeeLed');
      update = (t, reduce) => {
        ledMat.emissiveIntensity = !reduce && Math.floor(t) % 2 === 1 ? 2.4 : 0.3;
      };
      break;
    }
    case 'plant': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.35, 12), solid(hex(C.pot)));
      pot.position.set(x0 + 0.5, 0.175, z0 + 0.5);
      pot.castShadow = true;
      g.add(pot);
      for (const [dx, dy, dz, r] of [
        [0, 0.6, 0, 0.28],
        [-0.12, 0.72, 0.05, 0.18],
        [0.12, 0.7, -0.05, 0.2],
      ] as const) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), solid(dy > 0.65 ? hex(C.leaf2) : hex(C.leaf)));
        leaf.position.set(x0 + 0.5 + dx, dy, z0 + 0.5 + dz);
        leaf.castShadow = true;
        g.add(leaf);
      }
      break;
    }
    case 'board': {
      const top = FURN_H.board;
      for (const lx of [x0 + 0.25, x0 + w - 0.25]) box(g, 0.05, top - 0.1, 0.05, METAL_DARK, lx, (top - 0.1) / 2, z0 + 0.4);
      box(g, w - 0.2, 1.0, 0.05, METAL_DARK, x0 + w / 2, top - 0.5, z0 + 0.4, '', true);
      box(g, w - 0.3, 0.9, 0.01, solid(hex(C.board), { roughness: 0.3 }), x0 + w / 2, top - 0.5, z0 + 0.43);
      box(g, 1.2, 0.03, 0.01, new THREE.MeshBasicMaterial({ color: hex(C.red) }), x0 + 0.9, top - 0.3, z0 + 0.44);
      box(g, 1.8, 0.03, 0.01, new THREE.MeshBasicMaterial({ color: hex(C.glove) }), x0 + 1.3, top - 0.5, z0 + 0.44);
      break;
    }
    case 'screen': {
      const top = FURN_H.screen;
      box(g, w - 0.2, 0.08, 0.08, METAL_DARK, x0 + w / 2, top - 0.04, z0 + 0.15);
      box(g, w - 0.4, 1.1, 0.02, new THREE.MeshStandardMaterial({ color: hex(C.screenW), emissive: 0x3a3e4a, roughness: 0.9 }), x0 + w / 2, top - 0.08 - 0.55, z0 + 0.15);
      break;
    }
    case 'gate': {
      const top = FURN_H.gate;
      box(g, 0.25, top - 0.04, 0.5, METAL, x0 + 0.3, (top - 0.04) / 2, z0 + 0.5, '', true);
      box(g, 0.12, 0.04, 0.12, new THREE.MeshBasicMaterial({ color: hex(C.green), toneMapped: false }), x0 + 0.3, top - 0.02, z0 + 0.5);
      box(g, 0.55, 0.05, 0.05, METAL_DARK, x0 + 0.65, 0.85, z0 + 0.5);
      break;
    }
    default:
      return null;
  }
  return { group: g, update };
}
