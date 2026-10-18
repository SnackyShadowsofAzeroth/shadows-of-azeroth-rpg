# Shadows of Azeroth — Campaign Bible and Quality Standard

**Canonical interactive-chat checkpoint (2026-10-16):** Chapter I, Part LXXIX, **11:29 PM game time**. Snacky has completed TEST on the Archive inner-perimeter service interface (roll 16+7=23, DC19). Its readout confirms that his **active emergency supervisory override permits his individual crossing**; crossing will be logged. **He has NOT crossed.** The pressure strip and silver conductors are active and unchanged; ISOLATE and RESET untouched; the unlocked Archive antechamber door remains ajar. Record 07-13 remains separately restricted. Facility alarm count **zero**.

> **Important implementation boundary:** This is the story continuity standard for the ChatGPT campaign. The web app currently maintains a distinct offline prototype save and AI living-campaign save; neither is automatically synchronized with ChatGPT. Do not silently overwrite, migrate, or conflate saves.

## Creative and presentation direction

- Second-person atmospheric fantasy espionage centered on **Snacky Lugnuts**, an SI:7 **Combat Swords Gnome Rogue**. He has a bald crown, spiky black side/back hair, black beard and curled mustache, matching multifaceted emerald Gnomish Goggles, teal/blue armor, red pauldrons.
- Story paragraphs concise, strong descriptions and meaningful decisions, **about 30% less dialogue** than earlier dialogue-heavy parts. Don't stretch a simple decision into several inconsequential scenes.
- Refined compact interface: chapter/part/time; discovery and security state; important checks; stat panel with **green (#22b45e) HP bar**, **yellow (#f0ca23) Energy bar**, **full-width single-line money**; Sprint/Blade Flurry/Evasion/Vanish/Riposte immediately beneath stats; compact party, objective, evidence summaries; subtly green/amber/red **clickable** choice cards with difficulty on a line **under** the title. A bespoke hand-drawn scene illustration **only at a NEW CHAPTER**.
- Show exact roll, modifier, DC, and immediate consequence. Mark verified observations distinctly from hypotheses and NPC claims. Minimize repetition of unchanged inventory by preserving an authoritative ledger; expose the ledger when useful.
- Choices A–G or fewer when appropriate. Custom action always supported. If the player chooses multiple actions with an order, **resolve in that order**, stopping for a new player decision when an intervening consequence requires one.

## Rules invariant

- **Exactly one consequential combat exchange per player turn.** Do not auto-play additional combat rounds. Enemy and ally reactions, damage, armor, positioning and status are shown for the exchange.
- **+10 Energy at end of every combat exchange**, including cost-free actions; cap 100. Deduct action costs explicitly. No phantom regeneration outside combat just because a paragraph passed.
- **Riposte is not usable without a qualifying successful parry.** Sprint, Blade Flurry, Evasion and Vanish have cooldowns as shown in character sheet.
- Track every item, currency unit, ammunition, consumable, clue, prisoner, party HP, location, elapsed time, security log, alert and cooldown. **Automatically pocket enemy coins when an enemy is actually looted**, never on an unsearched defeated enemy.
- Do not heal a hostile prisoner merely because companions propose it: player declined medical expenditure on the critically wounded captured officer; his untreated condition continues with realistic stakes.
- Maintain the **zero-facility-alarm challenge**, separate from suspicious enemies, logged credentials, and possible future reviews. Logged access is NOT itself an alarm.
- Do not turn speculative testimony from the Memory Anchor into established facts.

## Canonical state — Chapter I, Part LXXIX

### Stats and position
- Snacky: **92/100 HP**, **100/100 Energy**, **22g 60s 53c**, out of combat, at Archive inner-perimeter threshold. **Prayer of Clarity expired**. Toxic Revenger sheathed. No current injuries this turn.
- Forward team: Pippa Sparkwhistle healthy; Bromli Ironkeg **100/100 HP**, both concealed at corridor bend. Each of Snacky, Pippa, Bromli has one working **Sparkwhistle Whisper-Link Mk II** wireless communicator (3 total), shared unencrypted push-to-talk. ~100ft open air and ~40–60ft stone are *estimates*, not guarantees; metal/wards can block signal. Antenna adjustment allows usable signal at reinforced doorway; deeper signal untested. Signals: two clicks hold, three withdraw, sustained transmission emergency. Battery ~2 hours intermittent. Three units constructed from Pippa's spares; no duplicate unused spares.
- Rear team at checkpoint: Elara Voss (custody of intact **sealed Memory Anchor**, plus her journal/brass key) guards Harlan Vex (bound **35/100 HP**); Garrick Vale guards approach and captured weapons; Lethariel priestess (magic diminished) watches bound Internal Security Officer (**12/110 HP**, critically wounded and untreated).
- Corvin bound **47/75 HP** outside mausoleum; two earlier prisoners secured at **Scarlet Raven Tavern** with Night Watch. SI:7 courier to **Mathias Shaw unanswered**. Characters' hidden identities remain unresolved.
- Authentication: silver patrol badge used **twice**, both junction transit events recorded; central 4 pressure plates rearmed behind scout team. Genuine **Level III Command Token** accepted provisionally by brass Archive Sentinel, and genuine **Silver Archive Key** (Subject07 / Sequence13 / Channel04) optically recognized. No mnemonic plate contact or memory sync. Snacky successfully bluffed an emergency supervisory override (Deception 22 vs DC21); override **logged for Archivist review**. Sentinel nonhostile; only Snacky has provisional access; Pippa/Bromli **not** separately authorized. Threshold TEST confirms Snacky's passage permitted but recorded. No threshold crossing yet. **Alarm zero**.
- Locked restricted record: **Archive Record 07-13**, Archivist **Magister Oren Valecroft**, **Seventh Witness**, **Protocol Mirrorfall**, commander **Aldren Thorne**. Meaning and reliability of relevant memories still in question.
- Western lab **untouched**: mnemonic console closed and unactivated; security reporting filament unchanged; six inert crystals and empty Subject07 extraction receptacle; living unidentified suspended occupant in **Chamber IV-03** stable; brass skull automaton suspicious but unalerted. Pippa's successfully built **Passive Mnemonic Diagnostic Reader** independently tested, disconnected, central VII contact physically ceramic-blocked; clockwork spider with message/possible lookalike evidence.
- Other equipment: Ruby-Adorned Longsword, Bloody Brass Knuckles, Toxic Revenger, Meteor Shard; Gnomish Goggles, Parachute Cloak, Disarming Wrench, Thieves' Tools, Trap Probe, Arcane Resonance Detector, **alchemical charge ×1**, **60ft rope**, **2 lanterns**, **3 oil**, **6 rations**, **3 waterskins**, medical kit, chalk, wraps, cord and spare torch. Confiscated patrol crossbow +8 bolts, swords/knives, signaling horn/whistle, security keys I–III, extra brass/iron keys, HR-W12 token, Subject Index, Thorne Memorandum 07-C, **partially decoded** coded officer notebook, security directives and rosters, insignias, correspondences and investigative notes remain accounted for.
- Preserve economy exactly until a verified transaction or loot.

## Quality gates for every turn

1. Read checkpoint/state, chosen action(s), and current positioning.
2. Resolve only authorized action(s); if a complication introduces combat, stop after **one** exchange for input.
3. Apply delta to canonical ledger: clock, HP, Energy, cooldowns, inventory, cash, alerts, evidence, AI testimony confidence, positioning.
4. Distinguish **unverified inference**, **observed fact**, **authorized but logged** and **alarmed**.
5. Check conservation: sum of communicator count=3, supplies consistent, time nondecreasing, money changes only with transactions/loot; previous state remains recoverable.
6. Write short narrative and clear choice consequences; display concise UI.
7. Never claim GitHub changes, Cloudflare deployment, Gemini reachability, cross-device saves or sync without independently verifying them.

## Web-app engineering review (status as of 2026-10-17)

**Save recovery — addressed in v51.** Offline saves, campaign journals and complete roster archives are validated before application. All-character archives include campaign and per-character data and restore with confirmation and best-effort rollback. Malformed local saves are preserved instead of silently replaced; XP and skill awards roll back if storage fails. Live iPhone restore testing remains outstanding.

**Action and combat calculations — partly addressed in v50.** Inferred action skill now determines the preview, energy cost, result text and practice credit together. Tracked combat preview now includes equipment bonuses, and attack rolls use Dexterity for Rogues or Strength for Warriors/Paladins. Combat remains one player exchange at a time; local mechanics remain authoritative and narration cannot grant unverified currency or loot. Broader game balance should be reviewed separately from correctness.

**Continuity — current inputs are state-based.** The server receives the prior scene, saved history, campaign origin and starting zone. New scenes remain optional online narration; the AI does not write gameplay state. Long-campaign continuity still needs real play testing.

**Retry safety — partially addressed.** Chosen campaign actions are recorded in the pending save before the network request, and retrying scene generation does not reapply the action. Storage is split across local keys, so atomic writes across all character, relationship and progression records cannot be guaranteed if the browser terminates during a write.

**Offline-first and mobile UX — implemented with live-device checks pending.** The legacy adventure is local, API routes are not cached, and recent scenes remain available from the save. The mobile navigation script and stylesheet are now linked and included in the offline cache; unknown saved tabs fall back to Adventure. Cloudflare and iPhone Safari behavior still require verification.

**Server hardening — partly addressed in v50.** Request bodies are bounded by bytes read from the stream (64 KiB Campaign, 12 KiB Story), and upstream provider details are withheld. Input fields remain individually bounded. Per-user rate limiting and replay abuse protection require a Cloudflare-side policy or a durable shared rate-limit store.

**Regression tests — expanded in v51.** Automated checks now cover race/faction restrictions, action calculation alignment, combat preview modifiers, save and archive validation, nested journal records, campaign normalization, quest migration, rare reward stability, request size enforcement and mobile navigation fallback. GitHub Actions runs syntax and test checks on pull requests and `main`. Browser interaction, queued-request retries, offline reloads and complete iPhone backup restoration remain manual checks.

## Last action and next decision

The last decision was **Option B: run TEST diagnostic**, successfully completed at 11:29 PM. Snacky stands outside the Archive antechamber with the Sentinel nonhostile, authorized to cross normally but the act would be logged. Next user action is undecided; **do not automatically enter**.
