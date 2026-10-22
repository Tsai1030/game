# M1-2b Chapter 2 Ending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Chinese version for the owner: [2026-10-22-m1-2b-chapter2-ending.zh-TW.md](2026-10-22-m1-2b-chapter2-ending.zh-TW.md). This English file is the canonical plan.

**Goal:** Finish v0.1 so New Game plays through to the end-of-demo card in both languages. That means:
- C2-07 to C2-10: Bear swaps the focus ring, the stand-up where Wang takes the credit, the three-way choice, and the talk afterwards.
- Bear and Director Chen in 3D.
- The end-of-demo card.
- The leftover Minors from earlier reviews.
- The spec §9 acceptance pass.

**Architecture:**
- **Story stays data:**
  - New scenes go in `ch02.yaml`, plus one trigger that starts the stand-up when you walk into the meeting room.
  - Who stands where in each phase is a `NpcDef` with a `when` condition in `m03-site.ts`.
- **Engine additions are small:**
  - A card kind `end`.
  - Sanity at chapter start, kept in the save (format v4).
  - A pure `chapterSummary(s)` that the end card renders from.
- **New Game and Continue move into `game/session.ts`**, out of `main.ts`, so tests can drive them.

**Tech Stack:** unchanged. Bun 1.4.3, Vite 6.4.3, TypeScript 5.9.3, three 0.160.0, yaml 2.9.1, happy-dom 20.14.5. No new dependencies.

**Spec:**
- `docs/03-spec.en.md`:
  - §1 scope; §2.4 saving
  - §4 Bear and Director Chen
  - §5.2 sanity table (ally chat, wrong conclusion, finishing a chapter); §5.8
  - §6 end-of-demo card
  - §7.2 C2-07 to C2-10 and the C2-09 table
  - §9 acceptance criteria
- `docs/02-story.en.md`: §4 cast, §6 Chapter 2 outline.

M1-2b completes M1. After it, the owner's playtest decides whether v0.1 is done.

## Global Constraints

- **Earlier plans still apply:**
  - Bun only: `bun test`, `bun run typecheck`, `bun run build`.
  - No player-visible text in `.ts`. Text goes in the locale JSON or YAML `{ zh, en }`.
  - TDD.
  - The attribution line on every commit.
- **Names:**
  - Bear is 大熊 / Bear. Speaker label `speaker.bear`: 「大熊（EE）」 / "Bear (EE)".
  - Director Chen is 陳處長 / Director Chen. Speaker label `speaker.chen`: 「陳處長」 / "Director Chen".
  - Director Chen has no relationship value (like the guard). Bear's is already in `NPC_IDS`, starting at 0.
- **Numbers** (§5.2, §7.2):
  - **Wrong conclusion:** sanity −5 and coffee −1, then you can try again.
  - **C2-07:** sanity +5, Bear +10.
  - **C2-08:** −12 [credit_stealing] and −12 [gaslighting]. A correct tag halves each to −6.
  - **C2-09:**

    | Choice | id | Requirement | Result |
    |---|---|---|---|
    | Pull up the LINE messages on the spot | `line` | `evidence: [E-C2-03, E-C2-04]`; the option is disabled otherwise | +10, Wang −25, flag `confronted_publicly` |
    | Email a timeline after the meeting, CC yourself | `email` | always enabled | With ≥2 of E-C2-01..04: +8, Wang −5, flag `paper_trail`. With fewer: +0, Wang −5, flag `paper_trail_thin` |
    | Let it go | `drop` | — | −5, Wang +5, flag `let_it_go` |

    `paper_trail_thin` is Claude's call. The email still goes out, but Chapter 6 can tell a thin one apart.
  - **C2-10:** finishing the chapter gives +10.
  - **Ally chat:** +5, once per ally per chapter.
    - In Chapter 2 the allies are Kevin, Fang-jie and A-Zhe. Flags: `chat_kevin_ch2`, `chat_fang_ch2`, `chat_fse_ch2`.
    - The prologue has no ally chats. Its numbers don't change.
- **Times:**
  - C2-07 is at 05:40, after the last LINE timestamp (05:10).
  - Back in the office at 07:40.
  - The stand-up is at 08:00.
  - C2-10 is at 08:30.
