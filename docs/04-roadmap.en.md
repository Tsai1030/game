# Fab Night Shift: Roadmap

> Version v0.1 · 2026-10-20 · Chinese version: [04-roadmap.zh-TW.md](04-roadmap.zh-TW.md)
> Specification: [03-spec.en.md](03-spec.en.md)

---

## 1. Overview

Effort uses relative sizes: S, M, L, XL. Calendar time depends on how many people work on it, so no week estimates yet.

| Milestone | Name | Contents | Effort | Output |
|---|---|---|---|---|
| M0 | Foundation | Version control, dev environment, moving the prototype into the real architecture | S | Plays the same as the prototype, but as real code |
| M1 | v0.1 playable slice | Scope A: Prologue + Chapter 2 + story systems + Chinese/English switching | L | A complete slice people can playtest |
| M1-3D | 3D renderer | Replace the Phaser 2D world with three.js Smooth 3D (owner's choice, 2026-10-21); runs between M1-2a and M1-2b | M | The same game, drawn in real 3D |
| M2 | Playtest and polish | Industry review, playtest feedback, art decision, audio | M | Revised v0.2 |
| M3 | Scope B | Chapters 1 and 3, equipment engineer gameplay | L | v0.3 |
| M4 | Scope C | Chapters 4–7, install engineer gameplay, 5 endings | XL | Full first year, v0.9 |
| M5 | Release prep | Professional review, help resources, localization check, launch | M | v1.0 |

---

## 2. M0 · Foundation (S)

> **Status (2026-10-20): done.** Merged into `main` after the owner's manual playtest found no problems. 73 automated tests pass, typecheck passes, and the build succeeds. The implementation plan and progress are in `docs/superpowers/plans/2026-10-20-m0-foundation.md`. Bun replaced Node.js (owner's directive), and the map format moved to M2 (see section 0 of the spec).

