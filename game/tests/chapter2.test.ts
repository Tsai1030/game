import { afterEach, beforeEach, expect, test } from 'bun:test';
import { setAutosave } from '../src/core/autosave';
import { setLang } from '../src/core/i18n';
import { ch2State, fmtClock, newState, S, setState } from '../src/core/state';
import { MAPS } from '../src/data/maps';
import { loadMap, NPC, refreshNpcs } from '../src/data/world';
import { placeLoaded } from '../src/game/travel';
import { stopScene } from '../src/ui/scene';
import { play, resetWorld, submitRC, talk } from './drive';

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
