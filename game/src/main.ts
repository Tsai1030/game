import Phaser from 'phaser';
import './style.css';
import { saveNow, setAutosave } from './core/autosave';
import { emit, on } from './core/bus';
import { applyDom, setLang, t, type Lang } from './core/i18n';
import { switchLang } from './core/lang';
import { clearSave, readSave } from './core/save';
import { loadSettings, settings } from './core/settings';
import { newState, S, setState, START_POS, type GameState } from './core/state';
import { browserStore } from './core/storage';
import { story } from './data/story';
import { resetNpcs, syncEtch, walkable } from './data/world';
import { doInteract } from './game/actions';
import { setCoffee } from './game/effects';
import { held, initInput } from './game/input';
import { busy, canOpenSettings, rt } from './game/runtime';
import { computeViewport } from './game/viewport';
import { WorldScene } from './game/WorldScene';
import { COFFEE_DECAY_MS, decay } from './systems/coffee';
import { advanceDialog, initDialog, isDialogOpen, say } from './ui/dialog';
import { $ } from './ui/dom';
import { initHud, refreshHud, setClock } from './ui/hud';
import { hideTitle, isTitleOpen, showTitle } from './ui/title';
import { toast } from './ui/toast';
import { closeWin, initWin, isWinOpen } from './ui/win';
import { openClues, openSettings, resetCaseUi } from './ui/windows';

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
initWin(() => game.canvas?.focus({ preventScroll: true }));
initDialog();
initHud(stageW() < 700);
initInput({
  interact: () => {
    if (isDialogOpen()) advanceDialog();
    else if (rt.near && !busy()) doInteract(rt.near);
  },
  escape: () => {
    if (!isWinOpen()) return false;
    closeWin();
    return true;
  },
  clues: () => {
    if (!busy()) openClues();
  },
  enabled: () => !isWinOpen() && !isTitleOpen(),
});
$('#clue-btn').addEventListener('click', () => {
  if (!busy()) openClues();
});
$('#set-btn').addEventListener('click', () => {
  if (canOpenSettings()) openSettings();
});

/* 3. Phaser 遊戲畫面 */
const vp = computeViewport(stageW(), innerHeight);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: vp.w,
  height: vp.h,
  zoom: vp.zoom,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#050507',
  scale: { mode: Phaser.Scale.NONE },
  input: { keyboard: false },
  audio: { noAudio: true },
  banner: false,
  scene: [WorldScene],
});
game.events.once('ready', () => {
  game.canvas.tabIndex = 0;
  game.canvas.dataset.i18nAria = 'game.canvasAria';
  applyDom();
});
window.addEventListener('resize', () => {
  const v = computeViewport(stageW(), innerHeight);
  game.scale.resize(v.w, v.h);
  game.scale.setZoom(v.zoom);
});

/* 4. 標題畫面、新遊戲與繼續 */
function start(loaded: GameState | null): void {
  const s = loaded ?? newState();
  if (!loaded) clearSave(browserStore());
  if (!walkable(s.x, s.y, s.suit)) {
    s.x = START_POS.x;
    s.y = START_POS.y;
  }
  setState(s);
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
  if (!loaded) say(story.intro);
}

function openTitle(): void {
  const r = readSave(browserStore());
  showTitle({
    canContinue: r.kind === 'ok',
    notice: r.kind === 'corrupt' ? t('toast.saveCorrupt') : undefined,
    onContinue: () => start(r.kind === 'ok' ? r.state : null),
    onNew: () => start(null),
    onLang: (l: Lang) => switchLang(l),
  });
}

on('toTitle', () => {
  saveNow();
  setAutosave(false);
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
  if (isTitleOpen() || S.coffee === 0) return;
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
