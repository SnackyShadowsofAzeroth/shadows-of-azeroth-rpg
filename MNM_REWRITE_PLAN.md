# M&M Rules Conversion Plan

## Goal
Build M&M: RPG as an offline-first, mobile fantasy RPG inspired by Monsters & Memories, while preserving the original game and all existing saves. Confirmed M&M rules and original house rules must remain clearly distinguished. Use original art and interface work rather than M&M game assets.

## Current implementation
- Character creation uses the seven M&M stats and the user-provided race/class bonuses, starting at 10 plus the selected modifiers. Deep Dwarf, High Elf, and Troll remain unavailable for new characters until their in-game stat lines are supplied; Var'nai is retained only for older profiles.
- New M&M characters can be Female or Male. Character records save the seven scores and modifier vectors without changing legacy profiles.
- Humans, Halflings, Gnomes, and Dwarves begin in Night Harbor. Deep Gnomes, Deep Elves, Goblins, and Ogres begin in the Underdocks. Wood Elves begin in Penshaw, Keepers Bight, as a custom M&M: RPG start assignment. The lift connects the Underdocks with Night Harbor; every race can sail between Night Harbor's Twilight Harbor and Penshaw.
- The dedicated M&M interface uses original Night Harbor art, parchment, wood, iron, and bronze details. It does not use M&M game assets.
- The Arena tab replaces the fixed offline chapter. A character must physically travel from the World tab to the arena in their current city before entering a bout. Arena bouts use shared turn-based combat and the current region's custom encounter table; standard custom encounter rewards apply. The per-character adventure save records the current site and arena record. This is an original M&M: RPG activity, not an official M&M arena system.
- The Adventure view now supports two saved campaign paths. The AI Chronicle uses Gemini to write connected scenes with three distinct choices plus a player-written action. Its chapter summaries, open threads, recent decisions, combat outcomes, learned official abilities, and current Health/Focus guide continuity. The chosen action and d20 result are saved before an AI call, so retries cannot reroll; if generation fails, the same action can be resolved locally. The local campaign selects authored arcs for supported regions and uses location-aware waystation/road stories for new regions. It resolves four d20 choices with successes, setbacks, a chapter outcome, journal entries, and optional 90 custom XP. It works without credentials or a network connection. AI-generated scenes still require Cloudflare GEMINI_API_KEY and AI_ACCESS_CODE. The AI cannot alter character stats, items, currency, abilities, travel, combat results, or rewards.
- Combat is a deliberate turn-based loop with regional custom foes and telegraphed enemy intent. Strike, Feint, Guard, verified memorized abilities where a custom resolution exists, consumables, escape, defeat, bind-point return, and location-aware corpse recovery share one action resolver. Each chosen action advances one round; there is no timer-driven auto-attack. Victory awards custom XP, four-denomination project coin, and randomized project loot. The AI Chronicle receives the latest resolved combat ledger to carry its consequences into the next scene.
- Progress is playable with a custom level curve, player-claimed chapter rewards, level-based Health and Focus growth, settlement rest, and the documented group-XP eligibility display. The 60-level cap and 15% Rested XP bonus are source-backed; custom thresholds and award values are not official.
- Items include an original starter kit, an equipped weapon and armor slot, consumables, custom weights and carry capacity, a Night Harbor market, discard/sell actions, and custom loot. The UI also retains guide-backed guild-note, candle, belt/bag, spellbook, and corpse information.
- All custom combat, progression, ability, item, and racial values are labeled as M&M: RPG house rules. They must not be described as official M&M formulas or catalog entries.
- The character roster contains M&M profiles only. M&M saves remain character-bound across switching and M&M archive backup/restore; old default characters are never recreated on an empty roster.

## Readiness audit (2026-11-13)

**The M&M mode now has a playable custom-rule RPG loop with city travel, Arena combat, a persistent local story path, and an optional AI-generated Chronicle. It is not an official-rule-accurate combat, progression, or item conversion because M&M has not published all required numeric tables.**

| System | Current state |
| --- | --- |
| Race/class creation and starting stats | Connected to the M&M creator using user-supplied modifiers. Unsupported provisional races stay excluded from new creation. |
| Character, roster, and saves | M&M profiles and separate adventure/system saves participate in switching and M&M archive backup/restore. The selector and archive importer exclude non-M&M profiles. |
| Setting and travel | Race-specific starts are implemented with playable Night Harbor, Underdocks lift, and all-race boat travel to Penshaw. |
| City Arena | The Arena tab requires travel to the arena in the current city through World; it uses shared turn-based combat, regional custom encounters, standard custom rewards, and a character-bound bout record. |
| Campaign story | AI scenes use Gemini and carry chapter summaries, open threads, choices, combat outcomes, learned abilities, and current resources forward. Local chapters provide region-specific original arcs and four saved d20 choices with success/setback branches. Failed AI requests preserve the exact action and roll for local resolution. Optional XP never blocks continuing. AI generation requires the production API key and separate access code. |
| Combat | Turn-based custom combat uses visible foe intent, one manual action per round, Strike, Feint, Guard, verified memorized abilities where supported, Focus, consumables, flee, loot, XP, defeat, bind-point return, and corpse recovery. Its combat math is original. The AI Chronicle receives the resolved combat ledger. |
| Level and XP | Custom XP, levels, character record, and roster values are connected. The official level cap, group eligibility, and Rested bonus remain distinct from the house-rule curve and award values. |
| Items | Custom gear, equipment, consumables, prices, four coin denominations with 100:1 conversion, market, carry limit, and loot are playable. Official weight formulas and full item catalog remain unknown. |
| Abilities | Only source-linked official class ability records may be shown as class abilities. Rogue Backstab and Archer Point Blank are verified starter records; add other class abilities only when their names, ranks, and learning requirements are verified. |
| Offline and mobile delivery | Gameplay scripts are cached by the service worker. Cache version is v168. Local story, travel, combat, Arena, inventory, and character saves work without AI generation. Save integrity and migration checks remain required for changes to these systems. |

## Remaining work
1. Replace custom values with sourced official combat, XP, ability, item, weight, and carrying data only when reliable in-game references are available. Preserve the manual telegraphed turn loop unless the user supplies a different combat design.
2. Expand the original world with quests, settlements, enemies, trainers, item variety, and longer campaign arcs.
3. Verify live Gemini generation with correctly configured Cloudflare secrets; retain a useful offline path when the service is unavailable.
4. Continue mobile, accessibility, save migration, archive recovery, and offline-cache validation.
5. Keep original art and M&M-inspired interface work aligned with the setting, without using M&M assets.

## Guardrails
- Never present invented values as official M&M facts. The user authorized clearly labeled custom combat, leveling, and item rules on 2026-11-13.
- Official M&M class abilities keep their correct class prefix, name, rank, source, and learned state.
- Level eligibility does not mean an ability is known.
- Keep custom racial features labeled as original game rules. Never invent substitute class techniques for missing official data.
- Preserve existing M&M profiles and local saves during roster cleanup. Do not recreate a deleted legacy profile or restore non-M&M profiles into the M&M roster.

