# Shadows of Azeroth — Living Campaign (v0.3)

Cloudflare Pages iPhone offline-first game with an OPTIONAL Gemini 3.5 Flash-Lite living campaign.

## How to play

1. In Cloudflare Pages configure secret `GEMINI_API_KEY`, secret `AI_ACCESS_CODE`, and optional variable `GEMINI_MODEL=gemini-3.5-flash-lite` in the Production environment. Redeploy after changing variables. No keys belong in GitHub.
2. Open your deployed HTTPS site on iPhone Safari. Enter your private AI access code in the AI Story Director field.
3. Enable **Living Campaign** at the top of the page and select **Start / Resume AI campaign** once. After that, every campaign choice automatically sends the confirmed local outcome to `/api/campaign` and updates the scene with new choices. No separate Generate Narration button is necessary.
4. Saves are local. Use JSON save export for the original offline engine. The AI campaign additionally uses localStorage key `soa-campaign-v1` and is not yet included in the legacy export file.

## Architecture

- `public/index.html`: offline turn-based starter adventure and status panel
- `public/campaign.js`: living story state and auto-turn progression, separate persistent localStorage
- `functions/api/campaign.js`: server-side Gemini structured output, validates JSON shape, holds encrypted Gemini key
- `functions/api/story.js`: optional atmospheric narration endpoint
- `worker.mjs` and `wrangler.jsonc`: Workers Builds preview adapter/config; it serves the same `public/` assets and routes the same two API handlers. Production Pages deployment remains configured separately below.
- `public/sw.js`: offline shell cache

Cloudflare Pages settings: branch `main`, framework none, build command blank, output `public`. Pages Functions deploy from the top-level `functions` directory.

## Important scope

The living campaign is **open-ended**, not a complete preauthored recreation of the entire ChatGPT narrative. It generates each future scene and choices from a rolling recap with short retained journal. Stats remain game-engine-owned. Abstract combat/skill resolution in this initial version is simpler than the original granular Combat Swords system. No AI generation is possible offline, but existing generated scenes can be viewed and the original scripted adventure remains available. Avoid playing simultaneous turns on two devices; saves do not sync. Using Gemini is subject to Google's current project quota and availability.

## Safety and abuse

Never paste either secret into GitHub. Your AI access code is a shared password, not production-grade authentication. For public distribution add user authentication, per-user rate limits and spend caps to avoid API quota abuse. The browser only receives scene text and validated choices; it cannot read `GEMINI_API_KEY`.

Independent fan-created project; not affiliated with Blizzard Entertainment.


## Companion moments and visual refresh

- New **Campfire & Companions** panel for Pippa, Bromli and Lethariel: **Catch up**, **Encourage**, **Ask advice**, **Flirt**. Pippa and Bromli are the nearby scouts; Lethariel is only available for in-person conversation if the AI scene location is a checkpoint/tavern/regroup point.
- Character moments are optional, work offline, and **do not spend Energy, change HP or advance the main story**. A small rapport indicator (0–5) and **Relationship journal** persist locally under `soa-companions-v1`. Flirting is playful and never guarantees a romantic response.
- In Living Campaign mode, up to four recent companion moments are included in the next Gemini scene request as optional context; their journal does not overwrite mission history or the gameplay save.
- Refined mobile layout: green Health bar, yellow Energy bar, better touch targets and focus indicators, compact action cards with **difficulty below the title**, and improved responsive spacing.
- Offline service worker now caches `companions.js` and does not cache API traffic.

### Quick test after a Cloudflare deployment

1. Open the game and refresh while online, then locate **Campfire & Companions**.
2. Select **Pippa → Flirt**. Confirm a response appears and her rapport/journal updates.
3. Change to Bromli and select **Ask advice**; switch back to Pippa and check her prior rapport persists. Reload and confirm the journal survives.
4. Switch to airplane mode after a successful online visit. Check companion actions and the old scripted adventure still work; new Gemini scenes should clearly require internet.
5. In Living Campaign, inspect the new difficulty labels on separate lines beneath choice titles. Verify the existing AI scene is still present after reopening.
6. Verify Health, Energy, money and facility alarms do not change after a companion moment. Do not press reset or import over a valued save.

**Important:** ChatGPT roleplay continuity, local scripted progress, the Gemini living-campaign save, and the companion journal are **separate persistence systems**. This update does not synchronize or overwrite them. Test on an existing browser profile first, with a local backup if available.



## Bonds of Azeroth — relationship expansion

The former **Flirt** interaction is now part of a broader optional relationship system. The companion panel has **Trust**, **Affection** and **Respect** meters, relationship stages (**Acquaintance**, **Friend**, **Close friend**, **Rival**, **Enemy**), and romantic stages (**Dating**, **Partners**, **Engaged**, **Married**). Actions include Show Interest, Deepen Friendship, Make Amends, Confess Feelings, Become Partners, Propose Marriage, Hold Wedding, Challenge Values, and Betray Trust. Major conflicts can be recorded using the `soaCompanions.applyStoryConsequence(id,kind)` hook with `protect`, `honor`, `deceive`, `cruelty`, or `betray`.

Romance progresses only after adequate trust, affection and shared interactions; the character reciprocates in the game's scripted romance route rather than being awarded romance for one flirt. A proposal creates **Engaged**; a wedding ceremony is a separate event at a peaceful location. Negative choices lower trust and can produce enmity; Make Amends offers a route toward reconciliation. All dialogue is mild and non-explicit.

Previous companion saves under `soa-companions-v1` are read and migrated **in place**, preserving the prior journal and converting old 0–5 rapport values into initial relationship attributes. No reset is performed. Romance choices are **optional offline interactions**; the Gemini narrator now receives the current statuses as context, but the full main-campaign consequence engine does not yet automatically infer every character's reaction from every generated quest choice. The explicit story-consequence hook is ready for deeper integration.

### Test relationships on iPhone

1. Reload online once to update offline assets (service-worker cache v7).
2. In Bonds of Azeroth, select Pippa → Show Interest, Deepen Friendship, or Ask Advice and check the meters/journal.
3. Select Challenge Values or Betray Trust to test rivalry; select Make Amends to test rebuilding trust. The changes are deliberate, so avoid these choices in a valued romance playthrough unless you want those story outcomes.
4. Continue playing, then try Confess Feelings → Become Partners → Propose Marriage → Hold Wedding once their stage and requirements permit. Wedding requires a peaceful in-game location.
5. Reload and verify the same stages/journal remain. Check that HP, Energy, gold, alarm, and main mission location remain unchanged by optional social interactions.


## Story choice and live-refresh reliability fix

Living Campaign choices now validate the AI access code **before** applying an action; missing code scrolls to and focuses the password field. On a valid action, local HP, Energy, time and history are saved immediately, and **all status/story/companion panels re-render without a browser reload** (a true reload would clear the unpersisted private access code). Generated scenes automatically repaint the page.

