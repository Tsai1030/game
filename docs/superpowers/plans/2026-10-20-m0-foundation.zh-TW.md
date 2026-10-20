# M0 基礎建設 實作計畫

> 這是給專案負責人看的中文版。執行時以英文版 [2026-10-20-m0-foundation.md](2026-10-20-m0-foundation.md) 為正本，兩者內容相同。
>
> **給執行者：** 必須搭配 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐一執行任務。步驟用核取方塊（`- [ ]`）追蹤。

**目標：** 把已定案的原型（`mockups/rpg-fab.html`）搬進 `game/` 裡的 Bun＋Vite＋TypeScript＋Phaser 3 正式專案。要有繁中／英文切換、存讀檔和設定，Case 03 的玩法和原型一致。

**架構：**
- **核心：** 純邏輯、有單元測試，包括語系、設定、狀態與存檔、玩法系統、地圖資料、案件與劇情資料，以及透過 `Painter` 介面繪圖的繪製模組。
- **黏合層：** 薄薄一層。Phaser 的 `WorldScene` 把繪製結果做成貼圖與圖形，並驅動有測試的 `Mover`（移動控制）；DOM 介面模組在 happy-dom 下測試。
- **原型的角色：** 原型是畫面和行為的參考，照著搬，不重新設計。

**技術：** Bun 1.4.3（套件管理、測試、執行）、Vite 6.4.3、TypeScript 5.9.3、Phaser 3.90.0、yaml 2.9.1、@happy-dom/global-registrator 20.14.5、@types/bun 1.4.2。

**規格依據：** `docs/03-spec.zh-TW.md`：
- 第 2 節：架構
- 5.1：移動
- 5.8：線索與結論
- 5.9：咖啡
- 5.10：設定
- 第 6 節：介面
- 第 8 節：美術

另外參考 `docs/04-roadmap.zh-TW.md` 第 2 節（M0 工作與完成條件）。行為參考 `mockups/rpg-fab.html`。

## 全域限制

- 一律用 Bun，不用 npm／npx。指令：`bun install`、`bun test`、`bun run typecheck`、`bun run build`。
- 版本鎖死：phaser 3.90.0、vite 6.4.3、typescript 5.9.3、yaml 2.9.1、@happy-dom/global-registrator 20.14.5、@types/bun 1.4.2。
- `.ts` 檔裡不寫任何玩家看得到的文字。介面文字一律用 `t(key)`，字串放在 `src/data/locales/ui.zh-TW.json` 和 `ui.en.json`；資料和劇情文字存成 `{ zh, en }`。
- 預設語言：`navigator.language` 開頭是 `zh` 就用 `zh-TW`，否則用 `en`。
- 圖塊 16×16 px，地圖 46×28 格（736×448 px）。
- 整數倍放大：畫面寬 ≥1500 px 放大 4 倍，≥840 px 放大 3 倍，其餘 2 倍。
- 一格走 0.15 秒；咖啡為 0 時變成 0.15／0.7 秒。
- 儲存 key：存檔 `fabns.save.v1`（一個欄位），設定 `fabns.settings.v1`。
- 開啟「減少動態效果」後，任何東西都不閃爍、不閃光、不捲動。
- 字型從 Google Fonts 載入，其餘資源都打包在建置結果裡。
- 每個 commit 訊息結尾加上 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。

**事先決定的規格偏離**（Task 1 時記入 ledger 作為 Ruling）：
- **測試工具：** 規格 2.1 寫的是 Vitest，負責人指定用 Bun，所以測試改用 `bun:test`。如果錯了，代價是改一行 import。
- **地圖：** 規格 2.1 寫地圖用 Tiled。但原型的圖塊是程式繪製的，還沒有圖塊圖檔，所以 M0 地圖先用程式定義，Tiled 移到 M2 決定美術時再導入，Task 10 會更新規格書。如果錯了，代價是 M2 時轉換一次地圖。
- **咖啡值：** 規格 5.9 寫咖啡只在夜班扣。M0 只有夜班，所以一律每 120 秒扣 1。

