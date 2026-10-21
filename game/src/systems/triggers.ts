import type { GameState, MapId } from '../core/state';
import type { Cond } from '../data/script';
import { evalCond } from './script';

/** 走進某張地圖（或地圖上的某個範圍）時自動開始的劇情。 */
export interface Trigger {
  scene: string;
  map: MapId;
  /** 範圍 [x, y, w, h]；沒寫就是整張地圖。 */
  at?: [number, number, number, number];
  /** 條件；觸發的劇情要設一個旗標讓條件不再成立，才不會一直重播。 */
  if?: Cond;
}

/** 站在 (x, y) 時第一個符合的觸發劇情。 */
export function triggerAt(list: Trigger[], map: MapId, x: number, y: number, s: GameState): string | null {
  for (const t of list) {
    if (t.map !== map) continue;
    if (t.at) {
      const [ax, ay, aw, ah] = t.at;
      if (x < ax || y < ay || x >= ax + aw || y >= ay + ah) continue;
    }
    if (t.if && !evalCond(s, t.if)) continue;
    return t.scene;
  }
  return null;
}
