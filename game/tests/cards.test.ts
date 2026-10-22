import { afterEach, beforeEach, expect, test } from 'bun:test';
import { saveNow, setAutosave } from '../src/core/autosave';
import { on } from '../src/core/bus';
import { setLang, t } from '../src/core/i18n';
import { switchLang } from '../src/core/lang';
import { SAVE_KEY } from '../src/core/save';
import { settings } from '../src/core/settings';
import { ch2State, S, setState } from '../src/core/state';
import { SCENES } from '../src/data/story';
import { busy, canOpenSettings } from '../src/game/runtime';
import { isCardOpen, showCard } from '../src/ui/cards';
import { isDialogOpen } from '../src/ui/dialog';
import { advanceScene, initScenePlayer, isSceneActive, playScene, stopScene } from '../src/ui/scene';

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;
const press = (code: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));

// 測試專用劇情：第一句扣 10 點理智。
Object.assign(SCENES, {
  t_zero: [
    { line: { id: 'z-1', speaker: 'boss', zh: '這種小事也要問？', en: 'You need to ask about this?', sanity: -10 } },
    { line: { id: 'z-2', speaker: 'me', zh: '之後', en: 'Afterwards' } },
  ],
});

beforeEach(() => {
  document.body.innerHTML = body;
  stopScene();
  initScenePlayer();
  setState(ch2State());
  settings.textSpeed = 'instant';
  localStorage.clear();
});

afterEach(() => {
  stopScene();
  setAutosave(false);
  setLang('zh-TW');
});

test('hitting zero sanity the first time shows the forced-leave card, then the scene resumes', () => {
  S.sanity = 5;
  playScene('t_zero');
  advanceScene();
  expect(isCardOpen()).toBe(true);
  expect($('#card').textContent).toContain(t('card.forcedTitle'));
  expect(isDialogOpen()).toBe(false);
  expect(S.sanity).toBe(40);
  expect(S.zeroCount).toBe(1);
  $<HTMLButtonElement>('#card [data-act="close"]').click();
  expect(isCardOpen()).toBe(false);
  expect(isDialogOpen()).toBe(true);
  expect($('#dlg-text').textContent).toBe('之後');
});

test('hitting zero again shows the Burnout card, which clears the save and returns to the title', () => {
  let toTitle = 0;
  const off = on('toTitle', () => toTitle++);
  setAutosave(true);
  saveNow();
  expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
  S.sanity = 5;
  S.zeroCount = 1;
  playScene('t_zero');
  advanceScene();
  expect(isSceneActive()).toBe(false);
  expect(isCardOpen()).toBe(true);
  expect($('#card').textContent).toContain(t('card.burnoutTitle'));
  // 卡片一出現存檔就刪掉：玩家直接關分頁，也不能回到這段劇情。
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  expect(canOpenSettings()).toBe(false);
  press('Space');
  expect(isCardOpen()).toBe(false);
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  expect(toTitle).toBe(1);
  off();
});

test('a card blocks the player, relocalizes, and closes with Enter', () => {
  let closed = 0;
  showCard({ zh: '第一章', en: 'Chapter 1' }, { zh: '夜班開始。', en: 'The night shift begins.' }, () => closed++);
  expect(busy()).toBe(true);
  expect($('#card').textContent).toContain('第一章');
  switchLang('en');
  expect($('#card').textContent).toContain('Chapter 1');
  expect($('#card [data-act="close"]').textContent).toBe(t('card.continue'));
  press('Enter');
  expect(closed).toBe(1);
  expect(busy()).toBe(false);
  press('Enter');
  expect(closed).toBe(1);
});

/** 試玩結束卡用的狀態：本章從 59 到 77，王經理 −35，兩張卡。 */
const endState = () => {
  S.chapterSanity = 59;
  S.sanity = 77;
  S.rel = { ...S.rel, boss: -35 };
  S.codex = ['credit_stealing', 'personal_attack'];
};

test('the end-of-demo card sums up the chapter', () => {
  endState();
  playScene('c2_demo_end');
  expect(isCardOpen()).toBe(true);
  const text = $('#card').textContent!;
  expect(text).toContain('59 → 77（+18）');
  expect(text).toContain('王經理');
  expect(text).toContain('−35');
  expect(text).toContain('2/7');
  const teaser = SCENES.c2_demo_end!.find((b) => 'card' in b)!;
  expect(text).toContain('card' in teaser ? teaser.card.zh : 'missing');
});

test('closing the end card twice fast returns to the title once and saves no scene', () => {
  let toTitle = 0;
  const off = on('toTitle', () => toTitle++);
  setAutosave(true);
  endState();
  playScene('c2_demo_end');
  press('Enter');
  press('Enter');
  expect(toTitle).toBe(1);
  expect(isSceneActive()).toBe(false);
  expect(isCardOpen()).toBe(false);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).scene).toBeNull();
  off();
});

test('the end card switches language while open', () => {
  endState();
  playScene('c2_demo_end');
  switchLang('en');
  const text = $('#card').textContent!;
  expect(/[㐀-鿿]/.test(text)).toBe(false);
  expect(text).toContain('Manager Wang');
  expect(text).toContain('59 → 77 (+18)');
});
