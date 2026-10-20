import { t } from '../core/i18n';
import { S } from '../core/state';
import { story, type StoryKey } from '../data/story';
import type { Thing } from '../data/world';
import { drink } from '../systems/coffee';
import { say } from '../ui/scene';
import { toast } from '../ui/toast';
import { openEtch, openMet, openPC, openTool } from '../ui/windows';
import { gainClue, setCoffee, setSuit } from './effects';

/** 轉身面向物件。 */
function faceTo(o: Thing): void {
  if (S.y < o.y) S.dir = 'down';
  else if (S.y >= o.y + o.h) S.dir = 'up';
  else if (S.x < o.x) S.dir = 'right';
  else S.dir = 'left';
}

function talk(n: Thing): void {
  const dx = S.x - n.x;
  const dy = S.y - n.y;
  n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  if (n.id === 'boss') {
    if (S.solved) return say(story.boss_solved);
    return say([...(S.suit ? story.boss_suit : []), ...story.boss_main, ...(S.clues.length >= 3 ? story.boss_ready : story.boss_more)]);
  }
  if (n.id === 'kevin') return say(story.kevin, { onEnd: () => gainClue('pm') });
  say(story.fse);
}

function doLocker(): void {
  if (!S.suit) {
    setSuit(true);
    say(story.locker_on);
  } else {
    setSuit(false);
    toast(t('toast.suitOff'));
  }
}

function doCoffee(): void {
  const r = drink(S.coffee);
  if (!r.ok) return say(story.coffee_full);
  setCoffee(r.coffee);
  say(story.coffee_ok);
}

/** 和物件或 NPC 互動（行為與原型的 doInteract 相同）。 */
export function doInteract(o: Thing): void {
  faceTo(o);
  if (o.npc) return talk(o);
  switch (o.act) {
    case 'pc':
      return openPC();
    case 'etch07':
      return openEtch();
    case 'met':
      return openMet();
    case 'tool':
      return openTool(o);
    case 'locker':
      return doLocker();
    case 'coffee':
      return doCoffee();
    case 'say':
      if (o.say) say(story[o.say as StoryKey]);
      return;
    default:
      return;
  }
}
