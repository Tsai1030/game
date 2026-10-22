import { afterEach, beforeEach, expect, test } from 'bun:test';
import { setAutosave } from '../src/core/autosave';
import { on } from '../src/core/bus';
import { setLang } from '../src/core/i18n';
import { parseSave, readSave, SAVE_KEY } from '../src/core/save';
import { ch2State, newState, S, setState, type GameState } from '../src/core/state';
import { browserStore } from '../src/core/storage';
import { MAPS } from '../src/data/maps';
import { loadMap, NPC, refreshNpcs } from '../src/data/world';
import { gainClue } from '../src/game/effects';
import { startGame } from '../src/game/session';
import { isSceneActive, stopScene } from '../src/ui/scene';
import { $, CJK, lineById, play, playUntil, prologue, recognizeIn, resetWorld, setCheckText, submitRC, talk, untilLine, use, walkTo } from './drive';
import { isCardOpen } from '../src/ui/cards';

/** 規格 §9 驗收：從「新遊戲」一路玩到「試玩結束」卡。 */

beforeEach(resetWorld);

afterEach(() => {
  stopScene();
  setAutosave(false);
  setLang('zh-TW');
  loadMap('M03');
});

/** 存檔來回一次要完全一樣。 */
const roundTrip = () => expect(parseSave(JSON.stringify(S))).toEqual(S);
const saved = (): GameState => {
  const r = readSave(browserStore());
  if (r.kind !== 'ok') throw new Error('no save');
  return r.state;
};

/** 第 2 章的標準路線：查案、換無塵衣、跟 Kevin 和芳姐聊、送出正確結論、看完過場。 */
function chapter2(): void {
  expect([S.chapter, S.map]).toEqual(['ch2', 'M03']);
  gainClue('spc');
  play();
  use('locker');
  play();
  gainClue('fdc');
  gainClue('ring');
  play();
  gainClue('map');
  talk('kevin');
  play();
  talk('fang');
  play();
  submitRC();
  play();
  expect(S.flags).toContain('c2_standup_call');
}

const recognizeStandup = () => ({ ...recognizeIn('c2_standup', 'credit_stealing'), ...recognizeIn('c2_standup', 'gaslighting') });

/** 晨會選「當場拿出 LINE」，停在試玩結束卡上回傳卡片文字，然後關掉卡片。 */
function standupToEnd(): { card: string; toTitle: number } {
  let toTitle = 0;
  const off = on('toTitle', () => toTitle++);
  walkTo(3, 13);
  playUntil(() => !!document.querySelector('#card .end-card'), ['line'], recognizeStandup());
  const card = $('#card').textContent ?? '';
  play();
  off();
  return { card, toTitle };
}

function fullDemo(): { card: string; toTitle: number } {
  prologue();
  roundTrip();
  chapter2();
  roundTrip();
  const r = standupToEnd();
  roundTrip();
  return r;
}

test('the whole demo plays from New Game to the end-of-demo card in Chinese', () => {
  const { card, toTitle } = fullDemo();
  expect(S.sanity).toBe(59 + 5 + 5 + 5 - 6 - 6 + 10 + 10);
  expect(card).toContain('59 → 82（+23）');
  expect([S.rel.boss, S.rel.bear, S.rel.fang]).toEqual([-35, 10, 25]);
  expect(S.codex.length).toBe(3);
  expect(toTitle).toBe(1);
  const save = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(save.flags).toContain('demo_done');
  expect(save.scene).toBeNull();
});

test('the whole demo in English shows no Chinese text', () => {
  setLang('en');
  setCheckText(true);
  try {
    const { card } = fullDemo();
    expect(CJK.test(card)).toBe(false);
    expect(card).toContain('59 → 82 (+23)');
  } finally {
    setCheckText(false);
  }
});

test('Continue after the cutscene puts you in the office with the stand-up still ahead', () => {
  prologue();
  chapter2();
  const s = saved();
  stopScene();
  setState(newState());
  loadMap('M01');
  startGame(s);
  expect([S.map, S.x, S.y]).toEqual(['M03', 3, 4]);
  expect(MAPS.M03.objects.find((o) => o.id === 'ETCH-07')!.st).toBe('run');
  refreshNpcs(S);
  expect(NPC.some((n) => n.id === 'bear')).toBe(true);
  expect(isSceneActive()).toBe(false);
  walkTo(3, 13);
  expect(isSceneActive()).toBe(true);
});

