import zh from '../data/locales/ui.zh-TW.json';
import en from '../data/locales/ui.en.json';
import { emit } from './bus';

export type Lang = 'zh-TW' | 'en';
/** 中英並排的文字；劇本與資料檔都用這個格式。 */
export interface Bi {
  zh: string;
  en: string;
}
export type Params = Record<string, string | number>;

const dicts: Record<Lang, Record<string, string>> = { 'zh-TW': zh, en };
let lang: Lang = 'zh-TW';

export const LANGS: readonly Lang[] = ['zh-TW', 'en'];

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  lang = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  emit('lang', next);
}

export function fmt(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** 介面文字：先查目前語言，再退回繁中，最後顯示 key 本身。 */
export function t(key: string, params?: Params): string {
  return fmt(dicts[lang][key] ?? dicts['zh-TW'][key] ?? key, params);
}

/** 資料文字：從中英並排的物件取出目前語言。 */
export function L(b: Bi, params?: Params): string {
  return fmt(lang === 'en' ? b.en : b.zh, params);
}

export function dictKeys(l: Lang): string[] {
  return Object.keys(dicts[l]);
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESC[c] ?? c);
}

/** 先跳脫 HTML，再把 **文字** 轉成 <b>，給提示句標重點。 */
export function rich(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

/** 套用 data-i18n（文字）與 data-i18n-aria（aria-label）。 */
export function applyDom(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n ?? '');
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria ?? ''));
  });
}
