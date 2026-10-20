export const COFFEE_MAX = 5;
/** 每 2 分鐘（真實時間）扣 1 杯。 */
export const COFFEE_DECAY_MS = 120_000;

export function drink(c: number): { coffee: number; ok: boolean } {
  return c >= COFFEE_MAX ? { coffee: c, ok: false } : { coffee: c + 1, ok: true };
}

export function decay(c: number): number {
  return Math.max(0, c - 1);
}
