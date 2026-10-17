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


## Relationship dialogue deepening (2026-10-16)
- Root cause: companion relationship meters reached Gemini but narrative prompt did not strongly prioritize them; successful romantic dialogue could be written as dismissive mission redirection.
- Gemini campaign function now prioritizes focused conversations, interprets positive affection and established romance consistently, and avoids reflexively redirecting player-led personal conversations to quests. Consent and stage changes remain governed by game mechanics.
- Client forwards sanitized recent per-companion relationship moments, trust/affection/respect, grievance and romantic status (no credentials). Existing saved relationship data is unchanged and available for narration.
- Static cache v18; source parse checks passed. Live Cloudflare/Gemini response and current player relationship values have not been independently verified.


## Relationship depth, overnight rest, and custom skill odds (2026-10-16)
- Existing relationship records retain trust/affection/respect, romance stages, grievances, and dialogue history. Added bounded 15-entry per-companion milestone memories, cumulative overnight counter and lastNightDay marker; migration defaults protect earlier saves.
- In the companion panel, "Spend the night together" requires Snacky's established partner, an actual dating-or-higher status, trust >=65, affection >=70, respect >=35, no grievance, safe inn/tavern/home/camp type setting, and no active hostiles. Its depiction is consensual, fade-to-black, and followed by morning narration. No explicit depiction. It does NOT automatically award new romance stages.
- Morning shared-rest XP is 25 normally or 35 for especially strong bonds, granted via the existing progression receipt system (idempotent), limited once per companion per matching location/scene turn. Overnight rest is a simplified milestone; full clock/day progression is not yet integrated.
- Gemini now receives recent per-companion milestone memories, nights count and romance status, so personalities can refer back to earned history.
- Custom actions now use text-inferred skill context with appropriate STR/DEX/INT/WIS/CHA via existing soaAbilities.modifier where applicable, trained progression bonus, difficulty, alert and level. The preview uses the same actionOdds as the resolver. Dedicated social actions still use existing d20/CHA-based social checks.
- Verified parse checks and deterministic action-odds tests: lockpicking 87% (Engineering), inspection 74% (Investigation), stealth 84%, climbing 83% in a representative level 10 test fixture. These are examples, NOT fixed chances.
- Offline cache v19 and live server deployment need real-world validation.


## Code review and consistency hardening (2026-10-16)
Scope: inspected and syntax-checked main HTML, client campaign, companions, character roster, progression, abilities, combat-rules and service worker, plus Cloudflare campaign/story functions. GitHub source-level audit only; no production secrets or local iPhone saves accessed.
Changes:
- Custom actions now charge Energy based on the SKILL actually inferred from text (stealth 20, engineering 10, movement 0, etc.), not a mismatched selected UI category. Chance preview uses a single actionOdds calculation, matching resolution.
- Combat d20 preview takes enemy AC from the same named archetype statBlock used in actual exchanges, fixing misleading odds shown for guards, skeletons, etc.
- Shared-night XP is now limited to one award per companion in a twelve-scene block, with stable award receipts. This is a gameplay anti-farming mechanism pending a true calendar/rest system.
- Offline cache v20 ensures assets refresh.
Verification: all reviewed JS scripts parse; deterministic example odds/costs tested: lock 87% at 10 Energy, investigation 74% at 10, stealth 84% at 20, climb 83% at 0 (sample level 10 fixture only). Existing save schemas retained, no reset/migration forced.
Outstanding priorities: complete automated integration tests for combat, save switching, full consent/overnight flow; true day clock; cloud browser tests of deployment and Gemini response; rate limiting/auth hardening for a publicly reachable AI endpoint; refactor oversized campaign.js into testable modules. Avoid broad refactors without backup and a test harness.