## 審查重點

1. **localStorage 不存在或會丟錯誤**（私密瀏覽、被封鎖）：遊戲照常開始、照常玩，只是不存檔，也不會當掉。由 Task 2（設定）、Task 3（存檔）測試。
2. **存檔損壞或版本不對：** 「繼續」反灰並顯示提示，「新遊戲」照常可用。由 Task 3（解析）、Task 8（標題畫面）測試。
3. **對話框或機台視窗開著時切換語言：** 所有看得到的文字立刻換語言，結論表單的選擇不會被清掉。由 Task 8 測試。
4. **點了走不到的地方**（沒穿無塵衣點 Fab、點牆、點機台）：出現提示，角色不會卡住也不會穿牆。由 Task 9 測試。
5. **視窗縮到手機寬度（360 px）：** canvas 重新縮放，頁面不出現橫向捲軸，疊在上面的介面都還能用。`computeViewport` 由 Task 9 測試，版面由 Task 10 的手動檢查確認。

---

### Task 1：工具鏈、事件匯流排、語系核心

**檔案：**
- 修改：`game/package.json`、`game/vite.config.ts`、`game/tsconfig.json`
- 新增：`game/bunfig.toml`、`game/tests/setup-dom.ts`、`game/src/core/bus.ts`、`game/src/core/i18n.ts`、兩份語系檔
- 測試：`game/tests/i18n.test.ts`

**介面（產出）：**
- **bus.ts：** `on(evt, fn)`，回傳取消函式；`emit(evt, ...args)`。
- **i18n.ts 型別：** `Lang`（`'zh-TW' | 'en'`）、`Bi`（`{ zh, en }`）、`Params`。
- **i18n.ts 函式：**
  - `LANGS`、`getLang()`
  - `setLang(l)`：切換語言並發出 `'lang'` 事件
  - `fmt(s, params?)`
  - `t(key, params?)`：查不到時先退回繁中，再退回 key 本身
  - `L(bi, params?)`、`esc(s)`
  - `rich(s)`：先跳脫 HTML，再把 `**x**` 換成 `<b>x</b>`
  - `applyDom(root?)`、`dictKeys(l)`

**步驟：**
- [ ] **1. 設定工具鏈：**
  - `package.json` 的 scripts 改成 bun 版本，移除 vitest，加入鎖定版本的開發套件。
  - `vite.config.ts` 改用 `vite` 的 `defineConfig`，保留 yaml 外掛。
  - `tsconfig.json` 的 types 設為 `["vite/client", "bun"]`。
  - `bunfig.toml` 設定測試前預先載入 `tests/setup-dom.ts`（註冊 happy-dom）。
  - 執行 `bun install`，預期產生 `bun.lock`。
- [ ] **2. 寫會失敗的測試：**
  - 兩份語系檔的 key 完全相同。
  - 沒有空字串。
  - 找不到的 key 回傳 key 本身。
  - `fmt` 會填入已知參數，未知的保留原樣。
  - `setLang('en')` 之後 `t('app.title')` 變成 `Fab Night Shift`，`L` 取英文，`'lang'` 事件只發一次。
  - `rich('<i>**hot**')` 等於 `'&lt;i&gt;<b>hot</b>'`。
  - `applyDom` 會填入文字和 aria-label。
- [ ] **3. 執行** `bun test tests/i18n.test.ts`。預期：失敗，找不到 `../src/core/i18n`。
- [ ] **4. 實作** bus.ts、i18n.ts。
- [ ] **5. 執行** `bun test`、`bun run typecheck`。預期：全部通過，typecheck 結束碼 0。
- [ ] **6. Commit：** `feat(game): bun toolchain, event bus and i18n core`。

### Task 2：設定

