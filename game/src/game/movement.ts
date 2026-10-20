import { S, type Dir } from '../core/state';
import { ACTS, adj, inb, MH, MW, objAt, T, TS, walkable, type Thing } from '../data/world';
import { VISUAL_TOP } from '../render/tools';
import { bfs, type Pt } from '../systems/path';

export const STEP_SEC = 0.15;

const DV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export interface MoverHooks {
  /** 走完一格；prevX 是出發的 x（用來判斷是不是從西邊走進風淋室）。 */
  onArrive(prevX: number): void;
  onInteract(o: Thing): void;
  onWarnSuit(): void;
  onUnreachable(): void;
}

interface Step {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
}

export type ClickResult = 'interact' | 'path' | 'blocked-suit' | 'unreachable' | 'none';

/** 角色移動：按鍵走一格、點擊自動尋路、走到物件旁邊再互動。不依賴 Phaser，可單獨測試。 */
export class Mover {
  step: Step | null = null;
  path: Pt[] = [];
  pending: Thing | null = null;
  marker: Pt | null = null;
  walkT = 0;
  px = 0;
  py = 0;

  constructor(private readonly hooks: MoverHooks) {
    this.reset();
  }

  reset(): void {
    this.step = null;
    this.path = [];
    this.pending = null;
    this.marker = null;
    this.walkT = 0;
    this.px = S.x * TS;
    this.py = S.y * TS;
  }

  private tryMove(d: Dir): boolean {
    S.dir = d;
    const [dx, dy] = DV[d];
    const nx = S.x + dx;
    const ny = S.y + dy;
    if (inb(nx, ny) && T[ny]![nx] === 'A' && !S.suit) {
      this.hooks.onWarnSuit();
      return false;
    }
    if (!walkable(nx, ny, S.suit)) return false;
    this.step = { fx: S.x, fy: S.y, tx: nx, ty: ny, t: 0 };
    return true;
  }

  /** 沒有在走的時候決定下一步：按鍵優先，其次是點擊的路徑，最後是到達後要互動的對象。 */
  private startNext(held: Dir | undefined): void {
    if (held) {
      this.path = [];
      this.pending = null;
      this.marker = null;
      this.tryMove(held);
      return;
    }
    if (this.path.length) {
      const n = this.path.shift()!;
      const dx = n.x - S.x;
      const dy = n.y - S.y;
      const d: Dir | null = Math.abs(dx) + Math.abs(dy) !== 1 ? null : dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
      if (!d || !this.tryMove(d)) {
        this.path = [];
        this.pending = null;
      }
      if (!this.path.length) this.marker = null;
      return;
    }
    if (this.pending) {
      const o = this.pending;
      this.pending = null;
      if (adj(o, S.x, S.y)) this.hooks.onInteract(o);
    }
  }

  /** 推進時間。blocked 為 true（對話、視窗、風淋中）時不會開始新的一步，但走到一半的會走完。 */
  tick(dt: number, held: Dir | undefined, blocked: boolean): void {
    if (!this.step && !blocked) this.startNext(held);
    if (this.step) {
      const stepSec = S.coffee === 0 ? STEP_SEC / 0.7 : STEP_SEC;
      this.step.t += dt / stepSec;
      this.walkT += dt;
      if (this.step.t >= 1) {
        const prevX = S.x;
        S.x = this.step.tx;
        S.y = this.step.ty;
        this.step = null;
        this.hooks.onArrive(prevX);
      }
    }
    if (this.step) {
      const k = Math.min(1, this.step.t);
      this.px = (this.step.fx + (this.step.tx - this.step.fx) * k) * TS;
      this.py = (this.step.fy + (this.step.ty - this.step.fy) * k) * TS;
    } else {
      this.px = S.x * TS;
      this.py = S.y * TS;
    }
  }

  /** 世界座標上的點擊落在哪個可互動物件（看得到的範圍，包含高出佔地格的部分）。 */
  private pick(wx: number, wy: number): Thing | null {
    let best: Thing | null = null;
    for (const o of ACTS) {
      const top = o.y * TS - (o.npc ? 7 : (VISUAL_TOP[o.kind] ?? 0));
      const bottom = (o.y + o.h) * TS;
      if (wx >= o.x * TS && wx < (o.x + o.w) * TS && wy >= top && wy < bottom && (!best || bottom > (best.y + best.h) * TS)) best = o;
    }
    return best;
  }

  click(wx: number, wy: number): ClickResult {
    const tx = Math.floor(wx / TS);
    const ty = Math.floor(wy / TS);
    const sx = this.step ? this.step.tx : S.x;
    const sy = this.step ? this.step.ty : S.y;
    const walk = (x: number, y: number) => walkable(x, y, S.suit);
    const hit = this.pick(wx, wy);
    if (hit) {
      if (!this.step && adj(hit, S.x, S.y)) {
        this.hooks.onInteract(hit);
        return 'interact';
      }
      const p = bfs(MW, MH, sx, sy, walk, (x, y) => adj(hit, x, y));
      if (p) {
        this.path = p;
        this.pending = hit;
        this.marker = null;
        return 'path';
      }
      return this.blocked(hit.x >= 15);
    }
    if (walk(tx, ty)) {
      const p = bfs(MW, MH, sx, sy, walk, (x, y) => x === tx && y === ty);
      if (p) {
        this.path = p;
        this.pending = null;
        this.marker = { x: tx, y: ty };
        return 'path';
      }
      return this.blocked(tx >= 15);
    }
    if (inb(tx, ty) && !S.suit && (T[ty]![tx] === 'A' || tx >= 15)) return this.blocked(true);
    return 'none';
  }

  /** 走不到：目標在 Fab 而且沒穿無塵衣就提示換裝，否則提示走不過去。 */
  private blocked(inFab: boolean): ClickResult {
    if (inFab && !S.suit) {
      this.hooks.onWarnSuit();
      return 'blocked-suit';
    }
    this.hooks.onUnreachable();
    return 'unreachable';
  }

  /** 面前（或身旁）可互動的東西；走路中不算。 */
  nearObj(): Thing | null {
    if (this.step) return null;
    const [fx, fy] = DV[S.dir];
    const front = objAt(S.x + fx, S.y + fy);
    if (front?.act) return front;
    for (const [dx, dy] of Object.values(DV)) {
      const o = objAt(S.x + dx, S.y + dy);
      if (o?.act) return o;
    }
    return null;
  }
}
