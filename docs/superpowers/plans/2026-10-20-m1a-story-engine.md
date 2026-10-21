# M1-1 Story Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Chinese version for the owner: [2026-10-20-m1a-story-engine.zh-TW.md](2026-10-20-m1a-story-engine.zh-TW.md). This English file is the canonical plan.

**Goal:** Build the story engine that M1 needs: sanity, Tactic Recognition with the Codex, the Evidence Log, relationships, asking, the four responses, a scripted-scene runner, and their UI. All existing Chapter 2 dialogue runs through the new engine, plus the two LINE-report scenes (C2-03, C2-06) that feed the Evidence Log.

**Architecture:**
- **Pure core:** Scenes are YAML lists of *beats*. A pure `ScriptRunner` steps through them against `GameState` and emits frames (line, choice, card, end) and events (sanity hit zero, codex unlocked, evidence added). New pure systems (sanity, evidence, relations, responses) hold the spec's numbers.
- **UI layer:** `ui/scene.ts` binds the runner to the dialog DOM (choices, "?" recognition picker, "Note it"). `ui/cards.ts` shows full-screen cards. The game calls `playScene(id)` wherever it used to call `say()`.

**Tech Stack:** unchanged from M0. Bun 1.4.3, Vite 6.4.3, TypeScript 5.9.3, Phaser 3.90.0, yaml 2.9.1, happy-dom 20.14.5.

**Spec:**
- `docs/03-spec.en.md`: §5.2 sanity, §5.3 recognition, §5.4 evidence, §5.5 relationships, §5.6 asking, §5.7 responses, §6 UI, §7.2 rows C2-03 and C2-06, Appendix A script format
- `docs/02-story.en.md` §9: Codex text
- `docs/04-roadmap.en.md` §3 (M1)