**檔案：**
- 新增：`game/src/core/storage.ts`、`game/src/core/settings.ts`
- 測試：`game/tests/settings.test.ts`

**介面：**
- **storage.ts：** `KV`（localStorage 的最小介面）、`browserStore()`。
- **settings.ts：**
  - 型別：`TextSpeed`、`Settings`
  - 常數：`SETTINGS_KEY = 'fabns.settings.v1'`；`CPS`：慢 20、標準 40、立即 Infinity（字／秒）
  - 函式：`defaultSettings(navLang, prefersReduce)`、`parseSettings(raw, base)`、`settings`（執行中的設定）、`loadSettings(store, env)`、`saveSettings(store)`

**步驟：**
- [ ] **1. 寫會失敗的測試：**
  - `zh-Hant-TW` 對應 `zh-TW`；`en-US` 和空字串對應 `en`。
  - 不合法的欄位退回預設值。
  - 用假的 store 存讀一次，內容一致。
  - `getItem` 丟錯誤時保留預設值、不丟錯（審查重點 1）。
  - `setItem` 丟錯誤時不丟錯。
- [ ] **2. 執行** `bun test tests/settings.test.ts`。預期：失敗。
- [ ] **3. 實作：** 所有儲存存取都包在 try/catch 裡。
- [ ] **4. 執行** `bun test`。預期：全部通過。
- [ ] **5. Commit：** `feat(game): settings with safe storage`。

### Task 3：遊戲狀態與存檔

**檔案：**
- 新增：`game/src/core/state.ts`、`save.ts`、`autosave.ts`
- 測試：`game/tests/save.test.ts`

**介面：**
- **state.ts：**
  - 型別：`Dir`、`EtchState`、`GameState`
  - 常數：`SHIFT_START = 10020`（02:47:00）、`SHIFT_END = 28800`、`START_POS = (3, 4)`
  - 函式：`newState()`（咖啡 3、朝上、alarm）、`S`（即時綁定）、`setState`、`hasClue`、`fmtClock`
- **save.ts：** `SAVE_KEY`、`parseSave`、`readSave`（回傳 none／corrupt／ok）、`writeSave`、`clearSave`。
- **autosave.ts：** `setAutosave`、`requestSave`（300 ms 合併寫入）、`saveNow`（自動存檔關閉時不寫）。

**步驟：**
- [ ] **1. 寫會失敗的測試：**
  - `fmtClock(10020)` 等於 `'02:47:00'`。
  - 存讀一次，狀態相同。
  - 壞 JSON、v:2、咖啡 6、方向 `north`、線索非字串，都判定為 corrupt。
  - 重複的線索會被去重。
  - 沒有存檔時回傳 none。
  - store 丟錯誤時：寫入回傳 false，讀取回傳 none（審查重點 1）。
  - 開啟自動存檔之前，`saveNow` 不寫入。
- [ ] **2. 執行** `bun test tests/save.test.ts`。預期：失敗。
- [ ] **3. 實作：** `parseSave` 檢查版本、座標範圍、列舉值、布林、咖啡 0–5、時間 0–86400、線索陣列。
- [ ] **4. 執行** `bun test`。預期：全部通過。
- [ ] **5. Commit：** `feat(game): game state and validated save/load`。

### Task 4：玩法系統

**檔案：**
- 新增：`game/src/systems/` 底下的 path、clues、conclusion、coffee、quest
- 測試：`game/tests/systems.test.ts`

**介面：**
- **path：** `bfs`（四方向廣度搜尋，結果不含起點；起點就是目標時回傳 `[]`）。
- **clues：** `addClue`。
- **conclusion：** `judge`，回傳四種結果之一：incomplete（沒填完）、need-evidence（證據不足）、wrong（答錯）、solved（破案）。
- **coffee：** `COFFEE_MAX = 5`、`COFFEE_DECAY_MS = 120000`、`drink`、`decay`。
- **quest：** 5 個任務步驟（`quest.q1`–`q5`）和各自的完成條件。