- **Chapter 2 positions** (M03 tiles; the flag that places each phase is in brackets):

  | Phase | Who | Tile and facing |
  |---|---|---|
  | C2-07 [`c2_bear_here`, stays set] | Bear (cleanroom suit, green gloves) | (26,6) up |
  | | Player (warp, suit on) | (26,7) up |
  | Back to the office | Player (warp, suit off) | (3,4) up |
  | Stand-up [`c2_in_standup`] | Director Chen | (8,12) down |
  | | Wang | (5,14) right |
  | | Kevin (day clothes, `kevinDay`) | (11,14) left |
  | | Player (warp, suit off) | (8,15) up |
  | C2-10 [`c2_after`] | Kevin (`kevinDay`) | (7,4) left |
  | | Fang-jie | (5,4) left |
  | | Wang | (11,4) down |
  | | Player (warp) | (3,4) up |

  NPCs that only appear inside a running scene use `talk: say_end`.
- **Stand-up trigger:**
  - Map M03, area `[3, 11, 11, 6]` (the meeting room, including its door at (3,13)).
  - Condition: `{ chapter: ch2, flag: c2_standup_call, notFlag: seen_c2_standup }`.
- **End-of-demo card** (§6):
  - **Sanity this chapter:** start → now, with a signed change. The sign is `+` for gains and `−` (U+2212) for losses.
  - **Relationships:** each of the six `NPC_IDS`, with signed values.
  - **Codex:** cards unlocked as n/7, plus their names.
  - **Teaser** for Chapter 3:
    - 「第 3 章 · 互踢皮球｜11 月，一場 particle 異常。大熊說是你們製程的問題，你說是他的機台。王經理對你們兩個說的，好像不太一樣。」
    - "Chapter 3 · The Blame Game | November. A particle excursion. Bear says it's your process; you say it's his tool. And Manager Wang seems to be telling each of you something different."
  - Closing the card returns to the title. After the demo, Continue shows the card again; there is no post-game roaming (Claude's call: it avoids stale lines).
- **Saving:** format `v: 4`, same key `fabns.save.v1`.
  - New field `chapterSanity` (integer 0–100): your sanity when the current chapter began.
  - v1–v3 saves migrate with `chapterSanity = sanity`.

## Review Focus

1. **Reload between the cutscene and the stand-up:** Continue puts you in the office. ETCH-07 is green, Bear is at ETCH-07, and the stand-up is still pending: walking into the meeting room starts it. Tested in Task 8.
2. **Reload in the middle of the stand-up:** the stand-up replays from its first line. Sanity, relationships and evidence are exactly what they were before it began, so nothing is charged twice. Tested in Task 8.
3. **A fast double Enter or click on the end card:** you return to the title exactly once. Continue then shows the end card again, not a stale office. Tested in Task 4.
4. **Switching language while the end card is open:** every label, NPC name, Codex card name and the teaser switch, and nothing stays untranslated. Tested in Task 4.
5. **Sanity hitting zero during the stand-up:**
   - The first time, the forced-leave card shows and the stand-up continues at 40.
   - The second time, the game ends in Burnout and returns to the title with the save deleted.

   Tested in Task 6.

---

### Task 1: Leftovers from earlier reviews

**Files:**
- **Create** `game/src/systems/reports.ts`.
- **Modify:**
  - `game/src/game/effects.ts`
  - `game/src/ui/scene.ts`
  - `game/src/ui/windows.ts` (Evidence Log speaker)
  - `game/src/ui/hud.ts`
  - `game/index.html` (the date label gets `id="date"` and loses its `data-i18n`)
  - `game/src/data/story/ch02.yaml` (`rc_wrong`)
  - `game/src/data/story/prologue.yaml`
  - `game/src/data/maps/m03-site.ts`
  - both locale files
- **Test:** `game/tests/scene.test.ts`, `game/tests/ui.test.ts` and `game/tests/prologue.test.ts`.

**Interfaces:**
- **Produces, in `systems/reports.ts`:**
  - `reportScene(clue: string): string | null`. It maps `spc` → `c2_report_spc` and `ring` → `c2_report_ring`.
  - `pendingReports(s: GameState): string[]`. These are the report scenes for clues you hold whose `seen_<scene>` flag is not set yet.
  - `effects.ts` uses both for `gainClue` and `requeueReports`. `scene.ts` uses them when a scene effect grants a clue (the `clue` runner event).
- **HUD:**
  - `#quest` is hidden while `S.chapter === 'prologue'`.
  - `#date` shows `t('hud.date.' + S.chapter)`:
    - prologue: 「8/24」 / "Aug 24"
    - ch2: 「10/21」 / "Oct 21"
  - These replace `hud.date`.
- **Asking only costs once:**
  - `p_ask_boss` sets `p_asked_boss`, and `p_ask_kevin` sets `p_asked_kevin`.
  - The asking `NpcDef`s use `notFlag: [knows_hold_lot, p_asked_boss]` and `notFlag: [knows_hold_lot, p_asked_kevin]`. After asking once, Wang and Kevin fall through to their normal talk scenes.

- [ ] **Step 1: Write the failing tests:**
  - **Wrong conclusion** (extend the existing ui test): a wrong cause with 3 clues costs coffee −1 and sanity −5.
  - **Report from a scene clue:**
    - Play a fixture scene `t_clue_ring: [{ effect: { clue: ring } }]` to its end, then call `pumpQueue()`.
    - `#dlg-text` shows the first line of `c2_report_ring`.
    - After playing it through, E-C2-03 and E-C2-04 are in `S.evidence`.
  - **Ask once:** in the prologue, talking to Wang again after one ask plays `p_boss`, and sanity stays the same. Talking to Kevin again doesn't cost another −2.
  - **Evidence Log name:** with `S.name = '阿明'`, an entry whose speaker is `me` shows 阿明. With an empty name it shows 林靜 (or Jing Lin in English).
  - **HUD:**
    - `newState()`: `#quest` is hidden and `#date` reads 8/24.
    - `ch2State()`: `#quest` is shown and `#date` reads 10/21.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `rc_wrong`, add `effect: { sanity: -5 }` before its line.
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `fix(game): review leftovers: wrong-conclusion sanity, scene clue reports, ask once, names in the log, prologue HUD`.

### Task 2: Sanity at chapter start (save v4)

**Files:**
- **Modify** `game/src/core/state.ts`, `game/src/core/save.ts` and `game/src/systems/script.ts`.
- **Test** `game/tests/save.test.ts` and `game/tests/script.test.ts`. Also update the `v: 3` expectations in `game/tests/ui.test.ts`.

**Interfaces:**
- **Produces:**
  - `GameState.v: 4` and `GameState.chapterSanity: number`.
  - `newState()` and `ch2State()` set `chapterSanity: 80`.
  - `applyEffect(s, { chapter })` sets `s.chapterSanity = s.sanity`. It runs before any `sanity` change in the same effect.
- **`parseSave`:**
  - Accepts v1–v4.
  - v4 requires `chapterSanity` to be an integer from 0 to 100.
  - v1–v3 get `chapterSanity = sanity` (80 for v1).

- [ ] **Step 1: Write the failing tests:**
  - **Chapter effect:** a state with sanity 59, after `applyEffect(s, { chapter: 'ch2' })`, has `chapterSanity` 59.
  - **Round trip:** `parseSave(JSON.stringify(s))` deep-equals `s` for a v4 state with every field set to a non-default value.
  - **Migration:** a v3 save with sanity 42 loads as v4 with `chapterSanity` 42.
  - **Rejection:** a v4 save with `chapterSanity` 101, or without it, returns `null`.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): remember sanity at chapter start (save v4)`.

### Task 3: Bear and Director Chen

**Files:**
- **Modify:**
  - `game/src/data/story.ts` (`SPEAKERS` gains `bear` and `chen`)
  - `game/src/data/world.ts` (`LookId` gains `bear` and `chen`)
  - `game/src/data/looks.ts`
  - `game/src/render/portraits.ts`
  - both locale files
- **Test** `game/tests/render.test.ts`. The existing loops in `world3d.test.ts` (every `LOOK` builds a person) and `data.test.ts` (every speaker has a label) cover the rest.

**Interfaces:**
- **Looks:**
  - `LOOK.bear = { suit: true, glove: '#5ab86a' }`. Bear only appears in the fab in v0.1.
  - `LOOK.chen = { hair: '#1a1820', top: '#2a2e44', bottom: '#1a1c28', tie: true }`.
- **Portraits:**
  - `bear`: the `HOOD` grid with `S: '#5ab86a'`.
  - `chen`: the `BOSS` grid with `H: '#1a1820'`, `W: '#2a2e44'` and `R: '#c8a040'`.
  - `PortraitId` gains both.

- [ ] **Step 1: Write the failing test.** Extend "Fang-jie, Amy and the guard have looks and 16×16 portraits" to `['fang', 'amy', 'guard', 'bear', 'chen']`. Also check that `t('speaker.bear')` and `t('speaker.chen')` match the Global Constraints in both languages.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass, including the 3D person and speaker-label loops.
- [ ] **Step 5: Commit:** `feat(game): Bear and Director Chen (looks, portraits, names)`.

### Task 4: End-of-demo card

**Files:**
- **Create** `game/src/systems/summary.ts`.
- **Modify:**
  - `game/src/data/script.ts` and `game/src/systems/script.ts` (card kind `'end'`)
  - `game/src/ui/cards.ts`
  - `game/src/ui/scene.ts`
  - `game/src/data/story/ch02.yaml` (`c2_demo_end`)
  - both locale files
  - `game/src/style.css`
- **Test** `game/tests/cards.test.ts`, `game/tests/systems.test.ts` and `game/tests/data.test.ts`.

**Interfaces:**
- **Consumes:** `GameState.chapterSanity` (Task 2).
- **Produces:**
  - `chapterSummary(s: GameState): { from: number; to: number; rel: { id: NpcId; value: number }[]; codex: TacticId[] }`. `rel` is in `NPC_IDS` order and `codex` in `TACTIC_IDS` order.
  - `signed(n: number): string`, also in `summary.ts`: `+18`, `−35` (U+2212), `0`.
  - The card kind in `Beat` and `Frame` becomes `'chapter' | 'notice' | 'end'`. For `end`, the card's `zh`/`en` is the teaser.
  - `showEndCard(teaser: Bi, onClose: () => void): void` in `cards.ts`.
    - It renders from the live state and re-renders on `lang`.
    - It closes the same way as other cards (click, Space, Enter), and only once.
- **Locale keys:**

  | Key | zh-TW | en |
  |---|---|---|
  | `end.title` | 試玩版結束 | End of Demo |
  | `end.sanity` | 本章理智：{from} → {to}（{delta}） | Sanity this chapter: {from} → {to} ({delta}) |
  | `end.rel` | 關係 | Relationships |
  | `end.codex` | 話術圖鑑 {n}/{total} | Codex {n}/{total} |
  | `end.next` | 下一章 | Next chapter |
  | `end.thanks` | 謝謝你玩到這裡。 | Thanks for playing this far. |
  | `end.back` | 回標題畫面 | Back to title |
- **`scene.ts`:** closing an `end` card advances the runner to the end of the scene (which finishes and saves), then emits `toTitle`.
- **Data rule:** an `end` card is the last top-level beat of its scene.
- **`c2_demo_end`:** one beat, the end card with the teaser from the Global Constraints.

- [ ] **Step 1: Write the failing tests:**
  - **Summary:**
    - Input: `chapterSanity` 59, sanity 77, `rel.boss` −35, codex `[credit_stealing, personal_attack]`.
    - Expected: `from` 59, `to` 77, six `rel` entries in `NPC_IDS` order, codex `[personal_attack, credit_stealing]`.
    - `signed(18)` is `+18`, `signed(-35)` is `−35`, `signed(0)` is `0`.
  - **Card contents:** `playScene('c2_demo_end')` with that state shows a `#card` containing:
    - `59 → 77（+18）`
    - 王經理 with `−35`
    - `2/7`
    - the teaser
  - **Double close (Review Focus 3):**
    - Two Enter keydowns in a row emit `toTitle` exactly once.
    - Afterwards `isSceneActive()` is `false`.
    - The save in `localStorage` has `scene: null`.
  - **Language (Review Focus 4):** `setLang('en')` while the card is open leaves no CJK characters in `#card`. Use the default name and the state above.
  - **Data:** every `end` card is the last top-level beat of its scene.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.** The card layout is a column on phone width, with no horizontal scroll.
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): end-of-demo card with the chapter summary`.

### Task 5: C2-07, Bear swaps the focus ring; ally chats

**Files:**
- **Create** `game/tests/drive.ts` (the playthrough driver, moved out of `prologue.test.ts`) and `game/tests/chapter2.test.ts`.
- **Modify:**
  - `game/src/game/effects.ts` (`solveCase`)
  - `game/src/data/story/ch02.yaml` and `game/src/data/story/world.yaml` (`fang`)
  - `game/src/data/maps/m03-site.ts`
  - `game/src/systems/quest.ts`
  - both locale files (`quest.q6`)
  - `game/tests/prologue.test.ts`, `game/tests/ui.test.ts` and `game/tests/scene.test.ts`

**Interfaces:**
- **Consumes:** Bear's look and portrait (Task 3).
- **Produces:**
  - **`tests/drive.ts`** exports:
    - `play(picks?, recognize?)`, which also calls `pumpQueue()` whenever no scene is active
    - `walkTo(x, y)`, `talk(id)`, `use(id)`
    - `newGame(name?)`, `prologue(stay?)`
    - `setCheckText(on: boolean)`, which checks for no CJK in `#dlg-text`, `#dlg-who` and `#card` while playing
  - **`solveCase()`** sets `S.solved = true` and ETCH-07 to `'inhibit'`. The cutscene later sets `etch: fixed`.
  - **`rc_solved`** (C2-07), in this order:
    1. A system line: it's 05:40, your conclusion is sent, and Bear arrives with a new focus ring. Then `effect: { time: "05:40", suit: true, flag: c2_bear_here, warp: { map: M03, x: 26, y: 7, dir: up } }`.
    2. Bear's signature line, 「機台沒問題，是你們製程的問題。」 / "The tool's fine. It's your process." Then he sees 1,180 h and admits the PM was pushed back.
    3. `effect: { etch: fixed }`, then a line on the swap and the monitor wafer: CD 45.1 nm, back on target.
    4. Bear tells you to call him directly next time. Then `effect: { sanity: 5, rel: { bear: 10 } }`.
    5. The 4 held lots are released. Then the existing summary line with `{clues}` and `{coffee}`, which stays the last line.
    6. `goto: c2_back_office`.
  - **`c2_back_office`:**
    - `effect: { time: "07:40", suit: false, flag: c2_standup_call, warp: { map: M03, x: 3, y: 4, dir: up } }`
    - Wang (LINE): he will present at 8, and you should come too.
    - A system hint: the stand-up is in the meeting room, and you can check the Evidence Log (J) first.
  - **`c2_bear`** (talking to Bear afterwards): PM-B is seasoning, don't touch it, and call him directly next time.
  - **Ally chats:** `kevin`, `fse` and the Chapter 2 branch of `fang` start with:
    - `if: { notFlag: chat_<id>_ch2 }`
    - `then: [effect { sanity: 5, flag: chat_<id>_ch2 }, a system line naming the ally and "Sanity +5"]`
  - **After solving** (`if: { solved: true }`), nobody talks about an alarming ETCH-07:
    - `boss_solved` changes to: Wang presents at the 8 o'clock stand-up, you come too, and Director Chen will be there.
    - `kevin` and `fang` get a short branch for this.
  - **Bear's `NpcDef`:** `{ id: 'bear', look: 'bear', x: 26, y: 6, dir: 'up', talk: 'c2_bear', when: { chapter: 'ch2', flag: 'c2_bear_here' } }`.
  - **Quest:** `quest.q6` reads 「8 點到會議室開晨會」 / "Go to the 8:00 stand-up in the meeting room". It is done when `seen_c2_standup` is set.

