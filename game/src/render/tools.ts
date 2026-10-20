import { hasClue, S } from '../core/state';
import { hashStr, rng } from '../core/random';
import { TS, type Thing } from '../data/world';
import { C, HALO1, HALO2, hexA, LEDC, type LedColor } from './palette';
import { disc, txt, txtW, type Painter } from './paint';

/** 靜態貼圖四周預留的空間（燈號塔高出機台 21 px、陰影向右下延伸）。 */
export const STATIC_PAD = { x: 6, top: 26, bottom: 6 } as const;

/** 物件畫面上高出佔地格的高度；點擊判定和頭上的箭頭都用這個。 */
export const VISUAL_TOP: Partial<Record<string, number>> = {
  etch: 24, cvd: 24, met: 24, wet: 24, stk: 24, litho: 24, track: 24, desk: 14, locker: 13, coffee: 11,
};

const isTool = (o: Thing) => o.kind === 'etch' || o.kind === 'cvd' || o.kind === 'met' || o.kind === 'wet' || o.kind === 'stk' || o.kind === 'litho' || o.kind === 'track';

/** 機台幾何：頂面（tx, ty, tw, th）與正面高度 FH。 */
function geo(o: Thing, X: number, Y: number) {
  const W = o.w * TS;
  const H = o.h * TS;
  const FH = o.kind === 'stk' ? 22 : 10;
  return { W, H, FH, tx: X + 1, ty: Y - 5, tw: W - 2, th: H + 4 - FH };
}

function chambers(o: Thing, X: number, Y: number): [string, number, number][] {
  const { tx, ty, tw } = geo(o, X, Y);
  const cx = tx + (tw >> 1);
  const cy = ty + 21;
  return o.kind === 'etch'
    ? [['A', cx - 25, cy - 3], ['B', cx - 17, cy - 19], ['C', cx + 3, cy - 19], ['D', cx + 11, cy - 3]]
    : [['A', cx - 25, cy - 3], ['B', cx - 7, cy - 19], ['C', cx + 11, cy - 3]];
}

const foupCount = (o: Thing) => (o.kind === 'etch' || o.kind === 'cvd' ? 3 : o.kind === 'wet' || o.kind === 'met' ? 1 : 0);

