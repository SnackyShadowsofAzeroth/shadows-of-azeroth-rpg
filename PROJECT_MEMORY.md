# Project Memory

Read this file before changing project code, content, configuration, or deployment settings. Query graphify-out/graph.json for the relevant systems before source searches or reads. Treat inferred edges as hypotheses and confirm behavior in source. After code changes, refresh the graph and report; update this memory when durable decisions or architecture change.

## Product and architecture

- M&M: RPG is an offline-first mobile web RPG delivered through Cloudflare Pages. Client files live in public/; Pages API handlers live in functions/api/; worker.mjs adapts those handlers for local/Workers preview; public/sw.js controls offline asset caching. Never put deployment secrets in the repository.
- Legacy profiles retain the original Warcraft-inspired game flow and local saves. M&M profiles use a separate seven-stat creator, race-specific starts, world travel, a fixed offline story, optional AI Chronicle, and character-bound system saves. Keep these systems isolated.
- Read CAMPAIGN_BIBLE.md for campaign and quality standards, DEVELOPMENT_HANDOFF.md for implementation history, and MNM_REWRITE_PLAN.md for conversion scope.
- M&M race descriptions and eligibility come from MNM_RACE_LORE.md, with Deep Gnome Bard updated from the later official patch note.

## M&M character rules

- public/mnm-rules.js defines STR, STA, DEX, AGI, INT, WIS, CHA, the user-supplied race/class modifiers, d20 checks, character normalization, and the level-60 cap.
- The M&M creator starts scores at 10 plus selected race and class modifiers. It grants no extra allocation points. This is an intentional M&M: RPG rebalance, not official score-scale parity.
- New character creation offers Female and Male. Existing saved gender values are preserved.
- The user supplied stat lines for the playable races and classes. Deep Dwarf, High Elf, and Troll use inferred provisional values only for older-profile compatibility; keep them excluded from new character creation until their in-game stat lines are supplied. Var'nai remains available only to old profiles because no stat line was supplied.
- Starting homes: Human, Halfling, Gnome, Dwarf → Night Harbor; Deep Gnome, Deep Elf, Goblin, Ogre → the Underdocks; Wood Elf → Penshaw in Keeper's Blight. The Underdocks lift links to Night Harbor. All races can sail from Twilight Harbor in Night Harbor to Penshaw. Existing Deep Dwarf, High Elf, and Troll profiles use Night Harbor fallback.
- Racial features and class techniques are original project abilities. Keep them lore-aware and clearly labeled as custom; do not call them official M&M abilities.

## Playable custom rules and official facts

- On 2026-11-13 the user explicitly authorized clearly labeled original custom combat, leveling, and item rules when official formulas or catalogs are unavailable. Confirmed M&M facts and project house rules must remain clearly separate.
- public/mnm-systems.js now provides a local playable loop: auto-attacks repeat while the Combat view is open; class techniques spend Focus; foes are selected from regional custom tables; victory awards custom XP, coppers, and random loot; levels improve Health and Focus; the player can claim one-time rewards for completed fixed or AI chapters; items can be equipped, used, sold, bought, or discarded; carry limits, safe rests, and location-aware corpse recovery are custom.
- All combat math, foe values, custom item definitions and weights, prices, carry limits, XP thresholds and rewards, healing amounts, rest healing, and custom racial/class mechanics are original M&M: RPG house rules. Do not present them as official M&M values.
- Official guide-backed mechanics remain source-linked: Q toggles auto-attack; learned/memorized abilities use ten slots and page/spellbook rules; group XP has documented eligibility constraints; Rested XP has a 15% bonus and a 20-minute bank; the guide documents a guild note, candle, bag/belt slots, corpse recovery, and weight-based encumbrance. Some exact official rates and formulas remain unpublished.
- Official class abilities must preserve class prefix, name, rank, source, and learned requirements. The custom class technique is separate from the empty/unprovided official ability catalog.
- The level-60 cap is documented, but this project uses an original XP curve. Custom chapters give player-claimed custom XP; AI cannot alter a character sheet or reward state. The fixed Chapter One story, checks, and encounter are original project content.
- The official M&M New Player Guide is at monstersandmemories.com/new-player-guide. Official XP and weight FAQs are at account2.monstersandmemories.com/community/faqs/15 and /45. The Miraheze wiki was unavailable to the prior request (HTTP 403); do not claim its pages were reviewed unless accessible.

## Save, AI, and offline behavior

- M&M profiles receive a road-worn weapon, patched travel coat, two healing poultices, two waybread, and 24 custom coppers. They do not receive legacy faction, professions, legacy equipment, or legacy currency.
- The adventure, world travel, AI Chronicle, and journal use soa-mnm-adventure-v1; official-rule and custom RPG system state uses soa-mnm-systems-v1. Both keys participate in character switching, archive backup/restore, and local saves.
- public/mnm-ai-chronicle.js generates original scenes and three choices per scene through Gemini; local d20 checks resolve outcomes. The AI API cannot edit game state. Live generation requires Cloudflare GEMINI_API_KEY and AI_ACCESS_CODE secrets. Never commit or print these secrets.
- public/sw.js cache version must be incremented when cached gameplay files change. The current source version is v142.
- Preserve legacy characters and saves; never silently reinterpret, reset, or erase local data.

## Graphify workflow

- This project has a Graphify skill at .codex/skills/graphify/ and checked-in navigation files under graphify-out/.
- When graphify-out/graph.json exists, run graphify query before codebase source searches, graphify path for relationships, and graphify explain for a focused concept. If graphify-out/wiki/index.md exists, use it for broad navigation. Read GRAPH_REPORT.md only for broad architecture review or when narrower queries are insufficient.
- After code changes run graphify update . so graphify-out/graph.json and GRAPH_REPORT.md reflect the source.
- Graphify refresh was attempted on 2026-11-13 but could not run because graphify, uv, and a working Python interpreter were unavailable in this environment. The checked-in graph was built at commit 81fc81b and is stale relative to the current branch; refresh it before the next code edit.
- The M&M creator treats an omitted race selectable flag as available and explicitly rejects only selectable:false. Mount the adventure after character section organization so startup cannot race the character layout.
