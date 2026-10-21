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
