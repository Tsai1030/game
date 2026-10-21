import { t } from './i18n';
import { NAME_MAX, type GameState } from './state';

/** 整理玩家輸入的名字：去控制字元、連續空白壓成一個、去頭尾空白，最多 NAME_MAX 個字。 */
export function cleanName(raw: string): string {
  const s = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return [...s].slice(0, NAME_MAX).join('').trim();
}

/** 顯示用的名字；沒取名字時用目前語言的預設名。 */
export const playerName = (s: GameState): string => s.name || t('name.default');
