# M&M Rules Conversion Plan

## Goal
Rebuild M&M: RPG around the user's Monsters & Memories rules and an original fantasy world. Preserve local/offline play, mobile usability, and all existing saves. An original fantasy-MMO interface redesign proceeds alongside the rules conversion.

## Current implementation
- The interface uses original Night Harbor harbor-at-dusk art, a wide parchment character-creation desk, compact score rows, and squared iron, wood, and bronze surfaces. It uses original art rather than M&M game assets.
- The character creator uses the seven in-game M&M stats: Strength, Stamina, Dexterity, Agility, Intelligence, Wisdom, and Charisma.
- Starting totals update as race and class change: 10 base + the corresponding racial and class modifiers supplied by the user. This is a deliberate M&M: RPG rebalance, not exact M&M score-scale parity.
- Deep Dwarf, High Elf, and Troll retain provisional modifiers for saved-profile compatibility but are excluded from new character creation until their actual in-game stat lines are supplied. Var'nai remains readable in old profiles but is also not offered for new creation.
- Deep Gnome Bard is included per the latest official patch note.
- New M&M profiles save the seven-stat starting sheet and both modifier vectors without changing legacy saves. Character creation grants no extra stat points; a later allocation system depends on combat tuning.
- Race-specific starting homes are assigned at character creation: Human, Halfling, Gnome, and Dwarf start in Night Harbor; Deep Gnome, Deep Elf, Goblin, and Ogre start in the Underdocks; Wood Elves start in Penshaw, Keeper's Blight. Existing Deep Dwarf, High Elf, and Troll profiles use the accepted Night Harbor fallback, but these races are excluded from new creation until actual in-game stats are supplied. The World view makes Night Harbor playable, links the Underdocks by lift, and lets every race sail from Twilight Harbor in the Shaded Dunes to Penshaw. Travel is saved separately from story progress, and old unstarted origin saves migrate to their race's home while active stories are preserved.
- Each selectable race has a distinct, lore-matched custom story feature in Chapter One. Human can retry an investigation through a different approach; the other races use varied clue, route, crafting, control, ward, flanking, stealth, assault, parley, survival, or hidden-route effects. They are limited to once per chapter, use no racial stat modifier, and are labeled as M&M: RPG rules rather than official M&M racial abilities.
- A dedicated offline M&M story module provides one complete original chapter with exploration checks, a branching encounter, safe retreat, a saved journal, and a completion state. Its d20 checks and Resolve/Pressure encounter are custom M&M: RPG rules. The documented M&M Systems views now record the Q auto-attack toggle, ten action slots, ability pages/spellbook requirements, group XP eligibility, the Rested bank and 15% bonus, documented starting items and container slots, and corpse recovery windows. No official attack resolution, XP thresholds/rewards, item catalog, or encumbrance formula is invented.
- The optional AI Chronicle generates original scenes and three stat-based choices through Gemini, resolves custom d20 story checks locally, retains a per-character story journal, and saves into the same adventure record. Its output cannot change character mechanics or grant official rewards. A working AI Chronicle requires the Production Cloudflare Pages `GEMINI_API_KEY` and `AI_ACCESS_CODE` secrets; the fixed Chapter One and documented system views remain available offline.

## Readiness audit (2026-11-13)

**The M&M version now has a playable first-chapter vertical slice, but it is not yet a full RPG.** M&M characters enter a dedicated, offline story screen. Legacy Warcraft campaign startup is explicitly disabled for them.

