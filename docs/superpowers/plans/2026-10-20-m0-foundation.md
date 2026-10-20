# M0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Chinese version for the owner: [2026-10-20-m0-foundation.zh-TW.md](2026-10-20-m0-foundation.zh-TW.md). This English file is the canonical plan.

**Goal:** Move the approved prototype (`mockups/rpg-fab.html`) into a real Bun + Vite + TypeScript + Phaser 3 codebase in `game/`, with Traditional Chinese / English switching, save/load and settings, playing Case 03 the same way the prototype does.

**Architecture:** A pure, unit-tested core (i18n, settings, state and save, gameplay systems, world data, case and story data, renderers that draw through a `Painter` interface) plus thin glue: a Phaser `WorldScene` that turns renderer output into textures and graphics and drives a tested `Mover`, and DOM UI modules tested under happy-dom. The prototype is the visual and behavioral reference; port its drawing and rules, don't redesign them.

**Tech Stack:** Bun 1.4.3 (package manager, test runner, script runtime), Vite 6.4.3, TypeScript 5.9.3, Phaser 3.90.0, yaml 2.9.1, @happy-dom/global-registrator 20.14.5, @types/bun 1.4.2.

**Spec:** `docs/03-spec.en.md` (§2 architecture, §5.1 movement, §5.8 clues and conclusion, §5.9 coffee, §5.10 settings, §6 UI, §8 art) and `docs/04-roadmap.en.md` §2 (M0 work and done-when). Behavior reference: `mockups/rpg-fab.html`.

## Global Constraints

- Use Bun for everything. Never run npm or npx. Commands: `bun install`, `bun test`, `bun run typecheck`, `bun run build`.
- Pin exact versions: phaser 3.90.0, vite 6.4.3, typescript 5.9.3, yaml 2.9.1, @happy-dom/global-registrator 20.14.5, @types/bun 1.4.2.
- No player-visible text in `.ts` files. UI text comes from `t(key)` backed by `src/data/locales/ui.zh-TW.json` and `ui.en.json`; data and story text is stored as `{ zh, en }`.
- Default language: `zh-TW` when `navigator.language` starts with `zh`, otherwise `en`.
- Tiles are 16×16 px. The map is 46×28 tiles (736×448 px).
- Integer zoom: 4 when the stage is ≥1500 px wide, 3 when ≥840 px, otherwise 2.
- Walking takes 0.15 s per tile, or 0.15 / 0.7 s when coffee is 0.
- Storage keys: save `fabns.save.v1` (one slot), settings `fabns.settings.v1`.
- With "reduce motion" on, nothing blinks, flashes, or scrolls.
- Fonts load from Google Fonts. Everything else ships with the build.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Spec deviations decided up front (record each in the ledger as a Ruling at Task 1):**
- Spec §2.1 names Vitest. The owner told us to use Bun, so tests use `bun:test`. Cost if wrong: swapping the test import line.
- Spec §2.1 names Tiled for maps. The prototype draws tiles in code and no tileset image exists yet, so M0 keeps the map defined in code. Tiled moves to the M2 art decision; Task 10 updates the spec. Cost if wrong: one map conversion in M2.
- Spec §5.9 drains coffee only on night shifts. M0 only has the night shift, so coffee always drains, 1 every 120 s.

## Review Focus

1. **localStorage is missing or throws** (private mode, blocked storage): the game starts and plays with no save and no crash. Tested in Task 2 (settings) and Task 3 (save).
2. **Corrupt or old-version save:** "Continue" is disabled and a notice appears; "New Game" works. Tested in Task 3 (parse) and Task 8 (title).
3. **Switching language while a dialog or a tool window is open:** every visible string switches immediately, and the conclusion form keeps its selections. Tested in Task 8.
4. **Clicking an unreachable target** (the fab while unsuited, a wall, a tool): a warning appears and the player neither freezes nor walks into walls. Tested in Task 9.
5. **Shrinking the window to phone width (360 px):** the canvas re-zooms, the page never scrolls sideways, and overlays stay usable. `computeViewport` is tested in Task 9; the layout is checked in Task 10's manual pass.

---

### Task 1: Toolchain, event bus, i18n core

**Files:**
- Modify: `game/package.json`, `game/vite.config.ts`, `game/tsconfig.json`
- Create: `game/bunfig.toml`, `game/tests/setup-dom.ts`, `game/src/core/bus.ts`, `game/src/core/i18n.ts`, `game/src/data/locales/ui.zh-TW.json`, `game/src/data/locales/ui.en.json`
- Test: `game/tests/i18n.test.ts`