A pending-action marker is saved before requesting the next scene. If Gemini or network fails, the existing scene remains visible with **Retry generating next scene**, preventing duplicate Energy deductions and duplicate history actions. The pending marker clears only after a valid scene is saved. Buttons are disabled while generating or while a turn is pending. The legacy offline prototype remains playable.

To test: load a saved living campaign, enter the separate AI access code if needed, choose a story action, confirm status displays “Gemini is writing…” followed by the new scene and updated stats. Disconnect network during one generation and verify the pending retry button; reconnect, retry and confirm the chosen action is not applied twice. Social panel interactions still update instantly. The static-shell offline cache is version v8.

This patch was verified by source checks and a JavaScript mock flow for normal success and network failure, **not** by a Cloudflare production browser test.


## Custom dialogue now changes relationships

In Living Campaign, write an explicit conversational custom action mentioning exactly one companion, such as **"Snacky flirts with Pippa"**, **"Snacky thanks Bromli for saving him"**, or **"Snacky apologizes to Lethariel."** The game recognizes the target and tone, automatically treats conversational actions as Social when the category is left on its default Investigate setting, and applies an appropriate trust/affection/respect change **only after Gemini successfully returns and saves the next scene**. Unclear actions, multiple named companions, and non-dialogue actions (e.g. "Ask Pippa to repair the door") leave relationships unchanged instead of guessing. A failed Social roll will not award friendship/romance points; overtly hurtful speech may still carry a penalty. Companions' journal and meters update immediately.

Relationship effects are associated with a unique saved action ID to prevent double changes after retries or reloads. The next scene request includes the current relationship state. Existing saves, companion actions, and offline prototype remain unchanged; only online Living Campaign custom dialogue triggers this bridge. Cache version v9.

**Manual check:** in Living Campaign, enter a code, write "Snacky flirts with Pippa" in Custom Action (category may remain Investigate), submit, wait for the scene, then inspect Pippa's affection meter and journal. Repeat with an apology or insult and verify different attributes; simulate a network failure and retry to ensure the same event is not counted twice. Avoid negative examples on a treasured relationship save unless intentionally roleplaying consequences.


## Reversible Stormwind SI:7 visual theme (v10)

The header now has an **Appearance · SI:7 Field Operations** selector with **Classic** and **Stormwind SI:7** buttons. Classic is the unchanged default for users without a saved theme preference. Stormwind uses CSS-only slate-blue stonework, torchlike atmospheric gradients, a dossier-inspired red/gold accent, and the original legible green Health/yellow Energy bars. It is deliberately lightweight: **no third-party images, no downloads, and no changes to game logic**. The theme is applied through the `theme-stormwind-si7` class on `body`.

- `public/theme.css`: all optional theme styles scoped under `body.theme-stormwind-si7`, with additional shared selector styling.
- `public/theme.js`: instant accessible pressed-state toggle, optional persistence under **`soa-ui-theme-v1`**, and one-tap Classic restoration without reloading.
- `public/index.html`: links only the extra stylesheet and script; the existing inline game engine, campaign script and companion script remain unchanged.
- `public/sw.js`: cache **v10**, pre-caches theme assets for offline switching and continues excluding API calls from cache.

### Safe testing

1. Open the existing game once online and refresh; verify its familiar appearance and existing story/companions/saves.
2. Tap **Stormwind SI:7** beneath the title. Verify panels, buttons, Health/Energy, story choices, and relationships remain legible and usable.
3. Tap **Classic** and verify the original appearance returns immediately. No page reload required and no save reset.
4. Select Stormwind again, refresh and ensure the selection persists; select Classic again when finished.
5. Disconnect after assets have cached and check the theme switch remains available offline.

The appearance selector never changes `soa-save-v1`, `soa-campaign-v1`, `soa-companions-v1`, actions, credentials or secret storage. Automated source/syntax and theme-state tests pass; **Cloudflare production deployment and on-device visual rendering are not yet verified**.


## Character selection, new heroes, and professions (v13)

A parchment **character-selection screen** appears on first entry in a browser session. It lets you continue existing **Snacky Lugnuts** (Gnome Rogue, **Mining + Engineering**) or create up to 16 independent heroes. A **☰ Characters** button in the header returns to the menu without resetting the current adventure.

The race/class picker follows the published WoW Forever beta combination matrix: Human, Dwarf, Night Elf, Gnome, Orc, Undead, Tauren, Troll and Skyborne (Alliance High Order or Horde Windshaper class choices). Nine classes: Warrior, Paladin, Hunter, Rogue, Priest, Shaman, Mage, Warlock, Druid. Character creation also chooses two distinct primary professions. Cooking, Fishing and First Aid are available separately for every character.

**Save isolation:** Existing localStorage keys are preserved as the actively loaded working save; the roster keeps independent snapshots under `soa-character-slot-v1-<id>`, with roster metadata under `soa-character-roster-v1`. Before a switch, the current hero is backed up; the destination slot is restored and the app reloads. The original save is copied into the Snacky slot on first setup. The UI stops switching if the current slot cannot be backed up. Relationship records are likewise per-slot. Appearance theme is global and unchanged.

**Profession practice:** Under **Character Record**, each hero can inspect their chosen professions and secondary skills and tap **Practice via Story**. A successful profession-relevant action gets a level-scaled chance at +1 skill (cap 300), recorded in that hero's profession log. Failures don't award skill, and an action identifier prevents double gains on retry. Profession practice currently tracks **skill progression**, not a full recipe, reagent, inventory or equipment crafting simulation.

**New adventures:** Each newly created character gets a clean AI Living Campaign and character-specific prompt. Gemini is instructed to start an unrelated personal mystery appropriate to the selected faction/race/class/professions, without introducing Snacky's Hollow Raven plot. Online AI access is required to generate new scenes. The original offline scripted campaign is Snacky-specific and is not presented as a different class's adventure. New-character combat currently uses the simplified living-campaign action engine; full class-specific ability trees are a separate future expansion. New characters do not inherit Snacky's companions.

### Essential smoke checks

1. Open on the existing device. Select **Snacky** and verify his existing scene, 22g 60s 53c (or your actual current amount), relationships, and Mining/Engineering; the app must not reset progress.
2. Open **☰ Characters**, create an Alliance Human Paladin with Herbalism/Alchemy and a unique name. Confirm the new campaign begins with its own story after entering the private AI access code, if needed.
3. Practice Herbalism via a successful custom story action. Confirm Herbalism rises only once and Snacky's professions remain unchanged.
4. Switch back to Snacky; confirm the previous scene, currency and companion journal return. Switch to the Paladin and confirm their saved separate story and profession skill.
5. Check Classic ↔ Alternative parchment theme switching, offline shell, no double rewards on retry, and character menu on next new browser session.

**Important:** Saves remain local to the browser/device and are not cloud synced. The legacy JSON Export Save button exports the *active legacy/offline save* only, not a complete multi-character roster backup. Do not clear browser storage or change browsers expecting these saves to follow automatically.


## Natural profession progression (v15)

Profession-required skill checks and ordinary field gathering now have a chance to award **exactly +1 skill point** on a successful, profession-relevant action. Mining ore, gathering herbs, skinning beasts, fishing, crafting, diagnosing or repairing mechanisms, and appropriate secondary profession work all qualify when the character has that profession. Mere references to a profession in dialogue do not qualify.

