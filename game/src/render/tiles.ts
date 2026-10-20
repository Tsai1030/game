import { MH, MW, T, TS } from '../data/world';
import { C } from './palette';
import { txt, type Painter } from './paint';

function tile(p: Painter, i: number, j: number): void {
  const ch = T[j]![i]!;
  const X = i * TS;
  const Y = j * TS;
  const floor = (base: string, seam: string, dot: string) => {
    p.rect(base, X, Y, 16, 16);
    p.rect(seam, X, Y, 16, 1);
    p.rect(seam, X, Y, 1, 16);
    for (const a of [4, 8, 12]) for (const d of [4, 8, 12]) p.rect(dot, X + a, Y + d, 1, 1);
  };
  if (ch === '.') {
    p.rect(C.carpet, X, Y, 16, 16);
    p.rect(C.carpet2, X + 3, Y + 3, 2, 2);
    p.rect(C.carpet2, X + 11, Y + 11, 2, 2);
  } else if (ch === ',') floor(C.fab, C.fab2, C.fabDot);
  else if (ch === 'y') floor(C.yel, C.yel2, C.yelDot);
  else if (ch === '=') {
    p.rect(C.gown, X, Y, 16, 16);
    p.rect(C.gown2, X, Y, 16, 1);
    p.rect(C.gown2, X, Y, 1, 16);
  } else if (ch === 'D') {
    p.rect(C.gown, X, Y, 16, 16);
    p.rect(C.wallEdge, X, Y, 16, 2);
    p.rect(C.wallEdge, X, Y + 14, 16, 2);
  } else if (ch === 'A') {
    p.rect(C.grate, X, Y, 16, 16);
    for (let k = 1; k < 16; k += 3) p.rect(C.grate2, X, Y + k, 16, 1);
    p.rect(C.glove, X, Y, 2, 16);
    p.rect(C.glove, X + 14, Y, 2, 16);
  } else if (ch === 'g') {
    p.rect(C.wallTop, X, Y, 16, 16);
    p.rect(C.line, X + 4, Y, 8, 16);
    p.rect(C.glass, X + 5, Y, 6, 16);
    p.rect(C.glassHi, X + 6, Y + 2 + ((j * 5) % 7), 1, 4);
  } else {
    p.rect(C.wallTop, X, Y, 16, 16);
    const below = j + 1 < MH ? T[j + 1]![i]! : '#';
    if (below !== '#' && below !== 'g' && below !== 'A') {
      p.rect(C.wall, X, Y + 9, 16, 7);
      p.rect(C.wallEdge, X, Y + 9, 16, 1);
      p.rect(C.line, X, Y + 15, 16, 1);
    }
  }
}

/** 整張地圖的靜態層：地板、牆、玻璃、風淋室、白板與地面標示。 */
export function drawMap(p: Painter): void {
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) tile(p, i, j);
  p.rect(C.line, 81, 1, 62, 14);
  p.rect(C.board, 82, 2, 60, 12);
  p.rect(C.red, 85, 5, 22, 1);
  p.rect(C.glove, 85, 8, 34, 1);
  p.rect(C.glove, 112, 5, 24, 1);
  p.rect(C.line, 85, 11, 14, 1);
  txt(p, 'FAB 9  ETCH BAY', 272, 4, C.white);
  txt(p, 'YELLOW ROOM', 608, 412, C.yelText);
  txt(p, 'AIR SHOWER', 172, 282, C.rail);
}
