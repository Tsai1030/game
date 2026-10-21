import type { MapDef } from './types';

/** M04 租屋處：下班後的小房間。 */
export const M04: MapDef = {
  id: 'M04',
  loc: 'loc.room',
  tiles: [
    '##########',
    '#wwwwwwww#',
    '#wwwwwwww#',
    '#wwwwwwww#',
    '#wwwwwwww#',
    '#wwwwwwww#',
    '#wwwwwwww#',
    '#####D####',
  ],
  objects: [
    { id: 'bed', kind: 'bed', x: 1, y: 1, w: 3, h: 2, name: { zh: '床', en: 'bed' } },
    { id: 'rdesk', kind: 'desk', x: 6, y: 1, w: 3, h: 1, pc: true, act: 'say', say: 'say_room_desk', name: { zh: '書桌', en: 'desk' } },
  ],
  npcs: [],
  exits: [{ x: 5, y: 7, to: 'M03', at: { x: 12, y: 1, dir: 'down' }, if: { flag: 'room_open' }, locked: 'room_locked' }],
  regions: [],
  start: { x: 5, y: 6, dir: 'up' },
};
