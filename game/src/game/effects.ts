import { requestSave } from '../core/autosave';
import { L, t } from '../core/i18n';
import { S, type EtchState } from '../core/state';
import { CASE, type ClueId } from '../data/case';
import { syncEtch } from '../data/world';
import { addClue } from '../systems/clues';
import { COFFEE_MAX } from '../systems/coffee';
import { refreshHud } from '../ui/hud';
import { queueScene } from '../ui/scene';
import { toast } from '../ui/toast';

/** 改變遊戲狀態的動作：更新狀態 → 重畫 HUD → 排程存檔。 */

/** 拿到這些線索後，要用 LINE 回報王經理。回報劇情最後會設 seen_<劇情> 旗標。 */
const CLUE_REPORTS: Partial<Record<ClueId, string>> = { spc: 'c2_report_spc', ring: 'c2_report_ring' };

/** 讀檔後補排還沒播過的回報（排程只存在記憶體裡，關掉遊戲就沒了）。 */
export function requeueReports(): void {
  for (const id of S.clues) {
    const sc = CLUE_REPORTS[id as ClueId];
    if (sc && !S.flags.includes('seen_' + sc)) queueScene(sc);
  }
}

export function gainClue(id: string): void {
  const r = addClue(S.clues, id);
  if (!r.added) {
    toast(t('toast.clueDup'));
    return;
  }
  S.clues = r.list;
  const clue = CASE.clues[id as ClueId];
  toast(t('toast.clueGot', { text: clue ? L(clue.t) : id }), 'clue');
  refreshHud();
  requestSave();
  const report = CLUE_REPORTS[id as ClueId];
  if (report) queueScene(report);
}

export function setEtch(e: EtchState): void {
  S.etch = e;
  syncEtch(e);
  refreshHud();
  requestSave();
}

export function solveCase(): void {
  S.solved = true;
  setEtch('fixed');
}

export function setCoffee(n: number): void {
  S.coffee = Math.max(0, Math.min(COFFEE_MAX, n));
  refreshHud();
  requestSave();
}

export function setSuit(on: boolean): void {
  S.suit = on;
  if (on) S.everSuit = true;
  refreshHud();
  requestSave();
}
