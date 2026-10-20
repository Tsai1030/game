/** 遊戲世界配色（夜班，固定，不跟介面的深淺色走）。數值沿用 mockups/rpg-fab.html。 */
export const C = {
  bg: '#050507',
  line: '#0a0910',
  shadow: 'rgba(0,0,0,.45)',
  wall: '#242136',
  wallTop: '#34304a',
  wallEdge: '#4a4566',
  carpet: '#1a1d30',
  carpet2: '#22263d',
  fab: '#1a1922',
  fab2: '#25232f',
  fabDot: '#302e3e',
  yel: '#2e2712',
  yel2: '#3d3318',
  yelDot: '#4d401f',
  yelText: '#6b5a2a',
  gown: '#122028',
  gown2: '#1b2e37',
  glass: '#24485a',
  glassHi: '#7fd0e0',
  grate: '#2b2e3e',
  grate2: '#3d4156',
  rail: '#5a5574',
  board: '#d9dbe6',
  front: '#8e93a8',
  win: '#5fd0e0',
  winDim: '#5c6178',
  red: '#ff4d45',
  redDim: '#6a2329',
  amber: '#f2b544',
  green: '#6bd05a',
  off: '#34304a',
  pod: '#2fa39c',
  wood: '#8a6142',
  wood2: '#5e3f2b',
  screen: '#7fd0e0',
  mon: '#202338',
  leaf: '#2f6b2a',
  leaf2: '#4c9a37',
  pot: '#7a4029',
  metal: '#5a6482',
  metal2: '#434b66',
  skin: '#f2c9a0',
  suit: '#f4f5ff',
  suit2: '#b9bdd6',
  visor: '#2a2d50',
  glove: '#3d6fd6',
  liquid: '#3a8fb8',
  white: '#ffffff',
  accent: '#5fd0c4',
  // 機台：黑色機身＋邊光
  tTop: '#0c0d12',
  tTopWarm: '#100f0c',
  tRim: '#3a3f5a',
  tRim2: '#1e2130',
  tFront: '#07080b',
  tFront2: '#2a2e42',
  tPanel: '#161821',
  tPanel2: '#242736',
  tDark: '#040507',
  tLabel: '#7f87a6',
  tWafer: '#4c5066',
  alarmGlow: 'rgba(255,77,69,.14)',
  pmHalo: 'rgba(255,77,69,.22)',
  screenGlow: 'rgba(95,240,255,.08)',
} as const;

export type LedColor = 'g' | 'c' | 'a' | 'b' | 'r' | 'w';

/** LED 顏色：綠、青、琥珀、藍、紅、白。 */
export const LEDC: Record<LedColor, string> = {
  g: '#5dff7a',
  c: '#5ff0ff',
  a: '#ffc04a',
  b: '#6b9bff',
  r: '#ff4d45',
  w: '#e8f0ff',
};

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** LED 外圈與內圈的光暈色。 */
export const HALO1 = Object.fromEntries(Object.entries(LEDC).map(([k, v]) => [k, hexA(v, 0.35)])) as Record<LedColor, string>;
export const HALO2 = Object.fromEntries(Object.entries(LEDC).map(([k, v]) => [k, hexA(v, 0.12)])) as Record<LedColor, string>;
