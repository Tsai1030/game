import { on } from '../core/bus';
import { esc, getLang, t, type Lang } from '../core/i18n';
import { cleanName } from '../core/name';
import { NAME_MAX } from '../core/state';
import { $ } from './dom';

export interface TitleOpts {
  canContinue: boolean;
  /** 已經翻譯好的提示文字，例如存檔損壞。 */
  notice?: string;
  onContinue(): void;
  /** 按「開始」時呼叫，帶著整理過的名字（空字串表示用預設名）。 */
  onNew(name: string): void;
  onLang?(l: Lang): void;
}

let open = false;
let last: TitleOpts | null = null;
/** 標題畫面的哪一步：主選單，或按了新遊戲之後的取名字。 */
let step: 'main' | 'name' = 'main';
/** 取名字輸入框目前的內容（切換語言重畫時保留）。 */
let draft = '';

export const isTitleOpen = (): boolean => open;

function render(): void {
  if (!last) return;
  const o = last;
  const other: Lang = getLang() === 'en' ? 'zh-TW' : 'en';
  const el = $('#title');
  const head = `<div class="title-card"><b class="tt">${esc(t('app.title'))}</b><small>${esc(t('app.subtitle'))}</small>`;
  const lang = `<button class="pbtn" data-act="lang" data-lang="${other}">${esc(t('lang.' + other))}</button>`;
  el.innerHTML =
    step === 'name'
      ? head +
        `<label class="name-row" for="name-in">${esc(t('title.nameLabel'))}</label>` +
        `<input id="name-in" class="name-in" maxlength="${NAME_MAX}" autocomplete="off" value="${esc(draft)}" placeholder="${esc(t('name.default'))}">` +
        `<div class="title-btns"><button class="pbtn primary" data-act="start">${esc(t('title.start'))}</button>` +
        `<button class="pbtn" data-act="back">${esc(t('title.back'))}</button>${lang}</div></div>`
      : head +
        `<p class="tag">${esc(t('title.tagline'))}</p>` +
        (o.notice ? `<p class="notice" role="alert">${esc(o.notice)}</p>` : '') +
        `<div class="title-btns">` +
        `<button class="pbtn primary" data-act="continue"${o.canContinue ? '' : ' disabled'}>${esc(t('title.continue'))}</button>` +
        `<button class="pbtn" data-act="new">${esc(t('title.newGame'))}</button>${lang}</div></div>`;
  const input = el.querySelector<HTMLInputElement>('#name-in');
  if (input) {
    input.oninput = () => (draft = input.value);
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) o.onNew(cleanName(draft));
    };
  }
  el.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'continue') o.onContinue();
    else if (act === 'new' || act === 'back') {
      step = act === 'new' ? 'name' : 'main';
      draft = '';
      render();
      el.querySelector<HTMLInputElement>('#name-in')?.focus();
    } else if (act === 'start') o.onNew(cleanName(draft));
    else if (act === 'lang') o.onLang?.(b.dataset.lang as Lang);
  };
}

export function showTitle(o: TitleOpts): void {
  last = o;
  step = 'main';
  draft = '';
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
