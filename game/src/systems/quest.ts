import type { GameState } from '../core/state';

/** Case 03 的任務清單；key 對應語系檔的 quest.q1–q5。 */
export const QUEST: readonly { key: string; done: (s: GameState) => boolean }[] = [
  { key: 'quest.q1', done: (s) => s.clues.includes('spc') },
  { key: 'quest.q2', done: (s) => s.everSuit },
  { key: 'quest.q3', done: (s) => s.clues.includes('fdc') && s.clues.includes('ring') },
  { key: 'quest.q4', done: (s) => s.clues.includes('map') },
  { key: 'quest.q5', done: (s) => s.solved },
];
