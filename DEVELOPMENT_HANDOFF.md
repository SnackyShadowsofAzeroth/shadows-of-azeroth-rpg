# Shadows of Azeroth — Development Handoff
Updated: 2026-10-16

## Repository
GitHub: SnackyShadowsofAzeroth/shadows-of-azeroth-rpg
Cloudflare Pages connects to main. Static files: public/. Server endpoints: functions/api/story.js and functions/api/campaign.js. Google Gemini default: gemini-3.5-flash-lite (Cloudflare environment may override). NEVER commit or print API secrets.

## Game
Offline-first iPhone PWA; Gemini online living campaign; original Snacky Lugnuts save must be preserved. Player decisions resolve deterministically through local JS, Gemini writes validated narrative. Campaign continuity comes from saved game state, NOT ChatGPT conversation context.

## Approved character requirements
- Male/female creation option.
- Valid race/faction/class combinations maintained in public/characters.js.
- New level-1 heroes start in their race's starting zone alone, with 15 silver and modest class starter equipment, never Snacky's late-game gear.
- Distinct primary professions and independent save slots; legacy Snacky campaign retained.
- D&D-inspired six ability scores are already present in public/abilities.js. The original game's HP bars and skill systems still need broader integration testing.
- Hidden special-case for exactly male Gnome Rogue named Snacky Lugnuts with both Mining and Engineering. Do not reveal it in creation UI or apply to other heroes. Current implementation grants a small +1 bluff modifier; this is intentionally modest, though exact reward was not conclusively recovered from the truncated previous chat.

## Confirmed changes this session
public/characters.js updated on main (commit 5862c9b): gender field, basic gear definitions, precise Easter egg check, and initial equipment data in new-character save. The file remains intact, including save-slot and export functions. Source inspections confirm the changes exist, but live iPhone behavior is NOT verified.

## Known limitations / TODO
- Cloudflare production verification and Gemini API live test still needed.
- Review whether the new starting equipment is displayed and used by an actual inventory UI; initial implementation stores equipment in the local save.
- Thoroughly test all race/class combinations and male/female selection, new-character start locations, save switching, progression and Easter egg behavior.
- Do not send empty GitHub file content or overwrite files without first fetching their existing SHA/content.
- Keep conversations shorter; read this handoff and repository code in a new session.
- Before changes that may reset or affect saves, request backup and explicit permission.


## Combat overhaul (2026-10-16)
- Added public/combat-rules.js reusable d20 resolution module; public/index.html loads it before campaign.js; sw.js caches it as v15.
- All real tracked combat exchanges in public/campaign.js now roll d20 + hero proficiency + DEX vs derived enemy AC, with natural 1 misses, natural 20 hits/criticals, and dice-based damage.
- Hostile attacks also roll d20 + estimated enemy attack modifier vs the targeted hero/companion's derived AC. Evasion imposes disadvantage; Kick on hit interrupts retaliation. Riposte remains gated behind a parry.
- Combat UI reveals attack totals and AC, and keeps the one-exchange-at-a-time flow. HP remains derived and manual editing is removed. Offline game scripts remain in use.
- Source JS syntax and deterministic attack-rule edge cases tested (natural 1, natural 20, advantage, disadvantage, critical damage).
- Caveat: unknown enemies still receive a deterministic estimated AC/attack modifier from HP until creature stat blocks are implemented; full live iPhone and Cloudflare deployment testing remains pending. Preserve existing saves.


## Tactical NPC upgrade (2026-10-16, additional)
- public/combat-rules.js has named opponent archetypes (undead, beast, armored, skirmisher, caster, guard), with explicit AC, attack modifiers and damage die instead of deriving all stats from HP. Specific enemy metadata may override values.
- Weapon damage varies by player class/action; bludgeoning, piercing, slashing and force types are tracked. Skeleton-type opponents resist poison and are vulnerable to bludgeoning; non-matching types do normal damage.
- d20 initiative is rolled and recorded for hero and current foe when starting an encounter. Current order is informational; full ordered turns/multi-enemy initiative queue remain future work.
- Existing companion assistance menu remains; full class-specific party actions still need deeper development. Cache v16.
- Verified JavaScript parsing and representative archetype, resistance, natural 1 / natural 20 rules. Live Cloudflare and iPhone verification pending.


## Companion combat update (2026-10-16)
- Added one-exchange ally combat choices to the living campaign: Bromli shield protection (enemy disadvantage), Pippa engineering snare (d20 vs enemy AC; suppresses a counterattack), Lethariel targeted healing (1d8+5, only to wounded combatants). Each action advances one round and regenerates +10 Energy, with cooldowns tracked in campaign save.
- Hero-vs-enemy initiative comparison now affects whether an opponent may strike even if defeated/interrupted during the exchange; **this is an initiative-order approximation, not yet a full actor-by-actor sorted queue**. Do not describe it as a full D&D initiative scheduler.
- New support controls require living combat allies; original offline campaign, save schema, and prior combat options remain. Offline cache bumped to v17. Cloudflare/iPhone end-to-end tests pending.
