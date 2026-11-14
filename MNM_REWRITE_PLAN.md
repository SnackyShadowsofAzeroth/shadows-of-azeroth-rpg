# M&M Rules Conversion Plan

## Goal
Build M&M: RPG as an offline-first, mobile fantasy RPG inspired by Monsters & Memories, while preserving the original game and all existing saves. Confirmed M&M rules and original house rules must remain clearly distinguished. Use original art and interface work rather than M&M game assets.

## Current implementation
- Character creation uses the seven M&M stats and the user-provided race/class bonuses, starting at 10 plus the selected modifiers. Deep Dwarf, High Elf, and Troll remain unavailable for new characters until their in-game stat lines are supplied; Var'nai is retained only for older profiles.
- New M&M characters can be Female or Male. Character records save the seven scores and modifier vectors without changing legacy profiles.
- Humans, Halflings, Gnomes, and Dwarves begin in Night Harbor. Deep Gnomes, Deep Elves, Goblins, and Ogres begin in the Underdocks. Wood Elves begin in Penshaw, Keeper's Blight. The lift connects the Underdocks with Night Harbor; every race can sail between Night Harbor's Twilight Harbor and Penshaw.
- The dedicated M&M interface uses original Night Harbor art, parchment, wood, iron, and bronze details. It does not use M&M game assets.
- The fixed offline chapter, The Quiet Signal at Dune Gate, has exploration, branching encounters, race-specific custom story features, retreat, a local journal, and a player-claimed 100 custom XP completion reward.
- The optional AI Chronicle uses Gemini to generate original scenes and three choices at a time. Checks resolve locally with custom d20 rules. Players may claim 90 custom XP after a chapter. The AI cannot alter the character sheet or issue items, currency, abilities, travel, or rewards. Live generation depends on Cloudflare GEMINI_API_KEY and AI_ACCESS_CODE.
- Combat is playable with regional custom foes, repeated Q auto-attacks, class techniques, Focus, guard, consumables, escape checks, death, bind-point return, and location-aware corpse recovery. Victory awards custom XP, custom coppers, and randomized project loot.
- Progress is playable with a custom level curve, player-claimed chapter rewards, level-based Health and Focus growth, settlement rest, and the documented group-XP eligibility display. The 60-level cap and 15% Rested XP bonus are source-backed; custom thresholds and award values are not official.
- Items include an original starter kit, an equipped weapon and armor slot, consumables, custom weights and carry capacity, a Night Harbor market, discard/sell actions, and custom loot. The UI also retains guide-backed guild-note, candle, belt/bag, spellbook, and corpse information.
- All custom combat, progression, ability, item, and racial values are labeled as M&M: RPG house rules. They must not be described as official M&M formulas or catalog entries.
- M&M saves are separate from legacy saves and included in character switching, archive backup/restore, and service-worker caching.

## Readiness audit (2026-11-13)

**The M&M mode now has a playable custom-rule RPG loop and an optional AI-generated narrative mode. It is not an official-rule-accurate combat, progression, or item conversion because M&M has not published all required numeric tables.**

| System | Current state |
| --- | --- |
| Race/class creation and starting stats | Connected to the M&M creator using user-supplied modifiers. Unsupported provisional races stay excluded from new creation. |
| Character, roster, and saves | Seven-stat M&M profiles and separate adventure/system saves participate in switching and archive backup/restore. Legacy saves remain isolated. |
| Setting and travel | Race-specific starts are implemented with playable Night Harbor, Underdocks lift, and all-race boat travel to Penshaw. |
| Fixed story | One original offline chapter uses local custom checks, distinct custom racial story features, saved outcomes, and a one-time 100 custom XP reward. |
| AI-generated story | Gemini generates original chapters and choices; local checks determine outcomes. A completed AI chapter offers a one-time 90 custom XP claim. Requires the production API key and separate access code. |
| Combat | Turn-based custom combat works with foes, auto-attacks, class techniques, Focus, guard, consumables, flee, loot, XP, defeat, bind-point return, and corpse recovery. Its numbers are original. |
| Level and XP | Custom XP, levels, character record, and roster values are connected. The official level cap, group eligibility, and Rested bonus remain distinct from the house-rule curve and award values. |
| Items | Custom gear, equipment, consumables, prices, coppers, market, carry limit, and loot are playable. Official weight formulas and full item catalog remain unknown. |
| Abilities | Custom class techniques are separate from official abilities. Official scroll names, ranks, and learning data still require verified references. |
| Offline and mobile delivery | Gameplay scripts are cached by the service worker. Cache version is v142. Save integrity and migration tests are required for changes to these systems. |

## Remaining work
1. Replace custom values with sourced official combat, XP, ability, item, weight, and carrying data only when reliable in-game references are available.
2. Expand the original world with quests, settlements, enemies, trainers, item variety, and longer campaign arcs.
3. Verify live Gemini generation with correctly configured Cloudflare secrets; retain a useful offline path when the service is unavailable.
4. Continue mobile, accessibility, save migration, archive recovery, and offline-cache validation.
5. Keep original art and M&M-inspired interface work aligned with the setting, without using M&M assets.

## Guardrails
- Never present invented values as official M&M facts. The user authorized clearly labeled custom combat, leveling, and item rules on 2026-11-13.
- Official M&M class abilities keep their correct class prefix, name, rank, source, and learned state.
- Level eligibility does not mean an ability is known.
- Keep custom racial features and class techniques labeled as original game rules.
- Preserve legacy profiles and local saves. Never silently reinterpret or erase them.
