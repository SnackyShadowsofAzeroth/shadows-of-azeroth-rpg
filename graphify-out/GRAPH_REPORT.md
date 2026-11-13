# Graph Report - Shadows of Azeroth RPG  (2026-11-12)

## Corpus Check
- 77 files · ~70,546 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .css 10, (none) 1, .webmanifest 1)

## Summary
- 908 nodes · 1591 edges · 82 communities (65 shown, 17 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 179 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59128fe5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- public/campaign.js
- Shadows of Azeroth — Development Handoff
- characters.js
- druid.js
- chronicle.js
- Shadows of Azeroth — Living Campaign (v0.3)
- progression.js
- steps
- dungeons.test.js
- companions.js
- api/campaign.js
- mobile-layout.test.js
- quests.js
- steps
- equipment.js
- save-rules.js
- ref_node_assert
- reputation.js
- enemy-combat-display.test.js
- racial-abilities.test.js
- crafting.test.js
- request-body.test.js
- storage-transactions.test.js
- arena.test.js
- campaign-math.test.js
- campaign-retry.test.js
- character-delete.test.js
- mission-reward.test.js
- relationship-onboarding.test.js
- selection-timeout.test.js
- specializations.test.js
- story-actions.test.js
- dungeons.js
- enchanting.js
- Project Memory
- chronicle-anchor.test.js
- combat-resource-display.test.js
- enemy-phase.test.js
- progression-storage.test.js
- Shadows of Azeroth — Campaign Bible and Quality Standard
- portraits.js
- worker-preview.test.js
- chronicle-pacing.test.js
- druid.test.js
- save-rules.test.js
- arena.js
- crafting.js
- init
- ref_node_fs
- ref_node_path
- ref_node_vm
- character-rules.test.js
- class-themes.test.js
- quests-migration.test.js
- resource-rules.test.js
- scripts
- mnm-rules.js
- story-actions.js
- character-rules.js
- M&M Rules Conversion Plan
- Reputation overhaul (v17)
- The Field Chronicle — immersion & usability refinement (v28)
- Character levels, experience and skill mastery (v36)
- Stability and calculation corrections (v50)
- Multi-pass stability and iPhone polish review (v38)
- sw.js
- Bonds of Azeroth — relationship expansion
- Character selection, new heroes, and professions (v13)
- Classic dungeon expeditions (October 23, 2026)
- Companion moments and visual refresh
- Rogue Evasion rework (v82)
- Party-wide Battle Overview and targeting (v31)
- UI refinement and safety pass (v18)
- Reversible Stormwind SI:7 visual theme (v10)
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `Shadows of Azeroth — Development Handoff` - 38 edges
2. `Shadows of Azeroth — Living Campaign (v0.3)` - 37 edges
3. `choose()` - 26 edges
4. `draw()` - 26 edges
5. `livingEnemies()` - 23 edges
6. `advance()` - 19 edges
7. `fightExchange()` - 17 edges
8. `result()` - 17 edges
9. `status()` - 17 edges
10. `resourceForecast()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Mission ledger phase 2 (2026-10-16)` --references--> `save()`  [INFERRED]
  DEVELOPMENT_HANDOFF.md → public/companions.js
- `questPanel()` --indirect_call--> `current()`  [INFERRED]
  public/chronicle.js → public/druid.js
- `organizeGameSections()` --indirect_call--> `get()`  [INFERRED]
  public/characters.js → public/class-abilities.js
- `draw()` --indirect_call--> `selected()`  [INFERRED]
  public/companions.js → public/specializations.js
- `interact()` --indirect_call--> `selected()`  [INFERRED]
  public/companions.js → public/specializations.js

## Import Cycles
- None detected.

## Communities (82 total, 17 thin omitted)

### Community 0 - "public/campaign.js"
Cohesion: 0.10
Nodes (75): accessCode(), actionOdds(), advance(), bribeCopper(), canonicalStoryChoice(), chanceLabel(), choose(), chooseArena() (+67 more)

### Community 1 - "Shadows of Azeroth — Development Handoff"
Cohesion: 0.05
Nodes (38): 2026-10-16 equipment visibility and legacy narration cleanup, Approved character requirements, Automatic class UI skins: Druid woodland (2026-10-22), Character-card equipped gear relocation (2026-10-16), Classic dungeon expeditions (2026-10-23), Code review and consistency hardening (2026-10-16), Combat overhaul (2026-10-16), Companion combat update (2026-10-16) (+30 more)

### Community 2 - "characters.js"
Cohesion: 0.11
Nodes (33): applyProfession(), baseState(), commitRoster(), create(), defaults(), deleteCharacter(), drawMenu(), update() (+25 more)

### Community 3 - "druid.js"
Cohesion: 0.18
Nodes (29): abilities(), atMentor(), atQuestObjective(), available(), castAtEnvironment(), context(), current(), environment() (+21 more)

### Community 4 - "chronicle.js"
Cohesion: 0.22
Nodes (24): attach(), banner(), completedMilestones(), completedTime(), completeObjective(), confirm(), context(), dismiss() (+16 more)

### Community 5 - "Shadows of Azeroth — Living Campaign (v0.3)"
Cohesion: 0.08
Nodes (24): Architecture, Campaign Chronicle, chapter system and Quest Journal (v30), Campaign continuity audit and guardrails (v20), Canonical story transition: Hollow Raven → Stormwind (v21), Combat health and damage ledger (v29), Companion conversations in Adventure (v32), Companion identities and class specializations (v34), Custom dialogue now changes relationships (+16 more)

### Community 6 - "progression.js"
Cohesion: 0.24
Nodes (20): award(), awardCore(), bar(), battle(), bonus(), check(), commitMutation(), companionBadge() (+12 more)

### Community 7 - "steps"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (+14 more)

### Community 8 - "dungeons.test.js"
Cohesion: 0.09
Nodes (8): assert, Element, fs, path, setup(), source(), test, vm

### Community 9 - "companions.js"
Cohesion: 0.25
Nodes (19): add(), adjust(), applyDialogueOutcome(), applyStoryConsequence(), canSpendNightTogether(), draw(), encounter(), establishedPeople() (+11 more)

### Community 10 - "api/campaign.js"
Cohesion: 0.18
Nodes (17): clean(), fetchGeminiWithRetry(), intentionalTravel(), json(), onRequestGet(), onRequestPost(), polishNarrative(), REGION_MARKERS (+9 more)

### Community 11 - "mobile-layout.test.js"
Cohesion: 0.11
Nodes (17): assert, campaign, characterCss, characters, chronicleStyles, element(), fs, html (+9 more)

### Community 12 - "quests.js"
Cohesion: 0.23
Nodes (11): accept(), claim(), claimMission(), journal(), missionById(), missionDefeat(), missionPanel(), onDefeat() (+3 more)

### Community 13 - "steps"
Cohesion: 0.14
Nodes (13): jobs, verify, name, on, pull_request, push, branches, run (+5 more)

### Community 14 - "equipment.js"
Cohesion: 0.41
Nodes (13): baselineModifiers(), canonicalSlots(), equip(), equipment(), formatSaleValue(), itemInfo(), modifiers(), panel() (+5 more)

### Community 15 - "save-rules.js"
Cohesion: 0.23
Nodes (10): readStoredJSON(), reportCorruption(), validateCampaignSave(), validateCharacterRoster(), validateChronicle(), validateCompanionsSave(), validateOfflineSave(), validateProgressionSave() (+2 more)

### Community 16 - "ref_node_assert"
Cohesion: 0.25
Nodes (3): assert, campaignModule, test

### Community 17 - "reputation.js"
Cohesion: 0.29
Nodes (10): applyChange(), baseline(), fromAction(), load(), markResolved(), persist(), renderAll(), renderInto() (+2 more)

### Community 18 - "enemy-combat-display.test.js"
Cohesion: 0.15
Nodes (11): assert, campaign, chronicleCss, fs, oldDruidStrike, path, resourcesContext, root (+3 more)

### Community 19 - "racial-abilities.test.js"
Cohesion: 0.08
Nodes (20): files, fs, html, path, roots, { spawnSync }, visit(), vm (+12 more)

### Community 20 - "crafting.test.js"
Cohesion: 0.21
Nodes (8): assert, fs, path, setup(), src(), {test}, turnSetup(), vm

### Community 21 - "request-body.test.js"
Cohesion: 0.17
Nodes (7): assert, encoded, fs, path, rulesPromise, source, test

### Community 22 - "storage-transactions.test.js"
Cohesion: 0.18
Nodes (9): assert, fs, functionBlock(), path, restoreContext(), SAVES, source, test (+1 more)

### Community 23 - "arena.test.js"
Cohesion: 0.20
Nodes (8): assert, Element, fs, path, setup(), source(), test, vm

### Community 24 - "campaign-math.test.js"
Cohesion: 0.18
Nodes (8): assert, fs, makeContext(), context, path, source, test, vm

### Community 25 - "campaign-retry.test.js"
Cohesion: 0.18
Nodes (9): assert, end, fs, helper, path, source, start, test (+1 more)

### Community 26 - "character-delete.test.js"
Cohesion: 0.18
Nodes (9): assert, deleteSource, end, fs, path, source, start, test (+1 more)

### Community 27 - "mission-reward.test.js"
Cohesion: 0.18
Nodes (9): assert, end, fs, path, rewardFunction, source, start, test (+1 more)

### Community 28 - "relationship-onboarding.test.js"
Cohesion: 0.22
Nodes (10): assert, companionsSource, element(), fs, path, reputationSource, startCompanions(), startReputation() (+2 more)

### Community 29 - "selection-timeout.test.js"
Cohesion: 0.18
Nodes (8): assert, end, fs, path, source, start, test, vm

### Community 30 - "specializations.test.js"
Cohesion: 0.18
Nodes (10): assert, classes, context, fs, path, profile, root, test (+2 more)

### Community 31 - "story-actions.test.js"
Cohesion: 0.19
Nodes (11): assert, bearReturnSetup(), block(), campaignSource, fs, path, setup(), ctx (+3 more)

### Community 32 - "dungeons.js"
Cohesion: 0.36
Nodes (7): command(), deployParty(), entryError(), panel(), pull(), scene(), settle()

### Community 33 - "enchanting.js"
Cohesion: 0.44
Nodes (9): apply(), atEnchanter(), atTrainer(), bonuses(), disenchant(), displaySlot(), eligibleSlots(), panel() (+1 more)

### Community 34 - "Project Memory"
Cohesion: 0.40
Nodes (4): Graphify workflow, Monsters & Memories rewrite status, Product and architecture, Project Memory

### Community 35 - "chronicle-anchor.test.js"
Cohesion: 0.20
Nodes (8): apiSource, assert, chronicleSource, fs, path, root, test, vm

### Community 36 - "combat-resource-display.test.js"
Cohesion: 0.20
Nodes (9): abilitiesCss, assert, campaign, fs, path, resourcesContext, root, test (+1 more)

### Community 37 - "enemy-phase.test.js"
Cohesion: 0.22
Nodes (9): assert, block(), fs, path, setup(), source, spell, {test} (+1 more)

### Community 38 - "progression-storage.test.js"
Cohesion: 0.20
Nodes (8): assert, fs, path, progressionSource, root, rulesSource, test, vm

### Community 39 - "Shadows of Azeroth — Campaign Bible and Quality Standard"
Cohesion: 0.22
Nodes (8): Canonical state — Chapter I, Part LXXIX, Creative and presentation direction, Last action and next decision, Quality gates for every turn, Rules invariant, Shadows of Azeroth — Campaign Bible and Quality Standard, Stats and position, Web-app engineering review (status as of 2026-10-17)

### Community 40 - "portraits.js"
Cohesion: 0.47
Nodes (8): controls(), enhanceMenu(), exportPortraits(), optimize(), read(), refresh(), renderPicture(), selectImage()

### Community 41 - "worker-preview.test.js"
Cohesion: 0.22
Nodes (7): assert, config, fs, path, { pathToFileURL }, test, workerPromise

### Community 42 - "chronicle-pacing.test.js"
Cohesion: 0.22
Nodes (6): assert, fs, path, src, {test}, vm

### Community 43 - "druid.test.js"
Cohesion: 0.25
Nodes (7): assert, fs, path, setup(), src(), {test}, vm

### Community 44 - "save-rules.test.js"
Cohesion: 0.25
Nodes (8): assert, context, fs, path, test, validArchive(), validSave(), vm

### Community 45 - "arena.js"
Cohesion: 0.57
Nodes (7): command(), isAtVenue(), opponent(), panel(), scene(), settle(), venue()

### Community 46 - "crafting.js"
Cohesion: 0.54
Nodes (7): addItem(), buy(), craft(), panel(), recover(), recoverable(), requirement()

### Community 47 - "init"
Cohesion: 0.46
Nodes (7): createNavigation(), group(), init(), render(), select(), removeLegacyNavigation(), sections()

### Community 48 - "ref_node_fs"
Cohesion: 0.25
Nodes (5): assert, fs, path, {test}, vm

### Community 49 - "ref_node_path"
Cohesion: 0.25
Nodes (6): assert, context, fs, path, test, vm

### Community 50 - "ref_node_vm"
Cohesion: 0.25
Nodes (6): assert, context, fs, path, test, vm

### Community 51 - "character-rules.test.js"
Cohesion: 0.25
Nodes (7): assert, context, fs, path, rulesPath, sharedSkyborneClasses, vm

### Community 52 - "class-themes.test.js"
Cohesion: 0.14
Nodes (10): assert, credentials, storyModule, test, assert, fs, path, source (+2 more)

### Community 53 - "quests-migration.test.js"
Cohesion: 0.25
Nodes (7): assert, context, fs, path, sourcePath, test, vm

### Community 54 - "resource-rules.test.js"
Cohesion: 0.25
Nodes (7): assert, context, fs, path, source, test, vm

### Community 55 - "scripts"
Cohesion: 0.29
Nodes (6): name, private, scripts, build, check, test

### Community 56 - "mnm-rules.js"
Cohesion: 0.48
Nodes (6): abilityModifier(), abilityModifiers(), abilityRequirement(), canUseAbility(), d20Check(), normalizeCharacter()

### Community 57 - "story-actions.js"
Cohesion: 0.43
Nodes (4): named(), obstacle(), plan(), visibleHostile()

### Community 58 - "character-rules.js"
Cohesion: 0.47
Nodes (4): classesFor(), displayFaction(), pathForFaction(), validSelection()

### Community 59 - "M&M Rules Conversion Plan"
Cohesion: 0.40
Nodes (4): Conversion order, Current foundation, Goal, M&M Rules Conversion Plan

### Community 60 - "Reputation overhaul (v17)"
Cohesion: 0.50
Nodes (4): Actions and thresholds, Faction standings, Reputation overhaul (v17), Test checklist

### Community 62 - "The Field Chronicle — immersion & usability refinement (v28)"
Cohesion: 0.67
Nodes (3): Changes, The Field Chronicle — immersion & usability refinement (v28), Verification

### Community 63 - "Character levels, experience and skill mastery (v36)"
Cohesion: 0.67
Nodes (3): Character levels, experience and skill mastery (v36), Level calculations, UI and continuity

### Community 64 - "Stability and calculation corrections (v50)"
Cohesion: 0.67
Nodes (3): Current calculation rules, Save, API, and runtime protections, Stability and calculation corrections (v50)

### Community 65 - "Multi-pass stability and iPhone polish review (v38)"
Cohesion: 0.67
Nodes (3): Improvements, Multi-pass stability and iPhone polish review (v38), Regression review

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `level()` connect `progression.js` to `story-actions.test.js`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `public/campaign.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09996754300551769 - nodes in this community are weakly interconnected._
- **Should `Shadows of Azeroth — Development Handoff` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `characters.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10953058321479374 - nodes in this community are weakly interconnected._
- **Should `Shadows of Azeroth — Living Campaign (v0.3)` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `steps` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `dungeons.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._