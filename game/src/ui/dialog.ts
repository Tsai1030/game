import { on } from '../core/bus';
import { esc, fmt, L, t, type Bi, type Params } from '../core/i18n';
import { CPS, settings } from '../core/settings';
import { S, type TacticId } from '../core/state';
import { CODEX, TACTIC_IDS } from '../data/codex';
import type { Line } from '../data/story';
import { drawPortrait, type PortraitId } from '../render/portraits';
import { $ } from './dom';

/** 對話框只負責畫；流程（下一句、選項、辨識）由 ui/scene.ts 透過這些 handler 控制。 */
export interface DialogHandlers {
  advance(): void;
  choose(id: string): void;
  recognize(id: TacticId): void;
  note(): void;
}

export interface ChoiceView {
  id: string;
  label: Bi;
  enabled: boolean;
}

type LineView = { kind: 'line'; line: Line; params?: Params; canRecognize: boolean };
/** 選項畫面也記住上面那句台詞（prompt），切換語言時一起重畫；劇情一開始就是選項時沒有。 */
type View = LineView | { kind: 'choice'; options: ChoiceView[]; prompt: LineView | null };

let open = false;
let view: View | null = null;
let shown = 0;
let raf = 0;
let last = 0;
let pickerOpen = false;

export const isDialogOpen = (): boolean => open;

const lineText = (v: LineView): string => fmt(L(v.line), v.params);
const portraitOf = (l: Line): PortraitId => (l.speaker === 'me' ? (S.suit ? 'meSuit' : 'me') : l.speaker);

function tick(now: number): void {
  if (!open || view?.kind !== 'line') return;
  const dt = (now - last) / 1000;
  last = now;
  const full = lineText(view);
  if (shown < full.length) {
    shown = Math.min(full.length, shown + dt * CPS[settings.textSpeed]);
    $('#dlg-text').textContent = full.slice(0, Math.floor(shown));
  }
  raf = requestAnimationFrame(tick);
}

function renderPicker(): void {
  const el = $('#dlg-pick');
  el.hidden = !pickerOpen;
  if (!pickerOpen) return;
  el.innerHTML =
    `<p>${esc(t('codex.pick'))}</p><div class="pick-grid">` +
    TACTIC_IDS.map((id) => `<button data-tactic="${id}">${esc(S.codex.includes(id) ? L(CODEX[id].name) : t('codex.locked'))}</button>`).join('') +
    `</div>`;
}

/** 說話者、頭像和台詞；沒有台詞時全部清空。 */
function paintSpeaker(v: LineView | null, text: string): void {
  $('#dlg-who').textContent = v ? t('speaker.' + v.line.speaker) : '';
  const cv = $<HTMLCanvasElement>('#dlg-por');
  const ctx = cv.getContext('2d');
  if (ctx) {
    if (v) drawPortrait(ctx, portraitOf(v.line));
    else ctx.clearRect(0, 0, cv.width, cv.height);
  }
  $('#dlg-text').textContent = text;
}

/** 依目前狀態整個重畫（切換語言時也用這個，不重跑打字效果）。 */
function paint(typewriter: boolean): void {
  if (!view) return;
  const choices = $('#dlg-choices');
  if (view.kind === 'line') {
    const full = lineText(view);
    if (!typewriter || CPS[settings.textSpeed] === Infinity) shown = full.length;
    paintSpeaker(view, full.slice(0, Math.floor(shown)));
    choices.hidden = true;
    choices.innerHTML = '';
    $('#dlg-rec').hidden = !view.canRecognize;
    $('#dlg-note').hidden = false;
  } else {
    paintSpeaker(view.prompt, view.prompt ? lineText(view.prompt) : '');
    choices.hidden = false;
    choices.innerHTML = view.options
      .map((o) => `<button class="pbtn" data-choice="${esc(o.id)}"${o.enabled ? '' : ` disabled title="${esc(t('choice.locked'))}"`}>${esc(L(o.label))}</button>`)
      .join('');
    $('#dlg-rec').hidden = true;
    $('#dlg-note').hidden = true;
  }
  $<HTMLButtonElement>('#dlg-rec').title = t('dlg.recognize');
  $('#dlg-note').textContent = t('dlg.note');
  renderPicker();
}

export function openDialog(): void {
  open = true;
  $('#dialog').hidden = false;
}

export function closeDialog(): void {
  open = false;
  view = null;
  pickerOpen = false;
  cancelAnimationFrame(raf);
  $('#dialog').hidden = true;
}

export function renderLine(line: Line, params: Params | undefined, canRecognize: boolean): void {
  view = { kind: 'line', line, params, canRecognize };
  pickerOpen = false;
  shown = 0;
  paint(true);
  cancelAnimationFrame(raf);
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

export function renderChoices(options: ChoiceView[]): void {
  const prompt = view?.kind === 'line' ? view : (view?.prompt ?? null);
  view = { kind: 'choice', options, prompt };
  pickerOpen = false;
  paint(false);
}

/** 還在打字就直接顯示整句並回傳 true（這次按鍵不往下走）。 */
export function finishTyping(): boolean {
  if (view?.kind !== 'line') return false;
  const full = lineText(view);
  if (shown >= full.length) return false;
  shown = full.length;
  $('#dlg-text').textContent = full;
  return true;
}

/** 這句已經猜過了：收起「？」和選單。 */
export function hideRecognize(): void {
  if (view?.kind === 'line') view.canRecognize = false;
  pickerOpen = false;
  $('#dlg-rec').hidden = true;
  renderPicker();
}

export function relocalizeDialog(): void {
  if (open) paint(false);
}

export function initDialog(h: DialogHandlers): void {
  $('#dialog').addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    // 用滑鼠按過「記下」「？」或話術按鈕後不要留著焦點，不然之後按空白鍵／Enter 會一直重按它，而不是下一句。
    el.closest<HTMLElement>('#dlg-note, #dlg-rec, [data-tactic]')?.blur();
    const choice = el.closest<HTMLButtonElement>('[data-choice]');
    if (choice) {
      if (!choice.disabled) h.choose(choice.dataset.choice!);
      return;
    }
    const tactic = el.closest<HTMLElement>('[data-tactic]');
    if (tactic) return h.recognize(tactic.dataset.tactic as TacticId);
    if (el.closest('#dlg-rec')) {
      pickerOpen = !pickerOpen;
      return renderPicker();
    }
    if (el.closest('#dlg-note')) return h.note();
    if (el.closest('#dlg-pick, #dlg-choices')) return;
    h.advance();
  });
}

// 語言切換時，正在顯示的台詞、選項、辨識選單自動換成新語言。
on('lang', () => relocalizeDialog());