Skill-up chances are intentionally diminishing as proficiency rises: **85%** at 1–74, **70%** at 75–149, **55%** at 150–224, **35%** at 225–274, and **20%** at 275–299. At 300 there is no further gain. A failed action never awards skill. Rolls are stable for the saved action identifier, avoiding rerolls on Gemini retries, and processed IDs prevent repeated awards. Profession log records +1 or a successful no-gain check. The existing individual-character skill levels, including Snacky's established **Mining 225/300 and Engineering 225/300**, are preserved.

This updates the previous guaranteed up-to-3-points profession practice behavior: successful practice is now a normal +1 *chance*, just like natural gameplay. Profession checks remain part of the already-resolved Living Campaign action, not a second expenditure of Energy.

Testing: mine an ore vein or inspect a device in a successful Living Campaign action, then inspect the Character Record. Repeat several separate actions; some award +1, others don't. Failed checks award nothing, resuming failed Gemini requests cannot award twice, and each character's professions remain independent.


## Natural-resource surveys (v16)

Living Campaign now has a permanent **Survey surrounding resources** choice, inserted immediately after Gemini's lettered actions and before the lettered Custom Action. It performs an Investigate-type action and requests a description of plausible *currently visible* local materials: ore veins, herbs, water, animal hides, or other natural opportunities. It does not gather anything, mint loot, spend special tools, or increase a profession; a **separate custom harvesting/mining action** must follow. Indoor restricted archives cannot suddenly acquire outdoor herb patches or mineable mineral veins. The survey uses the ordinary investigation success/complication roll and time/energy accounting. It remembers any findings in the ongoing scene text and the history passed to Gemini.

Skill progression from successfully gathering is still handled by the existing +1-chance profession rules, limited to professions owned by the active character. The resource-survey action is explicitly excluded from this award path even when it mentions mining or herbs.

Smoke test: after loading a Living Campaign scene, confirm Gemini options are lettered, the next button reads **Survey surrounding resources**, and Custom Action is the subsequent letter. On a survey, verify generated narrative reports plausible observations but grants no resources or skill points. Follow up with a separate gathering action only if a resource was actually identified. Confirm no interruption to regular choices, save, or relationships. Offline shell cache v16.


## Reputation overhaul (v17)

The former **Bonds of Azeroth** panel is now **Reputation**. Existing Pippa/Bromli/Lethariel Trust, Affection, Respect, romance and conflict actions remain unchanged in their original save and are displayed beneath the new heading. A **View faction standings & known enemies** shortcut jumps to the faction ledger.

### Faction standings
Known factions: SI:7, Stormwind, Night Watch, Ironforge, Horde, Defias Brotherhood and Scarlet Crusade. Each has a separate -100 to +100 standing and **Neutral / Friendly / Honored / Exalted / Unfriendly / Hostile / Hunted** labels. Initial values are narrative starting estimates reflecting character alignment (not claims about externally verified in-game faction reputation). Filter **All / Allies / Hostiles**. Snacky's existing enemies and uncertain figures (Thorne, Harlan Vex, Corvin, Valecroft) also appear as individually tracked standings. The separate-character reputation save key `soa-reputation-v1` is copied with the rest of that hero's snapshot; new heroes begin with their own affiliation-sensitive baseline.

### Actions and thresholds
On a successful, explicit action naming exactly one faction (such as *help SI:7* or *betray Stormwind*), standings change automatically (+8 for help; -12 for hostility). Explicit successful interactions with known named enemies may change individual standings, too. Ambiguous multi-faction references, failed actions and descriptive mentions without a relevant verb produce no changes. Events are identified and processed only once across retries.

Crossing **-75** creates a **pursuit** story hook; crossing **+75** creates a **patronage** offer hook. These are outstanding opportunities, not actual ambushes, damage, gold or inventory transfers. Gemini receives grounded reputation standings and unresolved events as context and may narrate an appropriate warning, envoy or offer. **Combat and rewards still require explicit decisions and engine-confirmed results.** No money, supplies or enemy spawns are created directly by the reputation panel. Hooks can be marked resolved via the exported reputation API when a future quest/reward engine supports doing so.

### Test checklist
1. Refresh while online after cache **v17** deploys. Open Reputation and confirm existing Pippa/Bromli/Lethariel affinity values and marriage stages remain.
2. Use the shortcut to inspect SI:7, Stormwind, Night Watch, factions and known enemies. Verify Faction All / Allies / Hostiles tabs.
3. In Living Campaign, use a successful action explicitly helping **SI:7** and check its standing rises exactly once. A failed action should not change it.
4. Check that only reputation changes; HP, Energy, currency, supplies, other characters' saves and actual facility alarms remain unchanged by the reputation system.
5. Switch heroes and back to confirm independent reputation and the existing preserved companion save.
6. Verify Classic and Alternative parchment appearance and regular story choices still work.

Initial source checks and mock reputation test verified one-time standing changes, threshold notices, and no inventory writes. The actual Cloudflare deployment and on-device rendering remain to be tested.


## UI refinement and safety pass (v18)

Reviewed character selection, Living Campaign, companion progression, faction reputation, offline shell, visual themes and save slots. Applied **UI-only navigation refinement** and a **non-destructive multi-character backup** feature.

- **Reputation** now has two switchable views: **Companions & Romance** and **Factions & Enemies**. Previously, both appeared in one very long panel. The selected view persists during redraws within the current session; existing relationship values, faction values and event histories are unchanged.
- Companion actions now appear in three concise groups: **Everyday interactions** (visible), **Romance & commitments** (expandable), and **Disagreements & reconciliation** (expandable). All twelve original actions remain available.
- The header provides one-tap **Adventure / Professions / Reputation** in-page navigation. These scroll without changing the selected character, quest progress or any currency.
- Character selection includes **Download All Character Saves**. This creates a JSON archive with roster metadata and every character's separate offline campaign, Living Campaign, companion relationships and reputation slot. The *active* character is freshly snapshotted before export. The backup does **not** store the Gemini access code or Cloudflare secrets and makes no gameplay state edits.
- **At v18:** The complete backup could not yet be imported directly in the UI; validated in-app restore was added in v50. The older Export Save button remains a legacy single-character save export, not a full-roster export.
- Fixed a Reputation render-target issue so faction updates only refresh their faction container, not the top of the companion page. Existing saved faction data is preserved.
- Offline shell cache updated to v18; no changes to core combat, dice, profession chances, story resolutions or relationship consequences.

Mock DOM tests verified both Reputation tabs, selected-tab retention after a faction update and redraw, no duplicate ledger, and correct friend/faction separation. A mocked full-roster export included story, companion, reputation, cash/HP and roster data. JavaScript syntax checks passed. Cloudflare production rendering and iPhone UI remain to be checked.

### Post-deployment smoke test