function toolStatic(p: Painter, o: Thing, X: number, Y: number): void {
  const { W, H, FH, tx, ty, tw, th } = geo(o, X, Y);
  const stk = o.kind === 'stk';
  p.rect(C.shadow, X + 3, Y + H - 2, W, 4);
  p.rect(C.line, X, Y - 6, W, H + 6);
  p.rect(o.kind === 'litho' ? C.tTopWarm : C.tTop, tx, ty, tw, th);
  p.rect(C.tRim, tx, ty, tw, 1);
  p.rect(C.tRim, tx, ty, 1, th);
  p.rect(C.tRim2, tx + tw - 1, ty, 1, th);
  p.rect(C.tFront, tx, Y + H - FH, tw, FH - 1);
  p.rect(C.tFront2, tx, Y + H - FH, tw, 1);
  if (o.kind === 'etch' || o.kind === 'cvd') {
    const cx = tx + (tw >> 1);
    const cy = ty + 21;
    p.rect(C.tPanel, tx + 4, ty + th - 9, tw - 8, 7);
    p.rect(C.tPanel2, cx - 2, ty + th - 7, 4, 3);
    p.rect(C.line, cx - 7, cy - 6, 14, 13);
    p.rect(C.tPanel, cx - 6, cy - 5, 12, 11);
    p.rect(C.tPanel2, cx - 1, cy - 3, 2, 7);
    for (const [, x, y] of chambers(o, X, Y)) {
      p.rect(C.line, x, y, 14, 11);
      p.rect(C.tPanel, x + 1, y + 1, 12, 9);
    }
  } else if (o.kind === 'wet') {
    for (let k = 0; k < 5; k++) {
      const x = tx + 5 + k * 18;
      p.rect(C.line, x, ty + 4, 15, 12);
      p.rect(C.liquid, x + 1, ty + 5, 13, 10);
      p.rect(C.glassHi, x + 2, ty + 6, 4, 1);
    }
    p.rect(C.tPanel2, tx + 4, ty + th - 4, tw - 8, 2);
  } else if (o.kind === 'met') {
    disc(p, tx + 22, ty + 18, 9, C.tRim);
    disc(p, tx + 22, ty + 18, 8, C.tPanel);
    disc(p, tx + 22, ty + 18, 4, C.tDark);
    p.rect(C.line, tx + 38, ty + 8, 18, 13);
    p.rect(C.screen, tx + 39, ty + 9, 16, 11);
    p.rect(C.tDark, tx + 41, ty + 12, 10, 1);
    p.rect(C.red, tx + 41, ty + 15, 6, 1);
  } else if (o.kind === 'litho') {
    p.rect(C.line, tx + 8, ty + 6, 22, 12);
    p.rect(C.tDark, tx + 9, ty + 7, 20, 10);
    p.rect(C.amber, tx + 11, ty + 9, 4, 1);
    disc(p, tx + 52, ty + 19, 11, C.tRim);
    disc(p, tx + 52, ty + 19, 10, C.tPanel);
    disc(p, tx + 52, ty + 19, 5, C.tDark);
    p.rect(C.line, tx + 74, ty + 6, 30, 28);
    p.rect(C.tPanel, tx + 75, ty + 7, 28, 26);
    disc(p, tx + 89, ty + 20, 9, C.tWafer);
  } else if (o.kind === 'track') {
    for (let k = 0; k < 4; k++) {
      const x = tx + 13 + k * 22;
      disc(p, x, ty + 15, 8, C.tRim);
      disc(p, x, ty + 15, 7, C.tPanel);
      disc(p, x, ty + 15, 4, C.tWafer);
    }
    for (let k = 0; k < 4; k++) p.rect(C.redDim, tx + 6 + k * 22, ty + th - 6, 14, 2);
  } else if (stk) {
    for (let k = 0; k < 5; k++) p.rect(C.tPanel, tx + 3, ty + 6 + k * 10, tw - 6, 1);
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 5; k++) {
        const x = tx + 3 + k * 12;
        const y = Y + H - FH + 3 + r * 9;
        p.rect(C.line, x, y, 9, 7);
        p.rect(C.pod, x + 1, y + 1, 7, 5);
      }
  }
  const foups = foupCount(o);
  for (let k = 0; k < foups; k++) {
    const x = X + 5 + k * 11;
    p.rect(C.line, x, Y + H - FH - 4, 10, 9);
    p.rect(C.pod, x + 1, Y + H - FH - 3, 8, 7);
    p.rect(C.line, x + 2, Y + H - FH - 1, 6, 1);
  }
  const lx0 = X + 5 + foups * 11;
  const lx = stk ? X + ((W - txtW(o.id)) >> 1) : lx0 + ((X + W - 6 - lx0 - txtW(o.id)) >> 1);
  txt(p, o.id, lx, stk ? ty + th - 9 : Y + H - FH + 2, C.tLabel);
  const px = X + W - 7;
  p.rect(C.line, px + 1, Y - 14, 1, 9);
  p.rect(C.line, px - 1, Y - 21, 5, 8);
  for (const ly of [Y - 20, Y - 18, Y - 16]) p.rect(C.off, px, ly, 3, 2);
}

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

function ledZones(o: Thing, tx: number, ty: number, tw: number, th: number): [number, number, number, number][] {
  switch (o.kind) {
    case 'etch':
    case 'cvd':
      return [[tx + 2, ty + 2, 9, th - 12], [tx + tw - 11, ty + 2, 8, th - 12], [tx + 6, ty + th - 8, tw - 12, 1], [tx + 37, ty + 2, 4, 8]];
    case 'wet':
      return [[tx + 3, ty + 1, tw - 6, 2], [tx + 3, ty + 18, tw - 6, 3]];
    case 'met':
      return [[tx + 2, ty + 30, tw - 6, 8], [tx + 36, ty + 23, 22, 5], [tx + 2, ty + 2, 8, 6]];
    case 'litho':
      return [[tx + 3, ty + 21, 30, 16], [tx + 66, ty + 2, 6, 36], [tx + 3, ty + 1, tw - 8, 2], [tx + 40, ty + 33, 26, 4]];
    case 'track':
      return [[tx + 3, ty + 26, tw - 6, 7], [tx + 3, ty + 1, tw - 6, 3]];
    default:
      return [[tx + 3, ty + 3, tw - 6, 44]];
  }
}

