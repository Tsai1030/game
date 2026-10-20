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

type View = { kind: 'line'; line: Line; params?: Params; canRecognize: boolean } | { kind: 'choice'; options: ChoiceView[] };

let open = false;
let view: View | null = null;
let shown = 0;
let raf = 0;
let last = 0;
let pickerOpen = false;

export const isDialogOpen = (): boolean => open;

const lineText = (v: Extract<View, { kind: 'line' }>): string => fmt(L(v.line), v.params);
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

/** 依目前狀態整個重畫（切換語言時也用這個，不重跑打字效果）。 */
function paint(typewriter: boolean): void {
  if (!view) return;
  const choices = $('#dlg-choices');
  if (view.kind === 'line') {
    const full = lineText(view);
    $('#dlg-who').textContent = t('speaker.' + view.line.speaker);
    const ctx = $<HTMLCanvasElement>('#dlg-por').getContext('2d');
    if (ctx) drawPortrait(ctx, portraitOf(view.line));
    if (!typewriter || CPS[settings.textSpeed] === Infinity) shown = full.length;
    $('#dlg-text').textContent = full.slice(0, Math.floor(shown));
    choices.hidden = true;
    choices.innerHTML = '';
    $('#dlg-rec').hidden = !view.canRecognize;
    $('#dlg-note').hidden = false;
  } else {
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
  view = { kind: 'choice', options };
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