- [ ] **Step 1: Write the failing tests.**
  - **Driver:** move the driver into `tests/drive.ts`. `prologue.test.ts` still passes unchanged.
  - **Submit and cutscene** (`ui.test.ts`):
    - Right after submitting the right answer, ETCH-07's `st` is `'inhibit'`. This replaces the old `'run'` assertion.
    - After playing `rc_solved` to its end:
      - `st` is `'run'`.
      - You are on M03 at (3,4) with `suit` false.
      - Sanity is +5 and `rel.bear` is 10.
      - Flags include `c2_bear_here` and `c2_standup_call`.
      - `fmtClock(S.sec)` starts with `07:40`.
  - **Summary line** (`scene.test.ts`): "rc_solved shows real clue and coffee counts" advances until the line containing `CASE 03`, instead of a fixed count.
  - **Ally chats** (`chapter2.test.ts`):
    - Talking to Fang-jie twice in Chapter 2 gives +5 once. Kevin and A-Zhe are the same.
    - Talking to Fang-jie in the prologue changes nothing.
  - **Bear's placement:** with `c2_bear_here`, `refreshNpcs(S)` puts `bear` at (26,6).
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): C2-07 Bear swaps the focus ring; ally chats`.

### Task 6: C2-08 to C2-10, the stand-up

**Files:**
- **Modify** `game/src/data/story/ch02.yaml` (scenes plus `triggers:`) and `game/src/data/maps/m03-site.ts` (the stand-up and C2-10 `NpcDef`s, placed before the general Chapter 2 ones).
- **Test** `game/tests/chapter2.test.ts`.

**Interfaces:**
- **Consumes:** `c2_demo_end` (Task 4), the Chen look (Task 3), the `c2_standup_call` state (Task 5).
- **Produces:**
  - **`c2_standup`** (C2-08 and C2-09):
    1. `effect: { time: "08:00", flag: seen_c2_standup }`, then `effect: { flag: c2_in_standup, suit: false, warp: { map: M03, x: 8, y: 15, dir: up } }`.
    2. System line: the 08:00 stand-up.
    3. Chen: 「我不要過程，我要結果。ETCH 那批怎麼樣了？」 / "I don't want the process. I want results. What happened with the ETCH lots?"
    4. Wang: 「我判斷是 focus ring 的問題，已經處理了。」 / "I identified it as a focus ring issue, and it's been handled." Tagged `tactic: credit_stealing`, `sanity: -12`, `evidence: meeting`.
    5. You speak up: you found the focus ring around 04:30.
    6. Wang: 「我昨天不是就叫你去看 focus ring 了嗎？你記錯了吧。」 / "Didn't I tell you to check the focus ring yesterday? You must be remembering it wrong." Tagged `tactic: gaslighting`, `sanity: -12`, `evidence: meeting`.
    7. A `choice` with ids `line`, `email` and `drop`, using the Global Constraints table:
       - `line` is guarded by `if: { evidence: [E-C2-03, E-C2-04] }`. Its label ends with a hint: 「（需要你 04:32 的回報和他的回覆）」 / "(needs your 04:32 report and his reply)".
       - `email` branches on `if: { evidenceMin: { ids: [E-C2-01, E-C2-02, E-C2-03, E-C2-04], n: 2 } }`. Each branch has its own lines: the email lists the timestamps, or it sounds thin.
       - Each option ends with its result effect.
    8. `effect: { unflag: c2_in_standup }`, then `goto: c2_s10`.
  - **`c2_s10`** (C2-10):
    1. `effect: { time: "08:30", flag: c2_after, warp: { map: M03, x: 3, y: 4, dir: up } }`.
    2. Who you talk to depends on your choice:
       - `confronted_publicly`: Kevin. He says you've got guts, and Wang will remember it.
       - `let_it_go`: Kevin. It happened to him too, and it will happen again.
       - Otherwise: Fang-jie. For `paper_trail`, she says written records protect you. For `paper_trail_thin`, she says to send reports as they happen next time.
    3. A wrap-up line, then `effect: { sanity: 10 }` with a line saying "Chapter 2 complete. Sanity +10".
    4. `effect: { flag: demo_done }`, then `goto: c2_demo_end`.
  - **Trigger:** the stand-up trigger in the Global Constraints.

- [ ] **Step 1: Write the failing tests** in `chapter2.test.ts`.
  - **Setup:** each test starts from a helper state that is "just solved and back in the office":
    - `ch2State()` plus sanity 70, `solved`, `etch: fixed`
    - flags `ev_unlocked`, `c2_bear_here`, `c2_standup_call`
    - the evidence items under test

    Then `walkTo(3, 13)`.
  - **Trigger:** walking to (3,13) starts `c2_standup`. Without `c2_standup_call` nothing starts.
  - **Confront, with E-C2-01..04:**
    - Recognize both tactics and pick `line`.
    - Expected: sanity 70 − 6 − 6 + 10 + 10 = 78, `rel.boss` −25, flag `confronted_publicly`.
    - Without recognizing them, the result is 70 − 12 − 12 + 10 + 10 = 66.
  - **Email, with E-C2-01 and E-C2-02 only:**
    - The `line` button is disabled.
    - Pick `email`: sanity 70 − 24 + 8 + 10 = 64, `rel.boss` −5, flag `paper_trail`.
  - **Email, with E-C2-01 only:** sanity 70 − 24 + 0 + 10 = 56, flag `paper_trail_thin`.
  - **Let it go:** sanity 70 − 24 − 5 + 10 = 51, `rel.boss` +5, flag `let_it_go`.
  - **Every run:**
    - Both of Wang's lines are in `S.evidence` with source `meeting`.
    - `#card` shows the end card.
    - Flags include `demo_done` and `c2_after`.
    - `fmtClock(S.sec)` starts with `08:30`.
    - You are at (3,4).
  - **Zero sanity (Review Focus 5):**
    - Sanity 10 and `zeroCount` 0: the credit-stealing line shows the forced-leave card. Sanity is 40, and the next line is your reply.
    - Sanity 10 and `zeroCount` 1: Burnout. The Burnout card shows, `toTitle` fires when it closes, and the save is deleted.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): C2-08 to C2-10, the stand-up and its three choices`.

### Task 7: 3D view leftovers

**Files:**
- **Modify** `game/src/world3d/model.ts`, `game/src/world3d/view.ts` and `game/src/ui/fade.ts`.
- **Test** `game/tests/world3d.test.ts` and `game/tests/ui.test.ts`.

**Interfaces:**
- **Shadows:** `ViewState` gains `focus: { x: number; z: number }`, the camera's ground target in world units. The sun and its shadow box follow `focus`, not the player. `WorldView` passes `{ x: this.target.x, z: this.target.z }`.
- **`fadeSwap(go: () => void, done: () => void, ms = 200): Promise<void>`** in `ui/fade.ts`:
  1. Fade out.
  2. Run `go` inside try/catch, logging any error with `console.error`.
  3. Always fade in, then call `done`.

  `WorldView`'s fader calls it, with `go` covering the map change, the rebuild, the motion reset and the banner.
- **`fadeOut`:**
  - It leaves an overlay that is already showing at full opacity. This is the "pop to black" Minor.
  - Otherwise it forces a style flush (`getComputedStyle(el).opacity`) between showing the overlay at 0 and starting the transition.
- **`WorldView.frame`:** skips the update and the render while the title screen is open. The canvas keeps its last frame.
- **`WorldView.resize`:**
  - It returns early when the stage width and window height are unchanged. This prevents a ResizeObserver loop.
  - After setting the stage height, it sizes the renderer and camera from `stage.clientHeight`, so the border no longer squashes the picture.

- [ ] **Step 1: Write the failing tests:**
  - **Shadow focus:**
    - Build `WorldModel` on M03.
    - Call `update` with the player at (5, 5) and `focus` (30, 20).
    - The `DirectionalLight` target is at (30, 0, 20), and the light is at (21, 16, 30).
  - **Fader error:** `fadeSwap` with a `go` that throws:
    - `done` is called once.
    - `#fade` ends hidden.
    - `console.error` was called.
  - **No pop:** with `#fade` showing at opacity `1`, calling `fadeOut(200)` (not awaited) leaves `style.opacity` at `1`.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.** The title-screen idle, the resize guard and the border fix in `view.ts` need WebGL, so they are checked by hand in Task 9.
