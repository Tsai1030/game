import type { Dir } from '../core/state';
import type { LookId } from '../data/world';
import { C } from './palette';
import type { Painter } from './paint';

export interface Look {
  hair?: string;
  top?: string;
  bottom?: string;
  tie?: boolean;
  suit?: boolean;
  glove?: string;
}

export const LOOK: Record<LookId, Look> = {
  office: { hair: '#2b2230', top: '#8fb8e0', bottom: '#4a4670' },
  suit: { suit: true },
  boss: { hair: '#8a8898', top: '#f4f2fa', bottom: '#4a4670', tie: true },
  kevin: { suit: true },
  kevinDay: { hair: '#3a2e2a', top: '#5a6a8a', bottom: '#2b2d3a' },
  fse: { suit: true, glove: '#f08a2a' },
  fang: { hair: '#1e1a24', top: '#2f7d74', bottom: '#2b2d3a' },
  amy: { hair: '#6b4a32', top: '#e8a0b4', bottom: '#7a7f92' },
  guard: { hair: '#23304a', top: '#9fb4d0', bottom: '#23304a' },
};

/**
 * 俯視 Q 版人物。(X, Y) 是所在格子的左上角，人物從 Y-7 畫到 Y+15。
 * fr 是走路的左右腳（0/1），mv 表示正在走。
 */
export function drawPerson(p: Painter, X: number, Y: number, dir: Dir, fr: 0 | 1, mv: boolean, L: Look): void {
  const suit = !!L.suit;
  const body = suit ? C.suit : (L.top ?? C.suit);
  const legs = suit ? C.suit : (L.bottom ?? C.suit);
  const feet = suit ? (L.glove ?? C.glove) : C.line;
  const hand = suit ? (L.glove ?? C.glove) : C.skin;
  const head = suit ? C.suit : (L.hair ?? C.line);
  const a = mv ? (fr ? 1 : -1) : 0;
  const lL = a > 0 ? -1 : 0;
  const rL = a < 0 ? -1 : 0;
  p.rect(C.shadow, X + 3, Y + 13, 10, 3);
  const parts: [number, number, number, number, string][] = [
    [5, 10 + lL, 2, 5, legs],
    [9, 10 + rL, 2, 5, legs],
    [4, 3, 8, 8, body],
    [2, 4 - a, 2, 6, body],
    [12, 4 + a, 2, 6, body],
    [3, -6, 10, 9, head],
  ];
  for (const [x, y, w, h] of parts) p.rect(C.line, X + x - 1, Y + y - 1, w + 2, h + 2);
  for (const [x, y, w, h, col] of parts) p.rect(col, X + x, Y + y, w, h);
  p.rect(feet, X + 5, Y + 14 + lL, 2, 1);
  p.rect(feet, X + 9, Y + 14 + rL, 2, 1);
  p.rect(hand, X + 2, Y + 9 - a, 2, 1);
  p.rect(hand, X + 12, Y + 9 + a, 2, 1);
  if (suit) p.rect(C.suit2, X + 7, Y + 4, 2, 6);
  if (dir !== 'up') {
    const fx = dir === 'left' ? 3 : dir === 'right' ? 7 : 4;
    const fw = dir === 'down' ? 8 : 6;
    if (suit) p.rect(C.skin, X + fx, Y - 2, fw, 3);
    else p.rect(C.skin, X + fx, Y - 3, fw, 5);
    for (const ex of dir === 'left' ? [4] : dir === 'right' ? [11] : [6, 9]) p.rect(C.line, X + ex, Y - 2, 1, 2);
    if (suit && dir === 'down') p.rect(C.suit2, X + 5, Y + 1, 6, 1);
  }
  if (L.tie && dir === 'down') p.rect(C.red, X + 7, Y + 4, 2, 5);
}
