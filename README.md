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
