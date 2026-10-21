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
