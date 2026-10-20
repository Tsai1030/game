import { afterEach, expect, test } from 'bun:test';
import { newState, setState } from '../src/core/state';
import { OBJ, syncEtch, TS, type LookId } from '../src/data/world';
import { drawMap } from '../src/render/tiles';
import { GL, parseColor, txt, type Painter } from '../src/render/paint';
import { drawPerson, LOOK } from '../src/render/person';
import { buildLeds, objDyn, objStatic, STATIC_PAD } from '../src/render/tools';

type Rect = [string, number, number, number, number];
const recorder = (): Painter & { rects: Rect[] } => {
  const rects: Rect[] = [];
  return { rects, rect: (c, x, y, w, h) => void rects.push([c, x, y, w, h]) };
};
const inside = (rects: Rect[], w: number, h: number) =>
  rects.filter(([, x, y, rw, rh]) => x < 0 || y < 0 || x + rw > w || y + rh > h);

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

test('LEDs are deterministic, sit on the tool and only ETCH-07 has red ones', () => {
  for (const o of OBJ.filter((x) => x.st)) {
    const a = buildLeds(o);
    expect(buildLeds(o)).toEqual(a);
    const X = o.x * TS;
    const Y = o.y * TS;
    const W = o.w * TS;
    const H = o.h * TS;
    for (const l of a.L) {
      expect(l.x >= X && l.x < X + W).toBe(true);
      expect(l.y >= Y - 5 && l.y < Y + H).toBe(true);
    }
    for (const x of a.strip) expect(x >= X && x < X + W).toBe(true);
    expect(a.L.some((l) => l.col === 'r')).toBe(o.id === 'ETCH-07');
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
