import { S } from '../core/state';
import { hashStr, rng } from '../core/random';
import { TS, type Thing } from '../data/world';
import { C, HALO1, HALO2, hexA, LEDC, type LedColor } from './palette';
import { FURN_TOP, furnDyn, furnStatic } from './furniture';
import { boxGeo, drawBox, sideTop, surface, type Faces, type Geo, type Rect, type Surface } from './oblique';
import { txt, txtW, type Painter } from './paint';

/** 靜態貼圖四周預留的空間（燈號塔高出佔地格 26 px、陰影向右下延伸）。 */
export const STATIC_PAD = { x: 6, top: 26, bottom: 6 } as const;

type ToolKind = 'etch' | 'cvd' | 'met' | 'wet' | 'stk' | 'litho' | 'track';

/** 各機種的正面高度 hz，以及頂面高出佔地格的距離 lift（px）。 */
const DIM: Record<ToolKind, { hz: number; lift: number }> = {
  etch: { hz: 18, lift: 12 },
  cvd: { hz: 18, lift: 12 },
  litho: { hz: 18, lift: 12 },
  stk: { hz: 50, lift: 12 },
  met: { hz: 16, lift: 10 },
  track: { hz: 16, lift: 10 },
  wet: { hz: 14, lift: 10 },
};
/** 燈號塔頂端比頂面最後一列高出的距離。 */
const TOWER = 14;

/** 物件畫面上高出佔地格的高度；點擊判定和頭上的箭頭都用這個。 */
export const VISUAL_TOP: Partial<Record<string, number>> = {
  ...Object.fromEntries(Object.entries(DIM).map(([k, d]) => [k, d.lift + TOWER])),
  ...FURN_TOP,
};

const isTool = (o: Thing) => o.kind in DIM;

/** 機台各面的顏色。 */
const TOOL_FACES: Faces = {
  line: C.tLine,
  top0: C.tTop0,
  top1: C.tTop1,
  top2: C.tTop2,
  rimHi: C.tRimHi,
  edge: C.tEdge,
  face: C.tFace,
  face1: C.tFace1,
  faceHi: C.tFaceHi,
  faceLo: C.tFaceLo,
  kick: C.tKick,
  kickHi: C.tKickHi,
  side: C.tSide,
  side1: C.tSide1,
  sideEdge: C.tSideEdge,
};

/** 機台幾何（見 oblique.ts 的 boxGeo）。 */
export const toolGeo = (o: Thing, X = 0, Y = 0): Geo => boxGeo(o, DIM[o.kind as ToolKind], X, Y);

/** 頂面往下凹的槽（腔體、槽體）：左上暗、右下亮。 */
function well(p: Painter, s: Surface, u: number, r: number, w: number, h: number): void {
  s.rect(p, C.tLine, u, r, w, h);
  s.rect(p, C.tWell, u + 1, r + 1, w - 2, h - 2);
  s.rect(p, C.tWellSh, u + 1, r + 1, w - 2, 1);
  s.rect(p, C.tWellSh, u + 1, r + 1, 1, h - 2);
  s.rect(p, C.tWellHi, u + 1, r + h - 2, w - 2, 1);
  s.rect(p, C.tWellHi, u + w - 2, r + 1, 1, h - 2);
}

/** 放在 load port 上的晶圓盒（FOUP），突出在頂面前緣。 */
function foup(p: Painter, x: number, y: number): void {
  p.rect(C.tLine, x - 1, y - 1, 12, 11);
  p.rect(C.podTop, x, y, 10, 4);
  p.rect(C.pod, x, y + 4, 10, 5);
  p.rect(C.podFront, x, y + 7, 10, 2);
  p.rect(C.tLine, x + 3, y + 5, 4, 1);
}

/** 正面：左邊名牌，右邊一到兩片 LED 面板（回傳面板內的 LED 區）。 */
function front(p: Painter, g: Geo, id: string): Rect[] {
  const { tx, sw, fy, hz } = g;
  txt(p, id, tx + 5, fy + 2 + ((hz - 10) >> 1), C.tLabel);
  const x0 = tx + 9 + txtW(id);
  const n = tx + sw - 3 - x0 >= 24 ? 2 : 1;
  const pw = ((tx + sw - 3 - x0) / n) | 0;
  const zones: Rect[] = [];
  for (let k = 0; k < n; k++) {
    const x = x0 + k * pw;
    p.rect(C.tSeam, x, fy + 2, 1, hz - 5);
    p.rect(C.tSeamHi, x + 1, fy + 2, 1, hz - 5);
    zones.push([x + 3, fy + 4, pw - 4, hz - 9]);
  }
  return zones;
}

