import { on } from '../core/bus';
import { esc, L, t, type Bi } from '../core/i18n';
import { $ } from './dom';
import { isTitleOpen } from './title';
import { isWinOpen } from './win';

/** 字串是語系 key，Bi 是劇本裡的雙語文字。 */
type Text = Bi | string;

let cur: { title: Text; body: Text | null; onClose: () => void } | null = null;

export const isCardOpen = (): boolean => cur !== null;

const tx = (v: Text): string => (typeof v === 'string' ? t(v) : L(v));

function render(): void {
  if (!cur) return;
  $('#card').innerHTML =
    `<div class="card-box"><b class="card-t">${esc(tx(cur.title))}</b>${cur.body === null ? '' : `<p>${esc(tx(cur.body))}</p>`}` +
    `<button class="pbtn primary" data-act="close">${esc(t('card.continue'))}</button></div>`;
}

/** 全畫面劇情卡（章節卡、強制請假、燃盡）。空白鍵、Enter 或點一下關閉。 */
export function showCard(title: Text, body: Text | null, onClose: () => void): void {
  cur = { title, body, onClose };
  render();
  const el = $('#card');
  el.hidden = false;
  el.querySelector<HTMLButtonElement>('[data-act="close"]')?.focus({ preventScroll: true });
}

/** 不觸發 onClose 直接收起（測試、強制結束劇情用）。 */
export function hideCard(): void {
  cur = null;
  const el = document.querySelector<HTMLElement>('#card');
  if (el) el.hidden = true;
}

function closeCard(): void {
  const c = cur;
  if (!c) return;
  hideCard();
  c.onClose();
}

document.addEventListener('click', (e) => {
  if (cur && (e.target as HTMLElement).closest('#card')) closeCard();
});
// 用捕獲階段先接住按鍵並停止傳遞，避免同一下空白鍵又推進了下一句對話。
document.addEventListener(
  'keydown',
  (e) => {
    if (!cur || isWinOpen() || isTitleOpen()) return;
    if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    e.preventDefault();
    e.stopPropagation();
    closeCard();
  },
  true,
);
on('lang', () => render());
