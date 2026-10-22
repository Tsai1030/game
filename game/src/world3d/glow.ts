/**
 * 發光與光暈的強度，集中在這裡調。
 * 負責人 2026-10-22：機台的光暈太大太亮。光暈改成小而集中：每顆 LED 各自一小圈，觀察窗只微微發亮。
 */
export const GLOW = {
  /** 後製光暈（UnrealBloomPass）：強度、擴散半徑、門檻（比門檻亮的像素才會暈開）。 */
  bloom: { strength: 0.6, radius: 0.2, threshold: 0.72 },
  /** LED 顏色倍率；超過 1 光暈才抓得到。 */
  led: 1.4,
  /** 腔體觀察窗：平常／ETCH-07 PM-B 告警閃紅時。 */
  window: 0.65,
  windowAlarm: 1.8,
  /** 燈號塔：綠燈、黃燈常亮／紅燈告警閃。 */
  lamp: 1.7,
  lampAlarm: 2.4,
  /** ETCH-07 腳下的紅光：閃亮時／暗時。 */
  alarmLight: 2.6,
  alarmLightDim: 0.3,
} as const;