/** LED 區：[x, y, w, h]，或再加上把區內座標轉成畫面座標的 map（頂面、側面）。 */
type Zone = [number, number, number, number, ((a: number, b: number) => [number, number])?];

interface Pm {
  n: string;
  rects: Rect[];
  lx: number;
  ly: number;
  halo: Rect;
}

interface ToolLayout {
  pms: Pm[];
  /** 燈號塔三顆燈（紅、黃、綠）的位置。 */
  tower: { x: number; ys: [number, number, number] };
  /** MET 螢幕的光暈。 */
  glow: Rect[];
  zones: Zone[];
  strip: number[];
  sy: number;
}

const NOPAINT: Painter = { rect() {} };

/** 畫機台並回傳版面（腔體、燈號、LED 區）。p 傳 NOPAINT 時只算版面。 */
function toolLayout(p: Painter, o: Thing, X: number, Y: number): ToolLayout {
  const g = toolGeo(o, X, Y);
  const s = surface(g);
  const { tx, sw, T, fy, by, hz, side } = g;
  drawBox(p, g, s, TOOL_FACES, C.shadow, C.shadow2);
  const L: ToolLayout = { pms: [], tower: { x: 0, ys: [0, 0, 0] }, glow: [], zones: [], strip: [], sy: by - 2 };
  const top = (u: number, r: number, w: number, h: number) => L.zones.push([u, r, w, h, s.pt]);
  L.zones.push([1, 3, side, hz - 7, (c, yy) => [tx + sw - 1 + c, sideTop(g, c) + yy]]);
  const pm = (n: string, u: number, r: number) => {
    well(p, s, u, r, 14, 11);
    const [x, y] = s.pt(u, r);
    const [lx, ly] = s.pt(u + 5, r + 3);
    const rects = [...s.rects(u + 1, r + 1, 12, 1), ...s.rects(u + 1, r + 9, 12, 1), ...s.rects(u + 1, r + 2, 1, 7), ...s.rects(u + 12, r + 2, 1, 7)];
    L.pms.push({ n, rects, lx, ly, halo: [x - 3, y - 3, 20, 17] });
  };
  const foups = (n: number) => {
    for (let k = 0; k < n; k++) foup(p, ...s.pt(4 + k * 12, T - 6));
  };
  switch (o.kind) {
    case 'etch':
    case 'cvd': {
      const cx = sw >> 1;
      const cy = 21;
      well(p, s, cx - 7, cy - 6, 14, 13);
      s.rect(p, C.tWellHi, cx - 1, cy - 3, 2, 7);
      const ch: [string, number, number][] =
        o.kind === 'etch'
          ? [['A', cx - 27, cy - 1], ['B', cx - 18, cy - 18], ['C', cx + 4, cy - 18], ['D', cx + 13, cy - 1]]
          : [['A', cx - 27, cy - 1], ['B', cx - 7, cy - 18], ['C', cx + 13, cy - 1]];
      for (const [n, u, r] of ch) pm(n, u, r);
      const lw = Math.min(7, cx - 30);
      top(2, 3, lw, T - 10);
      top(sw - 2 - lw, 3, lw, T - 10);
      top(42, T - 5, sw - 46, 1);
      foups(3);
      break;
    }
    case 'wet':
      for (let k = 0; k < 5; k++) {
        const u = 4 + k * 16;
        well(p, s, u, 4, 14, 14);
        s.rect(p, C.liquid, u + 1, 6, 12, 10);
        s.rect(p, C.glassHi, u + 2, 7, 4, 1);
      }
      top(3, 1, sw - 6, 2);
      top(18, 20, sw - 22, 3);
      foups(1);
      break;
    case 'met':
      s.round(p, C.tRim, 16, 18, 9);
      s.round(p, C.tPanel, 16, 18, 8);
      s.round(p, C.tDark, 16, 18, 4);
      s.rect(p, C.tLine, 31, 8, 18, 13);
      s.rect(p, C.screen, 32, 9, 16, 11);
      s.rect(p, C.tDark, 34, 12, 10, 1);
      s.rect(p, C.red, 34, 15, 6, 1);
      L.glow = s.rects(28, 5, 24, 19);
      top(2, 2, 6, 6);
      top(31, 23, 18, 5);
      top(16, 30, sw - 20, 6);
      foups(1);
      break;
    case 'litho':
      s.rect(p, C.tLine, 6, 6, 22, 12);
      s.rect(p, C.tDark, 7, 7, 20, 10);
      s.rect(p, C.amber, 9, 9, 4, 1);
      s.round(p, C.tRim, 48, 19, 11);
      s.round(p, C.tPanel, 48, 19, 10);
      s.round(p, C.tDark, 48, 19, 5);
      well(p, s, 68, 6, 28, 28);
      s.round(p, C.tWafer, 82, 20, 9);
      top(3, 21, 30, 16);
      top(61, 2, 5, 36);
      top(3, 1, sw - 8, 2);
      top(38, 33, 22, 4);
      break;
    case 'track':
      for (let k = 0; k < 4; k++) {
        const u = 12 + k * 20;
        s.round(p, C.tRim, u, 15, 8);
        s.round(p, C.tPanel, u, 15, 7);
        s.round(p, C.tWafer, u, 15, 4);
        s.rect(p, C.redDim, u - 7, T - 8, 14, 2);
      }
      top(3, 26, sw - 6, 6);
      top(3, 1, sw - 6, 3);
      break;
    case 'stk':
      for (let k = 0; 6 + k * 10 < T - 4; k++) {
        s.rect(p, C.tSeam, 3, 6 + k * 10, sw - 6, 1);
        s.rect(p, C.tSeamHi, 3, 7 + k * 10, sw - 6, 1);
      }
      top(2, 3, 4, T - 8);
      top(sw - 6, 3, 4, T - 8);
      // 正面大窗，看得到裡面三排晶圓盒。
      p.rect(C.tLine, tx + 3, fy + 3, sw - 6, hz - 13);
      p.rect(C.tGlass, tx + 4, fy + 4, sw - 8, hz - 15);
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++) {
          const x = tx + 7 + k * 13;
          const y = fy + 6 + r * 11;
          p.rect(C.tLine, x - 1, y - 1, 11, 10);
          p.rect(C.podTop, x, y, 9, 3);
          p.rect(C.pod, x, y + 3, 9, 4);
          p.rect(C.podFront, x, y + 6, 9, 2);
        }
      for (let k = 0; k < 6; k++) p.rect(C.tGlassHi, tx + sw - 12 + k, fy + 6 + k * 3, 1, 3);
      txt(p, o.id, tx + 5, by - 9, C.tLabel);
      L.zones.push([tx + 32, by - 9, sw - 36, 5]);
      break;
  }
  if (o.kind !== 'stk') L.zones.push(...front(p, g, o.id));
  // 燈號塔立在頂面右後角。
  const [px, py] = s.pt(sw - 6, 3);
  p.rect(C.tLine, px - 1, py - 8, 3, 9);
  p.rect(C.tRimHi, px, py - 8, 1, 8);
  p.rect(C.tLine, px - 3, py - 17, 7, 10);
  p.rect(C.off, px - 2, py - 16, 5, 8);
  L.tower = { x: px - 1, ys: [py - 15, py - 13, py - 11] };
  for (let x = tx + 2; x < tx + sw - 3; x += 3) L.strip.push(x);
  return L;
}

