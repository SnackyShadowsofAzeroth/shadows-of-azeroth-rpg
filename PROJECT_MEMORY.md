# Project Memory

Read this file before changing project code, content, configuration, or deployment settings. Then query `graphify-out/graph.json` for the relevant systems before searching or reading source files. Use the graph to locate relationships, and read the surfaced source sections before editing. If the graph is missing or stale, refresh it first with `graphify update .`; for documentation-only changes, use the installed Graphify skill when a semantic refresh is needed. After code changes, refresh the graph and keep `graphify-out/graph.json` and `GRAPH_REPORT.md` current. Update this memory when a durable project decision or architecture fact changes.

## Product and architecture

- Shadows of Azeroth is an offline-first, mobile web RPG delivered through Cloudflare Pages. Client files live in `public/`; Pages API handlers live in `functions/api/`; `worker.mjs` adapts those handlers for local/Workers preview. `public/sw.js` controls offline asset caching. Never put deployment secrets in the repository.
- The current deployed game and its saves still use the legacy Warcraft-inspired rules and content. Existing systems include character creation/progression, campaign choices, combat, arenas, quests/chronicle, equipment, dungeons, crafting, companions, and local saves. Feature modules and their relationships are indexed in the Graphify graph.
- Read `CAMPAIGN_BIBLE.md` for the campaign and quality standards, `DEVELOPMENT_HANDOFF.md` for accumulated implementation history, and `MNM_REWRITE_PLAN.md` for the agreed conversion order and boundaries.

## Monsters & Memories rewrite status

- The goal is to rebuild the game around the user's Monsters & Memories RPG rules, remove Warcraft-derived setting and terminology from converted content, and preserve offline play and mobile delivery. The visual redesign was initially deferred until rules and content settled; the user has now directed us to apply the M&M-inspired visual system in parallel.
- `public/mnm-rules.js` is loaded but remains an isolated rules foundation. It defines six ability scores, M&M race/class identifiers, d20 checks, character normalization, and source-aware ability eligibility. It does not yet drive character creation, gameplay, or existing saves. Do not describe the rules/content conversion as complete.
- The user-directed visual pass lives in `public/mnm-ui.css`. It applies a faceted classic-fantasy palette and framing across the interface, loads after existing styles, and is part of the offline cache. This is CSS-only; it does not change rules, gameplay, or saves, and it uses no copied M&M art or logos.
- The foundation currently lists 10 races (Human, Dwarf, Elf, Deep Elf, Gnome, Deep Gnome, Halfling, Goblin, Troll, Ogre) and 18 classes (Archer, Bard, Beastmaster, Cleric, Druid, Elementalist, Enchanter, Fighter, Inquisitor, Monk, Necromancer, Paladin, Ranger, Rogue, Shadow Knight, Shaman, Spellblade, Wizard).
- Official class abilities must retain their class prefix, name, rank, and source requirements. Level eligibility is not the same as learning: characters must learn official abilities from a trainer or scroll. Keep custom abilities explicitly identified as custom. Gate use by class, level, learned state, target, equipment, reagents, and Mana as applicable.
- Do not guess missing race bonuses, class/rank tables, item catalogs, or progression curves. Check the user's established M&M reference and current project sources before implementing them. Preserve legacy saves and distinguish legacy characters from new M&M characters; never silently reinterpret or erase local data.
- Conversion order: rules/catalogs → character creation/progression → combat/adventuring loop → original setting/content → save compatibility/offline rollout → visual redesign.

## Graphify workflow

- Graphify is installed as a project-scoped Codex skill under `.codex/skills/graphify/`, with project guidance in `AGENTS.md` and a Codex hook in `.codex/hooks.json`.
- The checked-in graph is the compact navigation index for the codebase. Query it before inspecting code; use `graphify path` and `graphify explain` for focused questions. Treat inferred graph edges as leads and verify them in source.
- Install the CLI with `uv tool install graphifyy` if it is unavailable. The executable is `graphify`.
- The baseline graph contains about 900 nodes across 81 communities and 1,585 edges. Its initial report is at `graphify-out/GRAPH_REPORT.md`; the graph itself is `graphify-out/graph.json`.