**步驟：**
- [ ] **1. 寫會失敗的測試：**
  - **bfs：** 繞牆路徑長度為 8，每一步只走一格；被牆完全包住時回傳 null；起點等於目標時回傳 `[]`。
  - **addClue：** 重複加同一條不會變成兩條。
  - **judge：** 涵蓋四種結果。
  - **coffee：** 咖啡滿杯喝不了，扣到 0 不會變負數。
  - **quest：** 新遊戲完成 0 步，全部完成後是 5 步。
- [ ] **2. 執行** `bun test tests/systems.test.ts`。預期：失敗。
- [ ] **3. 實作。**
- [ ] **4. 執行** `bun test`。預期：全部通過。
- [ ] **5. Commit：** `feat(game): pathfinding, clues, conclusion, coffee, quest`。

### Task 5：地圖資料

**檔案：**
- 新增：`game/src/data/world.ts`
- 新增語系 key：5 個地點名稱
- 測試：`game/tests/world.test.ts`

**內容：**
- 地圖格子、18 個物件、3 位 NPC，座標完全照原型。
- 函式：可走判斷、相鄰判斷、地點名稱、`syncEtch`（把 ETCH-07 狀態同步到地圖物件）。
- `TOOL_INFO`：6 台機台的中英狀態卡。

**步驟：**
- [ ] **1. 寫會失敗的測試：**
  - **可走判斷：** 起點可以走。沒穿無塵衣時風淋室不能走，穿了就可以。
  - **可抵達性：** 穿著無塵衣時，從起點走得到每個可互動物件旁邊。沒穿時，走不到任何 Fab 格子（審查重點 4）。
  - **地點名稱：** 5 個地點的名稱都正確。
  - **相鄰判斷：** 斜角不算相鄰，物件內部也不算。
  - **狀態同步：** `syncEtch('fixed')` 之後，ETCH-07 是 run。
  - **雙語：** 機台資訊的中英文都不是空的。
- [ ] **2. 執行** `bun test tests/world.test.ts`。預期：失敗。
- [ ] **3. 實作**：從原型搬移。
- [ ] **4. 執行** `bun test`。預期：全部通過。
- [ ] **5. Commit：** `feat(game): world map, objects and NPC data`。

### Task 6：Case 03 與劇情資料

**檔案：**
- 新增：`game/src/data/case03.json`、`case.ts`、`story/ch02.yaml`、`story.ts`
- 新增語系 key：說話者名稱
- 測試：`game/tests/data.test.ts`

**內容：**
- **case03.json：** 照原型搬入，補上英文：
  - SPC 25 點、6 批 lot、15 行 log
  - log 線索對應、log 註解
  - 5 條線索、5 項耗材
  - 選項、正解、最少 3 條線索、wafer 種子 1027
- **ch02.yaml：** 原型所有對話，中英並排：
  - 開場
  - 王經理的 5 種情況
  - Kevin、阿哲
  - 4 個桌子的描述
  - 置物櫃、咖啡機
  - 結論答錯、破案

**步驟：**
- [ ] **1. 寫會失敗的測試：**
  - 所有中英欄位都不是空的。
  - 說話者都合法，而且兩種語言都有名稱。
  - log 線索的索引沒有超出範圍，對應到存在的線索。
  - 正解在選項裡面。
  - 破案台詞的兩種語言都有 `{n}` 和 `{c}`。
  - 必要的劇情 key 都存在。
- [ ] **2. 執行** `bun test tests/data.test.ts`。預期：失敗。
- [ ] **3. 寫資料檔和型別包裝。**
- [ ] **4. 執行** `bun test`。預期：全部通過。
- [ ] **5. Commit：** `feat(game): Case 03 and chapter 2 story data (zh-TW + en)`。

### Task 7：繪製模組

**檔案：**
- 新增：`game/src/render/` 底下的 palette、paint、tiles、tools、person、portraits、oht
- 測試：`game/tests/render.test.ts`

