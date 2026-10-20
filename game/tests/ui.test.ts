import { afterEach, beforeEach, expect, test } from 'bun:test';
import { getLang, setLang, t } from '../src/core/i18n';
import { settings, SETTINGS_KEY } from '../src/core/settings';
import { newState, S, setState } from '../src/core/state';
import { NPC, OBJ, resetNpcs, syncEtch } from '../src/data/world';
import { story } from '../src/data/story';
import { gainClue } from '../src/game/effects';
import { canOpenSettings } from '../src/game/runtime';
import { advanceDialog, initDialog, isDialogOpen, relocalizeDialog, say } from '../src/ui/dialog';
import { verb } from '../src/ui/hud';
import { hideTitle, showTitle } from '../src/ui/title';
import { closeWin, initWin, rerenderWin, showTab } from '../src/ui/win';
import { openEtch, openPC, openSettings, resetCaseUi } from '../src/ui/windows';

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
// 拿掉 <script>，避免 happy-dom 試著載入 main.ts。
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;

beforeEach(() => {
  document.body.innerHTML = body;
  // 模組層級的狀態會跨測試保留，先把上一個測試開著的視窗與標題畫面關掉。
  closeWin();
  hideTitle();
  initWin(() => {});
  initDialog();
  setState(newState());
  syncEtch('alarm');
  settings.textSpeed = 'instant';
  localStorage.clear();
});

afterEach(() => {
  while (isDialogOpen()) advanceDialog();
  setLang('zh-TW');
});

const pick = (id: string, value: string) => {
  const sel = $<HTMLSelectElement>(id);
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
};
const toastText = () => $('#toast').textContent;

test('a dialog walks through its lines and calls onEnd once', () => {
  let ended = 0;
  say(story.kevin, { onEnd: () => ended++ });
  expect($('#dlg-text').textContent).toBe(story.kevin[0]!.zh);
  for (let i = 0; i < 4; i++) advanceDialog();
  expect(isDialogOpen()).toBe(false);
  expect(ended).toBe(1);
});

test('switching language relocalizes the open dialog line', () => {
  say(story.kevin);
  setLang('en');
  relocalizeDialog();
  expect($('#dlg-text').textContent).toBe(story.kevin[0]!.en);
  expect($('#dlg-who').textContent).toBe('Kevin');
});

test('the conclusion form keeps its picks across a language switch', () => {
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', 'focus_ring_eol');
  setLang('en');
  rerenderWin();
  expect($<HTMLSelectElement>('#rc-tool').value).toBe('ETCH-07');
  expect($<HTMLSelectElement>('#rc-ch').value).toBe('PM-B');
  expect($<HTMLSelectElement>('#rc-cause').value).toBe('focus_ring_eol');
  expect($('#win-b').textContent).toContain('The culprit is');
});

test('the language toggle in a window header switches language and keeps the picks', () => {
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', 'focus_ring_eol');
  $<HTMLButtonElement>('#win [data-langtoggle]').click();
  expect(getLang()).toBe('en');
  expect($<HTMLSelectElement>('#rc-ch').value).toBe('PM-B');
  expect($('#win-b').textContent).toContain('The culprit is');
  expect(localStorage.getItem(SETTINGS_KEY)).toContain('"lang":"en"');
});

test('settings can be opened mid-dialog and switching there relocalizes the dialog', () => {
  say(story.kevin);
  expect(canOpenSettings()).toBe(true);
  openSettings();
  $<HTMLButtonElement>('#win [data-lang="en"]').click();
  expect($('#dlg-text').textContent).toBe(story.kevin[0]!.en);
  expect($('#win .win-h b').textContent).toBe('Settings');
});

test('submitting with too few clues asks for more evidence', () => {
  S.clues = ['spc', 'fdc'];
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', 'focus_ring_eol');
  $<HTMLButtonElement>('#rc-go').click();
  expect(toastText()).toBe(t('toast.rcNeedEvidence'));
  expect(S.solved).toBe(false);
});

test('submitting the right answer with 3 clues solves the case', () => {
  S.clues = ['spc', 'fdc', 'ring'];
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', 'focus_ring_eol');
  $<HTMLButtonElement>('#rc-go').click();
  expect(S.solved).toBe(true);
  expect(OBJ.find((o) => o.id === 'ETCH-07')!.st).toBe('run');
  expect($('#dlg-text').textContent).toBe(story.rc_solved[0]!.zh);
});

test('a wrong cause costs a coffee and gets scolded', () => {
  S.clues = ['spc', 'fdc', 'ring'];
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', 'recipe_changed');
  $<HTMLButtonElement>('#rc-go').click();
  expect(S.coffee).toBe(2);
  expect($('#dlg-text').textContent).toBe(story.rc_wrong[0]!.zh);
});

test('a new game clears the previous conclusion picks and NPC facing', () => {
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', 'focus_ring_eol');
  NPC[0]!.dir = 'left';
  resetCaseUi();
  resetNpcs();
  openPC();
  showTab(2);
  expect($<HTMLSelectElement>('#rc-tool').value).toBe('');
  expect($<HTMLSelectElement>('#rc-ch').value).toBe('');
  expect($<HTMLSelectElement>('#rc-cause').value).toBe('');
  expect(String(NPC[0]!.dir)).toBe('down');
});

test('grep highlighting keeps “>” readable in log lines', () => {
  openEtch();
  showTab(1);
  const grep = $<HTMLInputElement>('#grep');
  grep.value = 't';
  grep.dispatchEvent(new Event('input', { bubbles: true }));
  const line = $('#log .ln[data-i="1"]');
  expect(line.textContent).toContain('21.6 W > limit 20.0 W');
  expect(line.querySelectorAll('mark').length).toBeGreaterThan(0);
});

test('the same clue cannot be collected twice', () => {
  gainClue('spc');
  gainClue('spc');
  expect(toastText()).toBe(t('toast.clueDup'));
  expect(S.clues).toEqual(['spc']);
});

test('the locker prompt follows the suit state', () => {
  const locker = OBJ.find((o) => o.id === 'locker')!;
  expect(verb(locker)).toBe(t('verb.suitOn'));
  S.suit = true;
  expect(verb(locker)).toBe(t('verb.suitOff'));
});

test('a corrupt save disables Continue and shows a notice', () => {
  showTitle({ canContinue: false, notice: t('toast.saveCorrupt'), onContinue: () => {}, onNew: () => {} });
  expect($<HTMLButtonElement>('#title [data-act="continue"]').disabled).toBe(true);
  expect($('#title').textContent).toContain(t('toast.saveCorrupt'));
});

test('choosing English in settings switches and stores the language', () => {
  openSettings();
  $<HTMLButtonElement>('#win [data-lang="en"]').click();
  expect(getLang()).toBe('en');
  expect(localStorage.getItem(SETTINGS_KEY)).toContain('"lang":"en"');
});
