import { getLang, setLang, type Lang } from './i18n';
import { saveSettings, settings } from './settings';
import { browserStore } from './storage';

/** 另一種語言（介面上的切換鈕顯示它）。 */
export const otherLang = (): Lang => (getLang() === 'en' ? 'zh-TW' : 'en');

/** 切換語言並記住；各介面模組訂閱 'lang' 事件自行重畫。 */
export function switchLang(l: Lang): void {
  settings.lang = l;
  saveSettings(browserStore());
  setLang(l);
}
