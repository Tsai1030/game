import raw from './story/ch02.yaml';

export const SPEAKERS = ['sys', 'me', 'boss', 'kevin', 'fse'] as const;
export type Speaker = (typeof SPEAKERS)[number];

/** 一句對話；文字中英並排。 */
export interface Line {
  speaker: Speaker;
  zh: string;
  en: string;
}

export const STORY_KEYS = [
  'intro',
  'boss_solved',
  'boss_suit',
  'boss_main',
  'boss_ready',
  'boss_more',
  'kevin',
  'fse',
  'say_desk2',
  'say_desk3',
  'say_desk4',
  'say_bossdesk',
  'locker_on',
  'coffee_ok',
  'coffee_full',
  'rc_wrong',
  'rc_solved',
] as const;
export type StoryKey = (typeof STORY_KEYS)[number];

export const story = raw as Record<StoryKey, Line[]>;
