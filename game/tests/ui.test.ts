import { afterEach, beforeEach, expect, test } from 'bun:test';
import { getLang, setLang, t } from '../src/core/i18n';
import { settings, SETTINGS_KEY } from '../src/core/settings';
import { ch2State, newState, S, setState } from '../src/core/state';
import { loadMap, NPC, OBJ, resetNpcs, syncEtch } from '../src/data/world';
import { SCENES } from '../src/data/story';
import { cleanName } from '../src/core/name';
import { doInteract } from '../src/game/actions';
import { CODEX } from '../src/data/codex';
import { switchLang } from '../src/core/lang';
import { gainClue, requeueReports } from '../src/game/effects';
import { canOpenSettings } from '../src/game/runtime';
import { isDialogOpen } from '../src/ui/dialog';
import { advanceScene, initScenePlayer, playScene, pumpQueue, stopScene } from '../src/ui/scene';
import { refreshHud, verb } from '../src/ui/hud';
import { hideTitle, showTitle } from '../src/ui/title';
import { closeWin, initWin, rerenderWin, showTab } from '../src/ui/win';
import { openCodex, openEtch, openEvidence, openPC, openSettings, resetCaseUi } from '../src/ui/windows';

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
  stopScene();
  initScenePlayer();
  setState(ch2State());
  loadMap('M03');
  syncEtch('alarm');
  settings.textSpeed = 'instant';
  localStorage.clear();
});

afterEach(() => {
  stopScene();
  setLang('zh-TW');
});

const pick = (id: string, value: string) => {
  const sel = $<HTMLSelectElement>(id);
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
};
const toastText = () => $('#toast').textContent;
/** 劇情裡的台詞（只看最外層的 line 段落）。 */
const lines = (id: string) => SCENES[id]!.flatMap((b) => ('line' in b ? [b.line] : []));
const line = (id: string, i = 0) => lines(id)[i]!;
/** 一路按下去直到對話框關掉，回傳看過的每一句。 */
const playThrough = () => {
  const seen: string[] = [];
  for (let k = 0; k < 50 && isDialogOpen(); k++) {
    seen.push($('#dlg-text').textContent ?? '');
    advanceScene();
  }
  return seen;
};

test('a dialog walks through its lines and calls onEnd once', () => {
  let ended = 0;
  playScene('kevin', { onEnd: () => ended++ });
  expect($('#dlg-text').textContent).toBe(line('kevin').zh);
  for (let i = 0; i < 4; i++) advanceScene();
  expect(isDialogOpen()).toBe(false);
  expect(ended).toBe(1);
});

