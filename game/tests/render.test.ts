import { afterEach, expect, test } from 'bun:test';
import { newState, setState } from '../src/core/state';
import { OBJ, syncEtch, TS, type LookId } from '../src/data/world';
import { drawMap } from '../src/render/tiles';
import { GL, parseColor, txt, type Painter } from '../src/render/paint';
import { drawPerson, LOOK } from '../src/render/person';
import { C } from '../src/render/palette';
import { buildLeds, objDyn, objStatic, STATIC_PAD, toolGeo, VISUAL_TOP } from '../src/render/tools';
import { furnFaces, furnGeo } from '../src/render/furniture';
import type { Thing } from '../src/data/world';

type Rect = [string, number, number, number, number];
const recorder = (): Painter & { rects: Rect[] } => {
  const rects: Rect[] = [];
  return { rects, rect: (c, x, y, w, h) => void rects.push([c, x, y, w, h]) };
};
const inside = (rects: Rect[], w: number, h: number) =>
  rects.filter(([, x, y, rw, rh]) => x < 0 || y < 0 || x + rw > w || y + rh > h);

const TOOL_KINDS = ['etch', 'cvd', 'met', 'wet', 'stk', 'litho', 'track'];
const tools = () => OBJ.filter((o) => TOOL_KINDS.includes(o.kind));
/** 靜態圖實際塗到的像素（陰影是半透明，不算機身）。 */
const painted = (rects: Rect[]) => {
  const px = new Set<string>();
  for (const [c, x, y, w, h] of rects) {
    if (c.startsWith('rgba')) continue;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px.add(`${i},${j}`);
  }
  return px;
};
const staticAt = (o: (typeof OBJ)[number]) => {
  const p = recorder();
  objStatic(p, o, o.x * TS, o.y * TS);
  return p.rects;
};

afterEach(() => {
  setState(newState());
  syncEtch('alarm');
});

test('parseColor reads hex and rgba', () => {
  expect(parseColor('#ff4d45')).toEqual([0xff4d45, 1]);
  expect(parseColor('rgba(255,77,69,.14)')).toEqual([0xff4d45, 0.14]);
});

test('txt draws one pixel per lit glyph bit', () => {
  const p = recorder();
  txt(p, 'ETCH-07', 0, 0, '#fff');
  const bits = [...'ETCH-07'].reduce((n, ch) => n + [...GL[ch]!].filter((b) => b === '1').length, 0);
  expect(p.rects.length).toBe(bits);
  expect(p.rects.every(([, , , w, h]) => w === 1 && h === 1)).toBe(true);
});

test('every object’s static drawing fits its padded texture', () => {
  for (const o of OBJ) {
    const p = recorder();
    objStatic(p, o, STATIC_PAD.x, STATIC_PAD.top);
    expect(p.rects.length).toBeGreaterThan(0);
    const w = o.w * TS + STATIC_PAD.x * 2;
    const h = o.h * TS + STATIC_PAD.top + STATIC_PAD.bottom;
    expect({ id: o.id, outside: inside(p.rects, w, h) }).toEqual({ id: o.id, outside: [] });
  }
});

test('people fit a 16×24 sprite in every look, direction and frame', () => {
  for (const id of Object.keys(LOOK) as LookId[])
    for (const dir of ['up', 'down', 'left', 'right'] as const)
      for (const [fr, mv] of [[0, false], [0, true], [1, true]] as const) {
        const p = recorder();
        drawPerson(p, 0, 7, dir, fr, mv, LOOK[id]);
        expect(inside(p.rects, 16, 24)).toEqual([]);
      }
});

test('LEDs are deterministic, sit on the tool body and only ETCH-07 has red ones', () => {
  for (const o of OBJ.filter((x) => x.st)) {
    const a = buildLeds(o);
    expect(buildLeds(o)).toEqual(a);
    const X = o.x * TS;
    const W = o.w * TS;
    const body = painted(staticAt(o));
    const off = a.L.filter((l) => !body.has(`${l.x},${l.y}`)).map((l) => [l.x, l.y]);
    expect({ id: o.id, off }).toEqual({ id: o.id, off: [] });
    for (const x of a.strip) expect(x >= X && x < X + W).toBe(true);
    expect(a.L.some((l) => l.col === 'r')).toBe(o.id === 'ETCH-07');
  }
});

test('every tool shows a right side face inside its footprint', () => {
  for (const o of tools()) {
    const X = o.x * TS;
    const g = toolGeo(o, X, o.y * TS);
    expect({ id: o.id, wide: g.side >= 6 }).toEqual({ id: o.id, wide: true });
    const side = staticAt(o).filter(([c]) => c === C.tSide || c === C.tSide1);
    expect(side.length).toBeGreaterThan(0);
    for (const [, x, , w] of side) expect(x >= g.tx + g.sw && x + w <= X + o.w * TS).toBe(true);
  }
});

