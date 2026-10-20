import { esc, L, t } from '../core/i18n';
import { fmtClock, S, SHIFT_END } from '../core/state';
import type { Thing } from '../data/world';
import { QUEST } from '../systems/quest';
import { $ } from './dom';

let locKey = 'loc.office';
let promptThing: Thing | null = null;

/** 靠近物件時，提示列要顯示的動作。 */
export function verb(o: Thing): string {
  if (o.npc) return t('verb.talk', { name: t('speaker.' + o.id) });
  switch (o.act) {
    case 'pc':
      return t('verb.pc');
    case 'locker':
      return t(S.suit ? 'verb.suitOff' : 'verb.suitOn');
    case 'coffee':
      return t('verb.coffee');
    case 'say':
      return t('verb.inspect', { name: o.name ? L(o.name) : o.id });
    default:
      return t('verb.tool', { id: o.id });
  }
}

/** 重畫咖啡、線索數、任務清單、地點和互動提示（狀態或語言改變後呼叫）。 */
export function refreshHud(): void {
  const cups = $('#cups');
  cups.innerHTML = [0, 1, 2, 3, 4].map((i) => `<i class="${i < S.coffee ? '' : 'e'}"></i>`).join('');
  cups.setAttribute('aria-label', t('hud.coffeeAria', { n: S.coffee }));
  $('#clue-n').textContent = `${S.clues.length}/5`;
  $('#q-list').innerHTML = QUEST.map((q) => `<li class="${q.done(S) ? 'done' : ''}"><i></i>${esc(t(q.key))}</li>`).join('');
  $('#loc').textContent = t(locKey);
  setPrompt(promptThing);
}

export function setLocation(key: string): void {
  locKey = key;
  $('#loc').textContent = t(key);
}

export function setClock(sec: number): void {
  $('#clock').textContent = fmtClock(sec);
  $('#countdown').textContent = fmtClock(Math.max(0, SHIFT_END - sec));
}

export function setPrompt(o: Thing | null): void {
  promptThing = o;
  const p = $('#prompt');
  if (!o) {
    p.hidden = true;
    return;
  }
  p.innerHTML = `<kbd>E</kbd>${esc(verb(o))}`;
  p.hidden = false;
}

export function showShower(): void {
  $('#shower').hidden = false;
}

export function hideShower(): void {
  $('#shower').hidden = true;
}

/** 任務清單的收合按鈕；手機寬度預設收合。 */
export function initHud(collapsed: boolean): void {
  const tog = $('#q-tog');
  const apply = (min: boolean) => {
    $('#quest').classList.toggle('min', min);
    $('#q-sign').textContent = min ? '+' : '−';
    tog.setAttribute('aria-expanded', String(!min));
  };
  apply(collapsed);
  tog.addEventListener('click', () => apply(!$('#quest').classList.contains('min')));
}
