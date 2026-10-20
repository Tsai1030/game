/** 取得頁面上一定存在的元素；找不到代表 index.html 和程式不同步，直接丟錯比默默失敗好查。 */
export function $<T extends Element = HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
}
