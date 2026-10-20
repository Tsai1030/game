import { esc, t } from '../core/i18n';
import { $ } from './dom';

export interface Tab {
  label(): string;
  html(): string;
  on?(root: HTMLElement): void;
}

/** 視窗內容全部用函式產生，切換語言時重畫就會換成新語言。 */
export interface WinSpec {
  title(): string;
  chip?(): string;
  tabs: Tab[];
  foot?(): string;
  onFoot?(act: string): void;
}

let cur: { spec: WinSpec; tab: number } | null = null;
let onCloseCb: () => void = () => {};

export const isWinOpen = (): boolean => cur !== null;

function renderTab(): void {
  if (!cur) return;
  const c = cur;
  document.querySelectorAll<HTMLElement>('#win [data-tab]').forEach((b) => {
    b.setAttribute('aria-selected', String(Number(b.dataset.tab) === c.tab));
  });
  const body = $('#win-b');
  const tab = c.spec.tabs[c.tab]!;
  body.innerHTML = tab.html();
  tab.on?.(body);
}

function render(): void {
  if (!cur) return;
  const { spec } = cur;
  const tabs =
    spec.tabs.length > 1
      ? `<div class="tabs" role="tablist">${spec.tabs.map((tb, i) => `<button role="tab" data-tab="${i}">${esc(tb.label())}</button>`).join('')}</div>`
      : '';
  $('#win').innerHTML =
    `<div class="win-h"><b>${esc(spec.title())}</b>${spec.chip ? spec.chip() : ''}<button class="x" id="win-x" aria-label="${esc(t('win.close'))}">✕</button></div>` +
    `${tabs}<div class="win-b" id="win-b"></div>` +
    `<div class="win-f">${spec.foot ? spec.foot() : ''}<button class="pbtn" data-f="close">${esc(t('win.close'))}</button></div>`;
  renderTab();
}

export function openWin(spec: WinSpec): void {
  cur = { spec, tab: 0 };
  render();
  $('#back').hidden = false;
  $<HTMLButtonElement>('#win-x').focus();
}

export function showTab(i: number): void {
  if (!cur) return;
  cur.tab = i;
  renderTab();
}

/** 重畫目前開著的視窗（保留目前的分頁），用在切換語言或狀態改變之後。 */
export function rerenderWin(): void {
  render();
}

export function closeWin(): void {
  if (!cur) return;
  cur = null;
  $('#back').hidden = true;
  onCloseCb();
}

export function initWin(onClose: () => void): void {
  onCloseCb = onClose;
  $('#win').addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const tab = el.closest<HTMLElement>('[data-tab]');
    if (tab) return showTab(Number(tab.dataset.tab));
    if (el.closest('#win-x')) return closeWin();
    const f = el.closest<HTMLElement>('[data-f]');
    if (!f) return;
    if (f.dataset.f === 'close') return closeWin();
    cur?.spec.onFoot?.(f.dataset.f ?? '');
  });
  $('#back').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'back') closeWin();
  });
}
