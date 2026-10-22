import type { GameState } from '../core/state';

/** 拿到這些線索後，要用 LINE 回報王經理。回報劇情最後會設 seen_<劇情> 旗標。 */
const CLUE_REPORTS: Record<string, string> = { spc: 'c2_report_spc', ring: 'c2_report_ring' };

/** 這條線索要排的 LINE 回報劇情；沒有就回傳 null。 */
export const reportScene = (clue: string): string | null => CLUE_REPORTS[clue] ?? null;

/** 手上的線索裡，還沒播過的回報劇情（讀檔後要補排）。 */
export function pendingReports(s: GameState): string[] {
  return s.clues.map(reportScene).filter((sc): sc is string => sc !== null && !s.flags.includes('seen_' + sc));
}
