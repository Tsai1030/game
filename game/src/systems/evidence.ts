import type { EvidenceItem } from '../core/state';

/** 加入一筆證據：同一個 id 不重複；依時間排序（同時間保持加入順序）。 */
export function addEvidence(list: readonly EvidenceItem[], item: EvidenceItem): { added: boolean; list: EvidenceItem[] } {
  if (list.some((e) => e.id === item.id)) return { added: false, list: [...list] };
  const next = [...list, item].map((e, i) => ({ e, i }));
  next.sort((a, b) => a.e.time.localeCompare(b.e.time) || a.i - b.i);
  return { added: true, list: next.map(({ e }) => e) };
}

/** 指定的證據是否全部到手。 */
export function hasEvidence(list: readonly EvidenceItem[], ids: readonly string[]): boolean {
  return ids.every((id) => list.some((e) => e.id === id));
}

/** 指定的證據到手了幾筆。 */
export function countEvidence(list: readonly EvidenceItem[], ids: readonly string[]): number {
  return ids.filter((id) => list.some((e) => e.id === id)).length;
}
