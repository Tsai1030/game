import type { KV } from '../src/core/storage';

/** 記憶體版的 localStorage，給存檔與設定測試用。 */
export function memStore(init: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data: Record<string, string> = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

/** 每個操作都丟錯誤的 store，模擬私密瀏覽或被封鎖的儲存空間。 */
export const throwingStore: KV = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};
