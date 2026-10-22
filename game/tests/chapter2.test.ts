import { afterEach, beforeEach, expect, test } from 'bun:test';
import { setAutosave } from '../src/core/autosave';
import { on } from '../src/core/bus';
import { SAVE_KEY } from '../src/core/save';
import { setLang, t } from '../src/core/i18n';
import { ch2State, fmtClock, newState, S, setState, type EvidenceItem } from '../src/core/state';
import { MAPS } from '../src/data/maps';
import { loadMap, NPC, refreshNpcs } from '../src/data/world';
import { placeLoaded } from '../src/game/travel';
import { isCardOpen } from '../src/ui/cards';
import { advanceScene, isSceneActive, stopScene } from '../src/ui/scene';
import { $, lineById, play, recognizeIn, resetWorld, submitRC, talk, untilChoice, untilLine, walkTo } from './drive';

beforeEach(() => {
  resetWorld();
  setState(ch2State());
  placeLoaded(S);
});

afterEach(() => {
  stopScene();
  setAutosave(false);
  setLang('zh-TW');
  loadMap('M03');
});

const etch07 = () => MAPS.M03.objects.find((o) => o.id === 'ETCH-07')!;

test('submitting the right conclusion plays the C2-07 cutscene and sends you back to the office', () => {
  S.clues = ['spc', 'fdc', 'ring'];
  S.flags = ['ev_unlocked', 'seen_c2_report_spc', 'seen_c2_report_ring'];
  submitRC();
  expect(etch07().st).toBe('inhibit');
  play();
  expect(etch07().st).toBe('run');
  expect([S.map, S.x, S.y, S.suit]).toEqual(['M03', 3, 4, false]);
  expect(S.sanity).toBe(85);
  expect(S.rel.bear).toBe(10);
  expect(S.flags).toEqual(expect.arrayContaining(['c2_bear_here', 'c2_standup_call']));
  expect(fmtClock(S.sec).startsWith('07:40')).toBe(true);
});

test('chatting with an ally helps once per chapter', () => {
  for (const [id, after] of [['fang', 85], ['kevin', 90], ['fse', 95]] as const) {
    talk(id);
    play();
    expect({ id, sanity: S.sanity }).toEqual({ id, sanity: after });
    talk(id);
    play();
    expect({ id, sanity: S.sanity }).toEqual({ id, sanity: after });
  }
});

test('the prologue has no ally chats', () => {
  setState(newState());
  S.map = 'M03';
  placeLoaded(S);
  talk('fang');
  play();
  expect(S.sanity).toBe(80);
});

test('Bear stands at ETCH-07 after the cutscene', () => {
  S.flags = ['c2_bear_here'];
  refreshNpcs(S, true);
  const bear = NPC.find((n) => n.id === 'bear');
  expect(bear && [bear.x, bear.y, bear.dir]).toEqual([26, 6, 'up']);
});

/* ===== C2-08 到 C2-10：晨會 ===== */

const ALL = ['E-C2-01', 'E-C2-02', 'E-C2-03', 'E-C2-04'];
const ev = (id: string): EvidenceItem => ({ id, time: '03:05', source: 'chat', speaker: 'me', zh: id, en: id });

/** 剛破案、從 Fab 回到辦公室：理智 70、ETCH-07 修好、等 8 點晨會。 */
function backInOffice(evidence: string[]): void {
  setState({ ...ch2State(), sanity: 70, solved: true, etch: 'fixed', flags: ['ev_unlocked', 'c2_bear_here', 'c2_standup_call'], evidence: evidence.map(ev) });
  placeLoaded(S);
}
const recognizeBoth = () => ({ ...recognizeIn('c2_standup', 'credit_stealing'), ...recognizeIn('c2_standup', 'gaslighting') });

/** 晨會一路玩到試玩結束卡關掉；回傳回到標題畫面的次數。 */
function standup(picks: string[], recognize: Record<string, string> = {}): number {
  let toTitle = 0;
  const off = on('toTitle', () => toTitle++);
  walkTo(3, 13);
  expect(isSceneActive()).toBe(true);
  play(picks, recognize);
  off();
  return toTitle;
}

