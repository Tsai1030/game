# Fab Night Shift: Specification v0.1 (Playable Slice)

> Version v0.1 · 2026-10-20 · Chinese version: [03-spec.zh-TW.md](03-spec.zh-TW.md)
> Builds on: [01-concept.en.md](01-concept.en.md), [02-story.en.md](02-story.en.md)
> Roadmap: [04-roadmap.en.md](04-roadmap.en.md)

---

## 0. Decisions made

These were the open questions in the concept document. The owner asked Claude to plan everything, so these are **Claude's calls**. Any of them can be overturned.

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | First-version scope | **Scope A: Prologue + Chapter 2, process engineer only** | The fastest route to a complete, playable slice that tests gameplay and tone |
| 2 | Game language | **The game switches between Traditional Chinese and English, starting in v0.1** | The documents are already bilingual, and language switching gets harder to retrofit the later it's added |
| 3 | Protagonist | **Custom name (default Jing Lin), one fixed look** | A name is enough for players to project onto, and one look saves character art |
| 4 | Sanity at zero | **First time triggers a forced-leave event; second time triggers the Burnout ending** | Gives the player one more chance, and says that resting is legitimate |
| 5 | Process-detail review | **One etch process or equipment engineer reviews using the checklist in Appendix B** | The owner doesn't have a process background |
| 6 | Dialogue realism | **Claude writes the first pass; real lines are collected anonymously in M2 to replace them** | Get it working first, then get it true |
| 7 | Tech | **TypeScript + Vite + three.js (Smooth 3D world); maps defined in code; UI in the DOM** (revised 2026-10-21: the owner chose real 3D over Phaser 2D after the `mockups/tools-threejs.html` prototype) | three.js gives real depth, lighting, shadows and glowing LEDs; the game logic never depended on Phaser, so only the drawing layer changes |
| 8 | Art | **Smooth 3D: black metal tool bodies with rim edges, glowing LEDs (bloom), shadows, low-poly characters; dialogue portraits stay 16×16 pixel art** (revised 2026-10-21, owner's choice over "Pixel 3D") | The owner wanted tools that feel solid, with real depth; M2 can still bring in an artist for models |
| 9 | Version control | **Run `git init` before starting** | The project isn't under version control yet |
| 10 | Package manager and tests | **Bun for everything (`bun install`, `bun test`), never npm** (owner's directive, 2026-10-20) | The owner's preference; Bun has a built-in test runner and reads the YAML scripts natively |
| 11 | Map format | **Maps are defined in code until M2; Tiled comes in with the M2 art decision** (decided during M0) | Tiles are drawn in code today, so there is no tileset image for Tiled to use yet |

---

## 1. v0.1 scope

| In | Out |
|---|---|
| Prologue scenes S1–S8 (Day One) | Chapters 1 and 3–7 |
| Chapter 2 (Case 03 + credit stolen at the stand-up) | Equipment engineer and install engineer gameplay |
| Movement, interaction, asking people | Real endings (v0.1 only has the Burnout card and an end-of-demo card) |
| Clue book, conclusion submission, coffee | Sound and music (M2) |
| Sanity, Tactic Recognition (7 cards), Evidence Log, relationships (6 NPCs) | Dedicated mobile optimization (it only needs to be playable) |
| Save, Chinese/English switching, settings | Multiple save slots |
| Title screen, chapter card, end-of-demo card | |

---

## 2. Technical architecture

### 2.1 Stack

| Item | Choice |
|---|---|
| Language | TypeScript |
| Build | Vite |
| Engine | three.js 0.160.0 (pinned; replaces Phaser 3 from M1-3D) |
| Map editor | Until M2: defined in code (`src/data/world.ts`); from M2: Tiled (exports `.tmj`) |
| Text UI | DOM layered over the canvas (HUD, dialogue, tool windows, Codex, Evidence Log) |
| Script format | YAML with Chinese and English side by side |
| Tests | `bun test` for system logic (happy-dom for UI tests), plus a manual playtest checklist |
| Requirements | Bun 1.4.3 (installed with winget at user scope) |

### 2.2 Folder layout

```
D:\g\
  docs/                 Concept, story, spec, roadmap (one Chinese and one English copy each)
  mockups/              Prototypes, kept for reference
  game/
    index.html
    package.json
    vite.config.ts
    src/
      main.ts
      scenes/           Boot, Title, World, ChapterCard, Ending
      systems/          sanity, codex, evidence, relations, ask, clues, story, save, i18n
      render/           tool (black tools), leds (light dots), person (characters)
      ui/               hud, dialog, toolWindow, codex, evidence, settings
      data/
        maps/           *.tmj
        cases/          case03.json
        story/          prologue/*.yaml, ch02/*.yaml
        codex.yaml
        locales/        ui.zh-TW.json, ui.en.json
    public/assets/      Tiles, characters, portraits, fonts
    tests/
```

### 2.3 Data-driven content

- **Scripts:** one YAML file per scene. Every line carries both `zh` and `en`, so translations can't drift apart. See Appendix A.
- **Cases:** one JSON file per case with SPC points, logs, consumables, wafer parameters, clue mapping, the answer, and the minimum clue count.
- **UI text:** `locales/ui.*.json`, looked up by key.
- **Rule:** no player-visible text is hard-coded.

### 2.4 Saving

- Stored in the browser's `localStorage`: one save slot, plus "New Game".
- Autosaves on scene changes and at the end of each chapter.
- Saved data: chapter, scene, flags, sanity, coffee, relationships, unlocked Codex cards, evidence, clues, protagonist name, settings.
- If the save is missing or malformed, return to the title screen with a notice. Never crash.

### 2.5 Display and performance

- 3D world, 1 tile = 1 unit. An orthographic camera looks down at a fixed 3/4 angle and follows the player; it shows about 13 tiles of height on wide screens and 11 on phones. Render resolution is capped at 2× (1.5× on phones).
- Target 60 fps. LEDs aren't drawn for tools outside the camera view.
- Supported browsers: the latest two versions of Chrome, Edge, Firefox, and Safari.

---

## 3. Maps

| ID | Name | Approx. size (tiles) | Purpose | Exits |
|---|---|---|---|---|
| M01 | Security gate | 20×12 | Prologue S1 | → M02 |
| M02 | Orientation room | 18×12 | Prologue S2 | → M03 |
| M03 | Main site | about 52×30 | Office, **meeting room (new)**, **technicians' break room (new)**, gowning room, air shower, fab. Expanded from the prototype | → M04 (going home) |
| M04 | Rented room | 10×8 | Prologue S8, between chapters | → M03 (going to work) |

Map changes fade out and in, and show the location name.

---

## 4. Characters (v0.1)

| Character | Appears | Starting relationship | Notes |
|---|---|---|---|
| You | Throughout | — | Name is customizable |
| Manager Wang | Prologue, Ch. 2 | 0 | Main source of manipulation |
| Kevin | Prologue, Ch. 2 | 10 | Gives the "PM was postponed" clue in Ch. 2 |
| Fang-jie | Prologue, Ch. 2 | 20 | The model for asking well |
| Amy | Prologue | 0 | Orientation only |
| Bear | Ch. 2 | 0 | Swaps the focus ring after you submit (cutscene) |
| A-Zhe | Ch. 2 | 10 | Carried over from the prototype |
| Director Chen | Ch. 2 stand-up | — | No relationship value |
| Security guard | Prologue | — | No relationship value |

---

## 5. System specifications

### 5.1 Movement and interaction (from the prototype)

- 0.15 s per tile, four directions.
- Click the floor to path there; click an object or person to walk next to it and interact automatically.
- Interact: E / Space / Enter. Touch: D-pad and an A button.
- You can't pass the air shower without a cleanroom suit.

### 5.2 Sanity

- Range 0–100, starting at 80 in the prologue. The HUD shows a bar and the number.

| Event | Change |
|---|---|
| Manipulative line (by severity) | −5 to −15 |
| Correctly recognizing that line | That loss is halved (rounded down) |
| Staying late | −5 |
| Leaving on time | +3 |
| Setting a boundary | +5 |
| Chatting with an ally (once per ally per chapter) | +5 |
| Wrong conclusion | −5 |
| Finishing a chapter | +10 |

- **At zero:** the first time triggers a forced-leave event (skip to the next day, sanity back to 40, and a snide message from Manager Wang). The second time triggers the Burnout ending.

### 5.3 Tactic Recognition

1. When a script line tagged with `tactic` appears, a "?" button shows at the top-right of the dialogue box until that line ends.
2. Pressing "?" opens the Codex card picker. Unlocked cards show their names; locked ones show "???" but can still be picked.
3. Correct pick: that sanity loss is halved, the card unlocks, and a one-line explanation appears. Wrong pick: no penalty, but no reduction either.
4. The first occurrence in prologue S6 includes a guided tutorial.

**The 7 cards in v0.1:** Double bind, Personal attack, Comparison, We're a family, For your own good, Credit stealing, Gaslighting.

### 5.4 Evidence Log

- **Automatic:** script lines and messages tagged `evidence: true` are saved automatically.
- **Manual:** every dialogue line has a "Note it" button so the player can save it.
- Each entry has: ID, in-game time, source (conversation, LINE, meeting), speaker, text (both languages), tags.
- The choices at the Chapter 2 stand-up check the log for specific IDs (see 7.2).

### 5.5 Relationships

- One value per NPC, from −100 to 100.
- Asking someone a question resolves by relationship:

| Effective relationship | Result |
|---|---|
| ≥ 20 | Full answer |
| 0–19 | Partial answer |
| < 0 | No answer, or a manipulative reply |

- Choosing "Say what I already checked" adds +15 to the effective relationship.

### 5.6 Asking system

- Each question topic has an ID, such as `hold_lot`. Each NPC has three answers per topic (full / partial / refuse).
- Asking sets a flag such as `knows_hold_lot`, and the story advances on flags.
- After the "Asking Well" skill unlocks in prologue S5, every ask gains the "Say what I already checked" option.

### 5.7 Response options

Four responses after a manipulation event:

| Response | Sanity | Relationship with the manipulator | Notes |
|---|---|---|---|
| Swallow it | −3 | +5 | Nothing changes |
| Clarify the facts | +0 | −5 | Only works with relevant evidence |
| Set a boundary | +5 | −10 | Best long-term effect |
| Talk it over with someone | +5 | +0 | That ally +5 |

### 5.8 Clues and conclusions (from the prototype, now data-driven)

- Click suspicious data to add it to the clue book.
- Submitting a conclusion requires at least 3 clues.
- Wrong conclusion: coffee −1, sanity −5, and you can try again.

### 5.9 Coffee

- Range 0–5. Drops by 1 every 2 real minutes, during night shifts only.
- The office coffee machine adds 1.
- At zero, movement speed ×0.7 and a "So sleepy..." message appears.

### 5.10 Settings

| Setting | Options |
|---|---|
| Language | Traditional Chinese / English, switchable any time, applies immediately |
| Text speed | Slow / Normal / Instant |
| Reduce motion | Disables LED blinking, running lights, and the red alarm flash; also follows the system "reduce motion" setting |

---

## 6. UI specification

| UI | Contents |
|---|---|
| HUD | Location, in-game time, shift-end countdown (night shifts only), coffee, sanity bar, clue book, Evidence Log, Codex, settings |
| Dialogue box | Portrait, name, typewriter text, ▼ to continue, choice list, "?" recognition button, "Note it" button |
| Tool windows | From the prototype: ETCH-07 (status / FDC log / consumables), MET-02 (wafer map), PE workstation (SPC / lots / conclusion), status cards for other tools |
| Codex | Card grid; open a card for its explanation and "What you can do" |
| Evidence Log | Sorted by time, filterable by source |
| Title screen | New Game, Continue, Settings, Language |
| Chapter card | For example: "Chapter 2 · The Night of Case 03 | Two months later" |
| End-of-demo card | Sanity change this chapter, relationships, cards unlocked, next-chapter teaser |

**Shortcuts:** E / Space interact, Esc close, C clue book, J Evidence Log, K Codex.

---

## 7. Script specification

In the effects column, "San" is sanity and "Rel" is relationship.

### 7.1 Prologue (M01 → M02 → M03 → M04)

| ID | Time | Location | Content | System effect |
|---|---|---|---|---|
| P-S1 | 07:20 | M01 | Pick up badge; phone camera gets a tamper sticker | Tutorial: movement, dialogue |
| P-S2 | 08:00 | M02 | Orientation. Amy: "Your manager will teach you the technical stuff in your unit." | Tutorial: interaction |
| P-S3 | 10:30 | M03 office | No PC, 2,000 pages of SOP | First talk with Kevin |
| P-S4 | 11:45 | M03 office | Wang: "If you don't know, go ask." "We're one big family." | 2 automatic evidence entries |
| P-S5 | 13:30 | M03 office, break room | "Ask Someone" minigame: holding a lot | Ask Wang: San −8 [Double bind]. Ask Fang-jie: unlocks "Asking Well", Fang-jie Rel +5 |
| P-S6 | 15:00 | M03 meeting room | "What did they teach you in school?" "Kevin knew this in his first week." | San −10 [Personal attack], San −6 [Comparison]; Tactic Recognition tutorial |
| P-S7 | 18:30 | M03 office | "New hires don't need to rush off." | San −5 [For your own good]. Choice: stay (San −5, Wang Rel +5) or leave on time (San +3, boundary +5, Wang Rel −10) |
| P-S8 | 23:10 | M04 | Added to the "One Big Happy Family" group: "Self-intro tomorrow. With data." | San −5 [We're a family]; Evidence Log UI unlocks |

### 7.2 Chapter 2 (M03)

| ID | Time | Location | Content | System effect |
|---|---|---|---|---|
| C2-01 | 02:47 | Office | Chapter card "Two months later"; phone buzzes, SPC auto-hold | Coffee timer starts |
| C2-02 | — | PE workstation | Read SPC, click OOC points | Clue `spc` |
| C2-03 | 03:05 | Automatic | You send on LINE: "N9K417.1 OOC, checking ETCH-07 PM-B." Wang replies at 03:40: "Handle it yourself. I need a conclusion by 8." | Evidence E-C2-01, E-C2-02 |
| C2-04 | — | Gowning room, air shower | Suit up | — |
| C2-05 | — | Fab | Investigate ETCH-07 and MET-02; talk to Kevin and A-Zhe | Clues `fdc`, `ring`, `map`, `pm` |
| C2-06 | 04:32 | Automatic (after `ring`) | You send on LINE: "PM-B focus ring at 1,180 h, likely end of life, recommend replacing." Wang reads it; at 05:10 he replies: "Mm." | Evidence E-C2-03, E-C2-04 |
| C2-07 | — | PE workstation | Submit conclusion → cutscene: Bear swaps the focus ring, monitor CD 45.1 nm | San +5; Bear Rel +10 |
| C2-08 | 08:00 | Meeting room | Wang to Director Chen: "I identified it as the focus ring." After you speak up: "Didn't I tell you to check it? You're remembering it wrong." | San −12 [Credit stealing], San −12 [Gaslighting] |
| C2-09 | 08:00 | Meeting room | Three choices (see below) | See below |
| C2-10 | 08:30 | Office | Talk with Kevin or Fang-jie depending on your choice; chapter summary; end-of-demo card | Chapter complete San +10 |

**C2-09 choices:**

| Choice | Requirement | Result |
|---|---|---|
| Pull up the LINE messages on the spot | Requires E-C2-03 + E-C2-04 | The director sees the timestamps; Wang is humiliated in front of everyone. San +10, Wang Rel −25, flag `confronted_publicly` |
| Email a timeline after the meeting, CC yourself | At least 2 of E-C2-01 to 04 for the email to carry weight | San +8, Wang Rel −5, flag `paper_trail` (used in Chapter 6). With too little evidence: San +0 |
| Let it go | — | San −5, Wang Rel +5, flag `let_it_go` |

---

## 8. Art and audio

| Item | v0.1 spec |
|---|---|
| Tiles | 3D floor with the prototype's tile textures (dark night shift); back walls tall, front walls low so the player is never hidden |
| Characters | Low-poly 3D figures in the same colors, four directions, swinging walk; cleanroom suit and street clothes |
| Portraits | 16×16 pixel grids shown enlarged (from the prototype); may move to 32×32 in M2 depending on the art decision |
| Tools | 3D black bodies with rim edges, glowing LED dots (bloom), running lights, light towers; an alarming tool lights the floor red |
| Fonts | DotGothic16 (body text in both languages), Silkscreen (English labels), Noto Sans TC (fallback for missing glyphs), IBM Plex Mono (FDC terminal) |
| UI | Black pixel windows with white borders (from the prototype) |
| Audio | None in v0.1; added in M2 |

---

## 9. Acceptance criteria

v0.1 is done when:

1. Starting from "New Game" on the title screen, the game can be played through to the end-of-demo card without getting stuck, once fully in Chinese and once fully in English.
2. Switching language mid-game immediately changes every piece of on-screen text (dialogue, tool windows, Codex included) with nothing left untranslated.
3. Sanity, relationships, evidence, Codex, and clues all save correctly. After a page reload, "Continue" restores exactly the same state.
4. Both stages of the zero-sanity flow (forced leave, Burnout ending) can be triggered.
5. All three C2-09 choices check their conditions and produce the right results.
6. About 60 fps in 1280×720 and 1920×1080 windows; fully playable at phone width.
7. System logic (sanity, recognition, evidence conditions, relationship thresholds, save/load) has automated tests, and they all pass.
8. With "Reduce motion" on, nothing flashes.

---

## Appendix A: Data format examples

**Script (YAML):**

```yaml
scene: P-S6
map: M03
location: meeting_room
lines:
  - id: P-S6-03
    speaker: wang
    zh: 這個也不會？你學校在學什麼？
    en: You don't know *this*? What did they teach you in school?
    tactic: personal_attack
    sanity: -10
    evidence: true
  - id: P-S6-04
    speaker: wang
    zh: Kevin 當年第一週就看得懂了。
    en: Kevin could read these in his first week.
    tactic: comparison
    sanity: -6
```

**Case (JSON excerpt):**

```json
{
  "id": "case03",
  "answer": { "tool": "ETCH-07", "chamber": "PM-B", "cause": "focus_ring_eol" },
  "minClues": 3,
  "clues": ["spc", "fdc", "ring", "map", "pm"],
  "logClues": { "1": "fdc", "5": "fdc", "9": "fdc", "11": "ring" }
}
```

## Appendix B: Industry review checklist

Ask an etch process or equipment engineer to play the prototype, read the storyline, and answer:

1. Does Case 03's causal chain hold up: focus ring wear → rising RF reflected power and matcher drift → high CD at the wafer edge?
2. Do the FDC parameter names and ranges look real (RF reflected limit 20 W, chamber pressure 10 mT, He flow 6–12 sccm)?
3. Is tracking focus ring life in RF hours, with a 1,200 h limit, reasonable?
4. Do the lot ID, recipe name, and alarm code formats look real?
5. Are the cleanroom suit, air shower, phone camera sticker, and 12-hour shift details correct?
6. Are the PE/EE division of labor, the ticket flow, and the stand-up reporting style accurate?
7. Is there any line that an insider would instantly recognize as written by an outsider?
8. Have you personally heard any manipulative lines that would fit better? (They'll be anonymized.)
