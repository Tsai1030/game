import { afterEach, beforeEach, expect, test } from 'bun:test';
import { setAutosave } from '../src/core/autosave';
import { setLang } from '../src/core/i18n';
import { settings } from '../src/core/settings';
import { newState, S, setState } from '../src/core/state';
import type { ScriptLine } from '../src/data/script';
import { SCENES } from '../src/data/story';
import { loadMap, NPC, OBJ, refreshNpcs } from '../src/data/world';
import { doInteract } from '../src/game/actions';
import { rt } from '../src/game/runtime';
import { onArrive, placeLoaded, setFader } from '../src/game/travel';
import { fireTrigger } from '../src/game/travel';
import { walkBeats } from '../src/systems/script';
import { isCardOpen } from '../src/ui/cards';
import { isDialogOpen } from '../src/ui/dialog';
import { advanceScene, initScenePlayer, isSceneActive, playScene, stopScene } from '../src/ui/scene';

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;
const CJK = /[㐀-鿿]/;

beforeEach(() => {
  document.body.innerHTML = body;
  stopScene();
  initScenePlayer();
  setFader(null);
  rt.traveling = false;
  settings.textSpeed = 'instant';
  localStorage.clear();
});

afterEach(() => {
  stopScene();
  setAutosave(false);
  setLang('zh-TW');
  loadMap('M03');
});

/** 某段劇情裡標了某種話術的那一句。 */
const tacticLine = (scene: string, tactic: string): ScriptLine => {
  let found: ScriptLine | null = null;
  walkBeats(SCENES[scene]!, (b) => {
    if ('line' in b && b.line.tactic === tactic) found = b.line;
  });
  return found!;
};

let checkText = false;
/** 一路播到劇情結束：遇到選項就照 picks 選，遇到卡片就按 Enter，指定的台詞會先辨識話術。 */
function play(picks: string[] = [], recognize: Record<string, string> = {}): void {
  for (let k = 0; k < 300 && (isSceneActive() || isCardOpen()); k++) {
    // 遊戲畫面每格都會更新 NPC 清單；這裡每推進一步也更新一次。
    refreshNpcs(S);
    if (checkText) for (const sel of ['#dlg-text', '#dlg-who', '#card']) expect({ sel, text: $(sel).textContent, cjk: CJK.test($(sel).textContent ?? '') }).toMatchObject({ cjk: false });
    if (isCardOpen()) {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
      continue;
    }
    const choices = [...document.querySelectorAll<HTMLButtonElement>('#dlg-choices button')];
    if (!$('#dlg-choices').hidden && choices.length) {
      const id = picks.shift() ?? choices.find((c) => !c.disabled)!.dataset.choice!;
      $<HTMLButtonElement>(`#dlg-choices [data-choice="${id}"]`).click();
      continue;
    }
    const tactic = Object.entries(recognize).find(([text]) => $('#dlg-text').textContent === text)?.[1];
    if (tactic && !$('#dlg-rec').hidden) {
      $<HTMLButtonElement>('#dlg-rec').click();
      $<HTMLButtonElement>(`#dlg-pick [data-tactic="${tactic}"]`).click();
    }
    advanceScene();
  }
  expect(isSceneActive() || isCardOpen() || isDialogOpen()).toBe(false);
}

/** 走到 (x, y)：跟遊戲畫面一樣，先看是不是門，再看有沒有觸發劇情。 */
function walkTo(x: number, y: number): void {
  S.x = x;
  S.y = y;
  if (!onArrive()) fireTrigger();
}
/** 跟 NPC 說話（遊戲畫面每格都會更新 NPC 清單，這裡先更新一次）。 */
const talk = (id: string) => {
  refreshNpcs(S);
  doInteract(NPC.find((n) => n.id === id)!);
};
const use = (id: string) => doInteract(OBJ.find((o) => o.id === id)!);

function newGame(): void {
  setState(newState());
  placeLoaded(S);
  playScene('p_s1');
  play();
}

/** 序章的標準路線，直到第 2 章開始。stay 為 true 時選留下來加班。 */
function prologue(stay = false): void {
  newGame();
  talk('guard');
  play();
  walkTo(10, 0);
  expect(S.map).toBe('M02');
  play();
  talk('amy');
  play();
  walkTo(15, 11);
  expect(S.map).toBe('M03');
  play();
  use('pc');
  play();
  talk('kevin');
  play();
  talk('boss');
  play();
  talk('fang');
  const attack = tacticLine('p_s6', 'personal_attack');
  play([stay ? 'stay' : 'leave'], { [attack.zh]: 'personal_attack', [attack.en]: 'personal_attack' });
}

test('the prologue runs from the gate to Chapter 2 with the spec’s numbers', () => {
  prologue();
  expect([S.chapter, S.map]).toEqual(['ch2', 'M03']);
  expect(S.sanity).toBe(80 - 8 - 5 - 6 - 5 + 8 - 5);
  expect(S.flags).toEqual(expect.arrayContaining(['skill_asking_well', 'ev_unlocked', 'p_left_on_time']));
  expect(S.codex).toEqual(['personal_attack']);
  expect(S.rel.boss).toBe(-10);
  expect(S.rel.fang).toBe(25);
  const ids = S.evidence.map((e) => e.id);
  expect(ids.filter((id) => id.startsWith('p_s4-')).length).toBe(2);
  expect(S.evidence.some((e) => e.id.startsWith('p_s8-') && e.source === 'chat')).toBe(true);
  expect(S.etch).toBe('alarm');
});

test('asking Wang or Kevin about holding a lot only costs once', () => {
  newGame();
  talk('guard');
  play();
  walkTo(10, 0);
  play();
  talk('amy');
  play();
  walkTo(15, 11);
  play();
  use('pc');
  play();
  talk('kevin');
  play();
  talk('boss');
  play();
  expect(S.sanity).toBe(72);
  talk('boss');
  play();
  expect(S.sanity).toBe(72);
  talk('kevin');
  play();
  expect(S.rel.kevin).toBe(8);
  talk('kevin');
  play();
  expect(S.rel.kevin).toBe(8);
});

test('staying late costs sanity and pleases Wang', () => {
  prologue(true);
  expect(S.sanity).toBe(46);
  expect(S.rel.boss).toBe(5);
  expect(S.flags).toContain('p_stayed');
});

test('the doors stay locked until the badge and the end of orientation', () => {
  newGame();
  walkTo(10, 0);
  expect(S.map).toBe('M01');
  play();
  talk('guard');
  play();
  walkTo(10, 0);
  stopScene();
  S.flags = S.flags.filter((f) => f !== 'p_orient_done');
  walkTo(15, 11);
  expect(S.map).toBe('M02');
});

test('the whole prologue in English shows no Chinese text', () => {
  setLang('en');
  checkText = true;
  try {
    prologue();
  } finally {
    checkText = false;
  }
  expect(S.chapter).toBe('ch2');
});
