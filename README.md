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
