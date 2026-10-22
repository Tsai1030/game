import type { Bi } from '../core/i18n';
import { S, type Dir, type EtchState, type GameState, type MapId } from '../core/state';
import { evalCond } from '../systems/script';
import { MAPS, type Exit, type MapDef, type NpcDef } from './maps';

export const TS = 16;

/** # 牆 · . 地毯 · , Fab 地板 · y 黃光區 · = 更衣室 · D 門 · A 風淋室 · g 玻璃牆 · l 大廳石材 · w 木地板 */
export type Tile = '#' | '.' | ',' | 'y' | '=' | 'D' | 'A' | 'g' | 'l' | 'w';
export type Kind =
  | 'desk' | 'coffee' | 'plant' | 'locker' | 'bench' | 'table' | 'board' | 'sofa' | 'vending' | 'booth' | 'gate' | 'screen' | 'bed'
  | 'etch' | 'cvd' | 'met' | 'wet' | 'stk' | 'litho' | 'track';
export type ToolSt = 'run' | 'idle' | 'alarm' | 'inhibit';
export type Act = 'pc' | 'say' | 'coffee' | 'locker' | 'tool' | 'etch07' | 'met' | 'npc';
export type LookId = 'office' | 'suit' | 'boss' | 'kevin' | 'kevinDay' | 'fse' | 'fang' | 'amy' | 'guard' | 'bear' | 'chen';

/** 地圖上佔格子的東西：物件或 NPC。 */
export interface Thing {
  id: string;
  kind: Kind | 'npc';
  x: number;
  y: number;
  w: number;
  h: number;
  act?: Act;
  name?: Bi;
  pc?: boolean;
  /** 劇情 key（查看時說的話）。 */
  say?: string;
  st?: ToolSt;
  npc?: boolean;
  dir?: Dir;
  look?: LookId;
  /** NPC：說話時播的劇情。 */
  talk?: string;
}

/** 目前載入的地圖。以下這些匯出都是即時綁定：loadMap 之後，其他模組讀到的就是新地圖。 */
export let MAP: MapDef;
export let MW = 0;
export let MH = 0;
export let T: Tile[][] = [];
export let OBJ: Thing[] = [];
export let NPC: Thing[] = [];
/** 可以互動的物件與 NPC。 */
export let ACTS: Thing[] = [];
export let BLK: (Thing | null)[][] = [];

const FLOOR = new Set<Tile>(['.', ',', 'y', '=', 'D', 'l', 'w']);

/** NPC 定義對應的地圖物件；同一筆定義一直用同一個物件，面向才會保留。 */
const npcThings = new Map<NpcDef, Thing>();
const thingOf = (d: NpcDef): Thing => {
  let o = npcThings.get(d);
  if (!o) npcThings.set(d, (o = { id: d.id, kind: 'npc', x: d.x, y: d.y, w: 1, h: 1, dir: d.dir, npc: true, act: 'npc', look: d.look, talk: d.talk }));
  return o;
};

/** skip：站在玩家腳下的 NPC 先不擋路，等玩家走開再擋。 */
function rebuildBlocks(skip: Thing | null): void {
  BLK = Array.from({ length: MH }, () => Array<Thing | null>(MW).fill(null));
  for (const o of [...OBJ, ...NPC]) {
    if (o === skip) continue;
    for (let j = o.y; j < o.y + o.h; j++) for (let i = o.x; i < o.x + o.w; i++) BLK[j]![i] = o;
  }
}

let npcKey = '';

/**
 * 依劇情狀態決定這張地圖上有哪些 NPC（每個 id 取第一筆條件成立的定義）。
 * 每格都可以呼叫；結果沒變就不重建，回傳 false。
 */
export function refreshNpcs(s: GameState, force = false): boolean {
  const seen = new Set<string>();
  const list: Thing[] = [];
  for (const d of MAP.npcs) {
    if (seen.has(d.id) || (d.when && !evalCond(s, d.when))) continue;
    seen.add(d.id);
    list.push(thingOf(d));
  }
  const under = list.find((o) => o.x === s.x && o.y === s.y) ?? null;
  const defs = list.map((o) => MAP.npcs.findIndex((d) => npcThings.get(d) === o));
  const key = `${MAP.id}|${defs.join(',')}|${under?.id ?? ''}`;
  if (!force && key === npcKey) return false;
  npcKey = key;
  NPC = list;
  ACTS = [...OBJ.filter((o) => o.act), ...NPC];
  rebuildBlocks(under);
  return true;
}

/** 換成另一張地圖。 */
export function loadMap(id: MapId): void {
  MAP = MAPS[id];
  T = MAP.tiles.map((row) => [...row] as Tile[]);
  MH = T.length;
  MW = T[0]!.length;
  OBJ = MAP.objects;
  refreshNpcs(S, true);
}

loadMap('M03');

export const inb = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < MW && y < MH;

/** 這一格能不能站：地板、沒有東西佔著；風淋室要穿無塵衣才能過。 */
export function walkable(x: number, y: number, suit: boolean): boolean {
  if (!inb(x, y)) return false;
  const ch = T[y]![x]!;
  if (ch === 'A') {
    if (!suit) return false;
  } else if (!FLOOR.has(ch)) return false;
  return !BLK[y]![x];
}

export const objAt = (x: number, y: number): Thing | null => (inb(x, y) ? BLK[y]![x]! : null);

/** (x, y) 是否緊貼物件的上下左右（不含斜角、不含物件本身）。 */
export function adj(o: Thing, x: number, y: number): boolean {
  return (
    (x >= o.x && x < o.x + o.w && (y === o.y - 1 || y === o.y + o.h)) ||
    (y >= o.y && y < o.y + o.h && (x === o.x - 1 || x === o.x + o.w))
  );
}

