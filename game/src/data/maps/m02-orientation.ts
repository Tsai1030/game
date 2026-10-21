import type { MapDef } from './types';

/** M02 新訓教室：一整個早上的安全影片。 */
export const M02: MapDef = {
  id: 'M02',
  loc: 'loc.orientation',
  tiles: [
    '##################',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '##D############D##',
  ],
  objects: [
    { id: 'oscreen', kind: 'screen', x: 6, y: 1, w: 6, h: 1 },
    { id: 'otable1', kind: 'table', x: 2, y: 6, w: 4, h: 1 },
    { id: 'otable2', kind: 'table', x: 7, y: 6, w: 4, h: 1 },
    { id: 'otable3', kind: 'table', x: 12, y: 6, w: 4, h: 1 },
    { id: 'otable4', kind: 'table', x: 2, y: 9, w: 4, h: 1 },
    { id: 'otable5', kind: 'table', x: 7, y: 9, w: 4, h: 1 },
    { id: 'otable6', kind: 'table', x: 12, y: 9, w: 4, h: 1 },
  ],
  npcs: [{ id: 'amy', look: 'amy', x: 9, y: 3, dir: 'down', talk: 'amy', when: { chapter: 'prologue' } }],
  exits: [{ x: 15, y: 11, to: 'M03', at: { x: 12, y: 1, dir: 'down' }, if: { flag: 'p_orient_done' }, locked: 'p_orient_locked' }],
  regions: [],
  start: { x: 2, y: 10, dir: 'up' },
};
