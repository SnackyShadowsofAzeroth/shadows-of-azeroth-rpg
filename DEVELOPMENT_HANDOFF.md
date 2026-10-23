# Shadows of Azeroth — Development Handoff
Updated: 2026-10-17

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


## Mobile UI tabs (2026-10-16)
- New files: public/mobile-layout.js and public/mobile-layout.css; linked from public/index.html, cached in public/sw.js v21.
- On iPhone-width viewports: five sticky bottom tabs: Adventure, Character, Journal, Companions, Settings. Keeps existing panels in the DOM, merely hides sections outside active tab, retaining event handlers, progress, and localStorage saves. Compact sticky HP/Energy/Currency indicator added.
- Active tab saved under soa-layout-v1; desktop original long-scroll layout remains unchanged. Character menu overlay and native in-panel controls remain.
- Rollback plan: remove the <link ... mobile-layout.css> and <script src="./mobile-layout.js" defer> tags from public/index.html, bump service-worker cache version, and redeploy. Files can remain in repository unused. PRE-UI baseline commit: fd9cb267032efa7cd979efbcdfb572380acb3ce5 (note gameplay changes after this commit SHOULD NOT be reverted). Last preceding non-UI app change commit: c8b49b2a250e70024138985968392e34bce3c54c. Revert ONLY UI related files, not whole repository history or saves.
- Known verification gap: must test live Safari with screen reader/safe-area and validate dynamic panels, all tab targets, and scroll navigation. No existing user saves reset.


## Social progression balance (2026-10-16)
- Casual conversations, greetings, joking, flirting, compliments and companionship can still affect relationships but do not award Social skill practice or character XP; meaningful negotiations, persuasion, interrogations, deception and high-stakes influence still qualify.
- Meaningful Social-family checks award 8/16/28 XP on easy/medium/hard success or 3 on failure, compared with previous 16/23/30 and 7. Other skills unchanged; existing Social ranks and prior XP retained.
- campaign.js classifies conversational intent before calling progression.check, which independently rejects non-meaningful Social-family awards. Companion passive Social practice also respects eligibility. Cache v25. This is heuristic text classification and needs gameplay verification for unusual custom wording; live iPhone unverified.


## Quest and bounty reward foundation (2026-10-16)
- Added public/quests.js loaded before campaign.js and offline-cached via service worker v27. Provides explicit bounty board templates at Stormwind, Darkshire and Ironforge; fixed posted copper payouts and predefined item rewards; optional deterministic rare relic on a small fraction of elite contracts. Accepted contracts and reward item inventory live in campaign.quests in the existing local campaign save (backward-compatible initialized lazily).
- Combat enemy defeat marks matching *accepted* bounty complete. Returning to original board and selecting Claim transfers exact copper into s.money and saves a receipt, inventory items, and bounty payout journal. Claim receipt blocks double collection. Accept and claim outcomes display currency in gold/silver/copper plus item names.
- Gemini prompt strengthened to avoid inventing a paid retainer or item if the engine did not confirm it.
- Tested accept -> kill -> claim (+1g25s) -> duplicate rejection; JavaScript parses. Live Cloudflare/iPhone not verified.
- IMPORTANT: This is a first-phase bounty system, not a general-purpose dynamically generated quest ledger. Existing SI:7 quartermaster retainer is still UNVERIFIED and has not been retroactively credited; arbitrary AI-created quests still cannot produce currency/items safely. Bounty item inventory is reward storage, not equippable item-stat handling. Rare drops from the limited currently seeded elite contracts may not occur until more eligible unique difficult bounties are available. To reach complete quest support, add engine-owned quest creation and verified completion criteria, a reliable game calendar / world-zone representation, equipment stats and inventory integration.


## Stormwind explosives mission party payout (2026-10-16)
- User authorized exactly 5 gold total for entire crew for COMPLETED defusal beneath Stormwind; NOT 5g per member. Integrated one-time canonical reward in `public/quests.js` (`mission:stormwind-explosives-defused:v1`, 50000 copper) with persisted claimed receipt and reward history.
- `public/campaign.js` applies the reward to Snacky's existing shared wallet once on the living campaign screen, calls both campaign store and base-engine save, and shows the exact +5g payment in a clear story receipt. Dedicated quartermaster dialogue included in transaction ledger.
- Existing standalone bounty payouts and local save fields remain unchanged; no reallocation of already held money. Source tests verify first grant +50000 copper and next grant denied. Offline cache v28. Browser Cloudflare runtime testing still needed. Beware not to duplicate if externally imported save lacks the new claim receipt.