const inRect = ([rx, ry, rw, rh]: [number, number, number, number], x: number, y: number) => x >= rx && y >= ry && x < rx + rw && y < ry + rh;

/** 地點名稱的語系 key。 */
export function region(x: number, y: number): string {
  if (T[y]?.[x] === 'A') return 'loc.airShower';
  return MAP.regions.find((r) => inRect(r.rect, x, y))?.loc ?? MAP.loc;
}

/** (x, y) 是否在無塵室範圍內（沒穿無塵衣不能進）。 */
export const inCleanroom = (x: number, y: number): boolean => !!MAP.clean && inRect(MAP.clean, x, y);

/** 站在 (x, y) 會走出去的門。 */
export const exitAt = (x: number, y: number): Exit | null => MAP.exits.find((e) => e.x === x && e.y === y) ?? null;

/** 把 ETCH-07 的狀態同步到地圖物件（燈號塔、腔體框顏色看這個）。 */
export function syncEtch(e: EtchState): void {
  const o = MAPS.M03.objects.find((x) => x.id === 'ETCH-07')!;
  o.st = e === 'alarm' ? 'alarm' : e === 'inhibit' ? 'inhibit' : 'run';
}

type ToolId = 'ETCH-05' | 'CVD-11' | 'WET-02' | 'STK-01' | 'LITHO-03' | 'TRACK-03';
const same = (s: string): Bi => ({ zh: s, en: s });

/** 一般機台的狀態卡內容。 */
export const TOOL_INFO: Record<ToolId, { type: Bi; st: 'RUN' | 'IDLE'; rows: [Bi, Bi][]; note: Bi }> = {
  'ETCH-05': {
    type: same('Poly Etch'),
    st: 'RUN',
    rows: [
      [same('PM-C'), { zh: '處理 N9K409.1 · STEP3', en: 'Processing N9K409.1 · STEP3' }],
      [{ zh: 'RF 反射功率', en: 'RF reflected power' }, { zh: '3.8 W（正常）', en: '3.8 W (normal)' }],
      [same('Focus ring'), same('420 / 1,200 h')],
      [same('WIP'), same('2 lots')],
    ],
    note: { zh: '同型機台，可以拿來跟 ETCH-07 對照。', en: 'Same model. Useful as a comparison for ETCH-07.' },
  },
  'CVD-11': {
    type: same('SiN CVD'),
    st: 'RUN',
    rows: [
      [same('Recipe'), same('SIN_DEP_V8')],
      [{ zh: '膜厚', en: 'Film thickness' }, { zh: '1,002 Å（目標 1,000）', en: '1,002 Å (target 1,000)' }],
      [{ zh: '下次 PM', en: 'Next PM' }, { zh: '3 天後', en: 'In 3 days' }],
      [same('WIP'), same('3 lots')],
    ],
    note: { zh: '阿哲說它今天很乖。', en: "A-Zhe says it's behaving today." },
  },
  'WET-02': {
    type: same('Wet Bench'),
    st: 'IDLE',
    rows: [
      [{ zh: '狀態', en: 'Status' }, { zh: '等 lot 中', en: 'Waiting for lots' }],
      [{ zh: '槽液壽命', en: 'Bath life' }, same('72%')],
      [{ zh: 'SC1 溫度', en: 'SC1 temp' }, same('65.0 °C')],
      [same('WIP'), same('0 lots')],
    ],
    note: { zh: '旁邊有人放了一雙備用手套。', en: 'Someone left a spare pair of gloves next to it.' },
  },
  'STK-01': {
    type: same('Stocker'),
    st: 'RUN',
    rows: [
      [{ zh: '儲位', en: 'Slots' }, same('212 / 240')],
      [{ zh: 'Hold 中', en: 'On hold' }, { zh: 'N9K417.1、N9K415.1、N9K412.1、N9K410.1', en: 'N9K417.1, N9K415.1, N9K412.1, N9K410.1' }],
      [same('OHT'), { zh: '2 台運行中', en: '2 running' }],
    ],
    note: { zh: 'Hold 住的 4 批都在這裡等你的結論。', en: 'The 4 held lots are all here, waiting on your conclusion.' },
  },
  'LITHO-03': {
    type: { zh: 'Scanner（黃光區）', en: 'Scanner (yellow room)' },
    st: 'RUN',
    rows: [
      [{ zh: '曝光中', en: 'Exposing' }, same('N9K420.1')],
      [same('Focus / Dose'), { zh: '正常', en: 'Normal' }],
      [same('Overlay'), same('3.1 nm')],
      [same('WIP'), same('5 lots')],
    ],
    note: { zh: '黃光區禁止白光，手機螢幕也算。', en: 'No white light in the yellow room. Phone screens count.' },
  },
  'TRACK-03': {
    type: same('Coater / Developer'),
    st: 'RUN',
    rows: [
      [{ zh: '流程', en: 'Flow' }, { zh: '塗佈 → 烘烤 → 顯影', en: 'Coat → Bake → Develop' }],
      [{ zh: 'PR 溫度', en: 'PR temp' }, same('23.0 °C')],
      [same('WIP'), same('4 lots')],
    ],
    note: { zh: '跟 LITHO-03 連線一起跑。', en: 'Runs inline with LITHO-03.' },
  },
};

/** 新遊戲時把 NPC 的面向轉回初始方向（對話時會轉向玩家）。 */
export function resetNpcs(): void {
  for (const [d, o] of npcThings) o.dir = d.dir;
}
