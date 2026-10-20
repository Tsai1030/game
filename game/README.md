# Fab 夜班 · Fab Night Shift（game）

黑色系像素 RPG 原型的正式程式碼。設計文件在 [`../docs/`](../docs/)。

## 指令（一律用 Bun，不用 npm）

| 指令 | 用途 |
|---|---|
| `bun install` | 安裝依賴（版本已鎖定在 `package.json`） |
| `bun run dev` | 開發伺服器（Vite），用瀏覽器打開它印出的網址 |
| `bun test` | 跑所有測試（介面測試用 happy-dom） |
| `bun run typecheck` | TypeScript 型別檢查 |
| `bun run build` | 型別檢查＋建置到 `dist/` |
| `bun run preview` | 預覽建置結果 |

## 資料夾

```
src/
  main.ts          啟動：設定 → 語言 → DOM → Phaser → 標題畫面
  core/            語系、設定、遊戲狀態、存檔、事件匯流排、亂數
  data/            地圖與物件（world.ts）、Case 03（case03.json）、劇本（story/*.yaml）、介面文字（locales/）
  systems/         尋路、線索、結論判定、咖啡、任務清單（純邏輯）
  render/          程式繪製的像素圖：地圖、黑機台＋LED、人物、頭像、天車
  game/            Phaser 場景、移動控制（Mover）、輸入、互動、視窗大小
  ui/              DOM 介面：HUD、對話框、機台視窗、設定、標題畫面
tests/             bun:test 測試
```

## 規則

- 玩家看得到的文字不能寫在 `.ts` 裡：介面文字放 `src/data/locales/ui.*.json`（兩份 key 必須一致，測試會檢查），劇本與資料用 `{ zh, en }`。
- 新功能先寫會失敗的測試，再實作（superpowers 的 TDD 流程）。