## Mission ledger phase 2 (2026-10-16)
Added three region-bound, engine-authored missions with immutable reward terms and exact target-name combat completion; paid only when player returns to issuing region and chooses claim. Mission receipts, item rewards and history share quest storage, with separate confirmed wallet persistence (`save()`) for bounty and mission claims. Gemini receives sanitized confirmed last receipt and pending mission states; prompt disallows fabricating payment. Tested accept/kill/claim/reclaim rejection with 1g80s SI:7 mission. Scripts parse and offline cache bumped v29. Existing 5g Stormwind party payment remains a separate idempotent record. Limits: no freeform AI quest registration, no gear equip/stat bonuses, no full simulation of geography or actual live Cloudflare/iPhone deployment. Existing saved campaign untouched until gameplay loads; no reset or schema migration. Rollback only changed quests.js, campaign.js, backend campaign.js and sw.js rather than replacing older saves.


## Equipped quest gear (2026-10-16)
- Added public/equipment.js, loaded before campaign.js and included in service worker shell v31.
- Equipment catalog defines class requirements, slots (weapon, armor, one trinket) and stat modifiers for named bounty/mission rewards. Non-equippable vouchers remain quest items. Elite bounty templates now include Defias Shadowblade (Rogue) and Ironforge Warhammer (Warrior/Paladin).
- Existing quest reward items live in campaign.quests.inventory; campaign.quests.equipped maps slot to existing inventory index. No schema replacement; equipped state persisted through the campaign store and saved slots remain unchanged. A small equipment inventory controls panel is available inside the Living Campaign scene.
- public/abilities.js applies equipped attribute and AC modifiers to hero-derived stats; combat.js's hero d20 roll and damage add item bonuses in public/campaign.js. Stats for companions are unchanged. Class restrictions checked both when equipping and when computing bonuses.
- Verified JavaScript parsing; simulated equipping kit, gloves and Shadowblade yielding +1 DEX, +1 AC, +1 attack and +2 damage; derived hero Dexterity moved from 20 to 21, AC 17 to 18 in an isolated test fixture.
- Limitations: no live Cloudflare/iPhone test; older base-engine scripted combat is not fully equipment-integrated. Only items in the catalog can be equipped. Current model permits one slot per type and does not model dual wielding or armor categories. Changes reversible by unlinking equipment.js, removing its calls from campaign.js and abilities.js, then bumping service worker cache, without changing old saves.


## 2026-10-16 equipment visibility and legacy narration cleanup
- UI-only: Equipment & Reward Inventory expandable section now appears at the TOP of the Living Campaign scene, before story paragraphs, for easy access. It shows collected items, slot occupancy via Equip/Unequip labels, bonuses and restrictions. Requires an item to have been earned for it to appear in inventory.
- The original AI Story Director was narrating the old Hollow Raven scripted prototype, unrelated to the current Gemini living campaign. In Living Campaign mode we hide legacy narration focus, generate button, spinner, stale output and errors with body.soa-living-mode; preserve the access-code field and Cloudflare test control used by living campaign. Offline scripted mode shows the legacy narration controls again.
- UI rollback: revert the related additions to public/index.html and public/campaign.js only; preserve game saves and logic. Offline cache v32. Live iPhone UI not verified.


## Snacky's established in-game loadout display (2026-10-16)
- User provided 15 current items: Gnomish Goggles, Parachute Cloak, Barbaric Bracers, Mantle of Thieves, Dusky Leather Armor, Tiger Hunter Gloves, Highlander's Chain Girdle, Triprunner Dungarees, Feet of the Lynx, Ironspine’s Eye, Field Researcher's Ring, Ruby-Adorned Blade, Bloody Brass Knuckles, Toxic Revenger, Golemsight Long Gun.
- Equipment panel now displays these as Snacky's baseline equipped items only when the active roster character is Snacky; additional quest reward inventory stays separate and unchanged. No unverified numerical bonus or loot grant was made. Future work: model real item statistics and unify main/off-hand/ranged slots without overwriting baseline equipment or save files.
- Code in public/equipment.js, offline cache v33; selective rollback can remove SNACKY_LOADOUT display only.


