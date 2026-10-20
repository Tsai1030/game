/** localStorage 的最小介面，測試時可以換成記憶體版或會丟錯誤的版本。 */
export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** 取得瀏覽器的 localStorage；被封鎖或不存在時回傳 null。 */
export function browserStore(): KV | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