**做法：** 從原型搬移繪圖程式，機台拆成兩部分：
- **靜態（只畫一次成貼圖）：** 機身、邊光、面板、腔體外框、FOUP、名牌、燈號塔外殼、熄滅的燈。
- **動態（每格重畫）：** 腔體狀態框和字母、亮著的燈和光暈、量測螢幕光、PM-B 告警光、LED、跑馬燈。

發光部分用 ADD 混色。減少動態效果開啟時：
- 閃爍的部分固定成同一個狀態。
- LED 只保留恆亮的。
- 跑馬燈變成靜態、偏暗。
- 天車停在固定位置。

**步驟：**
- [ ] **1. 寫會失敗的測試**（用一個會記錄所有矩形的假 Painter）：
  - **顏色解析：** 能解析 hex 和 rgba。
  - **點陣字：** 畫出的像素數和字形裡的 1 一樣多。
  - **物件範圍：** 每個物件的靜態圖都在貼圖範圍內。
  - **人物範圍：** 每種外觀、方向、動作都在 16×24 內。
  - **LED：**
    - 產生結果固定，每次都一樣。
    - 都在機台頂面上。
    - 只有 ETCH-07 有紅燈。
  - **減少動態效果：** 開啟時，ETCH-07 在不同時間點畫出的內容完全相同。
  - **地圖範圍：** 地圖在 736×448 內。
- [ ] **2. 執行** `bun test tests/render.test.ts`。預期：失敗。
- [ ] **3. 實作。**
- [ ] **4. 執行** `bun test`。預期：全部通過。
- [ ] **5. Commit：** `feat(game): procedural pixel renderers (map, black tools with LEDs, people, OHT)`。

### Task 8：DOM 介面

**檔案：**
- 新增：`game/index.html`、`game/src/style.css`
- 新增：`game/src/ui/` 底下的 dom、toast、dialog、win、hud、windows、title
- 新增：`game/src/game/effects.ts`
- 補齊兩份語系檔所有剩下的介面 key
- 測試：`game/tests/ui.test.ts`

**內容：**
- 從原型搬移 HTML、CSS 和所有機台視窗內容，文字一律改用 `t` 或 `L`。
- 結論句用各語言的模板，把下拉選單插在模板的空格位置：
  - 中：「兇手是 {tool} 的 {ch}，因為 {cause}。」
  - 英：「The culprit is {tool}, chamber {ch}, because of {cause}.」
- 結論表單的選擇存在模組變數裡，切換語言時不會被清掉。

**步驟：**
- [ ] **1. 寫會失敗的測試**（在 happy-dom 下執行）：
  - **對話框：**
    - 文字速度設為「立即」時，跑完 Kevin 的 4 句對話會關閉對話框，結束回呼只呼叫一次。
    - 對話中切換成英文，會顯示英文台詞和英文名字。
  - **結論視窗：**
    - 選好三格後切換成英文，選擇還在，標籤變成英文（審查重點 3）。
    - 只有 2 條線索就送出，顯示「證據不足」。
    - 3 條線索、答對就破案，ETCH-07 變成 run。
    - 答錯會扣 1 杯咖啡，並出現答錯的台詞。
  - **線索：** 同一條線索加兩次，第二次顯示「已經記過了」。
  - **互動提示：** 置物櫃的提示文字會跟著無塵衣狀態改變。
  - **標題畫面：** 存檔損壞時，「繼續」反灰並顯示提示（審查重點 2）。
  - **設定：** 點「English」會切換語言，並寫入設定。
- [ ] **2. 執行** `bun test tests/ui.test.ts`。預期：失敗。
- [ ] **3. 實作。**
- [ ] **4. 執行** `bun test`、`bun run typecheck`。預期：全部通過，typecheck 結束碼 0。
- [ ] **5. Commit：** `feat(game): bilingual DOM UI (HUD, dialog, tool windows, settings, title)`。

