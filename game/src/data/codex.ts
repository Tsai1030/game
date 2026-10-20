import type { Bi } from '../core/i18n';
import { TACTIC_IDS, type TacticId } from '../core/state';
import raw from './codex.yaml';

export { TACTIC_IDS };

export interface CodexCard {
  name: Bi;
  /** 這是什麼。 */
  what: Bi;
  /** 可以怎麼做。 */
  todo: Bi;
}

/** 話術圖鑑：每張卡的名稱、說明與健康的應對方式。 */
export const CODEX = raw as Record<TacticId, CodexCard>;