**Interfaces:**
- Produces:
  - `on(evt: string, fn: (...a: unknown[]) => void): () => void` and `emit(evt: string, ...a: unknown[]): void` (bus.ts)
  - In i18n.ts:
    - Types: `type Lang = 'zh-TW' | 'en'`, `interface Bi { zh: string; en: string }`, `type Params = Record<string, string | number>`
    - `LANGS`, `getLang(): Lang`, `setLang(l: Lang): void` (emits `'lang'`)
    - `fmt(s, params?)`
    - `t(key, params?): string`: falls back to zh-TW, then to the key itself
    - `L(b: Bi, params?): string`, `esc(s)`, `rich(s)`, `applyDom(root?)`, `dictKeys(l)`

- [ ] **Step 1: Toolchain.**
  - **package.json:**
    - Scripts: `"dev": "bunx --bun vite"`, `"build": "bunx --bun tsc --noEmit && bunx --bun vite build"`, `"preview": "bunx --bun vite preview"`, `"typecheck": "bunx --bun tsc --noEmit"`, `"test": "bun test"`.
    - Remove vitest; add the pinned dev dependencies.
  - **vite.config.ts:** use `defineConfig` from `vite` and keep the yaml plugin; drop the `test` block.
  - **tsconfig.json:** `"types": ["vite/client", "bun"]`.
  - **bunfig.toml:** `[test]` with `preload = ["./tests/setup-dom.ts"]`.
  - **tests/setup-dom.ts:** calls `GlobalRegistrator.register()`.
  - Run `bun install` and expect `bun.lock` to be created.
- [ ] **Step 2: Write the failing tests** in `tests/i18n.test.ts`:
  ```ts
  test('locale files have identical key sets', () => expect(new Set(dictKeys('en'))).toEqual(new Set(dictKeys('zh-TW'))));
  test('no locale value is empty', () => { for (const l of LANGS) for (const k of dictKeys(l)) expect(t(k).length).toBeGreaterThan(0) /* after setLang(l) */; });
  test('unknown key returns the key', () => expect(t('no.such.key')).toBe('no.such.key'));
  test('fmt fills known params and keeps unknown ones', () => expect(fmt('a {x} {y}', { x: 1 })).toBe('a 1 {y}'));
  test('setLang switches t and L and emits lang', ...); // t('app.title'): 'Fab 夜班' → 'Fab Night Shift'; L({zh:'甲',en:'A'}) → 'A'; an on('lang') spy fires once with 'en'
  test('rich escapes before bolding', () => expect(rich('<i>**hot**')).toBe('&lt;i&gt;<b>hot</b>'));
  test('applyDom fills text and aria-label', ...); // <span data-i18n="app.title"> and <canvas data-i18n-aria="app.title">
  ```
  Locale files start with `app.title` (zh `Fab 夜班`, en `Fab Night Shift`) and `app.subtitle` (zh `曦晶半導體 Fab 9 · 製程工程師值班中`, en `Xijing Semiconductor Fab 9 · Process engineer on shift`). Later tasks add keys to both files together.
- [ ] **Step 3: Run** `bun test tests/i18n.test.ts`. Expected: FAIL, cannot resolve `../src/core/i18n`.
- [ ] **Step 4: Implement** bus.ts and i18n.ts to the interfaces above. `t` looks up the current language dictionary, then zh-TW, then returns the key. `rich` escapes first, then replaces `**x**` with `<b>x</b>`.
- [ ] **Step 5: Run** `bun test` and `bun run typecheck`. Expected: all pass, and typecheck exits 0.
- [ ] **Step 6: Commit:** `git add game && git commit -m "feat(game): bun toolchain, event bus and i18n core"`.

### Task 2: Settings

**Files:** Create `game/src/core/storage.ts`, `game/src/core/settings.ts`. Test `game/tests/settings.test.ts`.

**Interfaces:**
- Consumes: `Lang` (Task 1).
- Produces:
  - storage.ts: `type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`, `browserStore(): KV | null`
  - settings.ts:
    - Types: `type TextSpeed = 'slow' | 'normal' | 'instant'`, `interface Settings { lang; textSpeed; reduceMotion }`
    - Constants: `SETTINGS_KEY = 'fabns.settings.v1'`, `CPS = { slow: 20, normal: 40, instant: Infinity }`
    - Functions: `defaultSettings(navLang = '', prefersReduce = false)`, `parseSettings(raw: unknown, base: Settings): Settings`
    - Live state: `settings` (a mutable singleton), `loadSettings(store: KV | null, env: { navLang: string; prefersReduce: boolean }): void`, `saveSettings(store: KV | null): void`

