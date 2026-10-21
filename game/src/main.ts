import './style.css';
import { saveNow, setAutosave } from './core/autosave';
import { emit, on } from './core/bus';
import { applyDom, setLang, t, type Lang } from './core/i18n';
import { switchLang } from './core/lang';
import { clearSave, readSave } from './core/save';
import { loadSettings, settings } from './core/settings';
import { isNightShift, newState, S, setState, type GameState } from './core/state';
import { browserStore } from './core/storage';
import { SCENES } from './data/story';
import { resetNpcs, syncEtch } from './data/world';
import { doInteract } from './game/actions';
import { placeLoaded } from './game/travel';
import { requeueReports, setCoffee } from './game/effects';
import { held, initInput } from './game/input';
import { busy, canOpenSettings, rt } from './game/runtime';
import { WorldView } from './world3d/view';
import { COFFEE_DECAY_MS, decay } from './systems/coffee';
import { isDialogOpen } from './ui/dialog';
import { advanceScene, initScenePlayer, playScene, stopScene } from './ui/scene';
import { $ } from './ui/dom';
import { initHud, refreshHud, setClock } from './ui/hud';
import { hideTitle, isTitleOpen, showTitle } from './ui/title';
import { toast } from './ui/toast';
import { closeWin, initWin, isWinOpen } from './ui/win';
import { openClues, openCodex, openEvidence, openSettings, resetCaseUi } from './ui/windows';

/* 1. 設定與語言 */
loadSettings(browserStore(), {
  navLang: navigator.language,
  prefersReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
});
document.documentElement.classList.toggle('rm', settings.reduceMotion);
setLang(settings.lang);
document.title = t('app.title');
applyDom();

/* 2. DOM 介面 */
const stageW = () => $('#stage').clientWidth;
initWin(() => view?.canvas.focus({ preventScroll: true }));
initScenePlayer();
initHud(stageW() < 700);
initInput({
  interact: () => {
    if (isDialogOpen()) advanceScene();
    else if (rt.near && !busy()) doInteract(rt.near);
  },
  escape: () => {
    if (!isWinOpen()) return false;
    closeWin();
    return true;
  },
  evidence: () => {
    if (!busy() && S.flags.includes('ev_unlocked')) openEvidence();
  },
  codex: () => {
    if (!busy()) openCodex();
  },
  clues: () => {
    if (!busy()) openClues();
  },
  enabled: () => !isWinOpen() && !isTitleOpen(),
});
$('#clue-btn').addEventListener('click', () => {
  if (!busy()) openClues();
});
$('#ev-btn').addEventListener('click', () => {
  if (!busy()) openEvidence();
});
$('#codex-btn').addEventListener('click', () => {
  if (!busy()) openCodex();
});
$('#set-btn').addEventListener('click', () => {
  if (canOpenSettings()) openSettings();
});

/* 3. 3D 世界畫面（three.js）。瀏覽器不支援 WebGL 時，舞台顯示說明，介面其餘部分照常。 */
let view: WorldView | null = null;
try {
  view = new WorldView($('#stage'));
  view.start();
} catch (e) {
  console.error(e);
  $('#stage').insertAdjacentHTML('afterbegin', '<p class="no-gl" data-i18n="world.noWebgl"></p>');
}
applyDom();

/* 4. 標題畫面、新遊戲與繼續 */
function start(loaded: GameState | null, name = ''): void {
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
  else S.scene = null;
  requeueReports();
}

function openTitle(): void {
  const r = readSave(browserStore());
  showTitle({
    canContinue: r.kind === 'ok',
    notice: r.kind === 'corrupt' ? t('toast.saveCorrupt') : undefined,
    onContinue: () => start(r.kind === 'ok' ? r.state : null),
    onNew: (name: string) => start(null, name),
    onLang: (l: Lang) => switchLang(l),
  });
}

on('toTitle', () => {
  saveNow();
  setAutosave(false);
  stopScene();
  openTitle();
});

/* 5. 語言切換：頁面上的靜態文字與 HUD 在這裡重畫；視窗、對話框、標題畫面各自訂閱 'lang' 自行重畫。 */
on('lang', () => {
  document.title = t('app.title');
  applyDom();
  refreshHud();
});

/* 6. 時鐘、咖啡、自動存檔 */
setInterval(() => {
  if (isTitleOpen()) return;
  S.sec = Math.min(86400, S.sec + 1);
  setClock(S.sec);
}, 1000);
setInterval(() => {
  if (isTitleOpen() || !isNightShift(S) || S.coffee === 0) return;
  setCoffee(decay(S.coffee));
  if (S.coffee === 0) toast(t('toast.coffeeEmpty'), 'bad');
}, COFFEE_DECAY_MS);
setInterval(saveNow, 15000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveNow();
});
window.addEventListener('pagehide', () => saveNow());

refreshHud();
setClock(S.sec);
openTitle();
