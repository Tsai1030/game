export interface Pt {
  x: number;
  y: number;
}

const DV: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/**
 * 四方向廣度優先搜尋。回傳不含起點的路徑；起點本身就符合 goal 時回傳 []，到不了回傳 null。
 */
export function bfs(
  w: number,
  h: number,
  sx: number,
  sy: number,
  walk: (x: number, y: number) => boolean,
  goal: (x: number, y: number) => boolean,
): Pt[] | null {
  if (goal(sx, sy)) return [];
  const prev = new Int32Array(w * h).fill(-2);
  const s0 = sy * w + sx;
  prev[s0] = -1;
  const q = [s0];
  for (let head = 0; head < q.length; head++) {
    const k = q[head]!;
    const x = k % w;
    const y = (k / w) | 0;
    for (const [dx, dy] of DV) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !walk(nx, ny)) continue;
      const nk = ny * w + nx;
      if (prev[nk] !== -2) continue;
      prev[nk] = k;
      if (goal(nx, ny)) {
        const path: Pt[] = [];
        for (let c = nk; c !== s0; c = prev[c]!) path.push({ x: c % w, y: (c / w) | 0 });
        return path.reverse();
      }
      q.push(nk);
    }
  }
  return null;
}