/** 每台機台用自己的 ID 當種子，產生固定的 LED 配置；只有 ETCH-07 會有紅燈。 */
export function buildLeds(o: Thing): LedSet {
  const X = o.x * TS;
  const Y = o.y * TS;
  const { W, H, tx, ty, tw, th } = geo(o, X, Y);
  const r = rng(hashStr(o.id));
  const pal = (o.id === 'ETCH-07' ? 'ggcccbwarrr' : 'gggcccbbwa') as string;
  const L: Led[] = [];
  const used = new Set<number>();
  for (const [zx, zy, zw, zh] of ledZones(o, tx, ty, tw, th)) {
    const n = Math.min(50, Math.max(3, Math.round((zw * zh) / 10)));
    for (let k = 0; k < n; k++) {
      const x = zx + Math.floor(r() * zw);
      const y = zy + Math.floor(r() * zh);
      const key = x * 7919 + y;
      if (used.has(key)) continue;
      used.add(key);
      // 取亂數的順序與原型相同，LED 排列才會一致。
      const q = r();
      const col = pal[Math.floor(r() * pal.length)] as LedColor;
      L.push({ x, y, col, kind: q < 0.22 ? 'steady' : q < 0.62 ? 'blink' : 'flick', rate: 0.4 + r() * 2.6, ph: r(), duty: 0.25 + r() * 0.55 });
    }
  }
  const strip: number[] = [];
  for (let x = X + 3; x < X + W - 3; x += 3) strip.push(x);
  return { L, strip, sy: Y + H - 2 };
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
  const { W, tx, ty } = geo(o, X, Y);
  const blink = reduce || Math.floor(t * 2.5) % 2 === 0;
  if (o.kind === 'etch' || o.kind === 'cvd') {
    for (const [n, x, y] of chambers(o, X, Y)) {
      const col = pmColor(o, n, blink);
      p.rect(col, x + 1, y + 1, 12, 1);
      p.rect(col, x + 1, y + 9, 12, 1);
      p.rect(col, x + 1, y + 1, 1, 9);
      p.rect(col, x + 12, y + 1, 1, 9);
      txt(p, n, x + 5, y + 3, col);
      if (o.id === 'ETCH-07' && n === 'B' && S.etch === 'alarm' && blink) g.rect(C.pmHalo, x - 3, y - 3, 20, 17);
    }
  } else if (o.kind === 'met') {
    g.rect(C.screenGlow, tx + 35, ty + 5, 24, 19);
  }
  const px = X + W - 7;
  const lamps: [boolean, LedColor, number][] = [
    [o.st === 'alarm' && blink, 'r', Y - 20],
    [o.st === 'idle' || o.st === 'inhibit', 'a', Y - 18],
    [o.st === 'run', 'g', Y - 16],
  ];
  drawLeds(g, o, t, reduce);
  for (const [lit, k, ly] of lamps) {
    if (!lit) continue;
    g.rect(HALO2[k], px - 3, ly - 3, 9, 8);
    g.rect(HALO1[k], px - 1, ly - 1, 5, 4);
    g.rect(LEDC[k], px, ly, 3, 2);
  }
}

/** ETCH-07 告警時，腳下地板閃紅光。 */
export function floorGlow(p: Painter, o: Thing, X: number, Y: number, t: number, reduce: boolean): void {
  if (o.st !== 'alarm' || !(reduce || Math.floor(t * 2.5) % 2 === 0)) return;
  p.rect(C.alarmGlow, X - 6, Y - 10, o.w * TS + 12, o.h * TS + 16);
}

function deskMonitorX(o: Thing, X: number): number {
  return X + ((o.w * TS) >> 1) - 7;
}

