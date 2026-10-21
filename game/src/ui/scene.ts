import { pauseAutosave, saveNow, setAutosave } from '../core/autosave';
import { emit } from '../core/bus';
import { L, t, type Params } from '../core/i18n';
import { clearSave } from '../core/save';
import { fmtClock, S } from '../core/state';
import { browserStore } from '../core/storage';
import { CASE, type ClueId } from '../data/case';
import { CODEX } from '../data/codex';
import type { Scene } from '../data/script';
import { ASKS, LABELS, SCENES, type Line } from '../data/story';
import { ScriptRunner, type Frame, type RunnerEvent } from '../systems/script';
import { hideCard, showCard } from './cards';
import { closeDialog, finishTyping, hideRecognize, initDialog, openDialog, renderChoices, renderLine } from './dialog';
import { refreshHud } from './hud';
import { toast } from './toast';

let runner: ScriptRunner | null = null;
let activeId: string | null = null;
let params: Params | undefined;
let onEnd: (() => void) | undefined;
const queue: string[] = [];
/** 過渡用：舊的 say() 呼叫轉成臨時劇情（Task 9 移除）。 */
const extra: Record<string, Scene> = {};

export const isSceneActive = (): boolean => runner !== null;

const scenes = () => ({ ...SCENES, ...extra });
/** 以 '__' 開頭的是臨時劇情，不記進存檔（讀檔時無法重播）。 */
const persistable = (id: string) => !id.startsWith('__');

function handle(ev: RunnerEvent): void {
  if (ev.kind === 'codex') toast(`${t('codex.correct', { name: L(CODEX[ev.id].name) })} ${L(CODEX[ev.id].what)}`, 'clue');
  else if (ev.kind === 'evidence') toast(t('dlg.noted'), 'clue');
  else if (ev.kind === 'clue') {
    const clue = CASE.clues[ev.id as ClueId];
    toast(t('toast.clueGot', { text: clue ? L(clue.t) : ev.id }), 'clue');
  }
}

function render(f: Frame): void {
  const evs = runner?.events() ?? [];
  for (const ev of evs) handle(ev);
  refreshHud();
  const zero = evs.find((e) => e.kind === 'zero');
  if (zero?.kind === 'zero' && zero.outcome === 'burnout') return burnout();
  if (zero) {
    // 第一次歸零：收起對話框，看完強制請假卡再接著播。
    closeDialog();
    showCard('card.forcedTitle', 'card.forcedBody', () => {
      openDialog();
      show(f);
    });
    return;
  }
  show(f);
}

function show(f: Frame): void {
  if (f.kind === 'line') renderLine(f.line, params, f.canRecognize);
  else if (f.kind === 'choice') renderChoices(f.options.map((o) => ({ id: o.id, label: { zh: o.zh, en: o.en }, enabled: o.enabled })));
  else if (f.kind === 'card') {
    closeDialog();
    showCard({ zh: f.card.zh, en: f.card.en }, null, () => {
      if (!runner) return;
      openDialog();
      render(runner.advance());
    });
  } else finish();
}

/** 第二次歸零：劇情中止，看完燃盡卡後刪除存檔、回標題畫面。存檔維持暫停，不會寫回。 */
function burnout(): void {
  closeDialog();
  runner = null;
  activeId = null;
  params = undefined;
  onEnd = undefined;
  S.scene = null;
  queue.length = 0;
  showCard('card.burnoutTitle', 'card.burnoutBody', () => {
    setAutosave(false);
    pauseAutosave(false);
    clearSave(browserStore());
    emit('toTitle');
  });
}

function finish(): void {
  const end = onEnd;
  closeDialog();
  runner = null;
  activeId = null;
  params = undefined;
  onEnd = undefined;
  S.scene = null;
  pauseAutosave(false);
  saveNow();
  end?.();
}

/**
 * 播一段劇情。開始時先存檔（記下這段劇情，讀檔時從開頭重播），
 * 進行中暫停自動存檔，結束後再存。已經有劇情在播時排到後面。
 */
export function playScene(id: string, opts: { params?: Params; onEnd?: () => void } = {}): void {
  if (runner) {
    queueScene(id);
    return;
  }
  if (persistable(id)) S.scene = id;
  saveNow();
  pauseAutosave(true);
  activeId = id;
  params = opts.params;
  onEnd = opts.onEnd;
  runner = new ScriptRunner({ state: () => S, clock: () => fmtClock(S.sec).slice(0, 5), scenes: scenes(), asks: ASKS, labels: LABELS });
  openDialog();
  render(runner.start(id));
}

/** 點對話框／按互動鍵：還在打字就先顯示整句，否則往下一句。 */
export function advanceScene(): void {
  if (!runner || finishTyping()) return;
  if (runner.current().kind === 'line') render(runner.advance());
}

function chooseScene(id: string): void {
  if (runner) render(runner.choose(id));
}

function recognizeScene(id: Parameters<ScriptRunner['recognize']>[0]): void {
  if (!runner) return;
  const ok = runner.recognize(id);
  hideRecognize();
  for (const ev of runner.events()) handle(ev);
  if (!ok) toast(t('codex.wrong'));
}

function noteScene(): void {
  if (!runner) return;
  runner.note();
  for (const ev of runner.events()) handle(ev);
}

/** 等不忙的時候再播；同一段不會重複排入。 */
export function queueScene(id: string): void {
  if (activeId !== id && !queue.includes(id)) queue.push(id);
}

/** 由遊戲迴圈在不忙時呼叫。 */
export function pumpQueue(): void {
  if (runner) return;
  const id = queue.shift();
  if (id) playScene(id);
}

/** 強制結束目前劇情（測試、回標題用）。 */
export function stopScene(): void {
  hideCard();
  if (runner) {
    closeDialog();
    runner = null;
    activeId = null;
    onEnd = undefined;
    S.scene = null;
    pauseAutosave(false);
  }
  queue.length = 0;
}

/** 過渡用：把一串台詞當成臨時劇情播放（Task 9 移除）。 */
export function say(lines: Line[], opts: { params?: Params; onEnd?: () => void } = {}): void {
  extra.__say = lines.map((l, i) => ({ line: { ...l, id: `__say-${i}` } }));
  playScene('__say', opts);
}

export function initScenePlayer(): void {
  initDialog({ advance: advanceScene, choose: chooseScene, recognize: recognizeScene, note: noteScene });
}