- [ ] **Step 4: Run** `bun test`, `bun run typecheck` and `bun run build`. Expected: all pass.
- [ ] **Step 5: Commit:** `fix(game): shadows follow the view; safe fades; idle on the title screen`.

### Task 8: Session module and the §9 acceptance run

**Files:**
- **Create** `game/src/game/session.ts` and `game/tests/demo.test.ts`.
- **Modify** `game/src/main.ts` (it calls the session) and `game/tests/drive.ts` (`newGame` uses `startGame`).

**Interfaces:**
- **Produces:** `startGame(loaded: GameState | null, name = ''): void` in `game/session.ts`. This is `main.ts`'s `start()` moved as it is, with one change for Continue when no scene is replayed:
  - With `demo_done`: `playScene('c2_demo_end')`.
  - Otherwise: `requeueReports()`, then `fireTrigger()`. A trigger that was pending when the game closed now fires.

- [ ] **Step 1: Write the failing tests** in `demo.test.ts`.
  - **Full demo in Chinese:**
    1. `newGame()`, then `prologue()`: leave on time and recognize `personal_attack`.
    2. Chapter 2 clues:
       - `gainClue` for `spc`, `fdc`, `ring` and `map`. These are what the windows call.
       - Talk to Kevin (the `pm` clue and his chat).
       - Use the locker, and talk to Fang-jie.
    3. Submit the right conclusion through the PE window, and play the cutscene.
    4. `walkTo(3, 13)`, recognize both stand-up tactics, and pick `line`.
    5. Close the end card.
  - **Expected after the Chinese run:**
    - Sanity 59 + 5 + 5 + 5 − 6 − 6 + 10 + 10 = **82**, and the card showed `59 → 82（+23）`.
    - `rel.boss` −35, `rel.bear` 10, `rel.fang` 25.
    - Codex is 3/7.
    - `toTitle` fired once.
    - The save has `demo_done` and `scene: null`.
  - **Full demo in English:** the same path with `setCheckText(true)`. No CJK appears in the dialog, the speaker label or any card.
  - **Save round trip:** after the prologue, after the cutscene and after the end card, `parseSave(JSON.stringify(S))` deep-equals `S`.
  - **Continue after the cutscene (Review Focus 1):** load the save with `startGame`. Expected:
    - map M03
    - ETCH-07 `st` is `'run'`
    - `bear` is in `NPC`
    - `walkTo(3, 13)` starts `c2_standup`
  - **Continue mid-stand-up (Review Focus 2):**
    - Start the stand-up with autosave on, and advance past the credit-stealing line.
    - `stopScene()`, then `startGame` with the save.
    - The first stand-up line shows, and sanity, `rel` and `evidence` equal their values from before the stand-up.
  - **Continue after the demo:** the end card shows. Closing it emits `toTitle`.
  - **Continue with a pending trigger:** a save on M02 without `seen_p_s2` plays `p_s2`.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test`, `bun run typecheck` and `bun run build`. Expected: all pass.
- [ ] **Step 5: Commit:** `test(game): v0.1 acceptance run from New Game to the end-of-demo card`.

### Task 9: Docs, preview, manual check

**Files:**
- **Modify:**
  - `docs/04-roadmap.en.md` and `docs/04-roadmap.zh-TW.md`: the M1-2b status. M1 is code complete and waiting for the owner's playtest.
  - `docs/03-spec.en.md` and `docs/03-spec.zh-TW.md`: one note under §7.2 for `paper_trail_thin`, the Chapter 2 allies, and Continue after the demo.
  - `game/README.md`: the `end` card kind, `game/session.ts` and `tests/drive.ts`.

- [ ] **Step 1: Update the docs.**
- [ ] **Step 2: Run** `bun test`, `bun run typecheck` and `bun run build`. Expected: all green, and no NUL bytes in `dist`.
- [ ] **Step 3: Republish the preview artifact** (same URL).
- [ ] **Step 4: List the manual checks for the owner** (§9.6, §9.8, and what tests can't see):
  1. New Game through to the end card, once in each language.
  2. The C2-07 cutscene: you appear in the fab next to Bear, and ETCH-07 turns from red to green during the swap.
  3. The stand-up: Director Chen, Wang and Kevin sit at the meeting table. The "?" button works on both of Wang's lines.
  4. The end card is readable at phone width.
  5. Roughly 60 fps at 1280×720 and 1920×1080. On the title screen the GPU goes idle.
  6. With Reduce motion on, nothing flashes and map changes don't fade.
- [ ] **Step 5: Commit:** `docs: M1-2b status; v0.1 acceptance notes`.

---

## Self-review

- **Spec coverage:**

  | Spec item | Task |
  |---|---|
  | §4 Bear, Director Chen | 3, 5, 6 |
  | §5.2 ally chat +5 | 5 |
  | §5.2 and §5.8 wrong conclusion −5 | 1 |
  | §5.2 chapter complete +10 | 6 |
  | §6 end-of-demo card | 2, 4 |
  | §7.2 C2-07 | 5 |
  | §7.2 C2-08, C2-09 table | 6 |
  | §7.2 C2-10 | 6 |
  | §9.1 New Game to end card, both languages | 8 |
  | §9.2 language switching | 4, 8 |
  | §9.3 save and Continue | 2, 8 |
  | §9.4 forced leave and Burnout | 6 |
  | §9.5 C2-09 conditions | 6 |
  | §9.6 fps and phone width | 7, 9 (manual) |
  | §9.7 automated tests | all |
  | §9.8 Reduce motion | 9 (manual) |
  | Deferred Minors | 1, 7, 8 |

- **Type consistency:** these names match across tasks:
  - `chapterSanity`, `chapterSummary`, `signed`, `showEndCard`
  - `reportScene`, `pendingReports`, `fadeSwap`, `startGame`
  - `ViewState.focus`
  - card kind `'end'`
  - flags `c2_bear_here`, `c2_standup_call`, `seen_c2_standup`, `c2_in_standup`, `c2_after`, `demo_done`, `confronted_publicly`, `paper_trail`, `paper_trail_thin`, `let_it_go`, `chat_<id>_ch2`
  - scenes `rc_solved`, `c2_back_office`, `c2_bear`, `c2_standup`, `c2_s10`, `c2_demo_end`
- **Proportion:** the plan holds signatures, values and assertions only. Dialogue beyond the lines the spec fixes is written during implementation, in both languages.
