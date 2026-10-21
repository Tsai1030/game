import type { Dir, MapId } from '../../core/state';
import type { Cond } from '../script';
import type { LookId, Thing } from '../world';

export type { MapId };

/** NPC 擺在哪張地圖的哪裡；同一個 id 可以有多筆，取第一筆條件成立的。 */
export interface NpcDef {
  id: string;
  look: LookId;
  x: number;
  y: number;
  dir: Dir;
  /** 跟他說話時播的劇情。 */
  talk: string;
  when?: Cond;
}

/** 門（D 格）通往另一張地圖；條件不成立時播 locked 劇情、人留在原地。 */
export interface Exit {
  x: number;
  y: number;
  to: MapId;
  at: { x: number; y: number; dir: Dir };
  if?: Cond;
  locked?: string;
}

/** 地點名稱的範圍 [x, y, w, h]；依序比對，都不符合時用地圖的 loc。 */
export interface Region {
  rect: [number, number, number, number];
  loc: string;
}

export interface MapDef {
  id: MapId;
  /** 預設地點名稱（語系 key）。 */
  loc: string;
  /** 每列一個字串，每個字元一格（見 world.ts 的 Tile）。 */
  tiles: string[];
  objects: Thing[];
  npcs: NpcDef[];
  exits: Exit[];
  regions: Region[];
  start: { x: number; y: number; dir: Dir };
  /** 無塵室範圍 [x, y, w, h]：沒穿無塵衣點進去時提示要先換裝。 */
  clean?: [number, number, number, number];
  /** 畫天車軌道（只有有 Fab 的地圖）。 */
  oht?: boolean;
}