**Work:**
1. Run `git init` in `D:\g` and commit the current docs and mockups.
2. ~~Install Node.js LTS~~ → install Bun instead (owner's directive).
3. Create a Vite + TypeScript + Phaser 3 project in `game/`.
4. Move the prototype into the new architecture: site map, movement and pathfinding, black tools with LEDs, tool windows, clue book, conclusion.
5. Build the data pipeline: YAML script loading, case JSON, Chinese/English UI text switching.
6. Save/load and settings (language, text speed, reduce motion).

**Done when:**
- Case 03 from the prototype is fully playable in the new architecture and looks the same.
- Traditional Chinese / English can be switched at any time.
- System logic has tests, and they pass.

**Needs the owner's approval first:** installing Node.js and initializing git in the project folder.

---

## 3. M1 · v0.1 playable slice (L)

> **M1-2b (2026-10-22): code complete, so all of M1 is code complete and waiting for the owner's playtest.** M1-2b adds:
> - C2-07: Bear swaps the focus ring in the fab while ETCH-07 goes from red to green.
> - C2-08 to C2-10: the 8 a.m. stand-up, where Wang takes the credit and gaslights you, the three choices with their evidence checks, and the talk with Kevin or Fang-jie afterwards.
> - The end-of-demo card: sanity this chapter, relationships, Codex cards, and a Chapter 3 teaser.
> - Bear and Director Chen in 3D, ally chats (+5 once per chapter), and sanity −5 for a wrong conclusion.
> - Save format v4, which remembers sanity at the start of the chapter.
>
> Automated tests now play the whole demo, from New Game to the end-of-demo card, in both languages. They also cover save and Continue at each checkpoint and all three stand-up choices. 219 tests pass. Plan: `docs/superpowers/plans/2026-10-22-m1-2b-chapter2-ending.md`. Still manual: frame rate at 1280×720 and 1920×1080, phone width, and Reduce motion (spec §9.6 and §9.8).

> **M1-3D (2026-10-21): code complete, waiting for the owner's playtest.** The world is now three.js Smooth 3D: 3D floors and walls, tools with instanced glowing LEDs and alarm light, furniture, low-poly characters, an orthographic follow camera with 3D picking, and fades between maps. Phaser is removed and the bundle drops from 1,613 KB to 617 KB. 177 automated tests pass. Plan: `docs/superpowers/plans/2026-10-21-m1-3d-renderer.md`.

> **Status (2026-10-21): M1-1 (story engine) code complete, waiting for the owner's playtest; M1-2 (content) next.** M1 is split in two. M1-1 adds the story systems and runs Chapter 2's existing lines through them: YAML scenes with choices, responses, asking, conditions and effects; sanity with forced leave and Burnout; Tactic Recognition and the 7-card Codex; the Evidence Log, where Chapter 2's LINE reports log E-C2-01 to E-C2-04; and save format v2, which migrates v1 saves. The owner also chose oblique tools with a visible side face from three mockups (`mockups/tools-3d.html`). 123 automated tests pass, typecheck passes, and the build succeeds. Plan and progress: `docs/superpowers/plans/2026-10-20-m1a-story-engine.md`. M1-2 covers maps 2 and 3, the new characters, Prologue S1–S8, C2-07 to C2-10, the end-of-demo card and the acceptance pass.
>
> **Status (2026-10-21): M1-1 merged into `main`. M1-2 is split in two. M1-2a (prologue) is code complete and waiting for the owner's playtest; M1-2b (Chapter 2 ending) is next.** M1-2a adds:
> - The security gate, orientation room and rented room maps; a corridor, meeting room and technicians' break room on the main site.
> - Door transitions with a fade and the location name.
> - Oblique furniture.
> - Fang-jie, Amy and the security guard, who appear based on story progress.
> - Naming your character on New Game.
> - Day and night shift rules.
> - Prologue S1–S8, flowing into the Chapter 2 chapter card.
>
> 165 automated tests pass, including a full prologue playthrough in each language. Plan and progress: `docs/superpowers/plans/2026-10-21-m1-2a-prologue.md`.

**Work:**
1. **Story systems:** sanity, Tactic Recognition (7 cards), Evidence Log, relationships, asking system, response options, story flags.
2. **Maps:** add the security gate, orientation room, and rented room; add the meeting room and technicians' break room to the main site.
3. **New characters:** Fang-jie, Amy, Bear, Director Chen, the security guard.
4. **Scripts:** Prologue S1–S8 and Chapter 2 C2-01 to C2-10, in both Chinese and English.
5. **UI:** title screen, chapter card, end-of-demo card, Codex, Evidence Log, sanity bar.
6. **Endings:** the forced-leave event and the Burnout ending.

**Done when:** all 8 acceptance criteria in section 9 of the spec pass.

---

## 4. M2 · Playtest and polish (M)

**Work:**
1. **Industry review:** an etch process or equipment engineer reviews using the checklist in Appendix B of the spec.
2. **Playtest:** 5–10 testers, mostly tech industry workers. Each fills in a short survey after playing (fun or not, where they got stuck, which line hit hardest, which felt fake).
3. **Anonymous line collection:** gather manipulative lines people have actually heard, pick the best, and adapt them into the script.
4. **Art decision:** choose one:
   - Keep the code-drawn style and only refine it
   - Buy a licensed pixel asset pack and adapt it to the black palette
   - Commission a pixel artist
5. **Sound and music:** tool hum, alarms, footsteps, dialogue blips, night-shift ambience.
6. Fix based on feedback and ship v0.2.

**Done when:** every issue from the review and playtests is triaged, and all severe ones are fixed.

---

## 5. M3 · Scope B (L)

**Work:**
1. **Chapter 1:** first night shift (Case 01: metrology drift).
2. **Chapter 3:** the blame game (particle excursion), with the triangulation storyline.
3. **Equipment engineer gameplay, "Tool Down!":** alarms, manuals, parts swaps, recovery. Switch to playing as Bear in Chapter 3.
4. **New Codex cards:** Criticism without standards, Moving the goalposts, Triangulation (10 total).
5. Character switching system.

**Done when:** Prologue through Chapter 3 plays straight through, and state is kept correctly across character switches.

---

## 6. M4 · Scope C (XL)

**Work:**
1. Maps, scripts, and cases for Chapters 4–7.
2. **Install engineer gameplay, "Hand-Over Countdown":** move-in, sub-fab piping puzzles, power-up, SAT.
3. **Final 3 Codex cards:** Empty promises, Emotional blackmail, Silent treatment (13 total).
4. 5 endings, including the hidden "Pay It Forward" ending.
5. The Chapter 7 "mirror" dialogue system: the lines you heard, and the other way to say them.

**Done when:** the full first year is playable, all 5 endings can be reached, and both languages are complete.

---

## 7. M5 · Release prep (M)

**Work:**
1. **Professional review:** mental-health or labor professionals review the Codex and sensitive scenes.
2. **Help resources:** verify complaint channels and counseling resources for each launch region and add them to the game menu and credits.
3. **Localization check:** a native English speaker reads through the English version.
4. **Performance and compatibility:** test on each browser and on phones.
5. **Launch:** pick a platform (for example itch.io web or a self-hosted site) and prepare a store page and screenshots.

**Done when:** review feedback is resolved and the game is live.

---

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Process details don't ring true | The target audience (insiders) loses immersion | Industry review in M2; line collection |
| The manipulation theme is mishandled | Players with real experiences feel hurt, or the game reads as glorifying it | Follow the stance and writing rules in the storyline; professional review in M5; include help resources |
| Scope creep | The game never ships | Stick to milestones; finish v0.1 before expanding |
| Art workload | Content stalls waiting on art | Code-drawn art for v0.1; decide in M2 |
| Languages drift apart | One language has missing or off-meaning lines | Side-by-side YAML scripts; acceptance requires a full playthrough in each language |
| Dev environment | Node.js isn't installed on this machine | Install it as the first step of M0 |

---

## 9. Next steps

1. Owner approves installing Node.js and running `git init` in `D:\g`.
2. Start M0.
3. Meanwhile, the owner can start looking for an etch engineer friend to do the M2 review.
