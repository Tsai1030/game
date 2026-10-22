import { settings } from '../core/settings';
import { $ } from './dom';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 換地圖時把舞台蓋黑（ms 毫秒）。「減少動態」時直接完成，遮罩不出現。 */
export async function fadeOut(ms: number): Promise<void> {
  if (settings.reduceMotion) return;
  const el = $('#fade');
  // 已經蓋黑了（例如劇情連續瞬移）：不要先變透明再變黑，免得閃一下。
  if (!el.hidden && el.style.opacity === '1') return;
  el.style.transition = 'none';
  el.style.opacity = '0';
  el.hidden = false;
  // 先讓瀏覽器算過一次透明的樣式，過渡才會從 0 開始，不會直接跳成全黑。
  void getComputedStyle(el).opacity;
  await wait(16);
  el.style.transition = `opacity ${ms}ms linear`;
  el.style.opacity = '1';
  await wait(ms);
}

/** 換地圖：淡出 → go() → 淡入 → done()。go() 出錯只記錄下來，畫面一定會淡回來，不會卡在黑畫面。 */
export async function fadeSwap(go: () => void, done: () => void, ms = 200): Promise<void> {
  await fadeOut(ms);
  try {
    go();
  } catch (e) {
    console.error(e);
  }
  await fadeIn(ms);
  done();
}

/** 換好地圖後把遮罩淡掉。 */
export async function fadeIn(ms: number): Promise<void> {
  const el = $('#fade');
  if (el.hidden) return;
  if (settings.reduceMotion) {
    el.hidden = true;
    return;
  }
  el.style.transition = `opacity ${ms}ms linear`;
  el.style.opacity = '0';
  await wait(ms);
  el.hidden = true;
}
