import { saveNow, setAutosave } from '../core/autosave';
import { emit } from '../core/bus';
import { clearSave } from '../core/save';
import { newState, S, setState, type GameState } from '../core/state';
import { browserStore } from '../core/storage';
import { SCENES } from '../data/story';
import { resetNpcs, syncEtch } from '../data/world';
import { refreshHud, setClock } from '../ui/hud';
import { playScene, queueScene, stopScene } from '../ui/scene';
import { hideTitle } from '../ui/title';
import { resetCaseUi } from '../ui/windows';
import { requeueReports } from './effects';
import { held } from './input';
import { fireTrigger, placeLoaded } from './travel';

/**
 * 標題畫面按「新遊戲」（loaded 為 null，name 是取的名字）或「繼續」（讀進來的存檔）。
 * 重設畫面與介面狀態、開始自動存檔，再決定要播哪段劇情。
 */
export function startGame(loaded: GameState | null, name = ''): void {
  stopScene();
  const s = loaded ?? { ...newState(), name };
  if (!loaded) clearSave(browserStore());
  setState(s);
  placeLoaded(S);
  syncEtch(S.etch);
  resetNpcs();
  resetCaseUi();
  held.length = 0;
  hideTitle();
  setAutosave(true);
  refreshHud();
  setClock(S.sec);
  emit('reset');
  saveNow();
  if (!loaded) {
    playScene('p_s1');
    return;
  }
  // 存檔停在某段劇情開頭時，從那段開頭重播（劇情進行中不會存檔，效果不會重複）。
  if (S.scene && SCENES[S.scene]) playScene(S.scene);
  else {
    S.scene = null;
    // 試玩已經結束：再看一次試玩結束卡，關掉後回標題畫面。
    if (S.flags.includes('demo_done')) {
      playScene('c2_demo_end');
      return;
    }
    // 關掉遊戲時剛好有觸發劇情還沒播（例如剛走進新地圖）：現在補播。
    fireTrigger();
  }
  requeueReports();
  // 已經破案卻還沒看過 C2-07 過場（舊版存檔，或送出結論後馬上關掉遊戲）：補播，才接得上晨會。
  if (S.chapter === 'ch2' && S.solved && !S.flags.includes('c2_standup_call')) queueScene('rc_solved');
}
