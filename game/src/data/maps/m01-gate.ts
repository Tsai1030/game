import type { MapDef } from './types';

/** M01 警衛室：換臨時通行證、手機鏡頭貼貼紙，穿過閘門進廠。 */
export const M01: MapDef = {
  id: 'M01',
  loc: 'loc.gate',
  tiles: [
    '##########D#########',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '#######lllllll######',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '#llllllllllllllllll#',
    '####################',
  ],
  objects: [
    { id: 'booth', kind: 'booth', x: 2, y: 7, w: 4, h: 2, name: { zh: '警衛崗亭', en: 'guard booth' } },
    { id: 'gate1', kind: 'gate', x: 7, y: 5, w: 1, h: 1 },
    { id: 'gate2', kind: 'gate', x: 9, y: 5, w: 1, h: 1 },
    { id: 'gate3', kind: 'gate', x: 11, y: 5, w: 1, h: 1 },
    { id: 'gate4', kind: 'gate', x: 13, y: 5, w: 1, h: 1 },
    { id: 'gplant', kind: 'plant', x: 17, y: 9, w: 1, h: 1 },
  ],
  npcs: [
    { id: 'guard', look: 'guard', x: 6, y: 8, dir: 'right', talk: 'p_guard', when: { chapter: 'prologue', notFlag: 'p_badge' } },
    { id: 'guard', look: 'guard', x: 6, y: 8, dir: 'right', talk: 'guard', when: { chapter: 'prologue' } },
  ],
  exits: [{ x: 10, y: 0, to: 'M02', at: { x: 2, y: 10, dir: 'up' }, if: { flag: 'p_badge' }, locked: 'p_gate_locked' }],
  regions: [],
  start: { x: 10, y: 10, dir: 'up' },
};
