import { MAP_IDS, type MapId } from '../../core/state';
import { M03 } from './m03-site';
import type { MapDef } from './types';

export type { Exit, MapDef, NpcDef, Region } from './types';
export { MAP_IDS };

export const MAPS: Record<MapId, MapDef> = { M03 };

/** 最大地圖的寬高（格）；畫面大小依這個算，換地圖不會跟著變。 */
export const MAX_W = Math.max(...Object.values(MAPS).map((m) => m.tiles[0]!.length));
export const MAX_H = Math.max(...Object.values(MAPS).map((m) => m.tiles.length));
