import { MAP_IDS, type MapId } from '../../core/state';
import { M01 } from './m01-gate';
import { M02 } from './m02-orientation';
import { M03 } from './m03-site';
import { M04 } from './m04-room';
import type { MapDef } from './types';

export type { Exit, MapDef, NpcDef, Region } from './types';
export { MAP_IDS };

export const MAPS: Record<MapId, MapDef> = { M01, M02, M03, M04 };

/** 最大地圖的寬高（格）；畫面大小依這個算，換地圖不會跟著變。 */
export const MAX_W = Math.max(...Object.values(MAPS).map((m) => m.tiles[0]!.length));
export const MAX_H = Math.max(...Object.values(MAPS).map((m) => m.tiles.length));
