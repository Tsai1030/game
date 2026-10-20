# Fab Night Shift: Design Proposal, Part 1 (Concept)

> Version v0.1 · 2026-10-20 · Chinese version: [01-concept.zh-TW.md](01-concept.zh-TW.md)
> Storyline: [02-story.en.md](02-story.en.md)
> Playable prototype: [mockups/rpg-fab.html](../mockups/rpg-fab.html)

---

## 1. One line

A pixel RPG where you're a new engineer at Fab 9 of Xijing Semiconductor, a fictional wafer fab. Walk into the cleanroom, open up the tools, dig the yield killer out of the logs, and stay whole while your manager tries every manipulation tactic on you.

## 2. Audience and platform

| Item | Detail |
|---|---|
| Primary players | Tech industry workers (semiconductors, electronics, displays, etc.) who get the jargon and the jokes |
| Secondary players | General players curious about what engineers actually do; students about to enter the industry |
| Platform | Web browser, with a PC build possible later |
| Document languages | Chinese and English |

## 3. Design pillars

1. **It feels like the real job:** walk into the fab, suit up, pass the air shower, and open a tool's screen by walking up to it.
2. **Solve it with evidence:** clues come from SPC, FDC logs, consumable life, and wafer maps. No guessing.
3. **See through the tactics:** manipulation is the enemy's move set. Recognizing it, recording it, and setting boundaries are the player's weapons.
4. **Insider humor:** make people laugh through recognition, never lecture.

## 4. Visual style (locked)

- Black pixel RPG, top-down view, with free movement.
- UI: black pixel windows with white borders.
- Scenes use a dark night-shift palette: black tools covered in blinking LED dots and running light strips, and the floor glows red during an alarm.
- Each tool type opens its own screen. The FDC log uses an amber CRT terminal look.
- Locked prototype: [mockups/rpg-fab.html](../mockups/rpg-fab.html).

## 5. Core loop

```
Shift starts
  → Event (alarm, OOC, message from the manager)
  → Move through the fab to investigate (open tool UIs, ask people)
  → Collect clues
  → Submit a conclusion
  → Outcome: yield, throughput, and how people treat you
  → Next shift
```

A story layer runs alongside:

```
Manipulation event → Recognize it (Codex card) → Respond (swallow / clarify / set a boundary / talk to someone) → Sanity and relationships change
```

## 6. Three role lines

| Role | Gameplay | Place in the story |
|---|---|---|
| Process engineer, PE (protagonist) | Log Detective: reasoning over SPC, FDC, wafer maps, and consumables | Throughout |
| Equipment engineer, EE (Bear) | Tool Down!: alarms, manuals, parts swaps, recovery | Guest in Chapter 3 |
| Install engineer (Mia) | Hand-Over Countdown: move-in, sub-fab piping puzzles, power-up, SAT | Guest in Chapter 5 |

## 7. Systems

| System | Description | Prototype status |
|---|---|---|
| Movement and interaction | Keyboard, click-to-move pathfinding, touch D-pad | ✅ Done |
| Cleanroom suit and air shower | You can't enter the fab without suiting up | ✅ Done |
| Tool UI | Status, FDC log, consumables, wafer map, SPC | ✅ ETCH-07, MET-02, PE workstation |
| Clue book | Click suspicious data to record it | ✅ Done |
| Conclusion | Fill-in-the-blank root cause | ✅ Done |
| Coffee | Short-term stamina | ✅ Done |
| Sanity | Drained by manipulation, restored by recognition and allies | 🔲 To do |
| Tactic Recognition / Codex | 13 cards; a correct tag reduces damage and unlocks an explanation | 🔲 To do |
| Evidence Log | Timestamped records used in confrontations and complaints | 🔲 To do |
| Relationships | Trust per NPC, affects endings | 🔲 To do |
| Asking system | Ask the right person, the right way | 🔲 To do |

## 8. Sample level: Case 03

- **Setup:** night shift, 02:47. SPC has auto-held lot N9K417.1. ETCH-step AEI CD (edge) is 47.4 nm, above the UCL of 46.5.
- **Clues:**
  - Every OOC point on the SPC chart comes from ETCH-07 PM-B.
  - FDC shows RF reflected power climbing to 38 W.
  - The consumables page shows the focus ring at 1,180 h of a 1,200 h life.
  - The wafer map shows a ring of high CD around the edge.
  - Kevin lets slip that the PM was postponed.
- **Red herrings:** the recipe is unchanged, chamber pressure is normal, He flow is normal, and ETCH-05 works as a control.
- **Answer:** ETCH-07 / PM-B / focus ring at end of life. You need at least 3 clues to convince Manager Wang.
- In the story this is Chapter 2, followed by the "credit stolen at the stand-up" event.

## 9. Story summary

New process engineer Jing Lin (renamable) spends a first year at Fab 9. It starts on day one with "If you don't know, go ask" and "You need to ask about *this*?", then runs through credit stealing, gaslighting, triangulation, empty promises, and emotional blackmail. At the end, when it's your turn to mentor a new hire, you choose whether to pass it all down. There are 5 endings, including one hidden ending.

Full details in [02-story.en.md](02-story.en.md).

## 10. Tone and sensitive-topic guidelines

- Manipulation only appears as something to recognize and push back on. "The Cycle" route is a bad ending.
- The manager is part of the system, not a pure villain.
- The Codex gives accurate information and healthy responses. The game includes help resources, verified per region before release.
- The company and every character are fictional. Avoid anything that points to a real company or person.
- Before release, have industry insiders review the process details and mental-health or labor professionals review the Codex.

## 11. Scope options (decided: start with A)

| Option | Contents | Good for |
|---|---|---|
| A · Minimum | Prologue + Chapter 2 (Case 03), PE only | Fastest complete slice; validates gameplay and tone |
| B · Medium | Prologue + Chapters 1–3, with the EE guest role | Validates switching between roles |
| C · Full first year | Prologue + Chapters 1–7, three roles, 5 endings | Full release |

**Recommendation:** start with A. The prototype already has Case 03. Adding the prologue and the story systems turns it into a complete, testable slice.

## 12. Open questions

> These have been decided in section 0 of [03-spec.en.md](03-spec.en.md). The original questions are kept here for the record.

1. Should the first version be A, B, or C?
2. Should the game itself support switching between Chinese and English? (Right now only the documents are bilingual.)
3. Should players be able to customize the protagonist's name and look?
4. When sanity hits zero, go straight to the ending, or offer one chance to take leave and rest?
5. Who will verify the process details?
6. How realistic should the dialogue be? Should insider friends contribute real lines they've heard (anonymized)?