test('VISUAL_TOP is how far above its footprint each tool is drawn', () => {
  for (const o of tools()) {
    const Y = o.y * TS;
    const top = Math.min(...staticAt(o).filter(([c]) => !c.startsWith('rgba')).map(([, , y]) => y));
    expect({ id: o.id, top: Y - top }).toEqual({ id: o.id, top: VISUAL_TOP[o.kind]! });
  }
});

test('chamber frames and other moving parts are drawn on the tool body', () => {
  for (const o of tools()) {
    const body = painted(staticAt(o));
    const p = recorder();
    objDyn(p, recorder(), o, o.x * TS, o.y * TS, 0, true);
    const off = [...painted(p.rects)].filter((k) => !body.has(k));
    expect({ id: o.id, off }).toEqual({ id: o.id, off: [] });
  }
});

test('reduce motion freezes every animated part of ETCH-07', () => {
  const o = OBJ.find((x) => x.id === 'ETCH-07')!;
  const frame = (t: number) => {
    const p = recorder();
    const g = recorder();
    objDyn(p, g, o, o.x * TS, o.y * TS, t, true);
    return [p.rects, g.rects];
  };
  expect(frame(0.4)).toEqual(frame(0));
});

test('the map stays inside 736×448', () => {
  const p = recorder();
  drawMap(p);
  expect(inside(p.rects, 736, 448)).toEqual([]);
});

/** 每種家具一個樣本（放在 (2,3)）。 */
const BOXY: Thing[] = [
  { id: 'pc', kind: 'desk', x: 2, y: 3, w: 3, h: 1, pc: true, act: 'pc' },
  { id: 'f_table', kind: 'table', x: 2, y: 3, w: 5, h: 2 },
  { id: 'f_bench', kind: 'bench', x: 2, y: 3, w: 4, h: 1 },
  { id: 'f_bed', kind: 'bed', x: 2, y: 3, w: 3, h: 2 },
  { id: 'f_sofa', kind: 'sofa', x: 2, y: 3, w: 4, h: 1 },
  { id: 'f_booth', kind: 'booth', x: 2, y: 3, w: 4, h: 2 },
  { id: 'f_vending', kind: 'vending', x: 2, y: 3, w: 2, h: 1 },
  { id: 'locker', kind: 'locker', x: 2, y: 3, w: 7, h: 1, act: 'locker' },
  { id: 'coffee', kind: 'coffee', x: 2, y: 3, w: 1, h: 1, act: 'coffee' },
];
const FLAT: Thing[] = [
  { id: 'f_board', kind: 'board', x: 2, y: 3, w: 4, h: 1 },
  { id: 'f_screen', kind: 'screen', x: 2, y: 3, w: 6, h: 1 },
  { id: 'f_gate', kind: 'gate', x: 2, y: 3, w: 1, h: 1 },
];
const fits = (o: Thing) => {
  const p = recorder();
  objStatic(p, o, STATIC_PAD.x, STATIC_PAD.top);
  return inside(p.rects, o.w * TS + STATIC_PAD.x * 2, o.h * TS + STATIC_PAD.top + STATIC_PAD.bottom);
};
const drawnTop = (o: Thing) => o.y * TS - Math.min(...staticAt(o).filter(([c]) => !c.startsWith('rgba')).map(([, , y]) => y));

test('oblique furniture fits its texture, shows a side face, and VISUAL_TOP is its drawn height', () => {
  for (const o of BOXY) {
    expect({ id: o.id, outside: fits(o) }).toEqual({ id: o.id, outside: [] });
    const X = o.x * TS;
    const g = furnGeo(o, X, o.y * TS)!;
    const f = furnFaces(o.kind)!;
    const side = staticAt(o).filter(([c]) => c === f.side || c === f.side1);
    expect({ id: o.id, side: side.length > 0 }).toEqual({ id: o.id, side: true });
    for (const [, x, , w] of side) expect(x >= g.tx + g.sw && x + w <= X + o.w * TS).toBe(true);
    expect({ id: o.id, top: drawnTop(o) }).toEqual({ id: o.id, top: VISUAL_TOP[o.kind]! });
  }
});

test('flat furniture fits its texture and VISUAL_TOP is its drawn height', () => {
  for (const o of FLAT) {
    expect({ id: o.id, outside: fits(o) }).toEqual({ id: o.id, outside: [] });
    expect({ id: o.id, top: drawnTop(o) }).toEqual({ id: o.id, top: VISUAL_TOP[o.kind]! });
  }
});

test('the PC alert, the hanging suit and the coffee light are drawn on the furniture', () => {
  for (const o of BOXY.filter((x) => ['pc', 'locker', 'coffee'].includes(x.id))) {
    const body = painted(staticAt(o));
    const p = recorder();
    objDyn(p, recorder(), o, o.x * TS, o.y * TS, 1, false);
    expect({ id: o.id, drawn: p.rects.length > 0 }).toEqual({ id: o.id, drawn: true });
    const off = [...painted(p.rects)].filter((k) => !body.has(k));
    expect({ id: o.id, off }).toEqual({ id: o.id, off: [] });
  }
});
