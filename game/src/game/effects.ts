import { requestSave } from '../core/autosave';
import { L, t } from '../core/i18n';
import { S, type EtchState } from '../core/state';
import { CASE, type ClueId } from '../data/case';
import { syncEtch } from '../data/world';
import { addClue } from '../systems/clues';
import { COFFEE_MAX } from '../systems/coffee';
import { pendingReports, reportScene } from '../systems/reports';
import { refreshHud } from '../ui/hud';
import { queueScene } from '../ui/scene';
import { toast } from '../ui/toast';

/** 改變遊戲狀態的動作：更新狀態 → 重畫 HUD → 排程存檔。 */

/** 讀檔後補排還沒播過的回報（排程只存在記憶體裡，關掉遊戲就沒了）。 */
export function requeueReports(): void {
  for (const sc of pendingReports(S)) queueScene(sc);
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
  const report = reportScene(id);
  if (report) queueScene(report);
}

export function setEtch(e: EtchState): void {
  S.etch = e;
  syncEtch(e);
  refreshHud();
  requestSave();
}

/** 結論正確：PM-B 先停機（inhibit）等 EE，過場裡大熊換好 focus ring 才恢復。 */
export function solveCase(): void {
  S.solved = true;
  setEtch('inhibit');
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