test('Continue in the middle of the stand-up replays it from the start without charging twice', () => {
  prologue();
  chapter2();
  const before = { sanity: S.sanity, rel: { ...S.rel }, evidence: [...S.evidence] };
  walkTo(3, 13);
  untilLine('c2_standup-4');
  expect(S.sanity).toBeLessThan(before.sanity);
  const s = saved();
  stopScene();
  startGame(s);
  expect($('#dlg-text').textContent).toBe(lineById('c2_standup-1').zh);
  expect(S.sanity).toBe(before.sanity);
  expect(S.rel).toEqual(before.rel);
  expect(S.evidence).toEqual(before.evidence);
});

test('Continue after the demo shows the end card again, then goes back to the title', () => {
  let toTitle = 0;
  const off = on('toTitle', () => toTitle++);
  startGame({ ...ch2State(), flags: ['ev_unlocked', 'demo_done', 'c2_after'], chapterSanity: 59, sanity: 82 });
  expect(document.querySelector('#card .end-card')).not.toBeNull();
  play();
  expect(toTitle).toBe(1);
  off();
});

test('Continue fires a trigger that was pending when the game closed', () => {
  startGame({ ...newState(), map: 'M02', x: 9, y: 6, flags: ['p_badge'] });
  expect(isSceneActive()).toBe(true);
  expect(S.flags).toContain('seen_p_s2');
});

/* ===== 最終審查修正 ===== */

/** 剛破案、從 Fab 回到辦公室、等 8 點晨會。 */
const backInOffice = (): GameState => ({ ...ch2State(), sanity: 70, solved: true, etch: 'fixed', flags: ['ev_unlocked', 'c2_bear_here', 'c2_standup_call'] });

test('closing the tab on the end card keeps the ending: Continue shows the card again', () => {
  startGame(backInOffice());
  walkTo(3, 13);
  playUntil(() => !!document.querySelector('#card .end-card'), ['drop']);
  const s = saved();
  expect([s.scene, s.sanity]).toEqual(['c2_demo_end', S.sanity]);
  expect(s.flags).toContain('demo_done');
  stopScene();
  startGame(s);
  expect(document.querySelector('#card .end-card')).not.toBeNull();
});

test('a save that solved Case 03 before this version plays the cutscene on Continue and reaches the stand-up', () => {
  const { chapterSanity: _cs, ...rest } = { ...ch2State(), solved: true, etch: 'fixed' as const, clues: ['spc', 'fdc', 'ring'], flags: ['ev_unlocked', 'seen_c2_report_spc', 'seen_c2_report_ring'] };
  const s = parseSave(JSON.stringify({ ...rest, v: 3 }))!;
  startGame(s);
  play();
  expect(S.flags).toEqual(expect.arrayContaining(['c2_bear_here', 'c2_standup_call']));
  walkTo(3, 13);
  expect(isSceneActive()).toBe(true);
});

test('a LINE report still waiting when you submit plays before the cutscene', () => {
  startGame({ ...ch2State(), clues: ['fdc', 'ring', 'map'], flags: ['ev_unlocked', 'seen_c2_report_ring'] });
  gainClue('spc');
  submitRC();
  expect($('#dlg-text').textContent).toBe(lineById('c2_report_spc-1').zh);
  play();
  expect(S.flags).toEqual(expect.arrayContaining(['seen_c2_report_spc', 'c2_standup_call']));
});

test('after the case is closed, new clues and their LINE reports no longer come in', () => {
  startGame({ ...backInOffice(), clues: ['spc', 'fdc', 'map'], flags: ['ev_unlocked', 'c2_bear_here', 'c2_standup_call', 'seen_c2_report_spc'] });
  gainClue('ring');
  play();
  expect(S.clues).not.toContain('ring');
  expect(S.evidence.map((e) => e.id)).not.toContain('E-C2-03');
  expect(isCardOpen() || isSceneActive()).toBe(false);
});
