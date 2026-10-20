import { expect, test } from 'bun:test';
import { applySanity, FORCED_LEAVE_SANITY, halve, SANITY_START, zeroOutcome } from '../src/systems/sanity';

test('constants match the spec', () => {
  expect(SANITY_START).toBe(80);
  expect(FORCED_LEAVE_SANITY).toBe(40);
});

test('a recognized loss is halved and rounded toward zero', () => {
  expect(halve(-10)).toBe(-5);
  expect(halve(-15)).toBe(-7);
  expect(halve(-5)).toBe(-2);
  expect(halve(3)).toBe(3);
});

test('applySanity clamps and reports hitting zero', () => {
  expect(applySanity(80, -10, true)).toEqual({ value: 75, hitZero: false });
  expect(applySanity(80, -10)).toEqual({ value: 70, hitZero: false });
  expect(applySanity(98, 5).value).toBe(100);
  expect(applySanity(5, -12)).toEqual({ value: 0, hitZero: true });
});

test('the first zero is forced leave, later ones are burnout', () => {
  expect(zeroOutcome(0)).toBe('forcedLeave');
  expect(zeroOutcome(1)).toBe('burnout');
});
