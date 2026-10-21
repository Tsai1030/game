import { TS, type Thing } from '../data/world';
import type { Painter } from './paint';

/** 斜角視角：頂面每往後 4 列向右偏 1 px，看得到右側面。機台和家具共用。 */
export const SHEAR = 0.25;
export const shift = (v: number) => Math.round(v * SHEAR);

export type Rect = [number, number, number, number];

/** 一個斜角方塊各面的顏色。光從左上來：頂面最亮、右側面次之、正面最暗。 */
export interface Faces {
  line: string;
  top0: string;
  top1: string;
  top2: string;
  rimHi: string;
  edge: string;
  face: string;
  face1: string;
  faceHi: string;
  faceLo: string;
  kick: string;
  kickHi: string;
  side: string;
  side1: string;
  sideEdge: string;
}

/**
 * 方塊幾何。hz 正面高、T 頂面深（列數）、side 右側面寬、sw 正面與頂面寬；
 * tx 正面左緣、ty 頂面最後一列、fy 正面第一列、by 佔地格底邊。
 * dim.lift 是頂面高出佔地格的距離。
 */
export function boxGeo(o: Thing, dim: { hz: number; lift: number }, X = 0, Y = 0) {
  const { hz, lift } = dim;
  const W = o.w * TS;
  const H = o.h * TS;
  const T = H + lift - hz;
  const side = shift(T - 1);
  const by = Y + H;
  const fy = by - hz;
  return { W, H, hz, T, side, sw: W - 2 - side, tx: X + 1, ty: fy - T, fy, by };
}
export type Geo = ReturnType<typeof boxGeo>;

/** 右側面第 c 欄（1 起算）最上面那一列：頂面右緣剛好蓋不到的地方。 */
export const sideTop = (g: Geo, c: number) => g.fy - Math.ceil((c - 0.5) / SHEAR);

/** 頂面座標 (u, r)：u 從頂面左緣往右、r 從頂面最後一列往前，轉成斜切後的畫面座標。 */
export function surface(g: Geo) {
  const pt = (u: number, r: number): [number, number] => {
    const v = g.T - 1 - r;
    return [g.tx + u + shift(v), g.fy - 1 - v];
  };
  const rects = (u: number, r: number, w: number, h: number): Rect[] => {
    const out: Rect[] = [];
    for (let i = 0; i < h; i++) {
      const [x, y] = pt(u, r + i);
      const last = out[out.length - 1];
      if (last && last[0] === x && last[1] + last[3] === y) last[3]++;
      else out.push([x, y, w, 1]);
    }
    return out;
  };
  const rect = (p: Painter, col: string, u: number, r: number, w: number, h: number) => {
    for (const q of rects(u, r, w, h)) p.rect(col, ...q);
  };
  const round = (p: Painter, col: string, cu: number, cr: number, rad: number) => {
    for (let y = -rad; y <= rad; y++) {
      const w = Math.floor(Math.sqrt(rad * rad - y * y) + 0.5);
      rect(p, col, cu - w, cr + y, w * 2 + 1, 1);
    }
  };
  return { pt, rects, rect, round };
}
export type Surface = ReturnType<typeof surface>;

/** 方塊本體：落地陰影、外框、右側面、頂面（後暗前亮）、正面與踢腳板。 */
export function drawBox(p: Painter, g: Geo, s: Surface, f: Faces, shadow: string, shadow2: string): void {
  const { tx, sw, T, fy, by, hz, side } = g;
  p.rect(shadow, tx + 2, by, sw + side + 2, 3);
  for (let c = 1; c <= side + 2; c++) p.rect(shadow2, tx + sw - 1 + c, by - Math.ceil((c - 0.5) / SHEAR), 2, 4);
  for (const q of s.rects(-1, 0, sw + 2, T)) p.rect(f.line, ...q);
  const [bx, byy] = s.pt(-1, 0);
  p.rect(f.line, bx, byy - 1, sw + 2, 1);
  p.rect(f.line, tx - 1, fy, sw + 2, hz + 1);
  for (let c = 1; c <= side + 1; c++) p.rect(f.line, tx + sw - 1 + c, sideTop(g, Math.min(c, side)) - 1, 1, hz + 2);
  for (let c = 1; c <= side; c++) {
    const x = tx + sw - 1 + c;
    const y = sideTop(g, c);
    p.rect(c % 3 === 0 ? f.side1 : f.side, x, y, 1, hz);
    p.rect(f.sideEdge, x, y, 1, 1);
    p.rect(f.kick, x, y + hz - 3, 1, 3);
  }
  const b = Math.max(1, (T / 3) | 0);
  s.rect(p, f.top0, 0, 0, sw, b);
  s.rect(p, f.top1, 0, b, sw, b);
  s.rect(p, f.top2, 0, 2 * b, sw, T - 2 * b);
  s.rect(p, f.rimHi, 0, 0, sw, 1);
  s.rect(p, f.rimHi, 0, 0, 1, T);
  s.rect(p, f.sideEdge, sw - 1, 1, 1, T - 1);
  s.rect(p, f.edge, 0, T - 1, sw, 1);
  p.rect(f.face, tx, fy, sw, hz);
  p.rect(f.face1, tx, fy, sw, 2);
  p.rect(f.faceHi, tx, fy, 1, hz);
  p.rect(f.faceLo, tx + sw - 1, fy, 1, hz);
  p.rect(f.kick, tx, by - 3, sw, 3);
  p.rect(f.kickHi, tx, by - 3, sw, 1);
}
