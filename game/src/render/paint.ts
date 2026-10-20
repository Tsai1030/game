/** 所有繪圖都透過 Painter：靜態部分畫進 canvas 貼圖，動態部分畫進 Phaser Graphics，測試時用記錄器。 */
export interface Painter {
  rect(col: string, x: number, y: number, w: number, h: number): void;
}

export function canvasPainter(ctx: CanvasRenderingContext2D): Painter {
  return {
    rect(col, x, y, w, h) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    },
  };
}

/** Phaser Graphics 只需要這兩個方法，所以用結構型別，測試時不必載入 Phaser。 */
export interface FillTarget {
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, w: number, h: number): unknown;
}

export function gfxPainter(g: FillTarget): Painter {
  return {
    rect(col, x, y, w, h) {
      const [n, a] = parseColor(col);
      g.fillStyle(n, a);
      g.fillRect(x, y, w, h);
    },
  };
}

const colorCache = new Map<string, [number, number]>();

/** '#rgb'、'#rrggbb'、'rgb(...)'、'rgba(...)' 轉成 [0xRRGGBB, alpha]。 */
export function parseColor(css: string): [number, number] {
  const hit = colorCache.get(css);
  if (hit) return hit;
  let out: [number, number] = [0, 1];
  if (css.startsWith('#')) {
    const h = css.length === 4 ? [...css.slice(1)].map((c) => c + c).join('') : css.slice(1);
    out = [parseInt(h, 16), 1];
  } else {
    const m = /rgba?\(([^)]+)\)/.exec(css);
    if (m) {
      const [r = 0, g = 0, b = 0, a = 1] = m[1]!.split(',').map((s) => parseFloat(s));
      out = [(r << 16) | (g << 8) | b, a];
    }
  }
  colorCache.set(css, out);
  return out;
}

/** 3×5 點陣字（機台名牌），每個字 15 個位元，由上而下、由左而右。 */
export const GL: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', Y: '101101010010010', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111',
  '3': '110001010001110', '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110', '-': '000000111000000', ' ': '000000000000000',
};

export function txt(p: Painter, s: string, x: number, y: number, col: string): void {
  for (let k = 0; k < s.length; k++) {
    const g = GL[s[k]!] ?? GL[' ']!;
    for (let i = 0; i < 15; i++) if (g[i] === '1') p.rect(col, x + k * 4 + (i % 3), y + ((i / 3) | 0), 1, 1);
  }
}

export const txtW = (s: string): number => s.length * 4 - 1;

/** 像素圓：逐列畫水平線。 */
export function disc(p: Painter, cx: number, cy: number, r: number, col: string): void {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
    p.rect(col, cx - w, cy + y, w * 2 + 1, 1);
  }
}