- [ ] **Step 1: Write the failing tests:**
  - `defaultSettings('zh-Hant-TW').lang === 'zh-TW'`
  - `defaultSettings('en-US').lang === 'en'`
  - `defaultSettings('').lang === 'en'`
  - `parseSettings({ lang: 'fr', textSpeed: 'warp', reduceMotion: 'yes' }, base)` equals `base`
  - Save then load through a fake in-memory `KV` round-trips `{ lang: 'en', textSpeed: 'slow', reduceMotion: true }`
  - `loadSettings` with a store whose `getItem` throws leaves the defaults and does not throw (Review Focus 1)
  - `saveSettings` with a throwing `setItem` does not throw
- [ ] **Step 2: Run** `bun test tests/settings.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** to the interfaces. Every storage access is wrapped in try/catch.
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): settings with safe storage`.

### Task 3: Game state and save

**Files:** Create `game/src/core/state.ts`, `game/src/core/save.ts`, `game/src/core/autosave.ts`. Test `game/tests/save.test.ts`.

**Interfaces:**
- Consumes: `KV`, `browserStore` (Task 2).
- Produces:
  - state.ts:
    - `type Dir = 'up' | 'down' | 'left' | 'right'`
    - `type EtchState = 'alarm' | 'inhibit' | 'fixed'`
    - `interface GameState { v: 1; x; y; dir; suit; everSuit; coffee; clues: string[]; solved; etch; sec }`
    - Constants: `SHIFT_START = 10020` (02:47:00), `SHIFT_END = 28800`, `START_POS = { x: 3, y: 4 }`
    - `newState()`: coffee 3, dir `'up'`, etch `'alarm'`, sec `SHIFT_START`
    - `let S` (a live ESM binding), `setState(s)`, `hasClue(id)`, `fmtClock(sec)`
  - save.ts:
    - `SAVE_KEY = 'fabns.save.v1'`
    - `parseSave(raw: string | null): GameState | null`
    - `type ReadResult = { kind: 'none' } | { kind: 'corrupt' } | { kind: 'ok'; state }`
    - `readSave(store)`, `writeSave(store, s): boolean`, `clearSave(store)`
  - autosave.ts: `setAutosave(on)`, `requestSave()` (300 ms debounce), `saveNow(store = browserStore())` (does nothing while autosave is off)

- [ ] **Step 1: Write the failing tests:**
  - `fmtClock(10020) === '02:47:00'`
  - write → read round-trips `newState()` with `x: 20`, `clues: ['spc']`
  - These raw values all give `{ kind: 'corrupt' }`: `'{'`, the same state with `v: 2`, `coffee: 6`, `dir: 'north'`, `clues: [1]`
  - `parseSave` turns `clues: ['spc', 'spc']` into `['spc']`
  - A missing key gives `{ kind: 'none' }`
  - With a throwing store, `writeSave` returns false and `readSave` gives `{ kind: 'none' }` (Review Focus 1)
  - `saveNow(store)` writes nothing until `setAutosave(true)`
- [ ] **Step 2: Run** `bun test tests/save.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `parseSave` checks:
  - `v === 1`
  - x and y are integers from 0 to 999
  - dir and etch are known values
  - booleans are booleans
  - coffee is an integer from 0 to 5
  - sec is an integer from 0 to 86400
  - clues is an array of strings, which it then de-duplicates
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): game state and validated save/load`.

### Task 4: Gameplay systems

**Files:** Create `game/src/systems/{path,clues,conclusion,coffee,quest}.ts`. Test `game/tests/systems.test.ts`.

**Interfaces:**
- Consumes: `GameState` (Task 3).
- Produces:
  - path.ts: `interface Pt { x; y }`, `bfs(w, h, sx, sy, walk: (x, y) => boolean, goal: (x, y) => boolean): Pt[] | null`. The result excludes the start; `[]` means the start already satisfies `goal`.
  - clues.ts: `addClue(list: readonly string[], id): { added: boolean; list: string[] }`
  - conclusion.ts: `interface Pick3 { tool; ch; cause }`, `type Verdict = 'incomplete' | 'need-evidence' | 'wrong' | 'solved'`, `judge(answer: Pick3, pick: Partial<Pick3>, clueCount, minClues): Verdict`
  - coffee.ts: `COFFEE_MAX = 5`, `COFFEE_DECAY_MS = 120000`, `drink(c): { coffee; ok }`, `decay(c): number` (never below 0)
  - quest.ts: `QUEST: { key: string; done: (s: GameState) => boolean }[]` with keys `quest.q1`..`quest.q5`:
    - q1: clue `spc`
    - q2: `everSuit`
    - q3: clues `fdc` and `ring`
    - q4: clue `map`
    - q5: `solved`