### Task 9：移動控制、輸入、Phaser 場景、啟動

**檔案：**
- 新增：`game/src/game/` 底下的 viewport、movement、actions、input、runtime、WorldScene，以及 `game/src/main.ts`
- 測試：`game/tests/movement.test.ts`、`game/tests/viewport.test.ts`

**內容：**
- **computeViewport：** 依畫面寬高算出放大倍率和畫面格數，公式見英文版。
- **Mover：** 移動控制器，從原型的移動、尋路、點擊、互動邏輯搬來，不依賴 Phaser，可以單獨測試。
- **WorldScene：** 只負責把繪製結果放上畫面，鏡頭跟隨照原型。
- **main.ts 啟動順序：** 設定 → 語言 → DOM → Phaser → 標題畫面。另外處理視窗縮放、時鐘、咖啡遞減、切到背景時自動存檔、切換語言時重繪。

**步驟：**
- [ ] **1. 寫會失敗的測試：**
  - **畫面倍率：**
    - 寬 1500 是 4 倍，1499 是 3 倍，839 是 2 倍。
    - 寬 360 時是 2 倍、寬 180 格，不會超出畫面（審查重點 5）。
  - **走路：**
    - 按住「下」0.16 秒走一格。
    - 撞到桌子不會移動。
    - 咖啡為 0 時 0.16 秒不夠走一格，0.22 秒可以。
  - **點擊：**
    - 沒穿無塵衣點 Fab，回傳 `blocked-suit` 並顯示提示（審查重點 4）。
    - 點牆，什麼都不會發生。
    - 穿著無塵衣點 ETCH-07，會走到旁邊，並且只觸發一次互動。
  - **風淋室：** 從西邊走進風淋室，會觸發抵達事件。
- [ ] **2. 執行** `bun test tests/movement.test.ts tests/viewport.test.ts`。預期：失敗。
- [ ] **3. 實作。**
- [ ] **4. 執行** `bun test`、`bun run typecheck`、`bun run build`。預期：全部通過，產生 `game/dist/index.html`。
- [ ] **5. Commit：** `feat(game): movement controller, Phaser world scene and boot`。

### Task 10：文件、預覽、手動檢查

- [ ] **1. 更新文件：**
  - 規格書第 0 節（中英）各加兩列：「套件管理與測試：Bun」「地圖：M2 前先用程式定義」。
  - 路線圖（中英）把 M0 標為完成。
  - 新增 `game/README.md`，列出 bun 指令和資料夾說明。
- [ ] **2. 執行** `bun test`、`bun run typecheck`、`bun run build`。預期：全部通過。
- [ ] **3. 發佈預覽：** 把建置結果發佈成私人網頁，讓負責人試玩。
- [ ] **4. 由負責人手動檢查**（這個 session 無法操作瀏覽器）：
  1. 中文、英文各玩到「CASE 03 完成」一次。
  2. 重新整理後按「繼續」，位置、線索、無塵衣、咖啡都保留。
  3. 開啟減少動態效果後，沒有任何閃爍。
  4. 視窗縮到約 360 px 寬，沒有橫向捲軸，而且還能玩。
- [ ] **5. Commit：** `docs: record M0 rulings and status; game README`。

---

## 自我檢查

- **規格涵蓋：** 路線圖的 M0 項目都有對應的任務：
  - git：已完成
  - Node 改 Bun、專案骨架：Task 1
  - 搬移原型：Task 5–9
  - 資料管線：Task 1、6
  - 存讀檔與設定：Task 2、3、8
- **型別一致：** 跨任務共用的名稱（`Thing`、`LookId`、`Line`、`Speaker`、`KV`、`GameState`、`Painter`、`Mover.click` 的回傳值、`syncEtch`）前後一致。
- **比例：** 計畫只列介面、數值和測試斷言。實作內容從原型搬移，不在這裡逐行抄寫。