/** 每一種選擇之後都一樣：會議紀錄、C2-10、試玩結束。 */
function expectEnding(toTitle: number): void {
  expect(S.evidence.filter((e) => e.source === 'meeting').map((e) => e.id)).toEqual(['c2_standup-3', 'c2_standup-5']);
  expect(toTitle).toBe(1);
  expect(S.flags).toEqual(expect.arrayContaining(['demo_done', 'c2_after', 'seen_c2_standup']));
  expect(fmtClock(S.sec).startsWith('08:30')).toBe(true);
  expect([S.map, S.x, S.y]).toEqual(['M03', 3, 4]);
}

test('walking into the meeting room starts the stand-up only after the cutscene', () => {
  walkTo(3, 13);
  expect(isSceneActive()).toBe(false);
  backInOffice([]);
  walkTo(3, 13);
  expect(isSceneActive()).toBe(true);
  expect(S.flags).toContain('seen_c2_standup');
});

test('pulling up the LINE messages: recognized tactics cost half, Wang loses the most', () => {
  backInOffice(ALL);
  const n = standup(['line'], recognizeBoth());
  expect(S.sanity).toBe(70 - 6 - 6 + 10 + 10);
  expect(S.rel.boss).toBe(-25);
  expect(S.flags).toContain('confronted_publicly');
  expectEnding(n);
});

test('pulling up the LINE messages without recognizing the tactics', () => {
  backInOffice(ALL);
  const n = standup(['line']);
  expect(S.sanity).toBe(70 - 12 - 12 + 10 + 10);
  expectEnding(n);
});

test('without the 04:32 report the LINE option is disabled; the email still carries weight', () => {
  backInOffice(['E-C2-01', 'E-C2-02']);
  walkTo(3, 13);
  untilChoice();
  expect($<HTMLButtonElement>('#dlg-choices [data-choice="line"]').disabled).toBe(true);
  stopScene();
  backInOffice(['E-C2-01', 'E-C2-02']);
  const n = standup(['email']);
  expect(S.sanity).toBe(70 - 24 + 8 + 10);
  expect(S.rel.boss).toBe(-5);
  expect(S.flags).toContain('paper_trail');
  expectEnding(n);
});

test('a thin email gives no sanity and is flagged as thin', () => {
  backInOffice(['E-C2-01']);
  const n = standup(['email']);
  expect(S.sanity).toBe(70 - 24 + 0 + 10);
  expect(S.rel.boss).toBe(-5);
  expect(S.flags).toContain('paper_trail_thin');
  expect(S.flags).not.toContain('paper_trail');
  expectEnding(n);
});

test('letting it go costs sanity and pleases Wang', () => {
  backInOffice(ALL);
  const n = standup(['drop']);
  expect(S.sanity).toBe(70 - 24 - 5 + 10);
  expect(S.rel.boss).toBe(5);
  expect(S.flags).toContain('let_it_go');
  expectEnding(n);
});

test('losing all sanity at the stand-up: forced leave first, then the stand-up goes on', () => {
  backInOffice(ALL);
  S.sanity = 10;
  walkTo(3, 13);
  untilLine('c2_standup-3');
  advanceScene();
  expect(isCardOpen()).toBe(true);
  expect($('#card').textContent).toContain(t('card.forcedTitle'));
  expect([S.sanity, S.zeroCount]).toEqual([40, 1]);
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
  expect($('#dlg-text').textContent).toBe(lineById('c2_standup-4').zh);
});

test('losing all sanity at the stand-up a second time is Burnout', () => {
  let toTitle = 0;
  const off = on('toTitle', () => toTitle++);
  setAutosave(true);
  backInOffice(ALL);
  S.sanity = 10;
  S.zeroCount = 1;
  walkTo(3, 13);
  expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
  untilLine('c2_standup-3');
  advanceScene();
  expect($('#card').textContent).toContain(t('card.burnoutTitle'));
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
  expect(toTitle).toBe(1);
  off();
});