- [ ] **Step 1: Write the failing tests:**
  - **bfs:** on a 5×3 grid with a wall at x=2 for y=0..1, the path from (0,0) to (4,0) has length 8 and every step moves exactly one tile; a fully walled goal gives null; start equal to goal gives `[]`.
  - **addClue:** adding `'a'` twice gives `added: false` the second time, and the list stays `['a']`.
  - **judge:** a missing field gives `'incomplete'`; the right answer with 2 clues and `minClues` 3 gives `'need-evidence'`; a wrong cause with 5 clues gives `'wrong'`; the right answer with 3 clues gives `'solved'`.
  - **coffee:** `drink(5)` gives `{ coffee: 5, ok: false }`; `drink(2)` gives `{ coffee: 3, ok: true }`; `decay(0) === 0`.
  - **QUEST:** a fresh state has 0 steps done; a state with clues spc, fdc, ring, map plus everSuit and solved has 5 done.
- [ ] **Step 2: Run** `bun test tests/systems.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** each function. bfs is the prototype's breadth-first search with an `Int32Array` predecessor table, 4-directional.
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): pathfinding, clues, conclusion, coffee, quest`.

### Task 5: World data

**Files:** Create `game/src/data/world.ts`. Test `game/tests/world.test.ts`. Add locale keys `loc.office`, `loc.gown`, `loc.airShower`, `loc.fabEtch`, `loc.fabLitho` (values from the prototype `region()` and the spec's English).

**Interfaces:**
- Consumes: `Bi` (Task 1), `Dir`, `EtchState` (Task 3), `bfs` (Task 4) in tests.
- Produces:
  - Constants: `TS = 16`, `MW = 46`, `MH = 28`
  - Types:
    - `type Tile = '#' | '.' | ',' | 'y' | '=' | 'D' | 'A' | 'g'`
    - `type Kind = 'desk' | 'coffee' | 'plant' | 'locker' | 'bench' | 'etch' | 'cvd' | 'met' | 'wet' | 'stk' | 'litho' | 'track'`
    - `type ToolSt = 'run' | 'idle' | 'alarm' | 'inhibit'`
    - `type Act = 'pc' | 'say' | 'coffee' | 'locker' | 'tool' | 'etch07' | 'met' | 'npc'`
    - `type LookId = 'office' | 'suit' | 'boss' | 'kevin' | 'fse'`
    - `interface Thing { id; kind: Kind | 'npc'; x; y; w; h; act?; name?: Bi; pc?: boolean; say?: string /* story key */; st?: ToolSt; npc?: boolean; dir?: Dir; look?: LookId }`
  - Data: `T: Tile[][]`, `OBJ: Thing[]`, `NPC: Thing[]`, `ACTS: Thing[]`, `BLK: (Thing | null)[][]`
  - Functions: `inb(x, y)`, `walkable(x, y, suit)`, `objAt(x, y)`, `adj(o, x, y)`, `region(x, y): string` (a locale key), `syncEtch(e: EtchState)` (sets ETCH-07 `st` to alarm/inhibit/run)
  - `TOOL_INFO: Record<'ETCH-05' | 'CVD-11' | 'WET-02' | 'STK-01' | 'LITHO-03' | 'TRACK-03', { type: Bi; st: 'RUN' | 'IDLE'; rows: [Bi, Bi][]; note: Bi }>`
- Values: the map fills, door, glass, and air-shower tile, plus all 18 objects and 3 NPCs, use exactly the prototype's coordinates (see `mockups/rpg-fab.html`, the `fill(...)` calls and the `OBJ` and `NPC` arrays). Object `say` text and NPC names move to Task 6 story data and the `speaker.*` keys. Write `TOOL_INFO` English from the prototype's Chinese.

- [ ] **Step 1: Write the failing tests:**
  - **Walkability:**
    - `walkable(3, 4, false)` is true
    - `walkable(14, 17, false)` is false, and `walkable(14, 17, true)` is true
  - **Reachability:**
    - With suit=true, bfs from (3,4) reaches a tile adjacent to every item in `ACTS`.
    - With suit=false, bfs from (3,4) reaches no tile with x ≥ 15 (Review Focus 4).
  - **Regions:**
    - `region(3, 4) === 'loc.office'`
    - `region(5, 20) === 'loc.gown'`
    - `region(14, 17) === 'loc.airShower'`
    - `region(30, 8) === 'loc.fabEtch'`
    - `region(30, 25) === 'loc.fabLitho'`
  - **Adjacency:** for the ETCH-07 footprint (25,3,5×3), `adj(o, 27, 6)` is true, `adj(o, 30, 6)` is false (diagonal), and `adj(o, 26, 4)` is false (inside).
  - **syncEtch:** `syncEtch('fixed')` sets ETCH-07 `st` to `'run'`.
  - **Data:** every `TOOL_INFO` `Bi` has non-empty zh and en.
- [ ] **Step 2: Run** `bun test tests/world.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** world.ts by porting the prototype's map and object data.
- [ ] **Step 4: Run** `bun test`. Expected: all pass, including i18n key parity.
- [ ] **Step 5: Commit:** `feat(game): world map, objects and NPC data`.

### Task 6: Case 03 and story data

**Files:** Create `game/src/data/case03.json`, `game/src/data/case.ts`, `game/src/data/story/ch02.yaml`, `game/src/data/story.ts`. Add locale keys `speaker.sys|me|boss|kevin|fse`. Test `game/tests/data.test.ts`.

**Interfaces:**
- Produces:
  - case.ts: a typed `CASE` with these fields:
    - `spc: [lot, 'A' | 'B', cd][]` (25 points)
    - `lots` (6), `logs: { t; src; ch; lv: 'ok' | 'info' | 'warn' | 'alarm'; msg: Bi }[]` (15)
    - `logClue: Record<string, string>` (`{1: 'fdc', 5: 'fdc', 9: 'fdc', 11: 'ring'}`), `logNote: Record<string, Bi>` (keys 3, 6, 7, 10, 12, 14)
    - `clues: Record<'spc' | 'fdc' | 'ring' | 'map' | 'pm', { t: Bi; src: Bi }>`
    - `cons: { name; val: Bi; pct; clue? }[]` (5)
    - `tools` (`['ETCH-07', 'ETCH-05', 'LITHO-03', 'CVD-11']`), `chambers` (`['PM-A', 'PM-B', 'PM-C', 'PM-D']`), `causes: { id; zh; en }[]` (5, the first being `focus_ring_eol`)
    - `answer: { tool: 'ETCH-07'; ch: 'PM-B'; cause: 'focus_ring_eol' }`, `minClues: 3`, `waferSeed: 1027`
  - story.ts:
    - `type Speaker = 'sys' | 'me' | 'boss' | 'kevin' | 'fse'`, `interface Line { speaker: Speaker; zh: string; en: string }`, `SPEAKERS`
    - `story: Record<StoryKey, Line[]>`, where the keys are:
      - `intro` (3), `boss_solved`, `boss_suit`, `boss_main`, `boss_ready`, `boss_more`
      - `kevin` (4), `fse` (3)
      - `say_desk2`, `say_desk3`, `say_desk4`, `say_bossdesk`
      - `locker_on` (2), `coffee_ok`, `coffee_full`, `rc_wrong`, `rc_solved` (4; the last line uses `{n}` and `{c}`)
- Values: Chinese and numbers come from the prototype's `SPC`, `LOTS`, `LOGS`, `LOGCLUE`, `LOGNOTE`, `CLUES`, `CONS` and its dialogue strings; the English comes from the docs' tone (see `docs/02-story.en.md`).

- [ ] **Step 1: Write the failing tests:**
  - **Bilingual completeness:** recursively, every object with a `zh` key in `CASE` and in every story line has non-empty `zh` and `en`.
  - **Speakers:** every story line's speaker is in `SPEAKERS`, and `t('speaker.' + s)` differs from its key in both languages.
  - **Log mapping:** every `logClue` index is below `logs.length` and maps to a key of `clues`; every `logNote` index is below `logs.length` and isn't in `logClue`.
  - **Answer:** `answer.tool ∈ tools`, `answer.ch ∈ chambers`, and `answer.cause` matches a cause id.
  - **Placeholders:** the last `rc_solved` line contains `{n}` and `{c}` in both languages.
  - **Required keys:** every key listed above exists in `story`.
- [ ] **Step 2: Run** `bun test tests/data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the data files and the typed wrappers.** `story.ts` imports the YAML (Bun imports it natively in tests; Vite uses the yaml plugin).
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): Case 03 and chapter 2 story data (zh-TW + en)`.

### Task 7: Renderers

**Files:** Create `game/src/render/{palette,paint,tiles,tools,person,portraits,oht}.ts`. Test `game/tests/render.test.ts`.

**Interfaces:**
- Consumes: world data (Task 5), `S`, `hasClue` (Task 3).
- Produces:
  - palette.ts: `C` (the prototype's night palette including the `t*` tool keys) and `LEDC`
  - paint.ts:
    - `interface Painter { rect(col: string, x, y, w, h): void }`
    - `canvasPainter(ctx)`, `gfxPainter(g: { fillStyle(c: number, a?: number): unknown; fillRect(x, y, w, h): unknown })`
    - `parseColor(css): [number, number]` (cached), `txt(p, s, x, y, col)`, `txtW(s)`, `disc(p, cx, cy, r, col)`
  - tiles.ts: `drawMap(p)`
  - tools.ts:
    - `STATIC_PAD = { x: 6, top: 26, bottom: 6 }`
    - `objStatic(p, o, X, Y)`, `objDyn(p, glow, o, X, Y, t, reduce)`, `floorGlow(p, o, X, Y, t, reduce)`
    - `buildLeds(o): { L: Led[]; strip: number[]; sy: number }`
  - person.ts: `LOOK: Record<LookId, Look>`, `drawPerson(p, X, Y, dir, fr, mv, look)`
  - portraits.ts: `type PortraitId = 'sys' | 'me' | 'meSuit' | 'boss' | 'kevin' | 'fse'`, `drawPortrait(ctx, id)`
  - oht.ts: `drawOht(p, t, reduce)`, `drawArrow(p, o, t, reduce)`, `drawMarker(p, pt)`
- Approach: port from `mockups/rpg-fab.html` (`tile`, `dTool`, `buildLeds`, `drawLeds`, `dDesk`, `dLocker`, `dCoffee`, `dPlant`, `dBench`, `person`, `oht`, `arrow`, the portrait matrices). Split `dTool` the way the spec's art row implies:
  - **Static** (drawn once into a texture): body, rim, panels, PM boxes without status frames, FOUPs, label, light-tower housing with unlit lamps.
  - **Dynamic** (redrawn per frame): PM status frames and letters, lit lamps with halos, MET screen glow, PM-B alarm halo, LEDs, running strip.
  - Glow uses the ADD-blend `glow` painter.
  - When `reduce` is true, blinking parts render in a fixed state, LEDs other than `flick` render steady, the strip renders static and dim, and the OHT stops at a fixed position.

- [ ] **Step 1: Write the failing tests**, using a `RecordingPainter` that collects rects:
  - **parseColor:** `parseColor('#ff4d45')` is `[0xff4d45, 1]`; `parseColor('rgba(255,77,69,.14)')` is `[0xff4d45, 0.14]`.
  - **txt:** `txt(p, 'ETCH-07', 0, 0, c)` records exactly as many 1×1 rects as there are `'1'` bits in those glyphs.
  - **objStatic bounds:** for every `OBJ`, drawing at `(STATIC_PAD.x, STATIC_PAD.top)` keeps every rect inside `[0, w*16 + 2*pad.x] × [0, h*16 + pad.top + pad.bottom]`.
  - **drawPerson bounds:** for every look × dir × frame, drawing at (0,7) keeps every rect inside 16×24.
  - **buildLeds:**
    - It is deterministic.
    - Every LED lies inside its tool's top face, and the strip is inside the footprint width.
    - Only ETCH-07 has `'r'` LEDs.
  - **Reduce motion:** with `reduce = true`, `objDyn` for ETCH-07 at t=0 and t=0.4 records identical rect lists.
  - **drawMap bounds:** every rect is inside 736×448.
- [ ] **Step 2: Run** `bun test tests/render.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** by porting from the prototype with the static/dynamic split.
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): procedural pixel renderers (map, black tools with LEDs, people, OHT)`.

### Task 8: DOM UI

**Files:**
- Create:
  - `game/index.html`, `game/src/style.css`
  - `game/src/ui/{dom,toast,dialog,win,hud,windows,title}.ts`
  - `game/src/game/effects.ts`
- Add every remaining UI locale key (HUD, quest, verbs, toasts, windows, settings, title, hint) to both locale files.
- Test: `game/tests/ui.test.ts`.

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces:
  - toast.ts: `toast(msg, kind?: 'bad' | 'clue')`
  - dialog.ts: `say(lines: Line[], opts?: { params?; onEnd? })`, `advanceDialog()`, `isDialogOpen()`, `relocalizeDialog()`
  - win.ts: `interface Tab { label(): string; html(): string; on?(root: HTMLElement): void }`, `interface WinSpec { title(); chip?(); tabs: Tab[]; foot?(); onFoot?(act) }`, `openWin(spec)`, `showTab(i)`, `rerenderWin()`, `closeWin()`, `isWinOpen()`, `initWin(onClose)`
  - hud.ts: `refreshHud()`, `setLocation(key)`, `setClock(sec)`, `setPrompt(o: Thing | null)`, `verb(o): string`, `showShower()`, `hideShower()`
  - windows.ts: `openPC()`, `openEtch()`, `openMet()`, `openTool(o)`, `openClues()`, `openSettings()`. The conclusion picks persist in a module-level `rcPick` across re-renders.
  - title.ts: `showTitle(o: { canContinue: boolean; notice?: string; onContinue(); onNew() })`, `hideTitle()`, `isTitleOpen()`
  - effects.ts: `gainClue(id)`, `setEtch(e)` (calls `syncEtch`), `solveCase()`, `setCoffee(n)`, `setSuit(on)`. Each refreshes the HUD and calls `requestSave()`.
- Markup, CSS, and window contents are ported from `mockups/rpg-fab.html`, with `data-i18n` and `data-i18n-aria` attributes in place of literal text. The conclusion sentence uses the per-language templates `pc.rcLine1` (`兇手是 {tool} 的 {ch}，` / `The culprit is {tool}, chamber {ch},`) and `pc.rcLine2` (`因為 {cause}。` / `because of {cause}.`) with `<select>`s inserted at the placeholders.

- [ ] **Step 1: Write the failing tests** (happy-dom; build the needed DOM from `index.html`'s body):
  - **Dialog:**
    - With `textSpeed = 'instant'`, `say(story.kevin)` followed by 4 × `advanceDialog()` closes it and calls `onEnd` exactly once.
    - With a line showing, `setLang('en')` plus `relocalizeDialog()` shows the English text and the speaker `Kevin`.
  - **Windows:**
    - After `openPC()` and `showTab(2)`, select ETCH-07 / PM-B / `focus_ring_eol`, then `setLang('en')` and `rerenderWin()`: the three selects keep their values, and the labels are English (Review Focus 3).
    - Submitting with 2 clues shows the `toast.rcNeedEvidence` text.
    - Submitting with 3 clues sets `S.solved`, and ETCH-07's `st` becomes `'run'`.
    - Submitting a wrong cause drops coffee by 1 and opens `rc_wrong`.
  - **Clues:** calling `gainClue('spc')` twice shows the `toast.clueDup` text the second time, and `S.clues` stays `['spc']`.
  - **HUD:** `verb(locker)` is `t('verb.suitOn')` when unsuited and `t('verb.suitOff')` when suited.
  - **Title:** `showTitle({ canContinue: false, notice: t('toast.saveCorrupt'), ... })` renders a disabled Continue button and the notice (Review Focus 2).
  - **Settings:** in `openSettings()`, clicking the English option sets `getLang()` to `'en'` and writes `"lang":"en"` to the store.
- [ ] **Step 2: Run** `bun test tests/ui.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the UI modules and effects, porting the prototype's window contents (SPC chart, lot table, conclusion, ETCH-07 status/FDC log/consumables, MET-02 wafer map, tool cards, clue book) with every string through `t` or `L`.
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass, and typecheck exits 0.
- [ ] **Step 5: Commit:** `feat(game): bilingual DOM UI (HUD, dialog, tool windows, settings, title)`.