1. Refresh while online once the new build is deployed. Confirm the main story choices still advance normally and all character stats stay the same.
2. Open Reputation: switch tabs; verify Companions & Romance retains prior trust/affection/respect, and Factions & Enemies retains faction standings and enemies. Expand and close romance/conflict groups.
3. Use the fixed bottom navigation to switch between Adventure, Quest, Character, Reputation and Settings; no reload or turn advance should occur.
4. In Characters, choose Download All Character Saves; keep the resulting JSON private and somewhere safe. Use **Restore All Character Saves** only when you intend to replace the local roster with that backup.
5. Verify Classic / Alternative parchment switching and individual-character saves still work.


## Campaign continuity audit and guardrails (v20)

**Problem discovered:** The Gemini director had only the last 12 history snippets (220 characters each), the prior scene, and a generic instruction to maintain continuity. Older motives and key evidence could drop out of immediate context, allowing a new unconnected mission (e.g. Stormwind explosives) to appear while Snacky was still investigating Hollow Raven.

**Improvements:** The Living Campaign now sends 20 recent history events, records longer scene snippets with explicit locations, includes the last 12 journal discoveries, and supplies a persistent **historical mission-origin anchor** per character. A historical origin is not proof that all the old objectives remain unfinished. The server's continuity instructions explicitly preserve established causality, unresolved leads, companion locations, and the player's authority over travel. New conspiracies may be introduced as leads, but not as unchosen completed journeys.

**Defensive response validation:** Server rejects a new scene that moves from one recognized major location to another (e.g. Hollow Raven to Stormwind) without an explicit matching destination in the chosen travel action or a teleport/portal/hearth action. A rejected scene does not replace the saved scene, does not deduct a second Energy cost, and shows the existing safe **Retry generating next scene** flow. Ordinary movement within the same region remains allowed. This is a targeted guardrail rather than perfect geographic understanding.

**Existing saves:** This update does **not** rewrite a saved Stormwind scene back into Hollow Raven or retroactively reinterpret past player choices. If the saved story already moved, compare its recent scene history and explicit player decisions before deciding whether that narrative is canonical or needs a deliberate correction.

**Test scenarios:** Hollow Raven → Stormwind via simple investigate/move/exit must be rejected; Hollow Raven → Stormwind via “travel to Stormwind” or “take a portal” allowed; Hollow Raven room-to-room movement allowed; Stormwind district movement allowed. Client/server JavaScript syntax and those guardrail scenarios passed. Cache v20; live Cloudflare/Gemini behavior remains to verify.


## Canonical story transition: Hollow Raven → Stormwind (v21)

**Player-authorized continuity override:** The Hollow Raven investigation is **solved and completed**. The original mystery's recovered evidence, intelligence about Thorne, Valecroft, Subject Seven, the Memory Anchor, and Protocol Mirrorfall remains historical intelligence for a future SI:7 debrief, **not** a recurring unresolved Hollow Raven mission.

**Active objectives:** Return to Stormwind; confront and defuse the explosives threat through player decisions (do not auto-resolve it); and brief SI:7 on the completed Hollow Raven operation, discoveries, and current situation. If the saved scene is already in Stormwind, respect that location; if elsewhere, narrate necessary travel only when explicitly chosen. Do not teleport party members or assume any mission objective has been completed merely from being listed.

**Restricted premises:** Only verified SI:7 operatives may enter SI:7 headquarters. Snacky is an operative. Pippa Sparkwhistle, Bromli Ironkeg, and Lethariel have no established SI:7 membership; they may accompany him to an appropriate public or external rendezvous, but not into the headquarters itself.

**Romantic dynamics:** Pippa is infatuated with Snacky. Lethariel has romantic feelings for Bromli. Express affection subtly and consistently through dialogue, glances and discretionary character behavior, while preserving personal agency and all saved Trust/Affection/Respect values. Narrative premise is **not** an automatic change to mechanical relationship points or an automatic confession.

**Safety and preservation:** Changes affect future story guidance only. Existing saved scenes, equipment, relationships, profession skills, currency and security flags are not overwritten; new character campaigns remain independent. JS source checks passed. Cache v21.


## Per-character portrait upload (v22)

The **Character Record** now has an avatar preview, **Upload Portrait / Change Portrait**, and **Remove** controls. The **Choose Your Hero** roster also displays each character's image or an initial when none is set. JPG, PNG and WebP files up to 12 MB are accepted; the browser resizes and center-crops images to a square 320×320 JPEG and stores a compressed local data URL under `soa-portrait-v1-<character-id>` (below ~210 KB per character). This reduces storage pressure and enables local/offline viewing on iOS.

Portraits are **independent of gameplay saves**: changing one cannot modify inventory, relationships, story or character stats. Existing characters begin without a portrait until one is uploaded. The **Download All Character Saves** archive includes a `portraits` object with all stored character portraits; no secret or external image hosting is involved. The older one-character export still does not include portraits. The character menu now supports validated full-roster restore from an all-character archive.

**How to use:** save the generated portrait image to Photos or Files on your iPhone, open Shadows of Azeroth, select Snacky, scroll/tap Professions (Character Record), tap Upload Portrait, choose the image, and confirm it appears both in the character sheet and on the main menu. Portrait selection/removal needs explicit confirmation for removal. Other heroes can upload separate photos.

**Smoke test:** upload image for Snacky; reload and switch characters; verify it follows Snacky only. Replace with another image and inspect roster display. Remove and verify an initial returns. Test dark Classic and Alternative parchment. Download All Character Saves and verify the `portraits` object in the JSON. Refresh after Cloudflare deploys cache version v22. Source syntax verified, but live iPhone image-picking is not yet verified.


## Definitive parchment appearance (v23)

The World of Warcraft-style parchment quest-journal look is now the **one permanent theme**. The page loads with `class="theme-alternative"` on the body and no longer offers a Classic or Alternative appearance selector. The unused `theme.js` switch and switch-only CSS were deleted. The former saved theme preference `soa-ui-theme-v1` is ignored so visitors who previously selected Classic automatically see parchment; their other local data is unchanged.

The CSS-only parchment panel styling is retained, and the offline cache is bumped to **v23**. No gameplay, campaign, inventory, profession, reputation, portrait or character save handlers were modified for this change. Source integration and JavaScript syntax checks passed; live Cloudflare/iPhone display still requires a refresh and confirmation.


## Distinct social ability checks (v25)

Living Campaign now supports explicit **Bluff, Bribe, Romance, and Threaten** checks. Choose a naturally described action or specify one of these under **Social check (optional)** in Custom Action. Each recognized check rolls **d20 + a character-specific class/background skill bonus vs DC** (Easy 10, Medium 14, Hard 18). The character sheet's expandable **Social skills** section displays the four bonuses; Snacky's SI:7 Rogue training gives Bluff **+6**, Bribe **+3**, Romance **+3**, Threaten **+2**. A natural 1 fails and a natural 20 succeeds. Romance against an explicitly distrusting companion receives +4 DC.

