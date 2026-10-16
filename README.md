# Shadows of Azeroth — Hybrid RPG

An unofficial, offline-first mobile RPG prototype featuring Snacky Lugnuts. This is not affiliated with Blizzard Entertainment.

## Cloudflare Pages configuration

Connect this repository to **Cloudflare Pages via Git integration**. Production branch: `main`; framework: None; build command: blank; output directory: `public`.

The `functions/api/story.js` Cloudflare Pages Function is automatically deployed from the repository root (not the public folder). The app's normal offline PWA logic and saves still work without AI.

### Required server secrets

In Cloudflare dashboard, open **Workers & Pages → your Pages project → Settings → Variables and Secrets** (or Environment variables, depending on UI). Add these to **Production**:

- `OPENAI_API_KEY` — your OpenAI API platform key. Set as encrypted **Secret**, never as a public variable and never commit to GitHub.
- `AI_ACCESS_CODE` — a long random passphrase you invent. Also set as **Secret**. Enter this code into the app's AI Story Director panel, *not* your API key.
- `OPENAI_MODEL` — optional plaintext variable, default `gpt-4.1-mini`. Select a model enabled for your API account.

Save changes and **redeploy** the production deployment so your Function receives the secrets. Check `https://YOUR-SITE.pages.dev/api/story`: a GET should return a JSON status message. In the app, enable AI, provide the access code, and tap Generate narration. Credits must be active at platform.openai.com.

**Security note:** this access code is a simple shared password, not robust authentication. Anyone who obtains it can make paid AI requests through your site. Since the site is public, consider adding Cloudflare Access, proper identity-based auth, per-user rate limiting, and spending limits before sharing AI functionality widely. Never share your API key or the access code in screenshots, GitHub, or chat. Current AI requests are intentionally restricted to SHORT scene embellishments and do not change stats, inventory, saved game state, or combat decisions. Cloudflare route only accepts same-origin requests plus a shared code; someone with the code could still script requests. Costs apply.

### Offline behavior

Open the live Pages URL in Safari once, add to Home Screen, and reload online to cache the game. Core story, turn-based combat, auto-saves, and JSON save export/import work offline. AI narration requires internet. Save data is local to that browser installation and doesn't synchronize across devices.

### Story canon and limits

The prototype resumes at Chapter I, Part LI at 10:23 PM with Snacky at 92/100 HP, 100/100 Energy and 22g 60s 53c. This first AI integration is an OPTIONAL atmospheric narrator only. Future phases can introduce validated AI-proposed dialogue/choices through a rules engine, without allowing AI to invent mechanical outcomes.