## Forever source tooltip scan + enchanting (2026-10-16)
- Added public/forever-items.js with links to Wowhead Forever tooltip records. Verified examples include Gnomish Goggles, Triprunner Dungarees, Parachute Cloak, Mantle of Thieves, Ruby-Adorned Blade, Golemsight Long Gun, Ironspine's Eye (a RING), Bloody Brass Knuckles, Barbaric Bracers, Tiger Hunter Gloves, and Highlander's Chain Girdle. Equipment UI shows source stats. "Field Researcher's Ring" lacks an exact confirmed entry; a similarly named "Field Researcher's Loop" is a possible match but is explicitly not auto-equipped/stat-applied. Tooltip records should continue to be checked for patches.
- public/equipment.js converts equipped Forever tooltip attributes into capped, game-specific D&D bonuses, separated from raw Forever stats. No false claims of 1:1 WoW conversion. Quest reward gear effects and enchanting modifiers stack, with derived attributes/AC coming from public/abilities.js. Established user loadout is preserved.
- public/enchanting.js supports NPC enchanting in major cities for gold, self-enchanting after acquiring Enchanting with requisite skill and Arcane Dust, profession advancement, replacing an existing enchant (one per slot), an in-game ledger, and confirmed destructive disenchanting for spare unequipped reward items only.
- Snacky can retrain one existing primary profession into Enchanting only after explicit destructive confirmation; the current Mining and Engineering are not changed automatically. No profession skills are erased except the one player deliberately replaces.
- Client UI shows enchanting in the Living Campaign, applies receipts and wallet charges locally, and persists campaign data. Two ring slots now canonical finger1 and finger2; quest equipment enchant keys include inventory index to avoid transferring enchant across different item instances. All scripts load from index.html; offline cache v34 includes new modules.
- Source syntax checks passed for modules. Isolated test: +9000 copper NPC Weapon Striking; duplicate enchant rejected; insufficient gold rejected; self-enchant blocked for non-enchanter; equipment modifier updates. End-to-end Cloudflare deployment/iPhone interactions remain UNVERIFIED.
- Enchant costs, difficulty, output and Arcane Dust economy are Shadows of Azeroth RPG rules, NOT exact WoW Forever recipe economics. Equipment enchant UI currently does not simulate time-based vendor schedules, a dedicated enchant vendor shop, detailed reagent purchasing, or item durability.
- Rollback by unlinking public/forever-items.js and public/enchanting.js and reverting the targeted integrations in public/equipment.js, public/campaign.js and public/characters.js; bump service-worker version. Don't delete user's local campaign saves.


