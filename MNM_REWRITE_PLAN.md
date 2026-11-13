# M&M Rules Conversion Plan

## Goal
Rebuild Shadows of Azeroth around the user's Monsters & Memories rules and an original fantasy world. Preserve local/offline play, mobile usability, and all existing saves. A full fantasy-MMO visual redesign proceeds alongside the rules conversion.

## Current implementation
- The character creator offers the 13 current M&M races and all 18 classes, filtered by the published race/class availability matrix.
- New M&M characters record six editable ability scores and derived modifiers. No race bonuses or point-buy rules are assumed.
- M&M profiles validate and save independently of legacy profiles. They receive no Warcraft faction, professions, gear, currency, or Warcraft campaign.
- Existing legacy characters and their local save slots remain supported.
- The M&M screen says campaign, combat, equipment, and progression remain under conversion.
- The interface uses original generated frontier art and a classic-MMO frame/panel treatment; no official M&M art or logo is copied.

## Remaining conversion order
1. **Rules and catalogs** — verify ability scores, checks, source requirements, class abilities, level tables, items, equipment, and progression from established user references. Distinguish official rules from custom additions.
2. **Character progression** — implement backgrounds, level advancement, traits, trainers, scrolls, and learned abilities once source data is available.
3. **Combat and adventuring** — implement initiative, turns, attacks, defenses, class abilities, checks, retreat, loot, XP, equipment, and branching quests.
4. **Original setting and content** — replace Warcraft setting text with original locations, NPCs, enemies, quests, trainers, and item catalogs.
5. **Save and offline rollout** — maintain legacy save recovery, M&M profile integrity, service worker cache coverage, and mobile behavior.
6. **Visual refinement** — continue the full UI conversion while gameplay systems are replaced; never present legacy mechanics as M&M.

## Guardrails
- Official M&M class abilities keep exact class prefix, name, rank, source requirements, and learned state.
- Level eligibility does not mean an ability is already known.
- Race bonuses, class/rank tables, starting details, gear catalogs, and progression curves must come from an established reference. Do not invent them.
- Preserve legacy characters and local saves; never silently reinterpret or erase them.
