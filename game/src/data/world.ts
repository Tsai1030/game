import type { Bi } from '../core/i18n';
import type { Dir, EtchState } from '../core/state';

export const TS = 16;
export const MW = 46;
export const MH = 28;

/** # 牆 · . 辦公室地毯 · , Fab 地板 · y 黃光區 · = 更衣室 · D 門 · A 風淋室 · g 玻璃牆 */
export type Tile = '#' | '.' | ',' | 'y' | '=' | 'D' | 'A' | 'g';
export type Kind = 'desk' | 'coffee' | 'plant' | 'locker' | 'bench' | 'etch' | 'cvd' | 'met' | 'wet' | 'stk' | 'litho' | 'track';
export type ToolSt = 'run' | 'idle' | 'alarm' | 'inhibit';
export type Act = 'pc' | 'say' | 'coffee' | 'locker' | 'tool' | 'etch07' | 'met' | 'npc';
export type LookId = 'office' | 'suit' | 'boss' | 'kevin' | 'fse';

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
}

function buildTiles(): Tile[][] {
  const t: Tile[][] = Array.from({ length: MH }, () => Array<Tile>(MW).fill('#'));
  const fill = (x: number, y: number, w: number, h: number, ch: Tile) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) t[j]![i] = ch;
  };
  fill(1, 1, 13, 13, '.');
  fill(1, 15, 13, 12, '=');
  fill(15, 1, 30, 18, ',');
  fill(15, 19, 30, 8, 'y');
  t[14]![3] = 'D';
  t[14]![4] = 'D';
  for (let y = 3; y <= 10; y++) t[y]![14] = 'g';
  t[17]![14] = 'A';
  return t;
}

export const T: Tile[][] = buildTiles();

const FLOOR = new Set<Tile>(['.', ',', 'y', '=', 'D']);

export const OBJ: Thing[] = [
  { id: 'pc', kind: 'desk', x: 2, y: 3, w: 3, h: 1, pc: true, act: 'pc', name: { zh: 'PE 工作站', en: 'PE workstation' } },
  { id: 'desk2', kind: 'desk', x: 6, y: 3, w: 3, h: 1, pc: true, act: 'say', say: 'say_desk2', name: { zh: 'Kevin 學長的座位', en: "Kevin's desk" } },
  { id: 'desk3', kind: 'desk', x: 2, y: 7, w: 3, h: 1, pc: true, act: 'say', say: 'say_desk3', name: { zh: '隔壁的座位', en: 'the next desk' } },
  { id: 'desk4', kind: 'desk', x: 6, y: 7, w: 3, h: 1, pc: true, act: 'say', say: 'say_desk4', name: { zh: '空位', en: 'the empty desk' } },
  { id: 'bossdesk', kind: 'desk', x: 10, y: 2, w: 3, h: 1, pc: true, act: 'say', say: 'say_bossdesk', name: { zh: '王經理的座位', en: "Manager Wang's desk" } },
  { id: 'coffee', kind: 'coffee', x: 1, y: 11, w: 1, h: 1, act: 'coffee', name: { zh: '咖啡機', en: 'coffee machine' } },
  { id: 'plant1', kind: 'plant', x: 13, y: 12, w: 1, h: 1 },
  { id: 'plant2', kind: 'plant', x: 1, y: 1, w: 1, h: 1 },
  { id: 'locker', kind: 'locker', x: 6, y: 15, w: 7, h: 1, act: 'locker', name: { zh: '無塵衣置物櫃', en: 'suit lockers' } },
  { id: 'bench', kind: 'bench', x: 4, y: 20, w: 4, h: 1 },
  { id: 'ETCH-05', kind: 'etch', x: 17, y: 3, w: 5, h: 3, st: 'run', act: 'tool' },
  { id: 'ETCH-07', kind: 'etch', x: 25, y: 3, w: 5, h: 3, st: 'alarm', act: 'etch07' },
  { id: 'CVD-11', kind: 'cvd', x: 33, y: 3, w: 5, h: 3, st: 'run', act: 'tool' },
  { id: 'MET-02', kind: 'met', x: 17, y: 11, w: 4, h: 3, st: 'run', act: 'met' },
  { id: 'WET-02', kind: 'wet', x: 25, y: 11, w: 6, h: 2, st: 'idle', act: 'tool' },
  { id: 'STK-01', kind: 'stk', x: 39, y: 10, w: 4, h: 5, st: 'run', act: 'tool' },
  { id: 'LITHO-03', kind: 'litho', x: 20, y: 21, w: 7, h: 3, st: 'run', act: 'tool' },
  { id: 'TRACK-03', kind: 'track', x: 30, y: 21, w: 6, h: 3, st: 'run', act: 'tool' },
];

export const NPC: Thing[] = [
  { id: 'boss', kind: 'npc', x: 11, y: 4, w: 1, h: 1, dir: 'down', npc: true, act: 'npc', look: 'boss' },
  { id: 'kevin', kind: 'npc', x: 27, y: 7, w: 1, h: 1, dir: 'up', npc: true, act: 'npc', look: 'kevin' },
  { id: 'fse', kind: 'npc', x: 36, y: 7, w: 1, h: 1, dir: 'left', npc: true, act: 'npc', look: 'fse' },
];

/** 可以互動的物件與 NPC。 */
export const ACTS: Thing[] = [...OBJ.filter((o) => o.act), ...NPC];

export const BLK: (Thing | null)[][] = Array.from({ length: MH }, () => Array<Thing | null>(MW).fill(null));
for (const o of [...OBJ, ...NPC]) {
  for (let j = o.y; j < o.y + o.h; j++) for (let i = o.x; i < o.x + o.w; i++) BLK[j]![i] = o;
}

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

/** 地點名稱的語系 key。 */
export function region(x: number, y: number): string {
  if (T[y]?.[x] === 'A') return 'loc.airShower';
  if (x < 14) return y < 14 ? 'loc.office' : 'loc.gown';
  return y >= 19 ? 'loc.fabLitho' : 'loc.fabEtch';
}

/** 把 ETCH-07 的狀態同步到地圖物件（燈號塔、腔體框顏色看這個）。 */
export function syncEtch(e: EtchState): void {
  const o = OBJ.find((x) => x.id === 'ETCH-07')!;
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

const NPC_DIR0 = new Map(NPC.map((n) => [n.id, n.dir]));

/** 新遊戲時把 NPC 的面向轉回初始方向（對話時會轉向玩家）。 */
export function resetNpcs(): void {
  for (const n of NPC) n.dir = NPC_DIR0.get(n.id);
}