## Enchanting finishing pass (2026-10-16)
- Fixed source-equipment slot mapping: Ironspine's Eye = finger1; user-named Field Researcher's Ring = finger2 (potential Field Researcher's Loop from Wowhead Forever remains UNCONFIRMED). Source sample tooltip stats independently checked against live Forever pages.
- Added explicit NPC enchanting skill lessons at 25 / 50 / 75 / 125, with fixed costs and confirmed payment, so self-enchanting is not stranded at skill 1. Enchanting craft and trainer skill sync to roster character professions; retraining requires explicit irreversible confirmation. No professions are replaced automatically.
- Fixed canonical slot keys for baseline gear and per-inventory-item enchant keys. Repeated enchant rejected, untrained crafting blocked, insufficient funds blocked, materials consumed, action recorded, valid source bonuses applied. UI remembers expansion state.
- Isolated tests passed: 15 equipped baseline slots; +90 silver vendor Striking on Ruby-Adorned Blade; duplicate rejected; 1g apprentice training to 25; +3 Arcane Dust disenchant of spare reward; self-applied Warding to Parachute Cloak costs 17 silver and 2 dust and increases AC; Enchanting rank increases to 27. These represent in-game RPG pricing, not Wowhead recipes. Cache v36, live deployment unverified.


## Profession limit and ring correction (2026-10-16)
- User confirms Field Researcher's Loop, not Ring. Source WoW Forever item 281634: +7 Agility and +7 Stamina, ring slot. Corrected catalog and Snacky's baseline display; benefits enter the existing capped conversion model.
- World of Warcraft's established limit is TWO primary professions simultaneously; secondary professions are separate. Enforced no more than two distinct primary professions on character creation. Retraining swaps one of two currently held professions, never adds a third. Mining + Engineering remain unchanged for Snacky unless player explicitly confirms a switch. Reference: Blizzard WoW Classic Primer for New Players.
- Offline cache v37. No save data intentionally reset; production iPhone verification pending.


## Enchanter encounter UI requirement (2026-10-16)
- Player explicitly rejects global Enchanting menus and global profession unlearning buttons. `public/enchanting.js` `panel()` returns null unless the current Living Campaign scene location specifically names an Enchanter's Shop/Workshop or Enchanting Trainer/Academy. Merely being in Stormwind or another major city no longer displays the menu.
- Enchantment services are accessible only when an actual enchanter shop scene is visited; profession retraining/lessons are visible only at a trainer scene. Direct NPC service checks also enforce location, not merely visibility. Backpack and other normal menus do not show enchanting actions.
- Exact scene names recognized include 'Stormwind — Enchanter\'s Shop' and 'Stormwind Enchanting Trainer'. Player must seek such scenes through travel/conversation in Living Campaign. No profession change made. Verified normal Stormwind location has no panel, shop/trainer matching succeeds, direct unvisited purchase blocked, shop purchase succeeds. `sw.js` cache v38. To rollback restore relevant function before commit bd739b8 if needed; do not reset saves.


## Character-card equipped gear relocation (2026-10-16)
- User asked to move displayed equipped items under Health, Energy, Gold, Time, Alert and cooldowns in main character status card. `public/index.html` adds `#soa-equipped-slot` and compact two-column parchment layout with a collapsed-by-default `Equipped Gear` disclosure. The original primary inventory now shows only spare quest rewards; the long canonical equipped grid was removed from that inventory panel. `public/equipment.js` builds dynamic baseline Snacky loadout + equipped quest rewards with small item-stat lines and enchant labels. `public/campaign.js` refreshes this card during Living Campaign rerenders.
- Fixed malformed legacy time such as 10:69 PM by wrapping minutes at 60. Existing clock convention remains simplified; no time state migration. Browser live validation still required.
- UI-only change; does not change stored equipment, loadout, enchantments, quest items or saves. Cache v39. Rollback: revert specific renderStatus addition and inventory panel removal in `public/equipment.js`, remove `#soa-equipped-slot` and styles from `public/index.html`, and remove renderStatus hook in `public/campaign.js`; bump service-worker cache. Do not revert whole repository, as it has later gameplay changes.


## Horde faction and Skyborne allegiance (2026-10-17)
- Character creation now presents the race-appropriate faction: Alliance races are locked to Alliance, Horde races are locked to Horde, and Skyborne can select either faction.
- Skyborne share Warrior, Hunter, Rogue, and Druid. The Druid note identifies unique bird-inspired forms. Alliance High Order Skyborne may choose Mage; Horde Windshaper Skyborne may choose Shaman. Changing faction refreshes the class list and removes incompatible choices.
- Creation validates race/faction/class combinations before saving. Skyborne characters store and display their allegiance label (High Order Skyborne · Alliance or Windshaper Skyborne · Horde); their opening story prompt carries that identity and the Skyborne Druid form detail.
- No existing saves or characters are migrated or reset. Offline cache v48.


## Stability and save-safety review (2026-10-17)
- Current local changes are on the isolated `audit/stability-cohesion` branch. They are not deployed. No existing save key or player progress was reset or migrated.
- Campaign outcome labels, preview chance, energy cost and progression now use the same resolved skill. Combat previews report equipment attack/damage bonuses, and Warrior/Paladin attack rolls use Strength while Rogues use Dexterity. Current d100 and combat formulas are documented in the v50 README section.
- Offline saves now validate scene/stat/encounter shapes before import. Corrupt saves are preserved; gameplay pauses on validation or storage failure until a valid import, retry, or confirmed restart.
- Versioned all-character backups can be restored in-app, with archive validation, confirmation and rollback on storage errors. The archive includes per-character stories, progression, relationships, reputation and portraits.
- Living Campaign records are normalized on load. An unreadable campaign is not overwritten; restore a valid all-character backup to recover it.
- API body limits are enforced while streaming actual bytes (64 KiB for Campaign and 12 KiB for Story), and upstream provider error details are no longer sent to the browser. API traffic stays uncached.
- The mobile navigation script and stylesheet are now linked from the page and precached; invalid saved tabs fall back to Adventure, and storage errors do not interrupt navigation. Campaign turns pause when a campaign save fails and resume through an explicit save retry.
- Offline cache is v51 and includes `save-rules.js`, `mobile-layout.js` and `mobile-layout.css`. `npm run check` parses the JavaScript and inline page script; `npm test` runs 27 Node tests plus 128 faction-rule assertions. New checks cover corrupt-save preservation, nested journal validation and XP transaction rollback. Live Cloudflare preview/production and iPhone restore verification remain outstanding until this branch is reviewed and merged.
- The AI endpoint has no server-side request budget yet. Cloudflare rate limiting must be configured in the hosting account; do not count the shared access code as per-player authentication. The account binding or WAF rule needs its actual account-specific configuration before we can verify that protection.


## Druid form engine (2026-10-22)
- Added `public/druid.js`, loaded before class abilities and cached in shell v97.
- Separate slot-scoped Mana/Energy/Rage state in `s.druid`; form quest proofs in
  `campaign.druidQuests`. No existing save keys, wallets or unrelated class rules replaced.
- Every form is level- and quest-gated; Bear/Aquatic use Classic-inspired trials,
  Cat uses Forever's three-relic structure. Additional forms use explicitly labeled
  SoA rites. Tree 40 and Flight 60 are custom adaptations, not Classic claims.
- Combat shifting takes one exchange and exposes the Druid to retaliation; no free
  attack or refill. Full form restrictions, armor, feral stat scaling, Energy/Rage
  economy, combo targets, bleed ticks, buffs and persistent cooldowns implemented.
- Mentor and objective buttons verify locations and proofs; real summoned trial
  targets must be defeated in the combat engine before mentor turn-in unlocks forms.
- API receives a bounded Druid state and active spellbook; narrator never grants forms.
- Validation: 145 Node tests pass, syntax check and static build pass. Full DOM smoke
  checks exercise actual script load, form controls, resource header, save persistence,
  combat-shift retaliation and failed-story retry without double charge.
- Browser visual QA could not run because the available runtime lacked a Chromium
  binary and its download failed. Live Cloudflare/Gemini and real-iPhone QA are not
  claimed. README documents mechanics and the existing no-drowning-meter limitation.

## Druid menu readability and earned progression (2026-10-23)
- Fixed parchment theme ink inheriting onto a dark green Druid panel. The panel now
  has explicit foreground colors in both themes; parchment uses cream surfaces,
  brown body text and forest headings, with readable active form buttons.
- The form picker and spellbook show only earned, eligible forms/techniques. Mana
  remains visible; Energy and Rage appear when their forms have been learned.
- Training quests show only when eligible or already recorded; accepting a quest
  does not expose the unearned form. Low-level heroes get a concise training hint.
- Resource rules, the form picker and training use existing optional-disclosure
  behavior, avoiding the global auto-expanded details override. Cache version v98.
- 146 tests pass. DOM checks confirm earned-only forms/resources and independent
  dark/parchment text contrast of at least 4.5:1. Existing full DOM combat, save and
  pending-retry checks still pass. Actual iPhone visual QA remains unverified.

## Druid spell use on environmental obstacles (2026-10-22)
- Fixed a regression from the form engine: a named offensive spell in a story
  choice was rejected whenever no living enemy was tracked, including Wrath
  against a fragile root knot. The ordinary choice button was not disabled;
  the resolver refused its non-hostile target after tapping.
- Added a distinct environmental cast path for visible obstacles named in the
  scene/choices. It uses d20 + proficiency + spell stat vs difficulty DC 10/13/17,
  the learned ability's actual cost, form restrictions and persistent cooldown.
- Success/failure spends one ordinary action with form-specific recovery. It
  does not create an enemy, resolve a combat exchange, inflict retaliation,
  award a defeat, generate loot or bypass verified form quest objectives.
- Previews now say obstacle DC instead of enemy AC when no enemy is engaged.
  Arbitrary scenery and untracked creatures still cannot be silently defeated.
- 149 tests pass; full DOM regression clicks the exact screenshot's Option A,
  confirms 100 -> 95 Mana, one saved turn, no enemy/retaliation, and no double
  charge after story retry. Cache v99 forces updated client scripts.

## Woodland Druid menu skin (2026-10-22)
- Replaced the parchment Druid card with a reference-inspired woodland frame in
  both themes: dark bark tones, hand-authored SVG vine/leaf trim, a green heading
  orb, recessed wood buttons, moss borders and luminous resource inlays.
- Scoped explicit ivory/sage/gold foregrounds prevent the original low-contrast
  parchment inheritance bug. Mana remains blue, Energy yellow and Rage red.
- `public/druid-vines.svg` is code-native decorative artwork; it is noninteractive
  and does not reuse the reference image's black content regions. Small-screen
  padding and 48px button targets remain. No gameplay or visibility gates changed.
- 149 tests, syntax check, DOM interactions and both-theme text contrast checks
  pass. New asset included in service-worker shell v100. Real-iPhone visual QA
  remains unverified.

## Rejuvenation periodic healing (2026-10-22)
- Rejuvenation now costs exactly 35 Mana and restores exactly 15 HP at the end of
  its casting turn plus the next two resolved turns (45 total before overheal).
  Cooldown blocks the following three resolved turns. No random heal, Wisdom
  bonus or Tree cost/heal adjustment is applied to this explicitly fixed spell.
- Saved remaining ticks use the existing action clock, survive form changes,
  reload and encounter boundaries, and are consumed even when health is capped.
  Same-turn redraws and pending story retries cannot produce duplicate ticks.
- Primary combat resolution and fallback racial/support/exploration actions all
  advance the buff once. Combat healing updates authoritative exchange/log HP;
  server context includes remaining duration and narration respects the receipt.
- Full health still blocks a fresh cast. Active duration, cooldown rounds, full
  health and insufficient resource reasons are now visible on healing buttons.
- 154 tests pass; real DOM action test confirms 20 -> 35 -> 50 -> 65 HP, correct
  Mana cost, disabled reasons, cooldown expiry and no extra heal on failed retry.
  Older obstacle-cast and shapeshifting DOM regressions also pass. Shell v101.

## Automatic class UI skins: Druid woodland (2026-10-22)
- `class-themes.js` introduces a presentation-only registry and applies the active
  character's supported class skin on initialization, DOM ready and page restore.
  Druid maps to `soa-theme-druid`; unsupported classes retain the existing base
  skin. No save keys, gameplay values, portraits or access settings are changed.
- `class-themes.css`, loaded after existing sheets, extends the Druid woodland
  treatment across all five tabs, story decisions, combat ledgers, quest editors,
  ability/profession/equipment cards, character selection, fields and navigation.
- Reuses the leaf/bark SVG; keeps green HP and blue/yellow/red resource meanings,
  difficulty tints, visible focus states and existing mobile hit targets.
- Chrome theme color follows the character. Switching away removes the Druid
  class and restores the base browser color. Character switching already reloads
  the selected independent save, so no new preferences or data migration needed.
- 158 tests pass. Full DOM navigation covers all five tabs, skin cleanup and
  unchanged game saves. Combat shifting, Rejuvenation and obstacle-cast regression
  checks still pass. New stylesheet/module included in shell cache v102.
- Actual browser/iPhone visual rendering remains unverified; no claim of testing
  a live Gemini session or the player's current saved campaign.

## Integrated stability review (2026-10-23)
- Reviewed crafting/equipment, spell routing, form transitions, combat summaries,
  persistence and offline assets. Fixed two reproduced regressions: combat shifts
  retained source-form armor during retaliation, and inventory reindexing lost
  valid equipment enchantments. Destination-form Dexterity now affects armor
  immediately; shared inventory-reference remapping preserves remaining enchants
  and removes destroyed items' enchants.
- Added live ability-engine coverage for Bear/Humanoid/Cat transitions and
  enchantment coverage for disenchanting, save reload and inventory repair.
- 219 Node tests plus 128 faction assertions pass; syntax and static build pass.
  All referenced interface and cached assets exist. Shell cache v109.
- Chromium is unavailable here. Actual mobile rendering, the player's saved
  campaign and a paid live Gemini generation have not been exercised.

## Shared multi-enemy phase (2026-10-23)
- `soaEnemyPhase` in combat-rules.js resolves one attack per surviving enemy in
  roster order after the player's action. Basic/class/racial, Druid and support
  resolvers share it. Control is target-specific; dead enemies never retaliate.
  Independent Evasion checks, phase-wide Vanish and any qualifying parry work
  across all incoming attacks. Existing ally-target selection remains on basic
  attacks; downed allies cannot receive later attacks in that phase.
- `enemyAttacks` records preserve ordered rolls, recipient HP, damage and skips;
  UI, combatLog and bounded API narration context use them. Legacy records retain
  their existing display. All phase effects are inside existing action rollback
  and pending/retry transactions. No extra time, recovery, cooldown or HOT ticks.
- Bear Rage credits each actual damaging incoming hit; phase completion still
  restores Mana/Energy and ticks healing only once. Service worker v111.
- Validation: 235 Node tests plus 128 faction-rule assertions; syntax/static
  build checks. Added coverage for three-enemy sequencing, per-hit Evasion,
  target-specific control, takedowns, ally recipients, later parries, combat
  shifts, Rage, HOT ticks, multi-enemy rollback/replay, rendering and API context.
  Actual iPhone rendering and live Gemini generation remain unverified here.

## Narrative pacing and named chapters (2026-10-23)
- Main story header now shows the named Act and Chapter plus stable scene title;
  the old global Scene counter is labeled Turn in save details. Chronicle scene
  counts are chapter-local, persist across responses/reloads, stay stable within
  an ongoing fight, and reset on chapter transitions.
- Chronicle pacing v1 baselines existing completion records and the current
  situation on migration. No retrospective chapters, save resets or quest changes.
  Fresh journal quest completions, claimed missions and verified form training
  queue a chapter transition until combat is over. Major new discoveries require
  current non-repeated journal evidence, a changed immediate goal and scene
  boundary, with six-turn minimum spacing. Director reviews every ~12 turns never
  force chapter advancement. Minor bounty kills and ordinary crafts do not qualify.
- Named chapter banners and archived recaps are visible; Act proposals are directly
  actionable in Adventure and remain player-confirmed. Pinned quests stay intact.
  API pacing metadata/context are bounded; generation retries are idempotent.
  Failed progression persistence restores the prior Chronicle state.
- Validation: 249 tests and 128 faction assertions pass, along with syntax/static
  build checks. Coverage includes 201-turn migration, multi-round scene continuity,
  quest/discovery gates, combat deferral, repeat prevention, save rollback/reload,
  Act confirmation and API metadata. Shell v112. Actual iPhone rendering and live
  Gemini generation remain unverified here.

## Classic dungeon expeditions (2026-10-23)
- Added a 26-route Classic Era catalog in `public/dungeon-data.js`; Scarlet
  Monastery, Dire Maul and Stratholme wings are separate. Each fixed SoA route
  tracks every listed boss, two minion patrols per boss, and one boss guard.
- `public/dungeons.js` owns gates, saved run/stage state, receipts, loot, camp,
  retreat, clearance contracts and locally generated encounter rosters. Routes
  require character level and matching region; cannot skip a wave; active runs
  cannot reach Gemini advance. Defeat of every minion and boss is required.
- Boss drop chance is 35%, final boss 60%; fixed receipts survive retries/reloads.
  Class-specific weapon/armor/trinket rewards use bounded tiered SoA bonuses,
  enter the normal inventory, and are manually equipped through existing gear UI.
  One-time contract reward requires a full clear, persists after retreat, and
  remains claimable with full inventory after making space. Camping is once per
  cleared stage. Loot and rewards are not auto-equipped.
- Integrated item metadata, Chronicle milestone, Quest UI, equipment, combat,
  campaign local routing, save validation and offline assets. Normal combat handles
  groups and boss every-third-round attacks. AI narration and API credentials are
  not required for the dungeon loop.
- At entrances, optionally recruit up to two of a shieldbearer, ranger and field
  healer. Recruits join existing story companions, act once after enemy responses
  each exchange, can take damage or be downed, heal when the party camps, and
  remain selected between runs. Recruited NPCs do not receive player XP. Group
  choices and run health survive save/reload; retreat restores the prior story-party.
- The catalog is informed by the Wowhead Classic overview; random rare spawns,
  class summons, keys and some original event mechanics are intentionally not
  simulated. Entry levels, encounter counts, SoA item names/stats, and drop rates
  are game adaptations rather than original WoW values.
- Validation: 264 Node tests and 128 faction assertions pass; syntax and static
  build pass. Added full RFC full-clear/claim coverage, loot/reload/overflow,
  no-skip guards, equipment bonuses, retreat/camp and malformed-save checks.
  Actual mobile rendering/live Gemini generation remain unverified. Shell v114.