Scope split (Claude's call, recorded at Task 1): M1 is split into M1-1 (this plan: engine and systems) and M1-2 (next plan: maps, new NPCs, Prologue S1–S8, Chapter 2 C2-07..C2-10 stand-up, end-of-demo card, the spec §9 acceptance pass).

## Global Constraints

- Everything from the M0 plan still applies: Bun only, pinned versions, no player-visible text in `.ts`, `{ zh, en }` data, TDD, and the attribution line on commits.
- **Sanity:**
  - Range 0–100, starting at 80.
  - A recognized loss is halved and rounded toward zero (−10 → −5, −15 → −7, −5 → −2).
  - At 0: the first time triggers forced leave (sanity becomes 40); the second time triggers the Burnout ending.
- **Recognition:**
  - One attempt per line.
  - A correct pick halves that line's loss and unlocks the card.
  - A wrong pick has no penalty and no reduction.
- **Codex v0.1:** 7 cards, ids `double_bind`, `personal_attack`, `comparison`, `family`, `for_your_good`, `credit_stealing`, `gaslighting`.
- **Evidence:**
  - A line tagged `evidence` is logged automatically.
  - Any line can be noted manually.
  - Items are `{ id, time 'HH:MM', source 'talk'|'chat'|'meeting', speaker, zh, en }`.
- **Relationships:** −100..100. Starting values: `boss` 0, `kevin` 10, `fse` 10, `fang` 20, `amy` 0, `bear` 0.
- **Asking:** effective relationship = rel + 15 if "say what I checked" is chosen. ≥20 gives a full answer, 0–19 partial, <0 refuse.
- **Responses (sanity, target relationship, ally relationship):**
  - swallow: −3, +5, 0
  - clarify: 0, −5, 0 with evidence; −3, −5, 0 without
  - boundary: +5, −10, 0
  - talk: +5, 0, +5
- **Saves:** same key `fabns.save.v1`, now `v: 2`. A `v: 1` (M0) save migrates with defaults.

## Review Focus

1. **An M0 save already in the owner's browser:** "Continue" loads it with sanity 80 and default relationships. It is not reported as corrupt. Tested in Task 1.
2. **Reloading mid-scene:** the game resumes at the start of that scene and does not apply its effects twice. Periodic autosaves are paused while a scene runs. Tested in Task 6.
3. **Sanity hits 0 in the middle of a scene:** the forced-leave card shows, the scene ends cleanly with no stuck dialog, and play continues. The second time, the Burnout ending shows, the save is cleared, and the title screen returns. Tested in Tasks 5 and 8.
4. **Switching language while choices or the recognition picker are showing:** labels switch immediately and the open choice or picker stays usable. Tested in Task 6.
5. **A clue that queues a LINE-report scene is found while a tool window is open:** the scene waits until the window closes, then plays exactly once. Tested in Task 9.

---

### Task 1: GameState v2 and save migration

**Files:** Modify `game/src/core/state.ts`, `game/src/core/save.ts`. Test `game/tests/save.test.ts`.

**Interfaces:**
- Produces, in state.ts:
  - `type NpcId = 'boss' | 'kevin' | 'fse' | 'fang' | 'amy' | 'bear'`
  - `type TacticId = 'double_bind' | 'personal_attack' | 'comparison' | 'family' | 'for_your_good' | 'credit_stealing' | 'gaslighting'`
  - `type EvidenceSource = 'talk' | 'chat' | 'meeting'`
  - `interface EvidenceItem { id: string; time: string; source: EvidenceSource; speaker: string; zh: string; en: string }`
  - `REL_START: Record<NpcId, number>` (values above)
  - `GameState` gains these fields: `v: 2`, `sanity: number`, `zeroCount: number`, `rel: Record<NpcId, number>`, `codex: TacticId[]`, `evidence: EvidenceItem[]`, `flags: string[]`, `scene: string | null`
  - `newState()` sets sanity 80, zeroCount 0, rel = `REL_START`, empty lists, scene null
- `parseSave` accepts `v: 1` (fills the new fields with defaults) and `v: 2` (validates every new field). Anything else is `null`.

- [ ] **Step 1: Record the scope-split ruling in the ledger. Then write the failing tests:**
  - A v1 save (M0 shape) gives `kind: 'ok'` with `v: 2`, `sanity: 80`, `rel.fang: 20`, `scene: null`, and the original `x`, `clues`, `suit` (Review Focus 1).
  - A v2 state with every new field set round-trips.
  - These v2 values each give `kind: 'corrupt'`: `sanity: 101`, `zeroCount: 3`, `rel.boss: 200`, `codex: ['nope']`, an evidence item missing `en`, and `flags: [1]`.
- [ ] **Step 2: Run** `bun test tests/save.test.ts`. Expected: FAIL (no migration; `v: 2` unknown).
- [ ] **Step 3: Implement.** Keep a single `parseSave`. Validate the v1 field set, then the v2 field set when `v === 2`, otherwise fill defaults.
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass. Update any test or code that builds `GameState` literals (the typecheck finds them).
- [ ] **Step 5: Commit:** `feat(game): GameState v2 with sanity, relationships, codex, evidence; v1 save migration`.

### Task 2: Sanity rules

**Files:** Create `game/src/systems/sanity.ts`. Test `game/tests/sanity.test.ts`.

**Interfaces:** Produces:
- `SANITY_START = 80`, `FORCED_LEAVE_SANITY = 40`
- `halve(delta)`: negative → `Math.ceil(delta / 2)`; positive → unchanged
- `applySanity(cur, delta, recognized = false): { value: number; hitZero: boolean }`: clamps to 0..100; `hitZero` is `value === 0`
- `zeroOutcome(zeroCount): 'forcedLeave' | 'burnout'`: 0 → `'forcedLeave'`, otherwise `'burnout'`

- [ ] **Step 1: Write the failing tests:**
  - `halve`: −10 → −5, −15 → −7, −5 → −2, 3 → 3
  - `applySanity(80, -10, true)` → `{ value: 75, hitZero: false }`
  - `applySanity(98, 5)` → value 100
  - `applySanity(5, -12)` → `{ value: 0, hitZero: true }`
  - `zeroOutcome(0)` → `'forcedLeave'`, `zeroOutcome(1)` → `'burnout'`
- [ ] **Step 2: Run** `bun test tests/sanity.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): sanity rules`.

### Task 3: Codex data

**Files:** Create `game/src/data/codex.yaml`, `game/src/data/codex.ts`. Add locale keys `codex.title`, `codex.locked`, `codex.what`, `codex.todo`, `codex.correct` (`看穿了：{name}` / `Seen through: {name}`), `codex.wrong` (`好像不是這個……` / `Not quite…`), `codex.pick` (`這句話是哪一種？` / `Which tactic is this?`). Test `game/tests/codex.test.ts`.

**Interfaces:** Produces `TACTIC_IDS: TacticId[]` (the 7, in the order above) and `CODEX: Record<TacticId, { name: Bi; what: Bi; todo: Bi }>`. The text comes from `docs/02-story.*.md` §9:
- `name`: the card name
- `todo`: the "What you can do" column
- `what`: one plain sentence saying what the tactic is, written for both languages

- [ ] **Step 1: Write the failing tests:**
  - `TACTIC_IDS` has 7 unique ids that match `TacticId`.
  - Every `CODEX` entry has non-empty `zh` and `en` for `name`, `what` and `todo`.
  - The new locale keys exist in both files (existing parity test).
- [ ] **Step 2: Run** `bun test tests/codex.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the data.**
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): tactics codex data (7 cards, zh-TW + en)`.

### Task 4: Evidence, relationships, responses

**Files:** Create `game/src/systems/evidence.ts`, `relations.ts`, `responses.ts`. Test `game/tests/social.test.ts`.

**Interfaces:** Produces:
- evidence.ts:
  - `addEvidence(list, item): { added: boolean; list: EvidenceItem[] }`: de-duplicates by `id` and keeps the list sorted by `time`, stable
  - `hasEvidence(list, ids): boolean` (all present), `countEvidence(list, ids): number`
- relations.ts:
  - `addRel(rel, npc, delta): Record<NpcId, number>`: clamps to −100..100
  - `ASK_BONUS = 15`
  - `askOutcome(rel: number, checkedFirst: boolean): 'full' | 'partial' | 'refuse'`
- responses.ts:
  - `type ResponseId = 'swallow' | 'clarify' | 'boundary' | 'talk'`, `RESPONSES: ResponseId[]`
  - `responseEffect(id, hasEvidence): { sanity: number; target: number; ally: number }` (table in Global Constraints)

- [ ] **Step 1: Write the failing tests:**
  - **Evidence:**
    - Adding an item twice keeps one copy.
    - Adding at 05:10 then 03:05 gives order 03:05, 05:10.
    - `hasEvidence` returns false if any id is missing.
    - `countEvidence` counts only the listed ids.
  - **Relationships:**
    - `addRel` clamps at 100 and −100.
    - `askOutcome(5, true)` → `'full'`, `askOutcome(5, false)` → `'partial'`, `askOutcome(-1, false)` → `'refuse'`, `askOutcome(-10, true)` → `'partial'`.
  - **Responses:** `responseEffect('clarify', false)` → `{ sanity: -3, target: -5, ally: 0 }`, and the three other rows exactly as the table.
- [ ] **Step 2: Run** `bun test tests/social.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): evidence, relationship, ask and response rules`.

### Task 5: Script format and runner

**Files:**
- Create: `game/src/data/script.ts` (types), `game/src/systems/script.ts` (runner)
- Modify: `game/src/data/story.ts` (now exports `SCENES`, `ASKS`), `game/src/data/story/ch02.yaml` (converted to scenes)
- Create: `game/src/data/story/asks.yaml` (an empty map for now)
- Test: `game/tests/script.test.ts` (fixture scenes inside the test), `game/tests/data.test.ts` (updated for scenes)

**Interfaces:**
- Produces, in data/script.ts:
  - `Cond = { flag?; notFlag?; evidence?: string[]; evidenceMin?: { ids: string[]; n: number }; clues?: number; suit?: boolean; solved?: boolean; rel?: { npc: NpcId; min: number } }` (all present keys must hold)
  - `Effect = { sanity?; rel?: Partial<Record<NpcId, number>>; flag?; unflag?; coffee?; clue?; suit? }`
  - `ScriptLine = Line & { id: string; tactic?: TacticId; sanity?: number; evidence?: true | EvidenceSource }`
  - `Beat`, one of:
    - `{ line: ScriptLine }`
    - `{ choice: { id; zh; en; if?: Cond; do: Beat[] }[] }`
    - `{ respond: { target: NpcId; ally?: NpcId; evidence?: string[]; after?: Partial<Record<ResponseId, Beat[]>> } }`
    - `{ ask: { npc: NpcId; topic: string } }`
    - `{ if: Cond; then: Beat[]; else?: Beat[] }`
    - `{ effect: Effect }`
    - `{ evidence: EvidenceItem }`
    - `{ card: { kind: 'chapter' | 'notice'; zh; en } }`
    - `{ goto: string }`
  - `Scene = Beat[]`
  - `AskTopic = Partial<Record<NpcId, { full: ScriptLine[]; partial: ScriptLine[]; refuse: ScriptLine[] }>>`
- Produces, in systems/script.ts:
  - `Frame`, one of:
    - `{ kind: 'line'; line: ScriptLine; canRecognize: boolean }`
    - `{ kind: 'choice'; options: { id; zh; en; enabled: boolean }[] }`
    - `{ kind: 'card'; card }`
    - `{ kind: 'end' }`
  - `RunnerEvent`, one of:
    - `{ kind: 'zero'; outcome: 'forcedLeave' | 'burnout' }`
    - `{ kind: 'codex'; id: TacticId }`
    - `{ kind: 'evidence'; item: EvidenceItem }`
    - `{ kind: 'clue'; id: string }`
  - `evalCond(s, c): boolean`
  - `applyEffect(s, e): RunnerEvent[]`. It mutates `s`. Sanity goes through `applySanity`. On zero it applies `zeroOutcome(s.zeroCount)`, increments `zeroCount`, and sets sanity to 40 on forced leave.
  - `class ScriptRunner`, constructed with `{ state(): GameState; clock(): string; scenes; asks }`, with methods `start(id): Frame`, `current(): Frame`, `advance(): Frame`, `choose(optionId): Frame`, `recognize(pick: TacticId): boolean`, `note(): EvidenceItem | null`, `events(): RunnerEvent[]` (drains)
- Runner rules:
  - **Lines:** a line's `sanity` is applied when the player advances past it (halved if it was recognized). A line with `evidence` is logged as soon as it is shown, as `{ id: line.id, time: clock(), source: evidence === true ? 'talk' : evidence, … }`. `note()` logs the current line with id `note:<line.id>` and source `'talk'`.
  - **Choices and branches:** options whose `if` fails come back with `enabled: false`; choosing one is ignored. `goto` replaces the rest of the scene.
  - **Respond:** expands to a choice of the 4 responses (labels from locale keys `resp.*`). It applies `responseEffect` (clarify counts as having evidence only if `evidence` ids are all present), then runs `after[id]` if given.
  - **Ask:** if flag `skill_asking_well` is set, it first offers a choice between `ask.plain` and `ask.checked`. Then it plays the `full`/`partial`/`refuse` lines from `askOutcome`. Full sets flag `knows_<topic>`; partial sets `half_<topic>`.
  - **Zero sanity:** a `'zero'` event with outcome `'burnout'` ends the scene immediately (next frame is `end`). Forced leave lets the scene continue.
- Convert `ch02.yaml` from the M0 `Record<key, Line[]>` to `scenes:`. Line ids look like `kevin-1`.
  - Kevin's scene ends with `effect: { clue: pm }`.
  - The boss scene uses `if` beats: `solved`, then `suit`, then `clues: 3` → ready, otherwise more. This replaces the logic in actions.ts.
  - Add `c2_report_spc`:
    - evidence E-C2-01 (03:05, chat, me: 「N9K417.1 OOC，正在查 ETCH-07 PM-B。」 / "N9K417.1 OOC, checking ETCH-07 PM-B.")
    - evidence E-C2-02 (03:40, chat, boss: 「你自己看著辦，8 點前要有結論。」 / "Handle it yourself. I need a conclusion by 8.")
    - a line each showing the two messages
  - Add `c2_report_ring`:
    - evidence E-C2-03 (04:32, chat, me: 「PM-B focus ring 1,180h，疑似到壽命，建議更換。」 / "PM-B focus ring at 1,180 h, likely end of life, recommend replacing.")
    - evidence E-C2-04 (05:10, chat, boss: 「嗯。」 / "Mm.")
    - a line each
  - `intro` gains `effect: { flag: ev_unlocked }`.

- [ ] **Step 1: Write the failing tests** with fixture scenes:
  - **Lines and choices:**
    - The runner walks line → effect → line.
    - A choice with one option gated by `if: { flag: x }` shows it as disabled; choosing it does nothing; choosing the other runs its `do` beats.
  - **Sanity and recognition:**
    - A `−10` tactic line not recognized drops sanity to 70.
    - The same line recognized drops it to 75 and emits `codex`.
    - A second `recognize` on the same line returns false and changes nothing.
  - **Evidence:**
    - A line with `evidence: chat` adds an item with `time` from `clock()`.
    - `note()` adds `note:<id>`.
  - **Control flow:**
    - `goto` jumps to the other scene.
    - `if`/`else` branches on `clues: 3`.
  - **Respond:** with `evidence: ['E1']` absent, picking clarify gives sanity −3 and target −5.
  - **Ask:**
    - At rel 5 without the skill, the partial lines play and `half_t` is set.
    - With `skill_asking_well` and the checked option, full lines play and `knows_t` is set.
  - **Zero sanity (Review Focus 3):**
    - At sanity 5, a −10 line emits `zero/forcedLeave` and sanity becomes 40.
    - At sanity 5 with `zeroCount 1`, it emits `zero/burnout` and the next frame is `end`.
  - **Data:** every scene in `SCENES` parses; every line has bilingual text and a known speaker; `c2_report_ring` contains E-C2-03 and E-C2-04.
- [ ] **Step 2: Run** `bun test tests/script.test.ts tests/data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the types, runner and data. The runner keeps a stack of `{ beats, i }` frames so `do`, `then` and `else` lists nest.
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass. (Old `story.*` keys are still read by UI code until Task 6. Keep a temporary `story` export derived from `SCENES` lines if typecheck needs it, and remove it in Task 9.)
- [ ] **Step 5: Commit:** `feat(game): scripted scene format and runner`.

### Task 6: Scene player in the dialog (choices, recognition, notes)

**Files:**
- Create `game/src/ui/scene.ts`.
- Modify:
  - `game/src/ui/dialog.ts` (rendering only: line with typewriter, choices, "?" and "Note it" buttons, recognition picker)
  - `game/src/core/autosave.ts` (`pauseAutosave(on)`)
  - `game/index.html` (dialog buttons and choice container)
  - `game/src/style.css`
  - both locale files (`dlg.recognize`, `dlg.note`, `dlg.noted`, `choice.locked`, `resp.swallow|clarify|boundary|talk`, `ask.plain`, `ask.checked`)
- Test: `game/tests/scene.test.ts`. Also update `game/tests/ui.test.ts` to use `playScene`.

**Interfaces:**
- Produces, in ui/scene.ts:
  - `playScene(id, opts?: { params?: Params; onEnd?: () => void })`
  - `queueScene(id)`: plays when not busy; duplicates are ignored
  - `pumpQueue()`
  - `isSceneActive()`
- `isDialogOpen()` is true while a scene is active.
- When a scene starts: `S.scene = id`, then `saveNow()`, then `pauseAutosave(true)`. When it ends: `S.scene = null`, `pauseAutosave(false)`, then `saveNow()`.
- Runner events become feedback:
  - codex → toast `codex.correct` with the card's `what` text
  - evidence → toast `dlg.noted`
  - zero → handled by Task 8 (until then, a stub that ends the scene)

- [ ] **Step 1: Write the failing tests (happy-dom):**
  - **Playthrough:** `playScene` on a fixture scene shows the first line; clicking the dialog advances; choices render as buttons, and a disabled option has `disabled` and a `choice.locked` title.
  - **Recognition:**
    - On a tactic line the "?" button is visible; it is hidden on lines without a tactic.
    - Picking the right card in the picker halves the loss and shows the `codex.correct` text.
    - Picking the wrong card shows `codex.wrong` and hides the "?" button.
  - **Note it:** "Note it" adds `note:<id>` to `S.evidence`.
  - **Language switch (Review Focus 4):** with choices showing, `switchLang('en')` re-labels them; with the picker open, card names switch and the picker stays open.
  - **Mid-scene save (Review Focus 2):**
    - After `playScene`, the stored save has `scene` set and the pre-scene sanity.
    - A `saveNow()` called mid-scene writes nothing new.
    - After the scene ends, the save has `scene: null`.
- [ ] **Step 2: Run** `bun test tests/scene.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Port the existing UI tests that called `say(story.X)` to `playScene('X')` (same assertions).
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): scene player with choices, tactic recognition and notes`.

### Task 7: Sanity bar, Evidence Log and Codex windows

**Files:**
- Modify:
  - `game/index.html` (sanity stat; `#ev-btn` and `#codex-btn` HUD buttons; `#ev-btn` stays hidden until flag `ev_unlocked`)
  - `game/src/ui/hud.ts`, `game/src/ui/windows.ts` (`openEvidence()`, `openCodex()`), `game/src/game/input.ts` (J, K), `game/src/style.css`
  - locale keys `hud.sanity`, `hud.sanityAria`, `hud.evidence`, `hud.codex`, `ev.title`, `ev.empty`, `ev.all`, `ev.src.talk|chat|meeting`
