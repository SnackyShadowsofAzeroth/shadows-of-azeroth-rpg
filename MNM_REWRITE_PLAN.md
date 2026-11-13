# M&M Rules Conversion Plan

## Goal
Rebuild Shadows of Azeroth around the user's Monsters & Memories rules and an original fantasy world. Preserve local/offline play, mobile usability, and all existing saves. An original fantasy-MMO interface redesign proceeds alongside the rules conversion.

## Current implementation
- The full interface uses an original frontier landscape, a wide parchment character-creation desk, compact score rows, and squared iron, wood, and bronze surfaces. It uses original art rather than M&M game assets.
- The character creator uses the seven in-game M&M stats: Strength, Stamina, Dexterity, Agility, Intelligence, Wisdom, and Charisma.
- Starting totals update as race and class change: 10 base + the corresponding racial and class modifiers supplied by the user. This is a deliberate Shadows of Azeroth rebalance, not exact M&M score-scale parity.
- Troll, High Elf, and Deep Dwarf have logical provisional racial modifiers and are visibly marked provisional. Var'nai remains readable in old profiles but is not offered for new creation because no stat line was supplied.
- Deep Gnome Bard is included per the latest official patch note.
- New M&M profiles save the seven-stat starting sheet and both modifier vectors without changing legacy saves. Character creation grants no extra stat points; a later allocation system depends on combat tuning.
- Each selectable race has a lore-matched custom story feature. In Chapter One, the matching feature can grant +1 on one eligible story check; Troll's Tempered Survivor triggers after an investigation setback. These are project-specific story effects, not official M&M racial traits.
- A dedicated offline M&M story module provides one complete original chapter with exploration checks, a branching encounter, safe retreat, a saved journal, and a completion state. Its d20 checks and Resolve/Pressure encounter are custom Shadows of Azeroth rules. The documented M&M Systems views now record the Q auto-attack toggle, ten action slots, ability pages/spellbook requirements, group XP eligibility, the Rested bank and 15% bonus, documented starting items and container slots, and corpse recovery windows. No official attack resolution, XP thresholds/rewards, item catalog, or encumbrance formula is invented.

## Readiness audit (2026-11-13)

**The M&M version now has a playable first-chapter vertical slice, but it is not yet a full RPG.** M&M characters enter a dedicated, offline story screen. Legacy Warcraft campaign startup is explicitly disabled for them.

| System | Current state |
| --- | --- |
| Race/class creation and starting stats | Connected to the M&M creator. User-provided modifiers update all seven totals from a base of 10. Troll, High Elf, and Deep Dwarf remain provisional; Var'nai creation is unavailable without a stat line. |
| Character record and roster | M&M stats remain separate from legacy profiles. Adventure progress is stored under `soa-mnm-adventure-v1`, included in character switching and archive backup, and initialized independently per character. |
| M&M setting and origins | Chapter One uses the official Aêthoril/Szuur setting frame and offers Night Harbor, the Underdocks, Faelindral, and Ail'vorith as story origins. The choice is labeled custom because this creator does not model faith/deity restrictions for official starting cities. |
| Quest and exploration | One complete original quest, **The Quiet Signal at Dune Gate**, has an investigation branch. Checks are driven by the seven M&M starting stats; failed checks still advance the story. Choices and results appear in the local Journey Log. |
| Encounter | One repeatable-until-resolved story encounter uses custom Resolve/Pressure counters, safe retreat, and a no-death fallback. It is explicitly labeled as a Shadows of Azeroth narrative rule, not official M&M combat. |
| Combat rules surface | The M&M Combat view records Q auto-attack state, shows Archer/Ranger ranged-auto rules, the 10-slot bar, skill/innate/spell pages, and spellbook gates. The text chapter has no target, weapons, enemy data, or official damage/defense formulas, so no attacks resolve. |
| Level and XP rules surface | The M&M Progress view caps profiles at level 60, calculates the documented group-XP eligibility rule, and records Rested time at 10 minutes banked per minute at a fire/inn, up to 20 minutes, with the documented 15% XP bonus. It does not award XP or calculate level progress because award values and thresholds are unpublished. |
| Item rules surface | The M&M Items view starts with the guide-documented class guild note and Trainee's Candle, provides the 1 backpack / 3 bag / 3 belt layout, candle toggle, weight limitations, and corpse-expiry rules. Unlisted class scrolls, item catalog, weights, bag restrictions, and carry formula remain unconfigured. System state is included in per-character saves and archive restore. |
| Class and racial abilities | No official M&M ability catalog is available in the project. The systems view enforces the documented scribe, memorized-slot, and spellbook conditions when verified ability records are supplied; the current bar and book pages are empty. Lore-matched racial story features have a once-per-chapter +1 effect in the chapter and are labeled custom. |
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
- User-authored/custom racial features must be identified as custom and design-only until implemented.
- Preserve legacy characters and local saves; never silently reinterpret or erase them.
