import { expect, test } from 'bun:test';
import { LOOK } from '../src/data/looks';
import type { LookId } from '../src/data/world';
import { GL, parseColor, txt, type Painter } from '../src/render/paint';
import { PORTRAITS, type PortraitId } from '../src/render/portraits';

type Rect = [string, number, number, number, number];
const recorder = (): Painter & { rects: Rect[] } => {
  const rects: Rect[] = [];
  return { rects, rect: (c, x, y, w, h) => void rects.push([c, x, y, w, h]) };
};

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

test('Fang-jie, Amy and the guard have looks and 16×16 portraits', () => {
  for (const id of ['fang', 'amy', 'guard']) {
    expect(LOOK[id as LookId]).toBeDefined();
    const [rows] = PORTRAITS[id as PortraitId];
    expect(rows.length).toBe(16);
    expect(rows.every((r) => r.length === 16)).toBe(true);
  }
});