Bribes require an explicit amount, such as `offer 50 silver to the guard`; they are paid from local money **only if accepted**. Missing amounts or insufficient funds stop without consuming the action. Bluff and Threaten can succeed or fail and affect the narrative, not silently modify faction reputation. Romance outcomes are conversations, never compelled consent or automatic commitment.

Other actions retain their previous action-type calculation, Energy costs and effects. Social rolls consume one time tick; the existing +10 Energy regeneration still applies. Results are persisted with the chosen action before requesting Gemini; retrying a failed generation does **not** reroll, spend the bribe twice or repeat the action. Gemini receives the authoritative die/bonus/DC and must not invent additional deductions or romance stages.

Safety test: check Bluff, Bribe, Romance and Threaten on different characters; verify explicit bribes affect currency only on an accepted attempt; check insufficient balance/missing amount; retry Gemini without repeating payments; inspect saved relationships and reputation. JavaScript syntax and mocked social check tests passed. Live Cloudflare deployment/on-device selection still needs confirmation. Shell cache v25.


## The Field Chronicle — immersion & usability refinement (v28)

This refinement deliberately preserves the definitive parchment theme, character roster, romance, faction reputation, profession chances, existing saved scenes, Gemini API access, and action outcomes. It is a presentation-focused update following source reviews of the campaign, roster, companions, reputation, portrait modules, server director, and offline shell.

### Changes

- **Narrative:** The AI scene now has a subtle **FIELD CHRONICLE · SCENE N** kicker and more comfortable mobile-friendly parchment typography. Story text remains text-only and is never passed through unsafe HTML.
- **Discoveries:** A collapsible **Field notes** section displays the last eight confirmed journal entries and the total count; it does not edit the journal or consume actions.
- **Choices:** A dedicated **Choose your next move** divider shows the number of generated story paths, separate from Survey and Custom. Six AI-generated options remain lettered A–F; Survey is G, and Custom is H for six-option scenes.
- **Custom actions:** The submit button now visibly disables while a story outcome is pending, so a waiting user cannot submit a second action while Retry is available. The existing pending/retry protection still avoids duplicate mechanical costs.
- **Status:** The scene footer shows local-save and connectivity status rather than repeating journal entries already available in Field notes.
- **New heroes:** Starting prompts for brand-new non-Snacky heroes now ask for six distinct choices, consistent with the main director. Snacky's fresh-campaign fallback recognizes that Hollow Raven is complete and the Stormwind threat is active; existing saved campaign states are not migrated or rewritten.
- **Styles:** New `public/chronicle.css` is loaded last, scoped under `body.theme-alternative`, for legible action panels, mobile responsive narration, collapsible notes, and accessible focus states. No heavy images or external dependencies.

### Verification

All JavaScript files and the inline game engine passed parsing checks. A simulated six-choice stored scene displayed A–F, Survey G, a custom-action form, field notes, and headings **without mutating its saved stats or story**. A separate pending-scene test confirmed its custom submit and survey are disabled, the retry control remains available, and the saved scene stays unchanged. Offline service worker cache version **v28** includes `chronicle.css`.

On-device Safari rendering and production Cloudflare deployment still need confirmation. A local save remains on that device; use **Download All Character Saves** periodically and retain the resulting private JSON. Full-roster import remains future work.


## Combat health and damage ledger (v29)

Both game modes now display combat information as a **parchment Combat Status** panel with red enemy HP bars, numeric current/maximum health, and damage dealt/received from the most recent exchange. The offline adventure reuses its original enemy `hp/max` and one-round combat damage without changing enemy damage or combat costs.

**Living Campaign** now requests a small list of currently visible hostile opponents (`enemies`: name, hp, maxHp) in the Gemini response. Each is validated server-side (up to 3, max 500 HP), and then tracked locally inside the existing `soa-campaign-v1` save. The local tracker is authoritative: attacking a confirmed visible target takes 35 Energy before +10 Energy regeneration, resolves exactly one exchange, applies 14–24 HP on hit, and permits at most one 4–11 HP retaliation by a surviving enemy. Chance to hit varies with difficulty and alarm. The panel shows before/after health, actual damage, and whether the enemy was defeated. Defeated foes are not automatically looted or respawned by a generated scene with a matching identity at that location. If several enemies are present, combat requires identifying the intended target (no arbitrary auto-target). A no-target or insufficient-Energy action is blocked without a turn expenditure.

**Compatibility:** Prior Living Campaign scenes without structured enemy data continue using their existing abstract combat resolution rather than assigning an invented enemy HP retroactively. Newly generated scenes can establish named enemies with health bars. Enemies' locally reduced HP is reused across continued scenes even if Gemini repeats the initial HP or momentarily omits a surviving enemy after an attack. Leaving an encounter may clear its active targets, but a round summary remains in the saved campaign until the next exchange. A failed Gemini generation keeps the combat result in the saved pending action; Retry does not roll or charge again.

**Validation:** Script parsing passed for the offline game, Living Campaign client, API and offline service worker. Mocked combat checks covered one attack + one retaliation, exactly 35 Energy spent with +10 regen, HP persistence when Gemini returns a stale/full HP enemy, omitted-enemy resilience after combat, a finished enemy not resurrected, insufficient Energy and ambiguous-target safeguards. Live Cloudflare and iPhone testing remain unverified.


## Campaign Chronicle, chapter system and Quest Journal (v30)

The previous fixed **Hollow Raven · Chapter I** header has been removed. The Living Campaign's scene label now shows **ACT II · CHAPTER I · SCENE N** (or the current saved campaign act/chapter) rather than implying every AI response is a new chapter. Scene titles remain local moments; chapters and acts persist independently.

**The chapter tracker is stored as `soa-campaign-v1.chronicle`**, so it is isolated by the existing per-character save-slot system and included automatically in full-roster backups. Prior saves are migrated lazily, preserving current scene, turn, stats, money, professions, relationships, reputation, companions, and discoveries. Snacky's established story starts at Act II *Shadows Over Stormwind*, Chapter I *The Threat in the Capital*. Act I *The Hollow Raven Conspiracy* is archived as completed. Custom heroes begin in Act I with their own first quest.

**Quest Journal:** A new dedicated panel immediately beneath Adventure contains *Quests*, *Chapter Archive*, and *Discoveries*. Active quests contain player-confirmed objectives. Marking an objective complete prompts for confirmation and never grants loot, moves the party, or automatically spends time. Completed quests and chapters remain browsable. Players can record additional quests and leads without modifying the generated story.

**Milestone proposals:** Gemini receives the current act, chapter, active objectives, completed quests, and recent archived chapters. It may return an optional `chapterMilestone` only when an important narrative phase or quest arc has genuinely progressed. Suggestions are **review-only**, with *Begin chapter* or *Not yet* controls; no AI response can silently advance chapters, complete quests, or end an act. Accepting archives the prior chapter and shows a cinematic parchment chapter banner; dismissing never blocks story progress. Normal scenes do not require milestone proposals. If the model omits the milestone entirely, the narrative works as before.

**Navigation:** Adventure / Journal / Character / Reputation is now the four-link mobile header navigation. The permanent parchment visual style remains active. The original offline adventure has not been relabeled as a dynamic multi-act campaign; the new Chronicle is for Living Campaign state.

