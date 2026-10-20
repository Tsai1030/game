import type { Dir } from '../core/state';
import { $ } from '../ui/dom';

/** 目前按住的方向；最後按下的優先。 */
export const held: Dir[] = [];

const KEYMAP: Record<string, Dir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export interface InputHooks {
  /** E／空白鍵／Enter／A 鈕：推進對話或和面前的東西互動。 */
  interact(): void;
  /** Esc：關掉視窗；有處理就回傳 true。 */
  escape(): boolean;
  /** C：打開線索簿。 */
  clues(): void;
  /** 視窗或標題畫面開著時回傳 false，讓按鍵留給那些介面。 */
  enabled(): boolean;
}

const release = (d: Dir) => {
  const i = held.indexOf(d);
  if (i >= 0) held.splice(i, 1);
};

export function initInput(h: InputHooks): void {
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (e.key === 'Escape') {
      if (h.escape()) e.preventDefault();
      return;
    }
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || !h.enabled()) return;
    const d = KEYMAP[e.code];
    if (d) {
      e.preventDefault();
      if (!held.includes(d)) held.push(d);
      return;
    }
    if (e.code === 'KeyC') return h.clues();
    if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
      // 焦點在按鈕上時，空白鍵和 Enter 交給按鈕本身。
      if (tag === 'BUTTON' && e.code !== 'KeyE') return;
      e.preventDefault();
      h.interact();
    }
  });
  window.addEventListener('keyup', (e) => {
    const d = KEYMAP[e.code];
    if (d) release(d);
  });
  window.addEventListener('blur', () => {
    held.length = 0;
  });
  document.querySelectorAll<HTMLElement>('[data-dir]').forEach((b) => {
    const d = b.dataset.dir as Dir;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!held.includes(d)) held.push(d);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => release(d));
  });
  $('#abtn').addEventListener('click', () => h.interact());
  $('#prompt').addEventListener('click', () => h.interact());
}