| System | Current state |
| --- | --- |
| Race/class creation and starting stats | Connected to the M&M creator. User-provided modifiers update all seven totals from a base of 10. Deep Dwarf, High Elf, and Troll are excluded from new character creation pending their actual in-game stat lines; Var'nai remains unavailable without a stat line. |
| Character record and roster | M&M stats remain separate from legacy profiles. Adventure progress is stored under `soa-mnm-adventure-v1`, included in character switching and archive backup, and initialized independently per character. |
| M&M setting and origins | Race-specific starts place characters in Night Harbor, the Underdocks, or Penshaw. A playable World view connects the Underdocks to Night Harbor by lift and Night Harbor's Twilight Harbor to Penshaw by boat for all races. Travel location is saved independently; unstarted older saves migrate to the race start while active stories are preserved. |
| Quest and exploration | One complete original quest, **The Quiet Signal at Dune Gate**, has an investigation branch. Checks are driven by the seven M&M starting stats; failed checks still advance the story. Choices and results appear in the local Journey Log. |
| AI-generated story | Optional Chronicle mode generates a fresh M&M-inspired chapter, three actionable choices per scene, and a local d20 story outcome. The story is saved with the active character; generated scenes cannot grant XP, levels, gear, abilities, currency, or location changes. |
| Encounter | One repeatable-until-resolved story encounter uses custom Resolve/Pressure counters, safe retreat, and a no-death fallback. It is explicitly labeled as a M&M: RPG narrative rule, not official M&M combat. |
| Combat rules surface | The M&M Combat view records Q auto-attack state, shows Archer/Ranger ranged-auto rules, the 10-slot bar, skill/innate/spell pages, and spellbook gates. The text chapter has no target, weapons, enemy data, or official damage/defense formulas, so no attacks resolve. |
| Level and XP rules surface | The M&M Progress view caps profiles at level 60, calculates the documented group-XP eligibility rule, and records Rested time at 10 minutes banked per minute at a fire/inn, up to 20 minutes, with the documented 15% XP bonus. It does not award XP or calculate level progress because award values and thresholds are unpublished. |
| Item rules surface | The M&M Items view starts with the guide-documented class guild note and Trainee's Candle, provides the 1 backpack / 3 bag / 3 belt layout, candle toggle, weight limitations, and corpse-expiry rules. Unlisted class scrolls, item catalog, weights, bag restrictions, and carry formula remain unconfigured. System state is included in per-character saves and archive restore. |
| Class and racial abilities | No official M&M ability catalog is available in the project. The systems view enforces the documented scribe, memorized-slot, and spellbook conditions when verified ability records are supplied; the current bar and book pages are empty. Chapter One has twelve different once-per-chapter, lore-matched racial effects labeled as original M&M: RPG rules, not official M&M traits. |
| XP, levels, gear, and rewards | The level-60 cap and group XP eligibility are implemented in M&M rules; Rested XP uses the documented 15% bonus and 20-minute bank. The first chapter awards no XP, equipment, or currency, so it remains level 1. No XP curve or item catalog is used. |
| Offline and mobile delivery | The new adventure module and its UI are in the service-worker shell cache. Its save key participates in character switching, backup, restore, and older-backup compatibility. |

## Remaining conversion order
1. **Rules and catalogs** — obtain verified ability/rank tables, XP thresholds and award values, combat formulas, item definitions, weights, bag constraints, and carrying limits. The documented rules surface is in place; these remaining values stay unconfigured.
2. **Character progression** — connect kill, quest, dungeon, campfire, and rested events to official XP awards once their values, thresholds, and rounding behavior are sourced. Keep the level-60 cap. The current creator grants no extra points.
3. **Combat and adventuring** — implement initiative, turns, attacks, defenses, class abilities, checks, retreat, loot, XP, equipment, and branching quests.
4. **Original setting and content** — replace Warcraft setting text with original locations, NPCs, enemies, quests, trainers, and item catalogs.
5. **Save and offline rollout** — maintain legacy save recovery, M&M profile integrity, service worker cache coverage, and mobile behavior.
6. **Visual refinement** — continue the original M&M-inspired interface while gameplay systems are replaced; never present legacy mechanics as M&M.

## Guardrails
- Official M&M class abilities keep exact class prefix, name, rank, source requirements, and learned state.
- Level eligibility does not mean an ability is already known.
- Do not invent stat-allocation caps, class/rank tables, starting details, gear catalogs, or progression curves.
- User-authored/custom racial features must remain labeled as custom; their mechanics apply only in implemented M&M: RPG content and must not be presented as official M&M traits.
- Preserve legacy characters and local saves; never silently reinterpret or erase them.