### Task 9: Movement, input, Phaser scene, boot

**Files:**
- Create:
  - `game/src/game/{viewport,movement,actions,input,runtime}.ts`
  - `game/src/game/WorldScene.ts`, `game/src/main.ts`
- Test: `game/tests/movement.test.ts`, `game/tests/viewport.test.ts`.

**Interfaces:**
- Consumes: everything above.
- Produces:
  - viewport.ts: `computeViewport(stageW: number, innerH: number): { zoom: 2 | 3 | 4; w: number; h: number }`
    - zoom per Global Constraints; `narrow = stageW < 700`
    - `w = min(floor(stageW / zoom), 736)`
    - `h = min(floor(max(narrow ? 300 : 420, min(innerH - (narrow ? 300 : 140), narrow ? stageW * 1.2 : stageW * 0.68)) / zoom), 448)`
  - movement.ts:
    - `class Mover`, constructed with `{ onArrive(prevX: number): void; onInteract(o: Thing): void; onWarnSuit(): void; onUnreachable(): void }`
    - Fields: `step`, `path`, `pending`, `marker`, `walkT`, `px`, `py`
    - Methods:
      - `tick(dt: number, heldDir: Dir | undefined, blocked: boolean): void`
      - `click(wx: number, wy: number): 'interact' | 'path' | 'blocked-suit' | 'unreachable' | 'none'`
      - `nearObj(): Thing | null`, `reset(): void`
    - It reads and writes `S.x`, `S.y`, `S.dir`, and uses `S.suit` and `S.coffee`.
  - runtime.ts: `rt = { shower: number; near: Thing | null }`, `busy(): boolean` (dialog, window, title, or shower)
  - actions.ts: `doInteract(o)`, which dispatches on `o.act` exactly like the prototype's `doInteract` and `talk`
  - input.ts: `held: Dir[]`, `initInput({ interact(); escape(): boolean; clues() })`, covering arrows/WASD, E/Space/Enter, Esc, C, and the D-pad
  - WorldScene.ts: builds textures from the renderers and Images and Graphics with depth = bottom y; calls `mover.tick` each frame; sets the camera scroll per the prototype's `updCam`; only draws dynamic layers for tools in view
  - main.ts: boot order is settings → language → DOM → Phaser game (`pixelArt`, `roundPixels`, `Scale.NONE` with `computeViewport`, keyboard disabled) → title. It also wires the resize handler, the 1 s clock, the 120 s coffee decay, autosave on `visibilitychange`, and the `'lang'` re-render.

