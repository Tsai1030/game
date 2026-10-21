import * as THREE from 'three';
import type { Dir } from '../core/state';
import type { Look } from '../data/looks';
import { C } from '../render/palette';
import { solid } from './materials';

/** 3D 人物：原點在腳下格子中心，正面朝 +z（畫面下方）。高 1.4、寬深不超過 0.7。 */
export interface PersonModel {
  group: THREE.Group;
  setDir(d: Dir): void;
  /** phase 0–1 是走路循環的位置；moving 為 false 時手腳回到原位。 */
  setWalk(phase: number, moving: boolean): void;
}

const ROT: Record<Dir, number> = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

function part(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, name = ''): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** 以 (x, y) 為轉軸的手或腳：子物件往下掛，擺動時轉 rotation.x。 */
function limb(parent: THREE.Object3D, name: string, w: number, len: number, d: number, mat: THREE.Material, x: number, y: number, end?: THREE.Material): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(x, y, 0);
  part(pivot, w, len, d, mat, 0, -len / 2, 0);
  if (end) part(pivot, w + 0.02, 0.08, d + 0.02, end, 0, -len + 0.04, 0);
  parent.add(pivot);
  return pivot;
}

export function buildPerson(look: Look): PersonModel {
  const g = new THREE.Group();
  g.name = 'person';
  const suit = !!look.suit;
  const white = solid(C.suit, { roughness: 0.9 });
  const body = suit ? white : solid(look.top ?? C.suit);
  const legsMat = suit ? white : solid(look.bottom ?? C.suit);
  const hand = solid(suit ? (look.glove ?? C.glove) : C.skin);
  const feet = suit ? hand : solid(C.line);
  const headMat = suit ? white : solid(look.hair ?? C.line);
  const legL = limb(g, 'legL', 0.15, 0.45, 0.17, legsMat, -0.1, 0.45, feet);
  const legR = limb(g, 'legR', 0.15, 0.45, 0.17, legsMat, 0.1, 0.45, feet);
  part(g, 0.42, 0.5, 0.28, body, 0, 0.7, 0, 'body');
  if (suit) part(g, 0.06, 0.42, 0.01, solid(C.suit2), 0, 0.72, 0.145);
  if (look.tie) part(g, 0.07, 0.3, 0.01, solid(C.red), 0, 0.78, 0.145);
  const armL = limb(g, 'armL', 0.1, 0.42, 0.12, body, -0.27, 0.93, hand);
  const armR = limb(g, 'armR', 0.1, 0.42, 0.12, body, 0.27, 0.93, hand);
  // 頭：便服是頭髮顏色的頭加上臉；無塵衣是白色頭套加深色面罩。
  part(g, 0.4, 0.4, 0.38, headMat, 0, 1.2, 0, 'head');
  if (suit) {
    part(g, 0.3, 0.12, 0.02, solid(C.skin), 0, 1.2, 0.2);
    part(g, 0.32, 0.07, 0.03, solid(C.visor, { metalness: 0.7, roughness: 0.2 }), 0, 1.25, 0.205);
  } else {
    part(g, 0.32, 0.22, 0.02, solid(C.skin), 0, 1.16, 0.2);
    for (const ex of [-0.07, 0.07]) part(g, 0.04, 0.05, 0.01, solid(C.line), ex, 1.18, 0.215);
  }
  return {
    group: g,
    setDir(d) {
      g.rotation.y = ROT[d];
    },
    setWalk(phase, moving) {
      const a = moving ? Math.sin(phase * Math.PI * 2) * 0.55 : 0;
      legL.rotation.x = a;
      legR.rotation.x = -a;
      armL.rotation.x = -a * 0.8;
      armR.rotation.x = a * 0.8;
    },
  };
}
