import { hasClue, S } from '../core/state';
import { TS, type Thing } from '../data/world';
import { C, FACES_FABRIC, FACES_METAL, FACES_WOOD } from './palette';
import { boxGeo, drawBox, surface, type Faces, type Geo } from './oblique';
import { disc, type Painter } from './paint';

type BoxKind = 'desk' | 'table' | 'bench' | 'bed' | 'sofa' | 'booth' | 'vending' | 'locker' | 'coffee';

/** 斜角家具：正面高 hz、頂面高出佔地格 lift、配色。 */
const BOX: Record<BoxKind, { hz: number; lift: number; faces: Faces }> = {
  desk: { hz: 8, lift: 6, faces: FACES_WOOD },
  table: { hz: 8, lift: 6, faces: FACES_WOOD },
  bench: { hz: 6, lift: 2, faces: FACES_WOOD },
  bed: { hz: 8, lift: 4, faces: FACES_WOOD },
  sofa: { hz: 9, lift: 6, faces: FACES_FABRIC },
  booth: { hz: 20, lift: 10, faces: FACES_METAL },
  vending: { hz: 26, lift: 16, faces: FACES_METAL },
  locker: { hz: 22, lift: 12, faces: FACES_METAL },
  coffee: { hz: 20, lift: 10, faces: FACES_METAL },
};

const isBox = (o: Thing): o is Thing & { kind: BoxKind } => o.kind in BOX;

/** 螢幕高出桌面最後一列的距離（含外框）。 */
const MONITOR = 10;

/**
 * 家具畫面上高出佔地格的高度。方塊家具是 lift + 1（頂面外框），
 * 桌子另外加上螢幕；平面家具（白板、投影幕、閘門）是各自的高度。
 */
export const FURN_TOP: Partial<Record<string, number>> = {
  ...Object.fromEntries(Object.entries(BOX).map(([k, d]) => [k, d.lift + 1])),
  desk: BOX.desk.lift + MONITOR,
  board: 12,
  screen: 10,
  gate: 6,
};

export const furnGeo = (o: Thing, X = 0, Y = 0): Geo | null => (isBox(o) ? boxGeo(o, BOX[o.kind], X, Y) : null);
export const furnFaces = (kind: string): Faces | null => BOX[kind as BoxKind]?.faces ?? null;

/** 桌上螢幕的左上角（外框）。 */
function monitorAt(o: Thing, X: number, Y: number): [number, number] {
  const g = boxGeo(o, BOX.desk, X, Y);
  const [x, y] = surface(g).pt((g.sw >> 1) - 7, 2);
  return [x, y - 12];
}

/** 咖啡機的指示燈位置。 */
function coffeeLed(o: Thing, X: number, Y: number): [number, number] {
  const g = boxGeo(o, BOX.coffee, X, Y);
  return [g.tx + 9, g.fy + 8];
}

/** 置物櫃打開的那一格（掛著無塵衣）。 */
const lockerSlot = (X: number, Y: number) => {
  const g = boxGeo({ id: '', kind: 'locker', x: 0, y: 0, w: 7, h: 1 }, BOX.locker, X, Y);
  return { x: X + 33, y: g.fy + 1, h: g.hz - 4 };
};

function boxParts(p: Painter, o: Thing & { kind: BoxKind }, X: number, Y: number): void {
  const g = boxGeo(o, BOX[o.kind], X, Y);
  const s = surface(g);
  const { tx, sw, T, fy, hz } = g;
  drawBox(p, g, s, BOX[o.kind].faces, C.shadow, C.shadow2);
  switch (o.kind) {
    case 'desk': {
      if (o.id === 'desk2') for (let k = 0; k < 3; k++) s.rect(p, C.white, 2 + k * 5, 4, 3, 4);
      if (!o.pc) return;
      s.rect(p, C.keyboard, (sw >> 1) - 5, 8, 10, 2);
      const [mx, my] = monitorAt(o, X, Y);
      p.rect(C.line, mx, my, 14, 12);
      p.rect(C.mon, mx + 1, my + 1, 12, 10);
      p.rect(C.screen, mx + 2, my + 2, 10, 7);
      p.rect(C.line, mx + 6, my + 12, 2, 1);
      return;
    }
    case 'bed':
      s.rect(p, C.pillow, 2, 2, Math.min(14, sw - 4), 5);
      s.rect(p, C.blanket, 1, 9, sw - 2, T - 10);
      s.rect(p, C.blanket2, 1, 9, sw - 2, 2);
      return;
    case 'sofa':
      s.rect(p, C.sofaBack, 0, 0, sw, 4);
      for (let u = 15; u < sw - 2; u += 16) s.rect(p, C.line, u, 5, 1, T - 6);
      return;
    case 'booth':
      p.rect(C.line, tx + 3, fy + 2, sw - 6, 10);
      p.rect(C.glass, tx + 4, fy + 3, sw - 8, 8);
      p.rect(C.glassHi, tx + 6, fy + 4, 6, 1);
      p.rect(C.metal, tx + 2, fy + 13, sw - 4, 2);
      return;
    case 'vending':
      p.rect(C.line, tx + 2, fy + 2, sw - 11, 16);
      p.rect(C.tGlass, tx + 3, fy + 3, sw - 13, 14);
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 4; k++) p.rect([C.can1, C.can2, C.can3][(r + k) % 3]!, tx + 4 + k * 4, fy + 4 + r * 5, 2, 3);
      p.rect(C.line, tx + sw - 8, fy + 3, 6, 10);
      for (let k = 0; k < 3; k++) p.rect(C.keyboard, tx + sw - 7, fy + 4 + k * 3, 4, 1);
      p.rect(C.line, tx + 3, fy + 20, sw - 13, 3);
      return;
    case 'locker': {
      for (let x = tx + 15; x < tx + sw - 1; x += 16) {
        p.rect(C.line, x, fy + 1, 1, hz - 4);
        p.rect(FACES_METAL.faceHi, x + 1, fy + 1, 1, hz - 4);
      }
      for (let x = tx + 3; x < tx + sw - 6; x += 16) for (let k = 0; k < 3; k++) p.rect(FACES_METAL.faceLo, x, fy + 3 + k * 2, 6, 1);
      for (let x = tx + 11; x < tx + sw; x += 16) p.rect(C.line, x, fy + 10, 1, 3);
      const slot = lockerSlot(X, Y);
      p.rect(C.line, slot.x, slot.y, 14, slot.h);
      return;
    }
    case 'coffee': {
      p.rect(C.screen, tx + 3, fy + 2, 6, 3);
      const [lx, ly] = coffeeLed(o, X, Y);
      p.rect(C.redDim, lx, ly, 2, 2);
      p.rect(C.line, tx + 3, fy + 12, 6, 6);
      p.rect(C.white, tx + 4, fy + 14, 4, 4);
      return;
    }
    default:
      return;
  }
}

