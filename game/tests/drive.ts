import { expect } from 'bun:test';
import { S } from '../src/core/state';
import { settings } from '../src/core/settings';
import type { ScriptLine } from '../src/data/script';
import { SCENES } from '../src/data/story';
import { NPC, OBJ, refreshNpcs } from '../src/data/world';
import { doInteract } from '../src/game/actions';
import { rt } from '../src/game/runtime';
import { fireTrigger, onArrive, setFader } from '../src/game/travel';
import { startGame } from '../src/game/session';
import { walkBeats } from '../src/systems/script';
import { isCardOpen } from '../src/ui/cards';
import { isDialogOpen } from '../src/ui/dialog';
import { advanceScene, initScenePlayer, isSceneActive, pumpQueue, stopScene } from '../src/ui/scene';
import { hideTitle } from '../src/ui/title';
import { closeWin, initWin, showTab } from '../src/ui/win';
import { openPC } from '../src/ui/windows';

/** 整套劇情的「自動玩」工具：序章、第 2 章與完整試玩測試共用。 */

const html = await Bun.file(new URL('../index.html', import.meta.url)).text();
// 拿掉 <script>，避免 happy-dom 試著載入 main.ts。
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1]!.replace(/<script[\s\S]*?<\/script>/g, '');
export const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;
export const CJK = /[㐀-鿿]/;

/** 每個測試前：重設畫面、視窗、劇情播放器；換地圖立即完成。 */
export function resetWorld(): void {
  document.body.innerHTML = body;
  closeWin();
  hideTitle();
  initWin(() => {});
  stopScene();
  initScenePlayer();
  setFader(null);
  rt.traveling = false;
  settings.textSpeed = 'instant';
  localStorage.clear();
}

/** 某段劇情裡標了某種話術的那一句。 */
export const tacticLine = (scene: string, tactic: string): ScriptLine => {
  let found: ScriptLine | null = null;
  walkBeats(SCENES[scene]!, (b) => {
    if ('line' in b && b.line.tactic === tactic) found = b.line;
  });
  return found!;
};

let checkText = false;
/** 開著時，play() 每一步都檢查對話框、說話者和卡片裡沒有中文。 */
export const setCheckText = (on: boolean): void => {
  checkText = on;
};

/**
 * 一路播到沒有劇情為止：遇到選項就照 picks 選，遇到卡片就按 Enter，指定的台詞先辨識話術。
 * 沒有劇情在播時，先讓排隊中的劇情（LINE 回報）播出來，跟遊戲畫面每格做的一樣。
 */
export function play(picks: string[] = [], recognize: Record<string, string> = {}): void {
  playUntil(() => false, picks, recognize);
  expect(isSceneActive() || isCardOpen() || isDialogOpen()).toBe(false);
}

/** 跟 play() 一樣往下播，但 stop() 成立時就停（例如停在試玩結束卡上檢查內容）。 */
export function playUntil(stop: () => boolean, picks: string[] = [], recognize: Record<string, string> = {}): void {
  for (let k = 0; k < 400; k++) {
    if (stop()) return;
    if (!isSceneActive() && !isCardOpen()) {
      pumpQueue();
      if (!isSceneActive()) break;
    }
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
}

/** 任何劇情裡（含巢狀分支）某個 id 的台詞。 */
export const lineById = (id: string): ScriptLine => {
  let found: ScriptLine | null = null;
  for (const sc of Object.values(SCENES))
    walkBeats(sc, (b) => {
      if ('line' in b && b.line.id === id) found = b.line;
    });
  if (!found) throw new Error(`no line ${id}`);
  return found;
};

/** 一直按下一句，直到對話框出現某一句台詞（中文）。 */
export function untilLine(id: string): void {
  const want = lineById(id).zh;
  for (let k = 0; k < 40 && $('#dlg-text').textContent !== want; k++) advanceScene();
  expect($('#dlg-text').textContent).toBe(want);
}

/** 一直按下一句，直到出現選項。 */
export function untilChoice(): void {
  for (let k = 0; k < 40 && $('#dlg-choices').hidden; k++) advanceScene();
  expect($('#dlg-choices').hidden).toBe(false);
}

/** 辨識某段劇情裡某種話術的那一句（中英文都認得）。 */
export const recognizeIn = (scene: string, tactic: string): Record<string, string> => {
  const l = tacticLine(scene, tactic);
  return { [l.zh]: tactic, [l.en]: tactic };
};

/** 走到 (x, y)：跟遊戲畫面一樣，先看是不是門，再看有沒有觸發劇情。 */
export function walkTo(x: number, y: number): void {
  S.x = x;
  S.y = y;
  if (!onArrive()) fireTrigger();
}

/** 跟 NPC 說話（遊戲畫面每格都會更新 NPC 清單，這裡先更新一次）。 */
export const talk = (id: string): void => {
  refreshNpcs(S);
  doInteract(NPC.find((n) => n.id === id)!);
};
export const use = (id: string): void => doInteract(OBJ.find((o) => o.id === id)!);

/** 下拉選單選一個值（觸發 change）。 */
export const pick = (sel: string, value: string): void => {
  const el = $<HTMLSelectElement>(sel);
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/** 在 PE 工作站填結論並送出（預設是正確答案）。 */
export function submitRC(cause = 'focus_ring_eol'): void {
  openPC();
  showTab(2);
  pick('#rc-tool', 'ETCH-07');
  pick('#rc-ch', 'PM-B');
  pick('#rc-cause', cause);
  $<HTMLButtonElement>('#rc-go').click();
}

/** 跟標題畫面按「新遊戲」一樣。 */
export function newGame(name = ''): void {
  startGame(null, name);
  play();
}

/** 序章的標準路線，直到第 2 章開始。stay 為 true 時選留下來加班。 */
export function prologue(stay = false, name = ''): void {
  newGame(name);
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
  play([stay ? 'stay' : 'leave'], recognizeIn('p_s6', 'personal_attack'));
}
