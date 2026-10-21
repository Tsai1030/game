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
  data/            目前地圖（world.ts）、四張地圖（maps/）、Case 03（case03.json）、劇本（story/*.yaml）、介面文字（locales/）
  systems/         尋路、線索、結論判定、咖啡、任務清單、理智、證據、關係、回應、劇本執行器（純邏輯）
  render/          程式繪製的像素圖：地圖、斜角黑機台＋LED、人物、頭像、天車
  game/            Phaser 場景、移動控制（Mover）、輸入、互動、視窗大小
  ui/              DOM 介面：HUD、對話框、劇情播放（scene.ts）、劇情卡、機台視窗、證據簿、圖鑑、設定、標題畫面
tests/             bun:test 測試
```

## 劇本格式 · Script format

劇本放在 `src/data/story/*.yaml` 的 `scenes:` 底下。每段劇情是一串「段落」，每個段落是只有一個 key 的物件。型別定義在 `src/data/script.ts`，執行器在 `src/systems/script.ts`。台詞的 `id` 全域唯一（測試會檢查），格式是「劇情名-編號」。

Scenes live under `scenes:` in `src/data/story/*.yaml`. A scene is a list of beats, and each beat is an object with a single key. The types are in `src/data/script.ts` and the runner is in `src/systems/script.ts`. Every line `id` must be unique across all scenes (a test checks this), written as `scene-number`.

```yaml
scenes:
  example:
    # line：一句台詞。tactic＝可辨識的話術、sanity＝理智變化、evidence＝自動記入證據簿
    # line: one spoken line. tactic = a tactic the player can recognize, sanity = sanity change, evidence = log it automatically
    - line: { id: example-1, speaker: boss, zh: "這種小事也要問？", en: "You need to ask about this?", tactic: comparison, sanity: -6, evidence: talk }
    # choice：玩家選項；if 不成立時選項會鎖住
    # choice: player options; an option whose if fails is shown locked
    - choice:
        - { id: wait, zh: "先等等", en: "Wait for now", do: [] }
        - { id: show, zh: "拿出 SPC 圖", en: "Show the SPC chart", if: { clues: 1 }, do: [{ goto: example_end }] }
    # respond：四種回應（吞下去／澄清事實／設界線／找人討論），效果由 systems/responses.ts 決定
    # respond: the four responses (swallow / clarify / boundary / talk); effects come from systems/responses.ts
    - respond: { target: boss, ally: kevin, evidence: [E-C2-01], after: { boundary: [{ line: { id: example-2, speaker: boss, zh: "……好吧。", en: "…Fine." } }] } }
    # ask：問人；回答分 full／partial／refuse，寫在 asks.yaml
    # ask: ask someone; full / partial / refuse answers live in asks.yaml
    - ask: { npc: fang, topic: focus_ring }
    # if／then／else：條件分支
    # if / then / else: branch on a condition
    - if: { flag: ev_unlocked, rel: { npc: kevin, min: 20 } }
      then: [{ effect: { rel: { kevin: 5 } } }]
      else: [{ effect: { flag: kevin_cold } }]
    # effect：改狀態（理智、關係、旗標、咖啡、線索、無塵衣）
    # effect: change state (sanity, relationships, flags, coffee, clues, bunny suit)
    - effect: { sanity: -3, flag: met_boss, clue: pm }
    # evidence：直接記一筆證據（例如 LINE 訊息）
    # evidence: log an item directly (for example a LINE message)
    - evidence: { id: E-EX-01, time: "03:05", source: chat, speaker: me, zh: "收到。", en: "Got it." }
    # card：全畫面劇情卡（章節卡、通知）
    # card: a full-screen story card (chapter card or notice)
    - card: { kind: chapter, zh: "第 2 章　夜班", en: "Chapter 2: Night Shift" }
    # include：插入另一段劇情，播完回來；goto：換到另一段劇情，不回來
    # include: play another scene, then come back; goto: switch to another scene for good
    - include: boss_main
    - goto: example_end
```

劇情由 `playScene(id)` 播放（`src/ui/scene.ts`）。播放時暫停自動存檔，存檔停在劇情開頭，讀檔後從頭重播，效果不會重複。要等玩家空下來再播的劇情（例如 LINE 回報）用 `queueScene(id)`。

Scenes play through `playScene(id)` (`src/ui/scene.ts`). Autosave pauses while a scene plays, so the save stays at the scene's start and a reload replays it from the top without applying its effects twice. Use `queueScene(id)` for scenes that should wait until the player is free, such as LINE reports.

## 地圖與劇情觸發 · Maps and triggers

每張地圖是 `src/data/maps/` 裡的一個 `MapDef`：格子（每列一個字串）、物件、NPC 定義、出口、地點範圍、起點。地板字元：`#` 牆、`.` 地毯、`,` Fab、`y` 黃光區、`=` 更衣室、`D` 門、`A` 風淋室、`g` 玻璃、`l` 石材、`w` 木地板。

Each map is a `MapDef` in `src/data/maps/`: tile rows (one string per row), objects, NPC definitions, exits, location regions and a start tile. Tile characters: `#` wall, `.` carpet, `,` fab, `y` yellow room, `=` gowning room, `D` door, `A` air shower, `g` glass, `l` stone, `w` wood.

```ts
// NPC：同一個 id 可以寫好幾筆，取第一筆 when 成立的；talk 是說話時播的劇情。
// NPCs: an id may have several entries; the first whose `when` holds is used. `talk` is the scene played when you talk to them.
{ id: 'kevin', look: 'kevinDay', x: 7, y: 4, dir: 'down', talk: 'p_ask_kevin', when: { chapter: 'prologue', flag: 'task_hold', notFlag: 'knows_hold_lot' } },
// 出口：站上門格就換地圖；if 不成立時播 locked 劇情、人留在原地。
// Exits: stepping on the door tile changes map. If `if` fails, the `locked` scene plays and you stay put.
{ x: 10, y: 0, to: 'M02', at: { x: 2, y: 10, dir: 'up' }, if: { flag: 'p_badge' }, locked: 'p_gate_locked' },
```

劇本檔可以寫 `triggers:`，在走進某張地圖（或某個範圍 `at: [x, y, w, h]`）時自動播劇情。觸發的劇情要設一個旗標，讓自己的條件不再成立（測試會檢查）。效果可以用 `time: "15:00"`、`chapter: ch2`、`etch: alarm`，以及 `warp: { map, x, y, dir }` 把玩家帶到別的地方；台詞裡的 `{name}` 會換成玩家的名字。

A story file can list `triggers:` that start a scene when you enter a map (or an area `at: [x, y, w, h]`). A triggered scene must set a flag that turns its own condition off (a test checks this). Effects can use `time: "15:00"`, `chapter: ch2`, `etch: alarm` and `warp: { map, x, y, dir }` to move the player. `{name}` in a line becomes the player's name.

```yaml
triggers:
  - { scene: p_s2, map: M02, if: { chapter: prologue, notFlag: seen_p_s2 } }
```

## 規則

- 玩家看得到的文字不能寫在 `.ts` 裡：介面文字放 `src/data/locales/ui.*.json`（兩份 key 必須一致，測試會檢查），劇本與資料用 `{ zh, en }`。
- 新功能先寫會失敗的測試，再實作（superpowers 的 TDD 流程）。
