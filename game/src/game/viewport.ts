import { MH, MW, TS } from '../data/world';

/**
 * 依舞台寬度與視窗高度，算出整數放大倍率與畫面要顯示多少邏輯像素。
 * 寬 ≥1500 放大 4 倍、≥840 放大 3 倍，其餘 2 倍；高度盡量吃滿視窗，但不超過地圖。
 */
export function computeViewport(stageW: number, innerH: number): { zoom: 2 | 3 | 4; w: number; h: number } {
  const zoom = stageW >= 1500 ? 4 : stageW >= 840 ? 3 : 2;
  const narrow = stageW < 700;
  const w = Math.min(Math.floor(stageW / zoom), MW * TS);
  const target = Math.max(narrow ? 300 : 420, Math.min(innerH - (narrow ? 300 : 140), narrow ? stageW * 1.2 : stageW * 0.68));
  const h = Math.min(Math.floor(target / zoom), MH * TS);
  return { zoom, w, h };
}
