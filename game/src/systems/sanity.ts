export const SANITY_START = 80;
export const SANITY_MAX = 100;
/** 第一次歸零（強制請假）後回到的理智值。 */
export const FORCED_LEAVE_SANITY = 40;

/** 辨識正確時的損失：減半並無條件捨去（往 0 取整）；回復不受影響。 */
export function halve(delta: number): number {
  return delta < 0 ? Math.ceil(delta / 2) : delta;
}

export function applySanity(cur: number, delta: number, recognized = false): { value: number; hitZero: boolean } {
  const d = recognized ? halve(delta) : delta;
  const value = Math.max(0, Math.min(SANITY_MAX, cur + d));
  return { value, hitZero: value === 0 };
}

/** 第一次歸零是強制請假，之後是燃盡結局。 */
export function zeroOutcome(zeroCount: number): 'forcedLeave' | 'burnout' {
  return zeroCount === 0 ? 'forcedLeave' : 'burnout';
}
