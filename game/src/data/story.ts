import asksRaw from './story/asks.yaml';
import ch02 from './story/ch02.yaml';
import labelsRaw from './story/labels.yaml';
import prologueStory from './story/prologue.yaml';
import worldStory from './story/world.yaml';
import type { AskTopic, Labels, Scene } from './script';
import type { Trigger } from '../systems/triggers';

type StoryFile = { scenes?: Record<string, Scene>; triggers?: Trigger[] };
const FILES: Record<string, StoryFile> = { prologue: prologueStory as StoryFile, ch02: ch02 as StoryFile, world: worldStory as StoryFile };

export const SPEAKERS = ['sys', 'me', 'boss', 'kevin', 'fse', 'fang', 'amy', 'guard', 'bear', 'chen'] as const;
export type Speaker = (typeof SPEAKERS)[number];

/** 一句對話；文字中英並排。 */
export interface Line {
  speaker: Speaker;
  zh: string;
  en: string;
}

/** 每個劇本檔各自的劇情（檔名 → 劇情）。劇情 id 在所有檔案之間不能重複（資料測試會檢查）。 */
export const SCENE_FILES: Record<string, Record<string, Scene>> = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, f.scenes ?? {}]));

/** 所有劇情。 */
export const SCENES: Record<string, Scene> = Object.assign({}, ...Object.values(SCENE_FILES));
/** 所有劇本檔的觸發劇情，依檔案順序。 */
export const TRIGGERS: Trigger[] = Object.values(FILES).flatMap((f) => f.triggers ?? []);
export const ASKS = (asksRaw ?? {}) as Record<string, AskTopic>;
export const LABELS = labelsRaw as Labels;
