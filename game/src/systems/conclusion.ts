export interface Pick3 {
  tool: string;
  ch: string;
  cause: string;
}

export type Verdict = 'incomplete' | 'need-evidence' | 'wrong' | 'solved';

/** 判定結論：沒填完 → 答錯 → 答對但證據不足 → 破案。 */
export function judge(answer: Pick3, pick: Partial<Pick3>, clueCount: number, minClues: number): Verdict {
  if (!pick.tool || !pick.ch || !pick.cause) return 'incomplete';
  const right = pick.tool === answer.tool && pick.ch === answer.ch && pick.cause === answer.cause;
  if (!right) return 'wrong';
  return clueCount >= minClues ? 'solved' : 'need-evidence';
}