- Test: `game/tests/ui.test.ts`.

**Interfaces:** Produces `openEvidence()` and `openCodex()`. `refreshHud()` also sets the sanity bar width and number, its `aria-label` (`hud.sanityAria`), and the visibility of `#ev-btn`.

- [ ] **Step 1: Write the failing tests:**
  - **Sanity bar:** with `S.sanity = 37`, `refreshHud()` shows "37" and the bar width is `37%`.
  - **Evidence button:** `#ev-btn` is hidden without `ev_unlocked` and visible with it.
  - **Evidence Log:**
    - `openEvidence()` lists items by time.
    - The `chat` filter hides `talk` items.
    - An empty log shows `ev.empty`.
  - **Codex:**
    - `openCodex()` shows 7 cards, with locked ones as `codex.locked`.
    - An unlocked card opens its `what` and `todo`.
    - Switching language re-renders it.
- [ ] **Step 2: Run** `bun test tests/ui.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, reusing the window framework and the existing CSS tokens.
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): sanity bar, evidence log and codex windows`.

### Task 8: Story cards, forced leave and Burnout

**Files:**
- Create `game/src/ui/cards.ts`.
- Modify `game/index.html` (`#card` overlay), `game/src/style.css`, `game/src/ui/scene.ts` (handle `zero` events), `game/src/game/runtime.ts` (`busy()` includes cards).
- Locale keys `card.continue`, `card.forcedTitle`, `card.forcedBody`, `card.burnoutTitle`, `card.burnoutBody`:
  - Forced leave: 「你的理智撐不住了，請了一天假。隔天群組裡，王經理：「請假？大家都在拚耶。」」 / "Your sanity gave out, so you took a day off. The next day, in the group chat, Manager Wang: "Leave? Everyone else is pushing through."".
  - Burnout: 「某個夜班，你坐在更衣室的長椅上，不想再進去。這不是你的錯。休息一下吧。」 / "One night shift, you sit on the bench in the gowning room and can't make yourself go back in. This isn't your fault. Take a rest.".
