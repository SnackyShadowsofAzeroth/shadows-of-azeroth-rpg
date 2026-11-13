# M&M Rules Conversion Plan

## Goal
Rebuild Shadows of Azeroth as a turn-based RPG grounded in the user's Monsters & Memories RPG rules. Remove Warcraft-derived lore, races, places, spells, abilities, and terminology from the converted game. Preserve the existing web delivery, local/offline play, and polished mobile interface during the rules conversion. The visual redesign to match the chunky, faceted Monsters & Memories look is a later phase, after the rules and game content are settled.

## Conversion order

1. **Rules core and source catalogs** — establish the six ability scores, d20 checks, race/class identities, source-aware ability requirements, learned-versus-eligible ability state, and shared rule interfaces. Keep this isolated from the current runtime until it can be adopted safely.
2. **Character creation and progression** — use the M&M race and class lists; support backgrounds, ability allocation, level, traits, starting details, trainers, scrolls, and explicit learned abilities. Keep ability offerings class-, level-, equipment-, target-, reagent-, and resource-gated.
3. **Combat and adventuring loop** — implement initiative/turn order, attacks, defenses, class abilities, items, custom actions, checks, retreat, loot, XP, equipment, and branching quests. Preserve one consequential exchange at a time and transparent state changes.
4. **Content replacement** — replace Warcraft setting text and content with original M&M-based locations, NPCs, enemies, quests, trainers, and item catalogs. Preserve only original or user-created material that is not Warcraft-derived.
5. **Save compatibility and offline rollout** — keep existing saves recoverable and distinguish legacy Warcraft saves from new M&M characters. Do not silently reinterpret or erase existing local data.
6. **Visual redesign** — the user has directed this to proceed in parallel with the rules/content conversion. Apply the chunky, faceted, classic-fantasy visual direction in `public/mnm-ui.css`; keep this style-only pass separate from the new rules and preserve saves.

## Current foundation

- `public/mnm-rules.js` is an isolated, data-only rules module. It defines the M&M race and class identifiers, six ability scores and modifiers, d20 check resolution, character normalization, and source-aware class ability eligibility checks.
- The new module now loads with the game and is included in the offline service-worker cache. It does not yet change character creation, gameplay, the interface, or existing saves.
- Official M&M abilities must keep their exact class prefix/name/rank and source requirements. Chat-RPG additions such as Sneak Attack, Cunning Action, and Read the Opening must be marked as custom rather than presented as official class abilities.
- A class level marks an ability as eligible to learn; it does not mean the character already knows it. Trainers and scrolls can add it to the learned list.
- Race-specific bonuses, full class/rank tables, equipment catalogs, and precise progression curves must be populated from the user's established RPG reference and current class data before integration. Do not guess missing values.
