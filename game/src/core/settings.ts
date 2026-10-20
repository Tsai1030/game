import type { Lang } from './i18n';
import type { KV } from './storage';

export type TextSpeed = 'slow' | 'normal' | 'instant';

export interface Settings {
  lang: Lang;
  textSpeed: TextSpeed;
  reduceMotion: boolean;
}

export const SETTINGS_KEY = 'fabns.settings.v1';

/** 每秒顯示幾個字。 */
export const CPS: Record<TextSpeed, number> = { slow: 20, normal: 40, instant: Infinity };

export function defaultSettings(navLang = '', prefersReduce = false): Settings {
  return { lang: /^zh/i.test(navLang) ? 'zh-TW' : 'en', textSpeed: 'normal', reduceMotion: prefersReduce };
}

/** 驗證存在瀏覽器裡的設定；不合法的欄位一律退回 base。 */
export function parseSettings(raw: unknown, base: Settings): Settings {
  if (!raw || typeof raw !== 'object') return { ...base };
  const r = raw as Record<string, unknown>;
  return {
    lang: r.lang === 'en' || r.lang === 'zh-TW' ? r.lang : base.lang,
    textSpeed: r.textSpeed === 'slow' || r.textSpeed === 'normal' || r.textSpeed === 'instant' ? r.textSpeed : base.textSpeed,
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : base.reduceMotion,
  };
}

/** 執行中的設定；main.ts 啟動時呼叫 loadSettings 載入。 */
export const settings: Settings = defaultSettings();

export function loadSettings(store: KV | null, env: { navLang: string; prefersReduce: boolean }): void {
  const base = defaultSettings(env.navLang, env.prefersReduce);
  let raw: unknown = null;
  try {
    const s = store?.getItem(SETTINGS_KEY);
    raw = s ? JSON.parse(s) : null;
  } catch {
    raw = null;
  }
  Object.assign(settings, parseSettings(raw, base));
}

export function saveSettings(store: KV | null): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* 私密瀏覽或被封鎖時略過 */
  }
}
