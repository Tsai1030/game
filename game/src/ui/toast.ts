import { $ } from './dom';

let timer: ReturnType<typeof setTimeout> | undefined;

/** 畫面上方的短訊息，3.4 秒後消失。bad 是警告，clue 是記下線索。 */
export function toast(msg: string, kind?: 'bad' | 'clue'): void {
  const el = $('#toast');
  el.textContent = msg;
  if (kind) el.dataset.kind = kind;
  else delete el.dataset.kind;
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => {
    el.hidden = true;
  }, 3400);
}