- Test: `game/tests/cards.test.ts`.

**Interfaces:**
- `showCard(title: Bi | string, body: Bi | string, onClose: () => void)`, `isCardOpen()`. The card re-renders on `'lang'`, and Space, Enter or a click closes it.
- In scene.ts, a `zero` event works like this:
  - **forcedLeave:** finish the dialog, show the forced-leave card, and continue the scene after it closes.
  - **burnout:** end the scene, show the Burnout card, then on close `clearSave()`, `setAutosave(false)` and `emit('toTitle')`.

- [ ] **Step 1: Write the failing tests:**
  - A fixture scene that drops sanity from 5 shows the forced-leave card; S.sanity is 40 and zeroCount is 1; closing the card resumes the scene.
  - With zeroCount 1, it shows the Burnout card; closing it clears the stored save and emits `toTitle` once.
  - `busy()` is true while a card is open.
- [ ] **Step 2: Run** `bun test tests/cards.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test` and `bun run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit:** `feat(game): story cards, forced leave and burnout ending`.

### Task 9: Wire the engine into the game

**Files:** Modify `game/src/game/actions.ts`, `game/src/game/effects.ts`, `game/src/ui/windows.ts` (conclusion outcomes), `game/src/main.ts`, `game/src/game/WorldScene.ts`, `game/src/data/story.ts` (remove the temporary `story` export). Test `game/tests/ui.test.ts`.

**Interfaces:**
- **Actions:**
  - `doInteract` plays scenes: NPCs → `boss` / `kevin` / `fse`; desks → `say_*`; locker → `locker_on` when suiting; coffee → `coffee_ok` / `coffee_full`.
  - The conclusion plays `rc_wrong` or `rc_solved` (params n, c).
- **Clue reports:** `gainClue` queues `c2_report_spc` after the first `spc` and `c2_report_ring` after the first `ring`.
- **Queue pumping:** `WorldScene.update` calls `pumpQueue()` when not busy.
- **New Game and Continue:**
  - New Game plays `intro`.
  - Continue with `S.scene` set replays that scene from its start.
  - New Game and Continue both reset the scene runner.

- [ ] **Step 1: Write the failing tests:**
  - **Interactions:**
    - `doInteract` on Kevin plays his 4 lines, then gains `pm`.
    - `doInteract` on the boss with 3 clues plays `boss_main`, then `boss_ready`.
  - **Clue reports:**
    - `gainClue('spc')` while a window is open queues `c2_report_spc`.
    - After `closeWin()` and `pumpQueue()`, it plays; after it finishes, E-C2-01 and E-C2-02 are in `S.evidence`.
    - A second `pumpQueue()` plays nothing (Review Focus 5).
- [ ] **Step 2: Run** `bun test tests/ui.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** and remove the old `say(story.*)` call sites.
- [ ] **Step 4: Run** `bun test`, `bun run typecheck`, `bun run build`. Expected: all green, exit code 0.
- [ ] **Step 5: Commit:** `feat(game): run chapter 2 through the story engine; LINE reports feed the evidence log`.

