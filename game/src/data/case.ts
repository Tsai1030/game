import type { Bi } from '../core/i18n';
import type { Pick3 } from '../systems/conclusion';
import raw from './case03.json';

export type LogLevel = 'ok' | 'info' | 'warn' | 'alarm';
export type ClueId = 'spc' | 'fdc' | 'ring' | 'map' | 'pm';

export interface CaseData {
  spc: [string, 'A' | 'B', number][];
  lots: { id: string; tool: string; ch: string; cd: number; j: 'ok' | 'warn' | 'ooc'; st: 'RUN' | 'HOLD' }[];
  logs: { t: string; src: string; ch: string; lv: LogLevel; msg: Bi }[];
  logClue: Record<string, ClueId>;
  logNote: Record<string, Bi>;
  clues: Record<ClueId, { t: Bi; src: Bi }>;
  cons: { name: string; val: Bi; pct: number; clue?: ClueId }[];
  tools: string[];
  chambers: string[];
  causes: (Bi & { id: string })[];
  answer: Pick3;
  minClues: number;
  waferSeed: number;
}

/** Case 03：ETCH-07 PM-B focus ring 到壽命。 */
export const CASE = raw as unknown as CaseData;
