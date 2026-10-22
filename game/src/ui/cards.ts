import { on } from '../core/bus';
import { esc, L, t, type Bi } from '../core/i18n';
import { S, TACTIC_IDS } from '../core/state';
import { CODEX } from '../data/codex';
import { chapterSummary, signed } from '../systems/summary';
import { $ } from './dom';
import { isTitleOpen } from './title';
import { isWinOpen } from './win';

/** 字串是語系 key，Bi 是劇本裡的雙語文字。 */
type Text = Bi | string;

/** 目前開著的卡片：html 每次重畫時重新產生（切換語言、讀最新狀態）。 */
let cur: { html: () => string; onClose: () => void } | null = null;

export const isCardOpen = (): boolean => cur !== null;

const tx = (v: Text): string => (typeof v === 'string' ? t(v) : L(v));
const closeBtn = (key: string): string => `<button class="pbtn primary" data-act="close">${esc(t(key))}</button>`;

function render(): void {
  if (!cur) return;
  $('#card').innerHTML = cur.html();
}

function open(html: () => string, onClose: () => void): void {
  cur = { html, onClose };
  render();
  const el = $('#card');
  el.hidden = false;
  el.querySelector<HTMLButtonElement>('[data-act="close"]')?.focus({ preventScroll: true });
}

/** 全畫面劇情卡（章節卡、強制請假、燃盡）。空白鍵、Enter 或點一下關閉。 */
export function showCard(title: Text, body: Text | null, onClose: () => void): void {
  open(
    () => `<div class="card-box"><b class="card-t">${esc(tx(title))}</b>${body === null ? '' : `<p>${esc(tx(body))}</p>`}${closeBtn('card.continue')}</div>`,
    onClose,
  );
}

function endHTML(teaser: Bi): string {
  const sum = chapterSummary(S);
  const rel = sum.rel.map((r) => `<li><span>${esc(t('speaker.' + r.id))}</span><b class="num">${esc(signed(r.value))}</b></li>`).join('');
  const cards = sum.codex.map((id) => `<li>${esc(L(CODEX[id].name))}</li>`).join('');
  return (
    `<div class="card-box end-card"><b class="card-t">${esc(t('end.title'))}</b>` +
    `<p class="end-san">${esc(t('end.sanity', { from: sum.from, to: sum.to, delta: signed(sum.to - sum.from) }))}</p>` +
    `<h3>${esc(t('end.rel'))}</h3><ul class="end-rel">${rel}</ul>` +
    `<h3>${esc(t('end.codex', { n: sum.codex.length, total: TACTIC_IDS.length }))}</h3><ul class="end-codex">${cards}</ul>` +
    `<h3>${esc(t('end.next'))}</h3><p class="end-next">${esc(L(teaser))}</p>` +
    `<p>${esc(t('end.thanks'))}</p>${closeBtn('end.back')}</div>`
  );
}

/** 試玩結束卡：本章理智變化、關係、解鎖的話術卡、下一章預告。內容讀目前的狀態。 */
export function showEndCard(teaser: Bi, onClose: () => void): void {
  open(() => endHTML(teaser), onClose);
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