/** 物件不會變的部分：畫一次成貼圖。 */
export function objStatic(p: Painter, o: Thing, X: number, Y: number): void {
  const W = o.w * TS;
  if (isTool(o)) return toolStatic(p, o, X, Y);
  switch (o.kind) {
    case 'desk': {
      p.rect(C.shadow, X + 2, Y + 12, W, 3);
      p.rect(C.line, X, Y - 2, W, 16);
      p.rect(C.wood, X + 1, Y - 1, W - 2, 9);
      p.rect(C.wood2, X + 1, Y + 8, W - 2, 5);
      if (o.id === 'desk2')
        for (let k = 0; k < 3; k++) {
          p.rect(C.line, X + 3 + k * 5, Y, 4, 5);
          p.rect(C.white, X + 4 + k * 5, Y + 1, 2, 3);
        }
      if (o.pc) {
        const mx = deskMonitorX(o, X);
        p.rect(C.line, mx, Y - 13, 14, 12);
        p.rect(C.mon, mx + 1, Y - 12, 12, 10);
        p.rect(C.screen, mx + 2, Y - 11, 10, 7);
        p.rect(C.line, mx + 6, Y - 1, 2, 1);
        p.rect(C.front, mx - 1, Y + 2, 16, 3);
        p.rect(C.line, mx - 1, Y + 5, 16, 1);
      }
      return;
    }
    case 'locker': {
      p.rect(C.line, X, Y - 12, W, 27);
      p.rect(C.metal, X + 1, Y - 11, W - 2, 25);
      for (let x = X + 16; x < X + W - 1; x += 16) p.rect(C.metal2, x, Y - 11, 1, 25);
      for (let x = X + 12; x < X + W; x += 16) p.rect(C.line, x, Y - 1, 1, 3);
      for (let x = X + 4; x < X + W - 6; x += 16) for (let k = 0; k < 3; k++) p.rect(C.metal2, x, Y - 8 + k * 2, 6, 1);
      p.rect(C.line, X + 33, Y - 10, 14, 23);
      return;
    }
    case 'coffee':
      p.rect(C.shadow, X + 3, Y + 13, 12, 3);
      p.rect(C.line, X + 2, Y - 10, 12, 25);
      p.rect(C.metal, X + 3, Y - 9, 10, 23);
      p.rect(C.screen, X + 5, Y - 7, 6, 3);
      p.rect(C.redDim, X + 10, Y - 2, 2, 2);
      p.rect(C.line, X + 5, Y + 3, 6, 6);
      p.rect(C.white, X + 6, Y + 5, 4, 4);
      return;
    case 'plant':
      p.rect(C.shadow, X + 3, Y + 13, 10, 3);
      disc(p, X + 8, Y + 1, 6, C.line);
      disc(p, X + 8, Y + 1, 5, C.leaf);
      disc(p, X + 6, Y - 1, 2, C.leaf2);
      disc(p, X + 10, Y + 2, 2, C.leaf2);
      p.rect(C.line, X + 3, Y + 6, 10, 9);
      p.rect(C.pot, X + 4, Y + 7, 8, 7);
      return;
    case 'bench':
      p.rect(C.shadow, X + 2, Y + 12, W, 3);
      p.rect(C.line, X, Y + 2, W, 10);
      p.rect(C.wood, X + 1, Y + 3, W - 2, 5);
      p.rect(C.wood2, X + 1, Y + 8, W - 2, 3);
      return;
    default:
      return;
  }
}

/** 物件會變的部分：每格重畫。p 是一般圖層，glow 是 ADD 混色的發光層。 */
export function objDyn(p: Painter, glow: Painter, o: Thing, X: number, Y: number, t: number, reduce: boolean): void {
  if (isTool(o)) return toolDyn(p, glow, o, X, Y, t, reduce);
  if (o.kind === 'desk' && o.id === 'pc' && !hasClue('spc') && (reduce || Math.floor(t * 2) % 2 === 0)) {
    p.rect(C.red, deskMonitorX(o, X) + 2, Y - 11, 10, 7);
  } else if (o.kind === 'locker' && !S.suit) {
    p.rect(C.suit, X + 36, Y - 8, 8, 18);
    p.rect(C.suit2, X + 39, Y - 8, 2, 18);
    p.rect(C.visor, X + 37, Y - 6, 6, 2);
  } else if (o.kind === 'coffee' && !reduce && Math.floor(t) % 2 === 1) {
    p.rect(C.red, X + 10, Y - 2, 2, 2);
  }
}
