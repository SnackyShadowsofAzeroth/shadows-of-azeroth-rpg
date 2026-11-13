# M&M Rules Conversion Plan

## Goal
Rebuild Shadows of Azeroth around the user's Monsters & Memories rules and an original fantasy world. Preserve local/offline play, mobile usability, and all existing saves. A full fantasy-MMO visual redesign proceeds alongside the rules conversion.

## Current implementation
- The character creator uses the seven in-game M&M stats: Strength, Stamina, Dexterity, Agility, Intelligence, Wisdom, and Charisma.
- Starting totals update as race and class change: 16 base + the corresponding racial and class modifiers supplied by the user.
- Troll, High Elf, and Deep Dwarf have logical provisional racial modifiers and are visibly marked provisional. Var'nai remains readable in old profiles but is not offered for new creation because no stat line was supplied.
- Deep Gnome Bard is included per the latest official patch note.
- New M&M profiles save the seven-stat starting sheet and both modifier vectors without changing legacy saves. The displayed totals are before the in-game 10 bonus-point allocation.
- Each selectable race has an original custom racial-feature concept with a short description. It is explicitly design-only and has no active combat/gameplay effect yet.
- M&M campaign, combat, equipment, and progression remain under conversion; the character sheet communicates this.

## Remaining conversion order
1. **Rules and catalogs** — verify ability tables, racial feature mechanics, level tables, items, equipment, and progression from established references.
2. **Character progression** — implement the in-game 10-point allocation and its race/class stat caps once the exact cap rules are sourced.
3. **Combat and adventuring** — implement initiative, turns, attacks, defenses, class abilities, checks, retreat, loot, XP, equipment, and branching quests.
4. **Original setting and content** — replace Warcraft setting text with original locations, NPCs, enemies, quests, trainers, and item catalogs.
5. **Save and offline rollout** — maintain legacy save recovery, M&M profile integrity, service worker cache coverage, and mobile behavior.
6. **Visual refinement** — continue the full UI conversion while gameplay systems are replaced; never present legacy mechanics as M&M.

## Guardrails
- Official M&M class abilities keep exact class prefix, name, rank, source requirements, and learned state.
- Level eligibility does not mean an ability is already known.
- Do not invent stat-allocation caps, class/rank tables, starting details, gear catalogs, or progression curves.
- User-authored/custom racial features must be identified as custom and design-only until implemented.
- Preserve legacy characters and local saves; never silently reinterpret or erase them.
