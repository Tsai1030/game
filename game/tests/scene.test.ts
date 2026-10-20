import { afterEach, beforeEach, expect, test } from 'bun:test';
import { saveNow, setAutosave } from '../src/core/autosave';
import { L as tr, setLang, t } from '../src/core/i18n';
import { switchLang } from '../src/core/lang';
import { SAVE_KEY } from '../src/core/save';
import { settings } from '../src/core/settings';
import { newState, S, setState } from '../src/core/state';
import { CODEX } from '../src/data/codex';
import { SCENES } from '../src/data/story';
import { advanceScene, initScenePlayer, isSceneActive, playScene, stopScene } from '../src/ui/scene';

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;

// 測試專用劇情。
Object.assign(SCENES, {
  t_tactic: [
    { line: { id: 't-1', speaker: 'boss', zh: '我不是叫你去看了嗎？', en: "Didn't I tell you to check it?", tactic: 'gaslighting', sanity: -10 } },
    { line: { id: 't-2', speaker: 'me', zh: '……', en: '…' } },
  ],
  t_choice: [
    {
      choice: [
        { id: 'locked', zh: '鎖住的', en: 'Locked one', if: { flag: 'nope' }, do: [] },
        { id: 'open', zh: '可以選', en: 'Open one', do: [{ line: { id: 'c-1', speaker: 'me', zh: '選了', en: 'Chosen' } }] },
      ],
    },
  ],
});

beforeEach(() => {
  document.body.innerHTML = body;
  stopScene();
  initScenePlayer();
  setState(newState());
  settings.textSpeed = 'instant';
  localStorage.clear();
});

afterEach(() => {
  stopScene();
  setAutosave(false);
  setLang('zh-TW');
});

test('a scene plays line by line and choices render as buttons', () => {
  playScene('t_choice');
  const btns = [...document.querySelectorAll<HTMLButtonElement>('#dlg-choices button')];
  expect(btns.map((b) => b.textContent)).toEqual(['鎖住的', '可以選']);
  expect(btns[0]!.disabled).toBe(true);
  expect(btns[0]!.title).toBe(t('choice.locked'));
  btns[0]!.click();
  expect($('#dlg-choices').hidden).toBe(false);
  btns[1]!.click();
  expect($('#dlg-text').textContent).toBe('選了');
  advanceScene();
  expect(isSceneActive()).toBe(false);
});

test('the ? button shows only on tactic lines; a correct pick halves the loss', () => {
  playScene('t_tactic');
  expect($('#dlg-rec').hidden).toBe(false);
  $<HTMLButtonElement>('#dlg-rec').click();
  expect($('#dlg-pick').hidden).toBe(false);
  $<HTMLButtonElement>('#dlg-pick [data-tactic="gaslighting"]').click();
  expect($('#toast').textContent).toContain(t('codex.correct', { name: tr(CODEX.gaslighting.name) }));
  expect(S.codex).toEqual(['gaslighting']);
  advanceScene();
  expect(S.sanity).toBe(75);
  expect($('#dlg-rec').hidden).toBe(true);
});

test('a wrong pick says so and hides the ? button', () => {
  playScene('t_tactic');
  $<HTMLButtonElement>('#dlg-rec').click();
  $<HTMLButtonElement>('#dlg-pick [data-tactic="family"]').click();
  expect($('#toast').textContent).toBe(t('codex.wrong'));
  expect($('#dlg-rec').hidden).toBe(true);
  advanceScene();
  expect(S.sanity).toBe(70);
});

test('Note it adds the current line to the evidence log', () => {
  playScene('t_tactic');
  $<HTMLButtonElement>('#dlg-note').click();
  expect(S.evidence.map((e) => e.id)).toEqual(['note:t-1']);
  expect($('#toast').textContent).toBe(t('dlg.noted'));
});

test('switching language re-labels choices and keeps the picker open', () => {
  playScene('t_choice');
  switchLang('en');
  expect([...document.querySelectorAll('#dlg-choices button')].map((b) => b.textContent)).toEqual(['Locked one', 'Open one']);
  stopScene();
  S.codex = ['gaslighting'];
  playScene('t_tactic');
  $<HTMLButtonElement>('#dlg-rec').click();
  switchLang('zh-TW');
  expect($('#dlg-pick').hidden).toBe(false);
  expect($('#dlg-pick [data-tactic="gaslighting"]').textContent).toBe(CODEX.gaslighting.name.zh);
  expect($('#dlg-text').textContent).toBe('我不是叫你去看了嗎？');
});

test('a scene saves at its start, not in the middle, and again at its end', () => {
  setAutosave(true);
  const stored = () => JSON.parse(localStorage.getItem(SAVE_KEY)!);
  playScene('kevin');
  expect(stored().scene).toBe('kevin');
  expect(stored().clues).toEqual([]);
  S.sanity = 50;
  saveNow();
  expect(stored().sanity).toBe(80);
  for (let i = 0; i < 4; i++) advanceScene();
  expect(isSceneActive()).toBe(false);
  expect(stored().scene).toBeNull();
  expect(stored().clues).toEqual(['pm']);
});
