import type { Faces } from './oblique';

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
  // 機台：黑色機身＋邊光（舊零件色，OHT 也用）
  tRim: '#3a3f5a',
  tFront: '#07080b',
  tPanel: '#161821',
  tDark: '#040507',
  tLabel: '#7f87a6',
  tWafer: '#4c5066',
  // 斜角機台的各面：光從左上來，頂面最亮、右側面次之、正面最暗。
  tLine: '#040407',
  tTop0: '#141722',
  tTop1: '#181b28',
  tTop2: '#1d2130',
  tRimHi: '#3e4560',
  tEdge: '#7a83a8',
  tFace: '#0a0b11',
  tFace1: '#12141d',
  tFaceHi: '#1d2030',
  tFaceLo: '#040507',
  tKick: '#030305',
  tKickHi: '#20243a',
  tSeam: '#030406',
  tSeamHi: '#191c28',
  tWell: '#06070b',
  tWellSh: '#010102',
  tWellHi: '#2a2e40',
  tSide: '#11131d',
  tSide1: '#151824',
  tSideEdge: '#4f5776',
  podTop: '#4cc9c0',
  podFront: '#1b625e',
  tGlass: '#08141b',
  tGlassHi: '#1f4352',
  shadow2: 'rgba(0,0,0,.32)',
  // 新地板：警衛室大廳石材、租屋處木地板
  lobby: '#22242e',
  lobby2: '#2c2f3c',
  lobbyDot: '#353948',
  floorW: '#2a2019',
  floorW2: '#352920',
  // 家具上的小東西
  keyboard: '#a9aec2',
  pillow: '#d9dbe6',
  blanket: '#4a5a80',
  blanket2: '#5c6e98',
  sofaBack: '#2a2640',
  can1: '#d65a4a',
  can2: '#4a8ad6',
  can3: '#5ab86a',
  screenW: '#c8ccd8',
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

/** 斜角家具各面的配色：木頭（桌子、會議桌、長椅、床）。 */
export const FACES_WOOD: Faces = {
  line: C.line, top0: '#6e4c33', top1: '#7a5538', top2: '#83593b', rimHi: '#9c7452', edge: '#b48a62',
  face: '#5e3f2b', face1: '#6a4832', faceHi: '#7a5538', faceLo: '#3e2a1d', kick: '#2e1f15', kickHi: '#5e3f2b',
  side: '#4a3222', side1: '#523826', sideEdge: '#8a6a4c',
};

/** 金屬（置物櫃、咖啡機、販賣機、崗亭）。 */
export const FACES_METAL: Faces = {
  line: C.line, top0: '#4a5372', top1: '#4f5978', top2: '#5a6482', rimHi: '#7a86a6', edge: '#8e9ab8',
  face: '#434b66', face1: '#4a5370', faceHi: '#5a6482', faceLo: '#2c3246', kick: '#1e2232', kickHi: '#3a4158',
  side: '#363d55', side1: '#3b435c', sideEdge: '#6a7594',
};

/** 布（沙發）。 */
export const FACES_FABRIC: Faces = {
  line: C.line, top0: '#3a3550', top1: '#403a58', top2: '#463f60', rimHi: '#5e5680', edge: '#6e6690',
  face: '#2e2a42', face1: '#353049', faceHi: '#3f3a55', faceLo: '#1f1c2e', kick: '#16141f', kickHi: '#2e2a42',
  side: '#28243a', side1: '#2c2840', sideEdge: '#57507a',
};