**Verification:** New and existing character migration, chapter proposal/acceptance, save callback, retained story state, and archived chapter count were exercised in mock tests. All edited client/server scripts passed syntax checks. The offline shell cache is **v30**, including `chronicle.js` and `chapters.css`. Live iPhone/Cloudflare UI remains to be verified.


## Party-wide Battle Overview and targeting (v31)

The Live Campaign now displays a **Battle Overview** during an encounter with:
- **Allied health:** the active hero and currently involved companions appear with labeled green current/max health bars. Values are read from the local game state, existing combatants, or confirmed actor records. When an ally's numerical HP has never been established, the UI displays a striped "HP unconfirmed" track and an optional **Confirm HP** editor rather than guessing. Once HP is recorded, the same editor can correct known health after actual treatment or another verified change.
- **Enemy health:** visible hostiles have red numeric current/max bars, retained between exchanges. A defeated opponent is shown at **0 HP** for the closing combat result.
- **Target selectors:** tapping a named enemy selects the intended target without spending a turn; the player then chooses a combat ability. If multiple enemies are present and no target has been selected or explicitly named, attacking is blocked before spending Energy. Selecting an ally drafts a non-healing support action; **Coordinate with selected ally** is a separate deliberate action.
- **Combat abilities:** Rogues currently have Strike (35 Energy), Kick (25, interrupts retaliation when successful), Evasion (0, defensive exchange) and conditional Riposte (10, requires qualifying parry). Other classes receive a conservative basic Attack/Defend pair while full class trees remain future work. One button causes exactly **one combat exchange**. +10 passive Energy regeneration remains active.
- **Damage history:** each exchange records who took how much damage and resulting HP, including companion recipients of enemy retaliation. The recent history can be expanded. The same pending action is not repeated if Gemini needs a retry. The local client is authoritative over mechanical HP; Gemini's role is narration, not additional damage or automatic heals.
- **Offline adventure:** displays a live green Snacky HP bar alongside the existing enemy health bar and exchange summary without altering its original combat damage.

Companions not actually present in the current scene are not automatically added to the battle roster. Health/targeting remains **per-character, per-save** in `soa-campaign-v1`, with confirmed ally HP also preserved in a save-bound `partyHealth` ledger when that ally leaves and returns to the battlefield. Existing saves without structured ally HP are supported. AI-proposed participant lists are advisory; the player can explicitly establish HP where a trusted value is known.

### Verification

Source syntax checks passed. Tests simulated Strike lowering an enemy from 70 to 55 HP and an enemy retaliation lowering Bromli from 100 to 96 HP, while Snacky remained at 92 HP. A later Gemini response listing Bromli at 100 was correctly ignored in favor of the saved 96 HP. Additional tests covered enemy targeting, Kick, Evasion, Riposte preconditions, insufficient Energy, no extra rounds on invalid inputs, per-actor damage logs, numerical/unknown health bar rendering, and explicitly setting previously unknown companion HP without changing the player's stats or spending a turn. Offline cache **v31**. Live Cloudflare deployment and iPhone UI remain unverified.


## Companion conversations in Adventure (v32)

Personal interactions with Pippa, Bromli, and Lethariel now display as **in-story conversation cards directly below the active Living Campaign scene text**, before Field Notes and action choices. Selecting an interaction from the existing Reputation/Companions controls refreshes the Adventure scene and scrolls to the newly added dialogue. The old Relationship Journal visual listing and duplicate result block were removed from the Reputation view; relationship statistics, bond changes, romance stages, and private entry history remain stored in `soa-companions-v1`.

**Variety:** Catch Up, Encourage, Ask Advice, and Show Interest now use several distinct character-appropriate responses with deterministic rotation and an immediate-repetition avoidance check. Contextual alternatives reflect underground passages or explosive hazards when relevant. Other romance/commitment actions still use the established trust thresholds, outcomes, and safety boundaries. No model API call or usage quota is required for these lightweight companion moments.

**Scope:** An interaction records `source:"interaction"`, a `sceneTurn`, and text in the existing companion save. Only the **three most recent** companion interactions from the current scene display within its narrative, so they do not repeat forever across successive generated scenes. Older saves lack these presentation fields but their previous relationship progress and history remain intact. The recent-companion context sent to Gemini now deduplicates identical entries, reducing the chance of reinforcing previously repeated phrases.

**Validation:** Verified distinct Bromli conversation lines over successive interactions, contextual underground dialogue, unchanged relationship-storage keys, removed duplicate Journal display, hook-up to main Adventure and source parsing. Offline shell cache **v32**. Cloudflare live deployment and on-device Safari testing remain unverified.


## Transparent dice previews on story choices (v33)

Every Living Campaign story choice now shows a non-rolling preview beneath the difficulty/type label:
- **Bluff, Bribe, Romance, Threaten:** `d20 + character-specific skill bonus vs DC` (Easy DC 10 / Medium DC 14 / Hard DC 18, plus applicable relationship hostility modifier). Natural 1 always fails; natural 20 succeeds. Missing bribe amounts still block action when selected.
- **Engineering, Stealth, Investigate, Social, Move, Rest, abstract Combat:** `d100` with the exact success range computed from the **existing** action odds, current alarm and difficulty, plus Energy cost. The resolver now makes a discrete d100 roll using this same target and writes the rolled result into the action resolution string for Gemini. The probabilities and other game effects are otherwise unchanged.
- **Tracked combat at v33:** this release note described a d100 preview and fixed damage dice. Later combat changes replaced that system with d20 attacks, class-based weapons, equipment bonuses, and damage mitigation; see the current calculations in the v50 section below.
- **Survey resources** shows its investigate d100 roll; **Custom action** has a reactive preview that changes when text, type or social skill selection changes.

No roll is made simply by reading the preview, and dice previews do not modify time, saves or Energy. The actual random roll occurs only after selecting the action. The parchment cards use compact mobile typography and retain green/amber/red difficulty borders. Offline cache **v33**.

Verified normal success/failure, social DC bonuses including hostile-romance modifier, combat dice preview, input integration, JavaScript parsing and that inspecting a preview does not change game state. Cloudflare deployment / iPhone live display still require independent confirmation.


## Companion identities and class specializations (v34)

The three established companions now have canonical, structured race/class/specialization profiles in `public/companions.js`:

- **Lethariel Moonguard** — Night Elf **Restoration Priest**, specializing in restorative healing and support (formerly shown with only her given name).
- **Pippa Sparkwhistle** — Gnome **Subtlety Rogue**, specializing in stealth reconnaissance; engineering remains an established secondary expertise.
- **Bromli Ironkeg** — Dwarf **Protection Paladin**, a frontline guardian empowered by the Light; no longer described as a Warrior.

The Reputation/Companions section displays these profiles. The Living Campaign now passes structured companion profiles to the server director, and its canonical instructions require Gemini to use the correct full name, class, specialization and role rather than the old generic roles. Explicitly referencing “Moonguard” in a custom dialogue action now recognizes Lethariel.

