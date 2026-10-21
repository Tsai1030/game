// 給無頭 Phaser 用的假 2D 畫布與圖片（happy-dom 沒有實作）。要在 import phaser 之前先 import 這個檔。
// 匯出 restoreCanvas()，測試結束時還原，避免影響其他測試檔。
const noop = () => undefined;
const fakeCtx = (canvas: object): CanvasRenderingContext2D =>
  new Proxy(
    {
      canvas,
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createPattern: () => ({}),
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    } as Record<string | symbol, unknown>,
    {
      get: (t, p) => (p in t ? t[p] : noop),
      set: (t, p, v) => ((t[p] = v), true),
    },
  ) as unknown as CanvasRenderingContext2D;

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 32;
  height = 32;
  naturalWidth = 32;
  naturalHeight = 32;
  complete = true;
  private s = '';
  set src(v: string) {
    this.s = v;
    setTimeout(() => this.onload?.(), 0);
  }
  get src() {
    return this.s;
  }
  addEventListener() {}
  removeEventListener() {}
}

const proto = HTMLCanvasElement.prototype as unknown as { getContext: (k: string) => unknown };
const g = globalThis as unknown as Record<string, unknown>;
const w = window as unknown as Record<string, unknown>;
const real = { getContext: proto.getContext, image: g.Image, windowImage: w.Image };
const ctxs = new WeakMap<object, CanvasRenderingContext2D>();

proto.getContext = function (this: HTMLCanvasElement, kind: string) {
  if (kind !== '2d') return null;
  let c = ctxs.get(this);
  if (!c) ctxs.set(this, (c = fakeCtx(this)));
  return c;
};
g.Image = FakeImage;
w.Image = FakeImage;
g.CanvasRenderingContext2D ??= function () {};

export function restoreCanvas(): void {
  proto.getContext = real.getContext;
  g.Image = real.image;
  w.Image = real.windowImage;
}