/** 以 (0, 0) 為原點的版面；畫動態層時再加上機台位置。 */
const layoutCache = new Map<string, ToolLayout>();
const layout = (o: Thing) => {
  let d = layoutCache.get(o.id);
  if (!d) layoutCache.set(o.id, (d = toolLayout(NOPAINT, o, 0, 0)));
  return d;
};

export interface Led {
  x: number;
  y: number;
  col: LedColor;
  kind: 'steady' | 'blink' | 'flick';
  rate: number;
  ph: number;
  duty: number;
}

export interface LedSet {
  L: Led[];
  strip: number[];
  sy: number;
}

/** 每台機台用自己的 ID 當種子，產生固定的 LED 配置（頂面、正面、側面）；只有 ETCH-07 會有紅燈。 */
export function buildLeds(o: Thing): LedSet {
  const lay = toolLayout(NOPAINT, o, o.x * TS, o.y * TS);
  const r = rng(hashStr(o.id));
  const pal = (o.id === 'ETCH-07' ? 'ggcccbwarrr' : 'gggcccbbwa') as string;
  const L: Led[] = [];
  const used = new Set<number>();
  for (const [zx, zy, zw, zh, map] of lay.zones) {
    if (zw <= 0 || zh <= 0) continue;
    const n = Math.min(50, Math.max(3, Math.round((zw * zh) / 10)));
    for (let k = 0; k < n; k++) {
      const a = zx + Math.floor(r() * zw);
      const b = zy + Math.floor(r() * zh);
      const [x, y] = map ? map(a, b) : [a, b];
      const key = x * 7919 + y;
      if (used.has(key)) continue;
      used.add(key);
      const q = r();
      const col = pal[Math.floor(r() * pal.length)] as LedColor;
      L.push({ x, y, col, kind: q < 0.22 ? 'steady' : q < 0.62 ? 'blink' : 'flick', rate: 0.4 + r() * 2.6, ph: r(), duty: 0.25 + r() * 0.55 });
    }
  }
  return { L, strip: lay.strip, sy: lay.sy };
}

