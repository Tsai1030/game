import asksRaw from './story/asks.yaml';
import ch02 from './story/ch02.yaml';
import labelsRaw from './story/labels.yaml';
import type { AskTopic, Labels, Scene } from './script';

export const SPEAKERS = ['sys', 'me', 'boss', 'kevin', 'fse'] as const;
export type Speaker = (typeof SPEAKERS)[number];

/** 一句對話；文字中英並排。 */
export interface Line {
  speaker: Speaker;
  zh: string;
  en: string;
}

/** 所有劇情（目前只有第 2 章）。 */
export const SCENES: Record<string, Scene> = (ch02 as { scenes: Record<string, Scene> }).scenes;
export const ASKS = (asksRaw ?? {}) as Record<string, AskTopic>;
export const LABELS = labelsRaw as Labels;

/* ---- 過渡用：Task 9 把呼叫端都改成 playScene 之後移除 ---- */
export const STORY_KEYS = [
  'intro', 'boss_solved', 'boss_suit', 'boss_main', 'boss_ready', 'boss_more', 'kevin', 'fse',
  'say_desk2', 'say_desk3', 'say_desk4', 'say_bossdesk', 'locker_on', 'coffee_ok', 'coffee_full', 'rc_wrong', 'rc_solved',
] as const;
export type StoryKey = (typeof STORY_KEYS)[number];
export const story = Object.fromEntries(
  STORY_KEYS.map((k) => [k, (SCENES[k] ?? []).flatMap((b) => ('line' in b ? [b.line] : []))]),
) as unknown as Record<StoryKey, Line[]>;
