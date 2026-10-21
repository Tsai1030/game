import { saveNow } from '../core/autosave';
import { on } from '../core/bus';
import { S, type Dir, type GameState, type MapId } from '../core/state';
import type { Exit } from '../data/maps';
import { exitAt, loadMap, MAP, walkable } from '../data/world';
import { evalCond } from '../systems/script';
import { TRIGGERS } from '../data/story';
import { triggerAt } from '../systems/triggers';
import { playScene } from '../ui/scene';
import { busy, rt } from './runtime';

export type ExitResult = { kind: 'go'; exit: Exit } | { kind: 'locked'; scene: string } | null;

/** 站在 (x, y) 時的出口：可以走、上鎖（附說明劇情），或不是出口。 */
export function tryExit(x: number, y: number): ExitResult {
  const e = exitAt(x, y);
  if (!e) return null;
  if (e.if && !evalCond(S, e.if)) return e.locked ? { kind: 'locked', scene: e.locked } : null;
  return { kind: 'go', exit: e };
}

/** 換到另一張地圖（立即生效，不含淡入淡出）：改狀態、載入地圖與 NPC、存檔。 */
export function enterMap(map: MapId, x: number, y: number, dir: Dir): void {
  Object.assign(S, { map, x, y, dir });
  loadMap(map);
  saveNow();
}

/**
 * 換地圖時的畫面效果：go() 真的換過去，done() 表示畫面已經換好。
 * 遊戲畫面會設成淡出、重建、淡入；沒有畫面時（測試）直接換。
 */
type Fader = (go: () => void, done: () => void) => void;
const instant: Fader = (go, done) => {
  go();
  done();
};
let fader: Fader = instant;

export function setFader(f: Fader | null): void {
  fader = f ?? instant;
}

let next: [MapId, number, number, Dir] | null = null;

/**
 * 遊戲裡換地圖都走這裡。換的途中 busy() 為 true，玩家不能動也不能互動；
 * 途中又要換（劇情連續瞬移）時，等這次換完再接著換最後一次。
 */
export function travel(map: MapId, x: number, y: number, dir: Dir): void {
  if (rt.traveling) {
    next = [map, x, y, dir];
    return;
  }
  rt.traveling = true;
  fader(
    () => enterMap(map, x, y, dir),
    () => {
      rt.traveling = false;
      const n = next;
      next = null;
      if (n) travel(...n);
      else fireTrigger();
    },
  );
}

/** 走到一格之後：踩到門就換地圖，門鎖著就播原因（人留在原地）。 */
export function onArrive(): 'go' | 'locked' | null {
  const r = tryExit(S.x, S.y);
  if (!r) return null;
  if (r.kind === 'locked') {
    playScene(r.scene);
    return 'locked';
  }
  travel(r.exit.to, r.exit.at.x, r.exit.at.y, r.exit.at.dir);
  return 'go';
}

/** 站的地方有觸發劇情就播（忙碌時不播）；有播回傳 true。 */
export function fireTrigger(): boolean {
  if (busy()) return false;
  const scene = triggerAt(TRIGGERS, S.map, S.x, S.y, S);
  return scene ? playScene(scene) : false;
}

/** 讀檔後載入存檔裡的地圖；原本那格不能站（例如地圖改過）就改站那張地圖的起點。 */
export function placeLoaded(s: GameState): void {
  loadMap(s.map);
  if (walkable(s.x, s.y, s.suit)) return;
  s.x = MAP.start.x;
  s.y = MAP.start.y;
  s.dir = MAP.start.dir;
}

// 劇情裡的瞬移（warp 效果）也走 travel。
on('warp', (ev) => {
  const e = ev as { map: MapId; x: number; y: number; dir: Dir };
  travel(e.map, e.x, e.y, e.dir);
});
