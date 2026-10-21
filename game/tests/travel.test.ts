import { afterEach, beforeEach, expect, test } from 'bun:test';
import { setAutosave } from '../src/core/autosave';
import { setLang, t } from '../src/core/i18n';
import { parseSave, SAVE_KEY } from '../src/core/save';
import { settings } from '../src/core/settings';
import { ch2State, S, setState } from '../src/core/state';
import { loadMap, MAP, MW, OBJ } from '../src/data/world';
import { doInteract } from '../src/game/actions';
import { busy, rt } from '../src/game/runtime';
import { enterMap, fireTrigger, onArrive, placeLoaded, setFader, travel, tryExit } from '../src/game/travel';
import { TRIGGERS } from '../src/data/story';
import { showBanner } from '../src/ui/hud';
import { initScenePlayer, isSceneActive, stopScene } from '../src/ui/scene';

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;

beforeEach(() => {
  document.body.innerHTML = body;
  stopScene();
  initScenePlayer();
  setFader(null);
  rt.traveling = false;
  setState(ch2State());
  loadMap('M03');
  settings.textSpeed = 'instant';
  localStorage.clear();
});

afterEach(() => {
  stopScene();
  setFader(null);
  setAutosave(false);
  setLang('zh-TW');
  loadMap('M03');
});

test('an exit opens only when its condition holds', () => {
  expect(tryExit(12, 0)).toEqual({ kind: 'locked', scene: 'home_locked' });
  S.flags = ['home_open'];
  const r = tryExit(12, 0);
  expect(r?.kind === 'go' && r.exit.to).toBe('M04');
  expect(tryExit(3, 4)).toBeNull();
});

test('stepping onto a locked door plays its reason and stays on the map', () => {
  S.x = 12;
  S.y = 0;
  expect(onArrive()).toBe('locked');
  expect([S.map, MAP.id]).toEqual(['M03', 'M03']);
  expect(isSceneActive()).toBe(true);
});

test('entering a map loads it, moves the player and saves where you are', () => {
  setAutosave(true);
  enterMap('M02', 2, 10, 'up');
  expect(MW).toBe(18);
  expect([S.map, S.x, S.y, S.dir]).toEqual(['M02', 2, 10, 'up']);
  expect(parseSave(localStorage.getItem(SAVE_KEY))).toMatchObject({ map: 'M02', x: 2, y: 10 });
});

test('nothing else happens while a map change is under way', () => {
  let pending: { go: () => void; done: () => void } | null = null;
  setFader((go, done) => {
    pending = { go, done };
  });
  travel('M04', 5, 6, 'up');
  expect(busy()).toBe(true);
  const coffee = OBJ.find((o) => o.id === 'coffee')!;
  doInteract(coffee);
  expect(isSceneActive()).toBe(false);
  // 換地圖途中又來一個（例如劇情連續瞬移）：等這次換完再接著換，不會疊在一起。
  travel('M02', 2, 10, 'up');
  pending!.go();
  pending!.done();
  expect(S.map).toBe('M04');
  expect(busy()).toBe(true);
  pending!.go();
  pending!.done();
  expect(S.map).toBe('M02');
  expect(busy()).toBe(false);
});

test('a saved tile that is now a wall falls back to that map’s start', () => {
  setState({ ...ch2State(), x: 3, y: 10 });
  placeLoaded(S);
  expect([S.x, S.y]).toEqual([3, 4]);
  setState({ ...ch2State(), map: 'M02', x: 0, y: 0 });
  placeLoaded(S);
  expect([MAP.id, S.x, S.y]).toEqual(['M02', 2, 10]);
});

test('a trigger plays its scene where it is placed, and not while you are busy', () => {
  TRIGGERS.unshift({ scene: 'home_locked', map: 'M03', at: [3, 4, 1, 1], if: { notFlag: 't_seen' } });
  try {
    S.x = 3;
    S.y = 5;
    expect(fireTrigger()).toBe(false);
    S.y = 4;
    expect(fireTrigger()).toBe(true);
    expect(S.scene).toBe('home_locked');
    expect(fireTrigger()).toBe(false);
  } finally {
    TRIGGERS.shift();
  }
});

test('the location banner switches language while it is showing', () => {
  showBanner('loc.gate');
  expect($('#banner').hidden).toBe(false);
  expect($('#banner').textContent).toBe(t('loc.gate'));
  setLang('en');
  expect($('#banner').textContent).toBe('Security gate');
});
