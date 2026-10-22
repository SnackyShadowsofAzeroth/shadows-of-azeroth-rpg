"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "campaign.js"), "utf8");
const start = source.indexOf("async function advance(");
const end = source.indexOf("\nfunction migrateCompanionDisplayNames(", start);
assert.notEqual(start, -1, "advance is present");
assert.notEqual(end, -1, "the next function follows advance");

test("a stalled story request releases the UI and preserves the selected action for retry", async () => {
  const pending = { action: "Leave the vault", resolution: "Success: d100 roll 24", startedAt: 123 };
  const campaign = { scene: { title: "Vault and Exit", location: "Stormwind" }, journal: [], history: [],
    turn: 48, flags: {}, quests: { missions: {} }, pending, lastAction: pending.action, lastResult: pending.resolution };
  let timeoutDelay = 0;
  let requestSignal;
  let displayedStatus = "";
  let saveCalls = 0;
  let refreshCalls = 0;
  const context = vm.createContext({
    campaign, busy: false, MAX: 24, s: { hp: 92, en: 100, money: 0, alert: 0 }, navigator: { onLine: true },
    window: {
      soaSaveRules: { isIntegrityBlocked: () => false },
      soaCharacters: { isNewCharacter: () => false, profile: () => null },
      soaResources: { forClass: () => ({ label: "Energy" }) },
      soaCompanions: { getRecent: () => [], getProfiles: () => ({}), getRelationships: () => ({}), getConversationContext: () => ({}) },
      soaAbilities: { get: () => null }, soaReputation: { getStandings: () => ({}), getDevelopments: () => [] },
      soaChronicle: { context: () => null },
    },
    AbortController: class { constructor() { this.signal = {}; requestSignal = this.signal; } abort() {} },
    setTimeout: (_callback, delay) => { timeoutDelay = delay; return 1; }, clearTimeout: () => {},
    fetch: async (_url, options) => {
      assert.equal(options.signal, requestSignal);
      const error = new Error("request aborted"); error.name = "AbortError"; throw error;
    },
    get: () => ({ textContent: "" }), accessCode: () => "configured", status: message => { displayedStatus = message; },
    draw: () => {}, store: () => { saveCalls++; return true; }, fmtMoney: () => "0c", originOfCampaign: () => "",
    livingEnemies: () => [], combatParty: () => [], refreshDisplay: () => { refreshCalls++; },
    returnToAdventure: mode => { context.returnMode = mode; },
  });
  const resourceStart = source.indexOf("function resourceName(");
  const resourceEnd = source.indexOf("\nfunction resolvedCombatAbility(", resourceStart);
  vm.runInContext(source.slice(resourceStart, resourceEnd) + "\n" + source.slice(start, end), context);

  await context.advance(pending.action, pending.resolution, false);

  assert.equal(timeoutDelay, 30000);
  assert.match(displayedStatus, /timed out.*selection is saved.*Retry/i);
  assert.equal(campaign.pending, pending);
  assert.equal(campaign.lastAction, pending.action);
  assert.equal(campaign.lastResult, pending.resolution);
  assert.equal(context.busy, false);
  assert.equal(context.returnMode, "status");
  assert.equal(saveCalls, 1);
  assert.equal(refreshCalls, 1);
});