**Backward compatibility:** Companion ID keys `pippa`, `bromli`, `lethariel` are unchanged, so trust, affection, respect, romance and interaction history remain in place. Historical relationship entries whose person is exactly `Lethariel` display `Lethariel Moonguard`. Active combat records, stored health ledger keys, last damage recipients and recent combat logs also use her full new name while retaining the existing numerical HP. The original story text and discovery notes are not rewritten.

JavaScript syntax checks and simulated companion profile / save migration checks passed. Offline cache **v34**. Production Cloudflare deploy and live iPhone rendering remain to be confirmed.


## Character levels, experience and skill mastery (v36)

**Every playable hero and established party companion starts at level 10 and can reach level 60.** Leveling is determined entirely by the local game engine, not by Gemini narration. Existing save data migrates automatically without changing story, HP, Energy, currency, professions, relationships, or learned character appearance. Character-specific progression lives under `soa-progression-v1` and is included in `SAVES`, so it follows the independent per-character save-slot system and appears in all-character backups. Unknown additional party members are initialized at level 10 only after their names are actually established as participating allies; no identities are invented.

### Level calculations
- XP required to advance from level `L` to `L+1`: **`140 + 22*L + 2*L²`** (560 XP from level 10 to 11). Multiple levels may be gained from one reward; at **level 60** additional XP does not accumulate in the current-level bar.
- Successful skill checks award **16 XP (Easy), 23 XP (Medium), 30 XP (Hard)** and **2 practice points**. Failed checks earn **7 XP** and **1 practice point**. Only actual resolved actions earn credit; previews, invalid attempts, scene refreshes, and retrying Gemini do not.
- Skill ranks begin at 0 and stop at 15. Rank `R` costs `4 + 2*R` practice points to advance. The trained ranks in Bluff, Bribe, Romance and Threaten improve their existing d20 skill bonuses. The original v36 note's d100 rank and level percentages are superseded by the current formula in the v50 section below. Profession levels/skill-up chances remain separate.
- Combat skill checks are earned for actual attempts. Named companions participating in relevant shared tasks can earn independent practice and XP where that character and action are both established in the scene.
- Confirmed encounter victory grants **`55 + 0.8 × enemy maximum HP`**, rounded, per defeated enemy (capped to 5,000 XP per battle). Only after the **last tracked hostile has been defeated and the following scene confirms no further hostile** is a battle paid. Eligible, identified allies who took part receive **70% of the victory XP**, individually. Each reward is save-receipted to prevent duplicate claims after a retry or refresh. Retreating, Vanishing, and unresolved battles do not grant victory XP.
- The **original scripted offline adventure** also grants combat practice and an idempotent XP award after defeating an opponent; it otherwise retains its own original damage, loot and action mechanics.

### UI and continuity
- **Character Record** shows Level 10–60, XP progress bar, expandable trained skill ranks, practice toward next rank and recent rewards.
- **Companion profiles** display individual levels and XP bars. Additional named expedition members have progression tracked in the hero record.
- **Hero selection** shows the actual level from saved character slots; player level and companion levels are also passed to the AI as informational, non-authoritative context, with explicit instructions not to invent XP or level gains.
- The main Adventure includes unobtrusive earned-XP messages and notifications upon skill increase or level-up.
- Offline service-worker cache **v36** includes both `progression.js` and `progression.css`.

**Validation:** Parsing checks passed for all edited scripts. Simulated checks confirmed skill gains and training, bonus/odds behavior, receipt-based duplicate protection, different progression for each companion, level 59→60 cap with zero overflow, registered extra expedition members, and delayed once-only XP after a battle is fully won. Full browser/cloud deployment and iPhone presentation have not yet been verified.


## Fresh character creation and veteran protection (v37)

**Grandfathered adventurers remain unchanged.** Snacky and his established party start at level 10 (or retain any level already earned), and older created hero slots retain their existing progression. Their money, history, companions, and story scenes are not rewritten.

**All characters created after this update** receive `startLevel:1` and an explicitly saved `startingZone`. Their local save begins with **1,500 copper (15 silver)**, HP 100, Energy 100, zero alarm, no previous victories, and the solo `new-hero-start` introductory screen rather than the veteran Hollow Raven checkpoint. Fresh progression saves contain **only the new hero**; no companion progression records or inherited parties are created. Newly encountered named companions can be recruited through earned gameplay.

Starting zones correspond to the chosen race's standard class-accessible level-one origin:
- Human — **Northshire Valley, Elwynn Forest**
- Dwarf / Gnome — **Coldridge Valley, Dun Morogh**
- Night Elf — **Shadowglen, Teldrassil**
- Orc / Troll — **Valley of Trials, Durotar**
- Undead — **Deathknell, Tirisfal Glades**
- Tauren — **Red Cloud Mesa, Mulgore**
- Skyborne (custom fictional race) — **Skyborne Enclave**, an original starting settlement

The first AI scene is constrained to that actual location, independently of the veteran campaign, and begins with no established companions, prior contacts, rewards, or completed missions. The starter screen's Party & Evidence panel becomes **Solo Journey & Supplies**, displaying the new player's actual starting details. Later scenes can develop friendships and parties normally.

The new leveling logic permits levels **1–60** and preserves existing saves at level 10+; character creation and inactive roster displays respect the new `startLevel` flag. `soa-progression-v1` remains slot-isolated and backed up with the hero's other files.

**Verification:** All modified scripts passed syntax parsing. Simulated loading showed established Snacky at level 10 with original allies; existing custom heroes at level 10; new heroes at level 1 with **only the hero progression record**; and a returning level-3 new hero resuming at level 3 without resets. Tests checked all race starting-zone mappings, 1,500-copper balance, correct solo opening scene, and independent campaign creation. Static shell cache updated to **v37**. Live Cloudflare deployment and iPhone rendering still require verification.


## Multi-pass stability and iPhone polish review (v38)

This release intentionally avoids rebalancing existing combat, changing plot canon or migrating user story history. The codebase was reviewed across character slots, progression, battle logic, companion UI, quest journal, portraits, UI styles, API story handling and offline caching.

### Improvements

- **Lower UI overhead:** Living Campaign refresh no longer redraws the companion panel twice; XP distribution refreshes character/companion progression once per completed encounter rather than after each participant's XP/practice. Journal rendering has been moved out of the every-button-redraw path into actual scene updates, so selecting a target or a combat action won't rebuild the journal unnecessarily.
- **Less browser-storage churn:** Re-registering a known party member doesn't rewrite the entire progression save unless a new actor actually needs to be created.
- **Safer save-slot restoration:** Restore verifies that at least one recognized save payload exists, snapshots all current keys, applies only changed keys, and rolls back if any storage operation fails. Changing the active character never reloads after a failed restore/roster commit.
- **Safer character creation:** All new-character save keys, the initial 1,500-copper starter state and the independent slot are written before the roster selection changes. If any stage fails, the previous character's save is recovered and the new roster entry is not retained. Existing established characters remain level 10+; new characters still start level 1 in their own zone.
- **Solo continuity:** Newly created adventurers do not inherit the three main-story companion interaction profiles unless one of those named characters is genuinely present as an established participant. Their reputation/faction screen is still available.
- **Mobile usability:** Section navigation respects the iOS safe-area offset, buttons/inputs have a visible keyboard focus indicator, and touch devices avoid costly fixed-background repaints. The parchment palette and layouts are otherwise preserved.
- **Offline cache:** service worker version **v38** includes all existing assets. API requests remain uncached and network-only.