- [ ] **Step 1: Write the failing tests:**
  - **Viewport:**
    - `computeViewport(1500, 900).zoom === 4`
    - `computeViewport(1499, 900).zoom === 3`
    - `computeViewport(839, 900).zoom === 2`
    - `computeViewport(360, 740)` gives `{ zoom: 2, w: 180 }` with `h * 2 <= 440` and `w * zoom <= 360` (Review Focus 5)
  - **Mover walking:**
    - From (3,4) holding `'down'` for 0.16 s reaches (3,5).
    - Holding `'up'` into the desk at (3,3) never changes position.
    - With coffee 0, 0.16 s isn't enough for one tile and 0.22 s is.
  - **Mover clicks:**
    - Clicking the fab floor at world (30·16, 8·16) while unsuited returns `'blocked-suit'` and calls `onWarnSuit` (Review Focus 4).
    - Clicking an outer wall tile returns `'none'` and doesn't change `path`.
    - When suited, clicking ETCH-07 returns `'path'`; ticking until the path is empty calls `onInteract` exactly once with ETCH-07, and the player ends adjacent to it.
  - **Mover air shower:** stepping from (13,17) east onto (14,17) while suited calls `onArrive(13)`.
- [ ] **Step 2: Run** `bun test tests/movement.test.ts tests/viewport.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** viewport.ts and movement.ts (porting the prototype's `update`, `tryMove`, pointer handler, `pick`, `nearObj`), then actions, input, runtime, WorldScene and main.
- [ ] **Step 4: Run** `bun test`, `bun run typecheck`, `bun run build`. Expected: all tests pass, typecheck exits 0, and the build exits 0 and writes `game/dist/index.html`.
- [ ] **Step 5: Commit:** `feat(game): movement controller, Phaser world scene and boot`.

### Task 10: Docs, preview, manual check

**Files:** Modify `docs/03-spec.en.md`, `docs/03-spec.zh-TW.md` (§0 rows for Bun and the code-defined map), `docs/04-roadmap.en.md`, `docs/04-roadmap.zh-TW.md` (M0 status). Create `game/README.md` (bun commands, folder map).

- [ ] **Step 1: Update the docs.**
  - §0 of both spec files gets two rows:
    - Package manager and tests: Bun.
    - Maps: code-defined until M2.
  - Mark M0 done in both roadmaps.
- [ ] **Step 2: Run** `bun test`, `bun run typecheck`, `bun run build`. Expected: all green, and exit code 0 for each.
- [ ] **Step 3: Publish the build** as a private artifact preview (`dist/index.html` adapted to the artifact page contract, with `assets/*` as supporting files), so the owner can play it.
- [ ] **Step 4: Manual check by the owner** (Claude can't drive a browser in this session). These items go into the final message as a checklist:
  1. Play Case 03 to "CASE 03 complete" in Chinese, then again in English.
  2. Reload and use "Continue": position, clues, suit, and coffee are all kept.
  3. Turn on reduce motion: nothing blinks.
  4. Narrow the window to about 360 px: no sideways scroll, and the game is still playable.
- [ ] **Step 5: Commit:** `docs: record M0 rulings and status; game README`.

---

## Self-review

- **Spec coverage:** the roadmap's M0 items are covered: git (done), Node → Bun (Task 1), scaffold (Task 1), prototype port (Tasks 5–9), data pipeline (Tasks 1, 6), save/load and settings (Tasks 2, 3, 8). M0's done-when items are tested in Tasks 8 and 9 and manually checked in Task 10.
- **Type consistency:** the following names match across the tasks that produce and consume them: `Thing`, `LookId`, `Line`, `Speaker`, `KV`, `GameState`, `Painter`, `Mover.click` results, and `syncEtch`.
- **Proportion:** the plan lists signatures, values, and assertions. Bodies are ported from the prototype, not transcribed here.
