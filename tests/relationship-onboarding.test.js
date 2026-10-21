"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const reputationSource = fs.readFileSync(path.join(__dirname, "..", "public", "reputation.js"), "utf8");
const companionsSource = fs.readFileSync(path.join(__dirname, "..", "public", "companions.js"), "utf8");

function element(tagName) {
  return {
    tagName, children: [], style: {}, append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }, setAttribute() {}, remove() {},
  };
}

function startReputation({ profile = { id: "hero-new", faction: "Horde" }, saved = null } = {}) {
  const values = new Map(saved ? [["soa-reputation-v1", JSON.stringify(saved)]] : []);
  const document = { getElementById: () => null, createElement: element };
  const window = {
    soaCharacters: { profile: () => profile },
    soaSaveRules: {
      readStoredJSON(key) { const value = values.get(key); return { ok: true, value: value ? JSON.parse(value) : null }; },
      validateReputationSave: value => value,
      isIntegrityBlocked: () => false,
      reportCorruption() {},
    },
  };
  const context = { document, window, localStorage: { setItem: (key, value) => values.set(key, value) } };
  vm.runInNewContext(reputationSource, context, { filename: "reputation.js" });
  return window.soaReputation;
}

function startCompanions() {
  const allies = [];
  const values = new Map();
  const document = {
    getElementById: () => null, createElement: element, querySelector: () => null,
    addEventListener() {},
  };
  const window = {
    soaCharacters: { profile: () => ({ id: "hero-new", origin: "custom" }), isNewCharacter: () => true },
    soaLivingCampaign: { getState: () => ({ combatAllies: allies, turn: 1 }) },
    soaSaveRules: {
      readStoredJSON(key) { const value = values.get(key); return { ok: true, value: value ? JSON.parse(value) : null }; },
      validateCompanionsSave: value => value,
      isIntegrityBlocked: () => false,
      reportCorruption() {},
    },
  };
  const context = { document, window, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) } };
  vm.runInNewContext(companionsSource, context, { filename: "companions.js" });
  return { api: window.soaCompanions, allies };
}

test("a new hero starts with no faction standings, including migrated faction-only defaults", () => {
  const reputation = startReputation({ saved: {
    factions: { stormwind: { value: 15 }, horde: { value: -15 } }, individuals: {}, events: [], handled: [], notices: [],
  } });
  assert.deepEqual(JSON.parse(JSON.stringify(reputation.getStandings())), {});
  assert.equal(reputation.fromAction({ id: "action-1", action: "Help Stormwind patrol", resolution: "Success: helped" }), true);
  assert.equal(reputation.getStandings().stormwind.value, 8);
  assert.equal(Object.keys(reputation.getStandings()).length, 1);
});

test("a new hero sends no companion profiles or relationship scores before meeting an ally", () => {
  const { api, allies } = startCompanions();
  assert.deepEqual(JSON.parse(JSON.stringify(api.getProfiles())), {});
  assert.deepEqual(JSON.parse(JSON.stringify(api.getRelationships())), {});
  assert.deepEqual(JSON.parse(JSON.stringify(api.getConversationContext())), {});
  assert.equal(api.applyDialogueOutcome({ id: "early-dialogue", target: "pippa", tone: "friendly", success: true }), false);

  allies.push({ name: "Pippa Sparkwhistle" });
  assert.equal(api.applyDialogueOutcome({ id: "first-meeting", target: "pippa", tone: "friendly", success: true }), true);
  assert.equal(api.getRelationships().pippa.trust, 4);
  assert.deepEqual(Object.keys(api.getProfiles()), ["pippa"]);
});
