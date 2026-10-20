/** 極簡事件匯流排：語言切換、重設移動狀態、回標題畫面等跨模組通知。 */
type Handler = (...args: unknown[]) => void;

const handlers = new Map<string, Set<Handler>>();

export function on(evt: string, fn: Handler): () => void {
  let set = handlers.get(evt);
  if (!set) {
    set = new Set();
    handlers.set(evt, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
  };
}

export function emit(evt: string, ...args: unknown[]): void {
  handlers.get(evt)?.forEach((fn) => fn(...args));
}
