// 由 phaser-glue.test.ts 在裝好假畫布之後動態載入（Phaser 一載入就會用到畫布）。
// 用無頭 Phaser 跑真正的 WorldScene（假的 2D 畫布），檢查換地圖、讀檔這些單元測試碰不到的膠水程式。
// M1-3D 換成 three.js 之後，這個檔案跟 Phaser 一起移除。
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { restoreCanvas } from './fake-canvas';
import { WorldScene } from '../src/game/WorldScene';
import Phaser from 'phaser/dist/phaser.js';
import { saveNow, setAutosave } from '../src/core/autosave';
import { emit } from '../src/core/bus';
import { settings } from '../src/core/settings';
import { ch2State, newState, S, setState, type GameState } from '../src/core/state';
import { MAP, NPC, resetNpcs, syncEtch } from '../src/data/world';
import { doInteract } from '../src/game/actions';
import { held } from '../src/game/input';
import { rt } from '../src/game/runtime';
import { placeLoaded } from '../src/game/travel';
import { isCardOpen } from '../src/ui/cards';
import { initHud } from '../src/ui/hud';
import { advanceScene, initScenePlayer, isSceneActive, playScene, stopScene } from '../src/ui/scene';

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');

let game: Phaser.Game;
let now = 1000;
const errors: string[] = [];
const frames = (n: number) => {
  for (let i = 0; i < n && errors.length === 0; i++) {
    now += 16.7;
    try {
      game.step(now, 16.7);
    } catch (e) {
      errors.push(`${(e as Error).message} @ ${MAP.id}`);
    }
  }
};
const world = () => game.scene.getScene('world') as unknown as { mover: { reset(): void }; npcImg: Map<string, { x: number; y: number }> };
function playOut(): void {
  for (let k = 0; k < 300 && (isSceneActive() || isCardOpen()); k++) {
    if (isCardOpen()) document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    else advanceScene();
    frames(3);
  }
  frames(30);
}
function walk(dir: 'up' | 'down', until: () => boolean): void {
  held.push(dir);
  for (let i = 0; i < 300 && !until() && errors.length === 0; i++) frames(1);
  held.length = 0;
  frames(40);
}
/** 跟 main.ts 的 start() 一樣的開局／讀檔流程（不含標題畫面與 HUD 細節）。 */
function start(loaded: GameState | null): void {
  stopScene();
  setState(loaded ?? newState());
  placeLoaded(S);
  syncEtch(S.etch);
  resetNpcs();
  held.length = 0;
  setAutosave(true);
  emit('reset');
  saveNow();
  if (!loaded) playScene('p_s1');
}

beforeAll(async () => {
  document.body.innerHTML = body;
  initScenePlayer();
  initHud(false);
  settings.textSpeed = 'instant';
  game = new Phaser.Game({ type: Phaser.CANVAS, parent: 'stage', width: 320, height: 240, scene: [WorldScene], banner: false, audio: { noAudio: true }, input: { keyboard: false } } as Phaser.Types.Core.GameConfig);
  await new Promise<void>((r) => game.events.once('ready', () => r()));
  game.loop.stop();
  frames(3);
});

afterAll(() => {
  game?.destroy(true);
  restoreCanvas();
  setAutosave(false);
  settings.reduceMotion = false;
});

test('walking through doors changes maps without crashing, with and without fades', () => {
  start(null);
  playOut();
  doInteract(NPC.find((n) => n.id === 'guard')!);
  playOut();
  walk('up', () => S.map !== 'M01');
  expect({ map: MAP.id, traveling: rt.traveling, errors }).toEqual({ map: 'M02', traveling: false, errors: [] });
  playOut();
  settings.reduceMotion = true;
  S.x = 15;
  S.y = 10;
  world().mover.reset();
  walk('down', () => S.map !== 'M02');
  expect({ map: MAP.id, traveling: rt.traveling, errors }).toEqual({ map: 'M03', traveling: false, errors: [] });
  settings.reduceMotion = false;
  playOut();
});

test('Continue on the map already shown draws the saved chapter’s NPCs', () => {
  errors.length = 0;
  start({ ...ch2State() });
  frames(5);
  const sprites = [...world().npcImg.entries()].map(([id, img]) => `${id}@${img.x / 16},${(img.y + 7) / 16}`).sort();
  expect(sprites).toEqual(NPC.map((n) => `${n.id}@${n.x},${n.y}`).sort());
  expect(errors).toEqual([]);
});