const ledCache = new Map<string, LedSet>();
const leds = (o: Thing) => {
  let d = ledCache.get(o.id);
  if (!d) ledCache.set(o.id, (d = buildLeds(o)));
  return d;
};

const fract = (v: number) => v - Math.floor(v);

function drawLeds(g: Painter, o: Thing, t: number, reduce: boolean): void {
  const D = leds(o);
  const sk: LedColor = o.st === 'alarm' ? 'r' : o.st === 'inhibit' ? 'a' : 'c';
  for (const l of D.L) {
    const on = reduce
      ? l.kind !== 'flick'
      : l.kind === 'steady' ||
        (l.kind === 'blink' ? fract(t * l.rate + l.ph) < l.duty : fract(Math.sin((Math.floor(t * 12) + l.ph * 977) * 12.9898) * 43758.5453) > 0.45);
    if (!on) continue;
    const k: LedColor = l.col === 'r' && o.st !== 'alarm' ? (o.st === 'inhibit' ? 'a' : 'g') : l.col;
    g.rect(HALO2[k], l.x - 2, l.y - 2, 5, 5);
    g.rect(HALO1[k], l.x - 1, l.y - 1, 3, 3);
    g.rect(LEDC[k], l.x, l.y, 1, 1);
  }
  if (reduce) {
    for (const x of D.strip) g.rect(hexA(LEDC[sk], 0.35), x, D.sy, 2, 1);
    return;
  }
  const n = D.strip.length;
  const head = Math.floor(t * 12) % n;
  for (let d = 0; d < 4; d++) {
    const x = D.strip[(head - d + n) % n]!;
    g.rect(HALO2[sk], x - 1, D.sy - 1, 4, 3);
    g.rect(hexA(LEDC[sk], 0.9 - d * 0.22), x, D.sy, 2, 1);
  }
}

function pmColor(o: Thing, n: string, blink: boolean): string {
  if (o.id !== 'ETCH-07') return C.win;
  if (n === 'B') {
    if (S.etch === 'alarm') return blink ? C.red : C.redDim;
    if (S.etch === 'inhibit') return C.amber;
    return C.win;
  }
  return n === 'C' ? C.winDim : C.win;
}

function toolDyn(p: Painter, g: Painter, o: Thing, X: number, Y: number, t: number, reduce: boolean): void {
  const lay = layout(o);
  const blink = reduce || Math.floor(t * 2.5) % 2 === 0;
  for (const pm of lay.pms) {
    const col = pmColor(o, pm.n, blink);
    for (const [x, y, w, h] of pm.rects) p.rect(col, X + x, Y + y, w, h);
    txt(p, pm.n, X + pm.lx, Y + pm.ly, col);
    if (o.id === 'ETCH-07' && pm.n === 'B' && S.etch === 'alarm' && blink) {
      const [x, y, w, h] = pm.halo;
      g.rect(C.pmHalo, X + x, Y + y, w, h);
    }
  }
  for (const [x, y, w, h] of lay.glow) g.rect(C.screenGlow, X + x, Y + y, w, h);
  const lamps: [boolean, LedColor, number][] = [
    [o.st === 'alarm' && blink, 'r', lay.tower.ys[0]],
    [o.st === 'idle' || o.st === 'inhibit', 'a', lay.tower.ys[1]],
    [o.st === 'run', 'g', lay.tower.ys[2]],
  ];
  drawLeds(g, o, t, reduce);
  const px = X + lay.tower.x;
  for (const [lit, k, ly] of lamps) {
    if (!lit) continue;
    g.rect(HALO2[k], px - 3, Y + ly - 3, 9, 8);
    g.rect(HALO1[k], px - 1, Y + ly - 1, 5, 4);
    g.rect(LEDC[k], px, Y + ly, 3, 2);
  }
}

/** ETCH-07 告警時，腳下地板閃紅光。 */
export function floorGlow(p: Painter, o: Thing, X: number, Y: number, t: number, reduce: boolean): void {
  if (o.st !== 'alarm' || !(reduce || Math.floor(t * 2.5) % 2 === 0)) return;
  p.rect(C.alarmGlow, X - 6, Y - 10, o.w * TS + 12, o.h * TS + 16);
}

/** 物件不會變的部分：畫一次成貼圖。 */
export function objStatic(p: Painter, o: Thing, X: number, Y: number): void {
  if (isTool(o)) toolLayout(p, o, X, Y);
  else furnStatic(p, o, X, Y);
}

/** 物件會變的部分：每格重畫。p 是一般圖層，glow 是 ADD 混色的發光層。 */
export function objDyn(p: Painter, glow: Painter, o: Thing, X: number, Y: number, t: number, reduce: boolean): void {
  if (isTool(o)) toolDyn(p, glow, o, X, Y, t, reduce);
  else furnDyn(p, o, X, Y, t, reduce);
}
