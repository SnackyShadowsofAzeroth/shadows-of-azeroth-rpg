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

