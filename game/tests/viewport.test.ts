import { expect, test } from 'bun:test';
import { computeViewport } from '../src/game/viewport';

test('zoom steps up at 840 and 1500 px', () => {
  expect(computeViewport(1500, 900).zoom).toBe(4);
  expect(computeViewport(1499, 900).zoom).toBe(3);
  expect(computeViewport(840, 900).zoom).toBe(3);
  expect(computeViewport(839, 900).zoom).toBe(2);
});

test('a phone-width stage fits without overflowing', () => {
  const v = computeViewport(360, 740);
  expect(v.zoom).toBe(2);
  expect(v.w).toBe(180);
  expect(v.w * v.zoom).toBeLessThanOrEqual(360);
  expect(v.h * v.zoom).toBeLessThanOrEqual(440);
});

test('the view never exceeds the map', () => {
  const v = computeViewport(5000, 5000);
  expect(v.w).toBeLessThanOrEqual(736);
  expect(v.h).toBeLessThanOrEqual(448);
});
