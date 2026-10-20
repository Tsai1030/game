import { on } from '../core/bus';
import { esc, getLang, t, type Lang } from '../core/i18n';
import { $ } from './dom';

export interface TitleOpts {
  canContinue: boolean;
  /** 已經翻譯好的提示文字，例如存檔損壞。 */
  notice?: string;
  onContinue(): void;
  onNew(): void;
  onLang?(l: Lang): void;
}

let open = false;
let last: TitleOpts | null = null;

export const isTitleOpen = (): boolean => open;

function render(): void {
  if (!last) return;
  const o = last;
  const other: Lang = getLang() === 'en' ? 'zh-TW' : 'en';
  const el = $('#title');
  el.innerHTML =
    `<div class="title-card"><b class="tt">${esc(t('app.title'))}</b><small>${esc(t('app.subtitle'))}</small>` +
    `<p class="tag">${esc(t('title.tagline'))}</p>` +
    (o.notice ? `<p class="notice" role="alert">${esc(o.notice)}</p>` : '') +
    `<div class="title-btns">` +
    `<button class="pbtn primary" data-act="continue"${o.canContinue ? '' : ' disabled'}>${esc(t('title.continue'))}</button>` +
    `<button class="pbtn" data-act="new">${esc(t('title.newGame'))}</button>` +
    `<button class="pbtn" data-act="lang" data-lang="${other}">${esc(t('lang.' + other))}</button>` +
    `</div></div>`;
  el.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'continue') o.onContinue();
    else if (b.dataset.act === 'new') o.onNew();
    else if (b.dataset.act === 'lang') o.onLang?.(b.dataset.lang as Lang);
  };
}

export function showTitle(o: TitleOpts): void {
  last = o;
  open = true;
  render();
  $('#title').hidden = false;
}

/** 切換語言時重畫（標題畫面開著才有作用）。 */
export function rerenderTitle(): void {
  if (open) render();
}

export function hideTitle(): void {
  open = false;
  $('#title').hidden = true;
}

// 語言切換時，標題畫面（開著的話）自動重畫。
on('lang', () => rerenderTitle());