test('switching language relocalizes the open dialog line', () => {
  playScene('kevin');
  setLang('en');

  expect($('#dlg-text').textContent).toBe(line('kevin').en);
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
  playScene('kevin');
  expect(canOpenSettings()).toBe(true);
  openSettings();
  $<HTMLButtonElement>('#win [data-lang="en"]').click();
  expect($('#dlg-text').textContent).toBe(line('kevin').en);
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
  expect($('#dlg-text').textContent).toBe(line('rc_solved').zh);
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
  expect($('#dlg-text').textContent).toBe(line('rc_wrong').zh);
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

test('the shift-end countdown shows only on the night shift', () => {
  setState(newState());
  refreshHud();
  expect($('#shift-stat').hidden).toBe(true);
  setState(ch2State());
  loadMap('M03');
  refreshHud();
  expect($('#shift-stat').hidden).toBe(false);
});

test('a new game starts the prologue at the security gate', () => {
  expect(newState()).toMatchObject({ v: 3, map: 'M01', x: 10, y: 10, chapter: 'prologue', sec: 26400, etch: 'fixed', name: '' });
  expect(ch2State()).toMatchObject({ map: 'M03', x: 3, y: 4, chapter: 'ch2', sec: 2 * 3600 + 47 * 60, etch: 'alarm' });
});

test('the sanity bar shows the current value', () => {
  S.sanity = 37;
  refreshHud();
  expect($('#sanity-n').textContent).toBe('37');
  expect($('#sanity-bar').style.width).toBe('37%');
  expect($('#sanity').getAttribute('aria-label')).toBe(t('hud.sanityAria', { n: 37 }));
});

test('the evidence button appears once the log is unlocked', () => {
  refreshHud();
  expect($('#ev-btn').hidden).toBe(true);
  S.flags = ['ev_unlocked'];
  refreshHud();
  expect($('#ev-btn').hidden).toBe(false);
});

test('the evidence log lists items by time and filters by source', () => {
  openEvidence();
  expect($('#win-b').textContent).toContain(t('ev.empty'));
  closeWin();
  S.evidence = [
    { id: 'b', time: '05:10', source: 'chat', speaker: 'boss', zh: '嗯。', en: 'Mm.' },
    { id: 'a', time: '03:05', source: 'talk', speaker: 'me', zh: '甲', en: 'A' },
  ];
  openEvidence();
  const rows = () => [...document.querySelectorAll('#win .evlist li')].map((li) => (li as HTMLElement).dataset.id);
  expect(rows()).toEqual(['a', 'b']);
  $<HTMLButtonElement>('#win [data-src="chat"]').click();
  expect(rows()).toEqual(['b']);
});

test('the codex shows locked cards and opens unlocked ones', () => {
  openCodex();
  const cards = [...document.querySelectorAll<HTMLButtonElement>('#win [data-card]')];
  expect(cards.length).toBe(7);
  expect(cards.every((c) => c.textContent === t('codex.locked'))).toBe(true);
  closeWin();
  S.codex = ['family'];
  openCodex();
  $<HTMLButtonElement>('#win [data-card="family"]').click();
  expect($('#win-b').textContent).toContain(CODEX.family.what.zh);
  expect($('#win-b').textContent).toContain(CODEX.family.todo.zh);
  switchLang('en');
  expect($('#win [data-card="family"]').textContent).toBe(CODEX.family.name.en);
  expect($('#win-b').textContent).toContain(CODEX.family.todo.en);
});

test('talking to Kevin plays his scene and then gives the PM clue', () => {
  doInteract(NPC.find((n) => n.id === 'kevin')!);
  expect($('#dlg-text').textContent).toBe(line('kevin').zh);
  expect(playThrough()).toHaveLength(4);
  expect(S.clues).toContain('pm');
});

test('the boss with 3 clues plays the main lines, then the ready lines', () => {
  S.clues = ['spc', 'fdc', 'ring'];
  doInteract(NPC.find((n) => n.id === 'boss')!);
  expect(playThrough()).toEqual([...lines('boss_main'), ...lines('boss_ready')].map((l) => l.zh));
});

test('the first SPC clue queues a LINE report that plays once, after the window closes', () => {
  openPC();
  gainClue('spc');
  pumpQueue();
  expect(isDialogOpen()).toBe(false);
  closeWin();
  pumpQueue();
  expect($('#dlg-text').textContent).toBe(line('c2_report_spc').zh);
  playThrough();
  expect(S.evidence.map((e) => e.id)).toEqual(['E-C2-01', 'E-C2-02']);
  pumpQueue();
  expect(isDialogOpen()).toBe(false);
});

test('a report that was queued but never played comes back after Continue', () => {
  gainClue('ring');
  stopScene();
  requeueReports();
  pumpQueue();
  expect($('#dlg-text').textContent).toBe(line('c2_report_ring').zh);
  playThrough();
  stopScene();
  requeueReports();
  pumpQueue();
  expect(isDialogOpen()).toBe(false);
});

test('the same clue cannot be collected twice', () => {
  gainClue('spc');
  gainClue('spc');
  expect(toastText()).toBe(t('toast.clueDup'));
  expect(S.clues).toEqual(['spc']);
});

test('in the prologue the PE workstation and the suit lockers stay closed', () => {
  S.chapter = 'prologue';
  doInteract(OBJ.find((o) => o.id === 'locker')!);
  expect(S.scene).toBe('p_locker');
  expect(S.suit).toBe(false);
  stopScene();
  doInteract(OBJ.find((o) => o.id === 'pc')!);
  expect(S.scene).toBe('p_pc');
  expect($('#win').textContent).toBe('');
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

// 測試用劇情：台詞裡用到名字。
Object.assign(SCENES, { t_name: [{ line: { id: 'tn-1', speaker: 'sys', zh: '你好，{name}。', en: 'Hi, {name}.' } }] });

test('cleanName trims, drops control characters and keeps at most 12 characters', () => {
  expect(cleanName('  小明  ')).toBe('小明');
  expect(cleanName('a\u0007b')).toBe('ab');
  expect(cleanName('a   b')).toBe('a b');
  expect(cleanName('一二三四五六七八九十壹貳參肆伍')).toBe('一二三四五六七八九十壹貳');
  expect(cleanName('   ')).toBe('');
});

test('your name is the speaker label for your lines, shown as plain text', () => {
  S.name = '<b>x</b>';
  playScene('intro');
  advanceScene();
  expect($('#dlg-who').textContent).toBe('<b>x</b>');
  expect($('#dlg-who b')).toBeNull();
});

test('{name} in a line becomes your name, or the default name in the current language', () => {
  S.name = '小明';
  playScene('t_name');
  expect($('#dlg-text').textContent).toBe('你好，小明。');
  stopScene();
  S.name = '';
  playScene('t_name');
  expect($('#dlg-text').textContent).toBe('你好，林靜。');
  setLang('en');
  expect($('#dlg-text').textContent).toBe('Hi, Jing Lin.');
});

test('New Game asks for a name, and switching language keeps what you typed', () => {
  let got = null as string | null;
  showTitle({ canContinue: false, onContinue: () => {}, onNew: (n) => (got = n) });
  $<HTMLButtonElement>('#title [data-act="new"]').click();
  const input = $<HTMLInputElement>('#name-in');
  expect(input.maxLength).toBe(12);
  input.value = '小明';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  switchLang('en');
  expect($<HTMLInputElement>('#name-in').value).toBe('小明');
  expect($('#title [data-act="start"]').textContent).toBe('Start');
  $<HTMLButtonElement>('#title [data-act="start"]').click();
  expect(got).toBe('小明');
});

test('the Enter that confirms an IME candidate does not start the game', () => {
  let started = 0;
  showTitle({ canContinue: false, onContinue: () => {}, onNew: () => started++ });
  $<HTMLButtonElement>('#title [data-act="new"]').click();
  const input = $<HTMLInputElement>('#name-in');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
  expect(started).toBe(0);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(started).toBe(1);
});

test('Back on the name step returns to the title buttons', () => {
  showTitle({ canContinue: false, onContinue: () => {}, onNew: () => {} });
  $<HTMLButtonElement>('#title [data-act="new"]').click();
  $<HTMLButtonElement>('#title [data-act="back"]').click();
  expect($('#name-in')).toBeNull();
  expect($('#title [data-act="new"]')).not.toBeNull();
});
