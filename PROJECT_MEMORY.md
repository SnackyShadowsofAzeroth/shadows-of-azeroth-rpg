# Project Memory

Read this file before changing project code, content, configuration, or deployment settings. Then query `graphify-out/graph.json` for the relevant systems before searching or reading source files. Use the graph to locate relationships, and read the surfaced source sections before editing. If the graph is missing or stale, refresh it first with `graphify update .`; for documentation-only changes, use the installed Graphify skill when a semantic refresh is needed. After code changes, refresh the graph and keep `graphify-out/graph.json` and `GRAPH_REPORT.md` current. Update this memory when a durable project decision or architecture fact changes.

## Product and architecture

- Shadows of Azeroth is an offline-first, mobile web RPG delivered through Cloudflare Pages. Client files live in `public/`; Pages API handlers live in `functions/api/`; `worker.mjs` adapts those handlers for local/Workers preview. `public/sw.js` controls offline asset caching. Never put deployment secrets in the repository.
- The current deployed game and its saves still use the legacy Warcraft-inspired rules and content. Existing systems include character creation/progression, campaign choices, combat, arenas, quests/chronicle, equipment, dungeons, crafting, companions, and local saves. Feature modules and their relationships are indexed in the Graphify graph.
- Read `CAMPAIGN_BIBLE.md` for the campaign and quality standards, `DEVELOPMENT_HANDOFF.md` for accumulated implementation history, and `MNM_REWRITE_PLAN.md` for the agreed conversion order and boundaries.

- `MNM_RACE_LORE.md` is the canon reference for the official race descriptions and race/class eligibility. Consult it when creating characters, races, or story content. The race page's Deep Gnome class list is superseded by the later official patch adding Bard.

## Monsters & Memories rewrite status

- The goal is to rebuild the game around the user's Monsters & Memories RPG rules, remove Warcraft-derived setting and terminology from converted content, and preserve offline play and mobile delivery. The user directed us to apply an original M&M-inspired visual system in parallel with rules and content work.
- `public/mnm-rules.js` is loaded but remains an isolated rules foundation. It defines the legacy six-score helper plus the seven in-game M&M stats (STR, STA, DEX, AGI, INT, WIS, CHA), race/class modifiers, d20 checks, character normalization, and source-aware ability eligibility. It does not yet drive character creation, gameplay, or existing saves. Do not describe the rules/content conversion as complete.
- The user-directed visual pass lives in `public/mnm-ui.css`. It now uses an original illustrated frontier landscape, a broad parchment character-creation desk, compact score rows, and squared iron, wood, and bronze frames across the game UI. The artwork is original and does not reuse M&M game assets. The creator is connected to M&M race/class availability, seven in-game stats, user-supplied racial/class modifiers, and M&M-aware save validation. Existing legacy characters retain their original flow. M&M campaign and gameplay are not complete; active M&M characters see an explicit conversion status screen.
- The M&M creator displays seven game stats: Strength, Stamina, Dexterity, Agility, Intelligence, Wisdom, and Charisma. Starting totals use a Shadows of Azeroth baseline of 10 plus the selected race and class modifiers. Character creation grants no extra allocation points for now. This is a deliberate balance change from the M&M score scale; the game-play stat effects still need conversion and tuning.
- User supplied the racial and class modifier tables. Troll, High Elf, and Deep Dwarf use explicitly marked provisional modifiers, each kept to the same +2 total racial modifier pattern as the supplied races.
- Var'nai remains recognized for old profiles but is not offered for new creation because no in-game modifier line was supplied. Deep Gnome Bard was added to the class matrix from the current official patch note.
- New M&M character sheets store the seven starting stats, race and class modifiers, and a custom racial-feature concept. Those feature descriptions are marked design-only and are not active gameplay abilities. Their concepts are reviewed against `MNM_RACE_LORE.md` before expansion; each should express the relevant canon theme without flattening every race member into one personality.
- M&M profiles are accepted by roster validation and kept distinct from legacy Warcraft profiles.
- M&M saves deliberately start without faction, profession, currency, equipment, or a Warcraft campaign. The live UI labels campaign/combat/equipment/progression conversion as incomplete. Legacy characters and saves remain available and unchanged.
- Official class abilities must retain their class prefix, name, rank, and source requirements. Level eligibility is not the same as learning: characters must learn official abilities from a trainer or scroll. Keep custom abilities explicitly identified as custom. Gate use by class, level, learned state, target, equipment, reagents, and Mana as applicable.
- Do not guess missing class/rank tables, item catalogs, or progression curves. The user explicitly authorized logical provisional modifiers for Troll, High Elf, and Deep Dwarf; keep those labels visible. Other missing values still require the user's reference. Preserve legacy saves and distinguish legacy characters from new M&M characters; never silently reinterpret or erase local data.
- Conversion order: rules/catalogs → character creation (now connected) → progression and combat/adventuring loop → original setting/content → save compatibility/offline rollout. The original visual redesign proceeds in parallel.

## Graphify workflow

- Graphify is installed as a project-scoped Codex skill under `.codex/skills/graphify/`, with project guidance in `AGENTS.md` and a Codex hook in `.codex/hooks.json`.
- The checked-in graph is the compact navigation index for the codebase. Query it before inspecting code; use `graphify path` and `graphify explain` for focused questions. Treat inferred graph edges as leads and verify them in source.
- Install the CLI with `uv tool install graphifyy` if it is unavailable. The executable is `graphify`.
- The baseline graph contains 908 nodes across 82 communities and 1,591 edges. Its initial report is at `graphify-out/GRAPH_REPORT.md`; the graph itself is `graphify-out/graph.json`.
