import type { Pt } from '../systems/path';
import { TS, type Thing } from '../data/world';
import { C } from './palette';
import type { Painter } from './paint';
import { VISUAL_TOP } from './tools';

/** 天車軌道（Fab 走道上方的一圈）與兩台天車。減少動態效果時天車停在固定位置。 */
export function drawOht(p: Painter, t: number, reduce: boolean): void {
  const x0 = 264;
  const x1 = 696;
  const y0 = 136;
  const y1 = 264;
  const w = x1 - x0;
  const h = y1 - y0;
  const Lp = 2 * (w + h);
  p.rect(C.rail, x0, y0 - 1, w + 1, 2);
  p.rect(C.rail, x0, y1 - 1, w + 1, 2);
  p.rect(C.rail, x0 - 1, y0, 2, h);
  p.rect(C.rail, x1 - 1, y0, 2, h);
  [0, Lp / 2].forEach((off, k) => {
    let d = ((reduce ? 120 : t * 28) + off) % Lp;
    let x: number;
    let y: number;
    if (d < w) {
      x = x0 + d;
      y = y0;
    } else if ((d -= w) < h) {
      x = x1;
      y = y0 + d;
    } else if ((d -= h) < w) {
      x = x1 - d;
      y = y1;
    } else {
      d -= w;
      x = x0;
      y = y1 - d;
    }
    x = Math.round(x);
    y = Math.round(y);
    p.rect(C.shadow, x - 6, y + 9, 12, 3);
    p.rect(C.line, x - 6, y - 5, 12, 10);
    p.rect(C.tPanel, x - 5, y - 4, 10, 8);
    p.rect(C.tRim, x - 5, y - 4, 10, 1);
    p.rect(C.tFront, x - 5, y + 2, 10, 2);
    p.rect(C.amber, x + 2, y - 3, 2, 2);
    if (k === 0) p.rect(C.pod, x - 4, y - 2, 5, 4);
  });
}

/** 可互動物件頭上的黃色箭頭。 */
export function drawArrow(p: Painter, o: Thing, t: number, reduce: boolean): void {
  const ox = o.x * TS + o.w * 8;
  const oy = o.y * TS - (o.npc ? 18 : (VISUAL_TOP[o.kind] ?? 6) + 12) + (reduce ? 0 : Math.floor(t * 3) % 2);
  p.rect(C.line, ox - 5, oy - 1, 11, 1);
  for (let k = 0; k < 5; k++) p.rect(C.line, ox - 5 + k, oy + k, 11 - 2 * k, 1);
  for (let k = 0; k < 4; k++) p.rect(C.amber, ox - 4 + k, oy + k, 9 - 2 * k, 1);
}

/** 點地板之後的目的地框。 */
export function drawMarker(p: Painter, pt: Pt): void {
  const X = pt.x * TS;
  const Y = pt.y * TS;
  p.rect(C.accent, X + 1, Y + 1, 14, 2);
  p.rect(C.accent, X + 1, Y + 13, 14, 2);
  p.rect(C.accent, X + 1, Y + 1, 2, 14);
  p.rect(C.accent, X + 13, Y + 1, 2, 14);
}