/** 家具不會變的部分：畫一次成貼圖。 */
export function furnStatic(p: Painter, o: Thing, X: number, Y: number): void {
  const W = o.w * TS;
  if (isBox(o)) return boxParts(p, o, X, Y);
  switch (o.kind) {
    case 'plant':
      p.rect(C.shadow, X + 3, Y + 13, 10, 3);
      disc(p, X + 8, Y + 1, 6, C.line);
      disc(p, X + 8, Y + 1, 5, C.leaf);
      disc(p, X + 6, Y - 1, 2, C.leaf2);
      disc(p, X + 10, Y + 2, 2, C.leaf2);
      p.rect(C.line, X + 3, Y + 6, 10, 9);
      p.rect(C.pot, X + 4, Y + 7, 8, 7);
      return;
    case 'board':
      // 有腳架的白板，立在地上。
      p.rect(C.shadow, X + 2, Y + 12, W - 2, 3);
      p.rect(C.line, X + 3, Y - 2, 1, 15);
      p.rect(C.line, X + W - 4, Y - 2, 1, 15);
      p.rect(C.line, X + 1, Y - 12, W - 2, 14);
      p.rect(C.board, X + 2, Y - 11, W - 4, 12);
      p.rect(C.red, X + 5, Y - 8, 18, 1);
      p.rect(C.glove, X + 5, Y - 5, 28, 1);
      p.rect(C.glove, X + 26, Y - 8, 20, 1);
      p.rect(C.line, X + 5, Y - 2, 12, 1);
      return;
    case 'screen':
      // 掛在牆上的投影幕。
      p.rect(C.metal2, X, Y - 10, W, 2);
      p.rect(C.line, X + 1, Y - 8, W - 2, 16);
      p.rect(C.screenW, X + 2, Y - 8, W - 4, 14);
      return;
    case 'gate':
      // 閘門：一根立柱、一支橫桿、頂上的綠燈。
      p.rect(C.shadow, X + 3, Y + 13, 10, 3);
      p.rect(C.line, X + 3, Y - 6, 10, 20);
      p.rect(C.metal, X + 4, Y - 5, 8, 18);
      p.rect(C.green, X + 6, Y - 4, 4, 2);
      p.rect(C.metal2, X + 12, Y + 2, 4, 2);
      return;
    default:
      return;
  }
}

/** 家具會變的部分：PE 工作站的告警畫面、置物櫃裡的無塵衣、咖啡機的燈。 */
export function furnDyn(p: Painter, o: Thing, X: number, Y: number, t: number, reduce: boolean): void {
  if (o.kind === 'desk' && o.id === 'pc' && !hasClue('spc') && (reduce || Math.floor(t * 2) % 2 === 0)) {
    const [mx, my] = monitorAt(o, X, Y);
    p.rect(C.red, mx + 2, my + 2, 10, 7);
  } else if (o.kind === 'locker' && !S.suit) {
    const slot = lockerSlot(X, Y);
    p.rect(C.suit, slot.x + 3, slot.y + 1, 8, slot.h - 2);
    p.rect(C.suit2, slot.x + 6, slot.y + 1, 2, slot.h - 2);
    p.rect(C.visor, slot.x + 4, slot.y + 3, 6, 2);
  } else if (o.kind === 'coffee' && !reduce && Math.floor(t) % 2 === 1) {
    const [lx, ly] = coffeeLed(o, X, Y);
    p.rect(C.red, lx, ly, 2, 2);
  }
}
