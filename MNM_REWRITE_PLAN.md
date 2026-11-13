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
- Each selectable race has an original custom racial-feature concept with a short description. It is explicitly design-only and has no active combat/gameplay effect yet.
- M&M campaign, combat, equipment, and progression remain under conversion; the character sheet communicates this.

## Readiness audit (2026-11-13)

**The M&M version is not yet a playable full RPG.** Character creation works, but new M&M characters are deliberately routed to a character-record screen while the former Warcraft campaign screens are hidden.

| System | Current state |
| --- | --- |
| Race/class creation and restrictions | Connected to the M&M creator. User-provided stat modifiers update all seven displayed starting totals. Troll, High Elf, and Deep Dwarf remain provisional; Var'nai creation is unavailable without a stat line. |
| Character records and local roster | M&M profile and starting stats are saved separately from legacy character profiles. There is no M&M adventure save model yet. |
| M&M setting, starting location, NPCs, and quests | Not playable. No M&M opening adventure or quest path is wired to the character screen. |
| Checks and ability use | A d20 helper and eligibility checks exist in `mnm-rules.js`, but the campaign does not call them. No official M&M ability catalog is connected. |
| Combat | No M&M initiative, attacks, defenses, resources, encounter resolution, or retreat flow. The existing combat engine is legacy rules and is hidden for M&M characters. |
| Leveling, learning, and progression | M&M characters start at level 1. There is no M&M XP curve, level table, trainer flow, ability learning, or advancement loop. |
| Inventory and rewards | M&M profiles start with empty equipment and currency. No M&M item catalog, loot, vendors, or equipment rules are connected. |
| Racial features | Race feature concepts are shown as custom design drafts only; none has a gameplay effect. |
| Offline and mobile delivery | The app shell supports offline/mobile delivery for existing content. An eventual M&M adventure module must be added to the service-worker cache and save-slot/backup flow. |

Treat the current live M&M experience as a **character creator and record prototype**, not a full RPG. Legacy characters still use the older Warcraft-inspired game; they are not evidence that M&M gameplay is complete.

## Remaining conversion order
1. **Rules and catalogs** — verify ability tables, racial feature mechanics, level tables, items, equipment, and progression from established references.
2. **Character progression** — after level-one combat and derived-stat effects are tuned, decide whether to add a Shadows of Azeroth allocation budget and define caps from those mechanics; the current creator grants no extra points.
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
