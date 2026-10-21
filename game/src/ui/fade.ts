import { settings } from '../core/settings';
import { $ } from './dom';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 換地圖時把舞台蓋黑（ms 毫秒）。「減少動態」時直接完成，遮罩不出現。 */
export async function fadeOut(ms: number): Promise<void> {
  if (settings.reduceMotion) return;
  const el = $('#fade');
  el.style.transition = 'none';
  el.style.opacity = '0';
  el.hidden = false;
  await wait(16);
  el.style.transition = `opacity ${ms}ms linear`;
  el.style.opacity = '1';
  await wait(ms);
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