### Task 9b: Oblique tools (added 2026-10-21)

The user picked option B from `mockups/tools-3d.html`: the tools are drawn so the top face leans up and to the right (1 px per 4 rows) and the right side face shows, with LEDs on it. Lighting runs top > side > front. Only tools change. Desks, lockers and the coffee machine stay as they are for now.

**Files:** Modify `game/src/render/tools.ts` and `game/src/render/palette.ts`. Test `game/tests/render.test.ts`.

**Interfaces:**
- `toolGeo(o, X?, Y?)` returns `{ W, H, hz, T, side, sw, tx, ty, fy, by }`: front height, top depth, side width, front and top width, and key rows.
- `VISUAL_TOP` for a tool is `lift + 14`. `STATIC_PAD` is unchanged.
- `buildLeds` zones cover the top, the front panels and the side face.
- The chamber frames, tower lamps and MET screen glow come from a cached per-tool layout, so the static and dynamic layers agree.

- [ ] **Step 1: Write the failing tests:**
  - Every tool has a side face 6 px or wider, drawn right of the front and inside the footprint.
  - `VISUAL_TOP` equals how far above the footprint each tool is drawn.
  - Every LED, and every rect of the chamber-frame layer, lands on a pixel the static drawing painted (shadows excluded).
- [ ] **Step 2: Run** `bun test tests/render.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, porting `surface()`/`body()` from the mockup and relaying out each kind to fit the narrower top.
- [ ] **Step 4: Run** `bun test`, `bun run typecheck`, `bun run build`. Expected: all green.
- [ ] **Step 5: Commit:** `feat(game): oblique tools with a visible side face`.

### Task 10: Docs, preview, manual check

**Files:** Modify `docs/04-roadmap.en.md` and `docs/04-roadmap.zh-TW.md` (M1-1 status), and `game/README.md` (script format section with one example beat of each kind).

- [ ] **Step 1: Update the docs.**
- [ ] **Step 2: Run** `bun test`, `bun run typecheck`, `bun run build`. Expected: all green.
- [ ] **Step 3: Republish the preview artifact** (same URL as M0).
- [ ] **Step 4: Manual checks for the owner:**
  1. Talking to Kevin raises the clue count and the sanity bar is visible.
  2. Getting the SPC clue and closing the PE window plays the LINE report once, and the Evidence Log shows E-C2-01 and E-C2-02.
  3. The Codex window shows 7 locked cards.
  4. Switching language while a choice is showing works.
  5. Reloading and choosing Continue works.
- [ ] **Step 5: Commit:** `docs: M1-1 status and script format`.

---

## Self-review

- **Spec coverage:**

  | Spec item | Task |
  |---|---|
  | §5.2 sanity | Tasks 2, 5, 8 |
  | §5.3 recognition | Tasks 5, 6 |
  | §5.4 evidence | Tasks 4, 5, 6, 7 |
  | §5.5 relationships | Task 4, plus `rel` effects in Task 5 |
  | §5.6 asking | Task 5 runner and data hook |
  | §5.7 responses | Tasks 4, 5 |
  | §6 HUD sanity bar, Evidence Log, Codex, cards; shortcuts J/K | Tasks 7, 8 |
  | §7.2 C2-03 and C2-06 | Tasks 5, 9 |
  | Appendix A format | Task 5 |

  Deferred to M1-2 by the scope split: maps, new NPCs, Prologue S1–S8, C2-07..C2-10, the title and end-of-demo flow, and the §9 acceptance pass.
- **Type consistency:** these names match across tasks: `NpcId`, `TacticId`, `EvidenceItem`, `Beat`, `Frame`, `RunnerEvent`, `playScene`, `queueScene`, `pumpQueue`, `showCard`, `pauseAutosave`.
- **Proportion:** signatures, values and assertions only; bodies are left to the implementer, guided by the M0 code.
