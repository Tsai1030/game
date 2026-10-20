import { on } from '../core/bus';
import { fmt, L, t, type Params } from '../core/i18n';
import { CPS, settings } from '../core/settings';
import { S } from '../core/state';
import type { Line } from '../data/story';
import { drawPortrait, type PortraitId } from '../render/portraits';
import { $ } from './dom';

interface Queue {
  lines: Line[];
  i: number;
  /** 目前已顯示的字數（打字效果）。 */
  n: number;
  params?: Params;
  onEnd?: () => void;
}

let q: Queue | null = null;
let raf = 0;
let last = 0;

export const isDialogOpen = (): boolean => q !== null;

const text = (d: Queue): string => fmt(L(d.lines[d.i]!), d.params);
const portraitOf = (l: Line): PortraitId => (l.speaker === 'me' ? (S.suit ? 'meSuit' : 'me') : l.speaker);

function paint(d: Queue): void {
  const full = text(d);
  if (CPS[settings.textSpeed] === Infinity) d.n = full.length;
  $('#dlg-text').textContent = full.slice(0, Math.floor(d.n));
}

function show(d: Queue): void {
  const l = d.lines[d.i]!;
  $('#dlg-who').textContent = t('speaker.' + l.speaker);
  const ctx = $<HTMLCanvasElement>('#dlg-por').getContext('2d');
  if (ctx) drawPortrait(ctx, portraitOf(l));
  d.n = 0;
  paint(d);
}

function tick(now: number): void {
  if (!q) return;
  const dt = (now - last) / 1000;
  last = now;
  const full = text(q);
  if (q.n < full.length) {
    q.n = Math.min(full.length, q.n + dt * CPS[settings.textSpeed]);
    $('#dlg-text').textContent = full.slice(0, Math.floor(q.n));
  }
  raf = requestAnimationFrame(tick);
}

/** 開始一段對話；params 會填進台詞裡的 {佔位符}，onEnd 在最後一句結束後呼叫。 */
export function say(lines: Line[], opts: { params?: Params; onEnd?: () => void } = {}): void {
  q = { lines, i: 0, n: 0, params: opts.params, onEnd: opts.onEnd };
  $('#dialog').hidden = false;
  show(q);
  cancelAnimationFrame(raf);
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

/** 還在打字就直接顯示整句；已經顯示完就換下一句或結束。 */
export function advanceDialog(): void {
  if (!q) return;
  const full = text(q);
  if (q.n < full.length) {
    q.n = full.length;
    $('#dlg-text').textContent = full;
    return;
  }
  q.i++;
  if (q.i >= q.lines.length) {
    const end = q.onEnd;
    q = null;
    cancelAnimationFrame(raf);
    $('#dialog').hidden = true;
    end?.();
    return;
  }
  show(q);
}

/** 切換語言後，把目前這句換成新語言並直接顯示完整。 */
export function relocalizeDialog(): void {
  if (!q) return;
  const full = text(q);
  q.n = full.length;
  $('#dlg-who').textContent = t('speaker.' + q.lines[q.i]!.speaker);
  $('#dlg-text').textContent = full;
}

export function initDialog(): void {
  $('#dialog').addEventListener('click', advanceDialog);
}

// 語言切換時，正在顯示的台詞自動換成新語言。
on('lang', () => relocalizeDialog());