### Regression review

All relevant JavaScript modules and the inline game engine parsed successfully. Simulated tests exercised character switching, interrupted storage writes with successful rollback, creating a new level-one character, failure during new-character initialization and roster write, independent save-slot values, progression rank/XP gains, one-time 135 XP victory grants with correct 95 XP per participating ally, repeated party registrations without extra writes, the level cap, and solo newcomer companion visibility. The ongoing campaign/story generation API logic was left intact. Live deployment and real iPhone Safari behavior are **not independently verified**.


## D&D-inspired ability scores and known-companion health (v39)

Each hero and named companion now has a **deterministic, level-aware six-stat sheet**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma; score modifiers; proficiency bonus; class Hit Die; calculated class HP benchmark; Armor Class; Initiative; Passive Perception; and class saving throws. Stats depend on **race, class and current saved level**, and advance at 4-level milestones with a 20-point per-stat cap. They are regenerated from the character's saved identity and progression record, not rerolled on every page load. The new sheet is visible in the Character tab and the named companions' profiles.

**Snacky** has a unique SI:7 field-veteran bonus of +2 Dexterity and +2 Wisdom in addition to his normal Gnome/Rogue profile; the stat sheet shows this distinction. The story director receives the hero's six scores for character portrayal, but the browser remains authoritative for all actual rolls and damage.

**Mechanical integration:** The existing Bluff/Bribe/Romance/Threaten d20 bonuses now include the derived Charisma modifier and appear consistently on the stat panel and dice preview. Stealth/Movement use Dexterity; Engineering uses Intelligence; Investigation uses Wisdom; Rest uses Constitution; combat uses Dexterity for Rogues and Strength for melee Warriors/Paladins. The existing d100 success odds, hit chances and damage previews include these modifiers; Armor Class influences enemy retaliation odds. One exchange remains one action, and normal energy, XP and cap rules are unchanged.

**Companion HP:** The original earlier combat model left Pippa, Bromli and Lethariel at `null` HP because it had no class/Constitution HP rules and refused to invent a number. They now receive a **calculated baseline** using their class Hit Die, Constitution modifier and saved level when present as confirmed battle participants. At level 10 without previous health records, expected starting totals are Pippa **63 HP**, Bromli **94 HP**, Lethariel **63 HP**. Manually recorded or combat-established HP remains authoritative and is not overwritten. Estimated HP is marked as derived; future level increases increase its maximum without restoring existing wounds. Unidentified or unconfirmed allies still display unknown HP until they acquire a trustworthy profile. Snacky's existing gameplay **92/100 or other saved values remain unchanged**; his sheet's HP figure is explicitly a D&D class benchmark, not a retroactive replacement of the old game HP.

**Offline cache:** v39 contains `abilities.js` and `abilities.css` and loads the engine after character progression but before the Living Campaign. No save keys, passwords, portraits, chapter records, or current relationship values are changed.

**Verification:** Checked syntax of all changed scripts, class/race/level sheets, correct save modifiers, the derived level-10 HP totals, manual-health precedence, wound-preserving level-ups and combat-calculation wiring. Browser-side behavior was simulated; actual Cloudflare deployment and live iPhone UI have not yet been verified.


## Stability and calculation corrections (v50)

This pass reconciles previews with the actual resolver, validates imported and saved state, and makes storage/API failures easier to detect. Existing game saves are not migrated or reset.

### Current calculation rules
- Abstract actions use `d100`; a roll succeeds when it is at or below the displayed target. The target is the action's base chance, plus **3 points per ability modifier**, **2 points per trained rank**, **0.2 points per hero level above level 1**, and **12 points for Easy** or **minus 22 for Hard**, then **minus 5 per alert level**. The result is rounded and clamped to **10–95%**. An action recovers up to 10 Energy after paying its displayed gross cost; previews show both. A mismatch between inferred action skill and displayed type could previously make the preview, consequence text, and awarded practice disagree; all now use the resolved skill.
- Social checks use their d20/DC system. Tracked combat uses d20 + proficiency + **Dexterity for Rogues** or **Strength for Warriors and Paladins**, plus equipment attack bonuses, against target AC. Natural 1 misses and natural 20 hits and doubles weapon dice. Weapon dice and modifiers come from the class/action; damage bonuses from equipped items are included, then resistances and vulnerabilities modify final damage. Combat skill rank does not currently change tracked d20 accuracy; it earns practice/XP and affects abstract d100 combat checks.
- Combat previews now show equipment attack and raw damage bonuses, and identify advantage when it applies. The raw damage number is before critical extra dice and target mitigation. A valid Rogue Riposte is an automatic hit after a parry and uses its own fixed damage formula plus Dexterity and equipment damage bonuses.
- Rare relic eligibility is a stable **2% hash chance per character and elite contract**, so reloading cannot reroll it and every character has an independent result. Partial quest ledgers receive safe defaults and malformed entries are filtered.

### Save, API, and runtime protections
- Offline save imports require a known scene and valid stat, encounter, inventory, and journal shapes. Valid older saves with optional missing fields receive defaults. Malformed local saves are left untouched and gameplay pauses until the player imports a valid save or confirms a restart. Storage failures are surfaced, and ordinary actions pause until saving succeeds again.
- The character menu can restore a complete versioned all-character archive, including stories, progression, relationships, reputation, and portraits. It validates the full archive, asks before replacement, snapshots the current state, and rolls back best-effort if storage fails.
- Living Campaign saves normalize malformed partial state; an unreadable stored campaign is preserved and blocked from overwriting until a full-roster backup is restored. A failed campaign write stops turn progression until a save retry succeeds. Relationship, reputation, character and campaign save failures now report through the UI.
- Campaign and story endpoints enforce actual streamed request byte limits (64 KiB and 12 KiB), even when `Content-Length` is absent or incorrect. Upstream provider details are not returned to clients. API routes remain network-only.
- The mobile navigation files are now loaded by the page and cached for offline use. An unknown saved tab falls back to Adventure, and storage exceptions no longer break navigation.
- Offline cache **v51** includes the save validator and mobile navigation assets. The local checks now run through `npm run check` and `npm test`, with a GitHub Actions workflow on pull requests and `main`. All 27 Node tests passed, plus 128 faction-rule assertions. Coverage includes save corruption preservation, journal-import validation, XP rollback on storage failure, request-size enforcement, and mission reward gating. Live iPhone restore behavior still needs manual verification.
- The public AI endpoint still needs a Cloudflare rate limit configured in the hosting account. The repository does not contain that account binding or WAF configuration; do not assume the shared access code is per-player authentication.
