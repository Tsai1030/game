/** 依舞台寬度與裝置倍率決定畫質：手機（寬 < 700 px）解析度倍率最多 1.5、陰影 1024；其他最多 2、陰影 2048。 */
export function quality(stageW: number, dpr: number): { pixelRatio: number; shadowMap: 1024 | 2048; narrow: boolean } {
  const narrow = stageW < 700;
  return { pixelRatio: Math.min(dpr, narrow ? 1.5 : 2), shadowMap: narrow ? 1024 : 2048, narrow };
}
