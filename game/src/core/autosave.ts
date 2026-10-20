import { writeSave } from './save';
import { S } from './state';
import { browserStore, type KV } from './storage';

let timer: ReturnType<typeof setTimeout> | undefined;
let enabled = false;
let paused = false;

/** 按下「新遊戲」或「繼續」之後才開始存檔，避免停在標題畫面時寫出空存檔。 */
export function setAutosave(on: boolean): void {
  enabled = on;
}

/** 劇情進行中暫停存檔：存檔停在劇情開始前，讀檔時從那段開頭重播，效果不會重複套用。 */
export function pauseAutosave(on: boolean): void {
  paused = on;
}

export function saveNow(store: KV | null = browserStore()): void {
  clearTimeout(timer);
  if (enabled && !paused) writeSave(store, S);
}

/** 狀態有變化時呼叫；300 ms 內的多次變化只會寫一次。 */
export function requestSave(): void {
  clearTimeout(timer);
  timer = setTimeout(() => saveNow(), 300);
}
