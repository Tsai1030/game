/** 把線索加進清單；已經有的不會重複加入。 */
export function addClue(list: readonly string[], id: string): { added: boolean; list: string[] } {
  return list.includes(id) ? { added: false, list: [...list] } : { added: true, list: [...list, id] };
}
