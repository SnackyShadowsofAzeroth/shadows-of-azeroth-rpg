"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: {}, structuredClone };
vm.createContext(context);
for (const file of ["character-rules.js", "save-rules.js"]) {
  const fullPath = path.join(__dirname, "..", "public", file);
  vm.runInContext(fs.readFileSync(fullPath, "utf8"), context, { filename: fullPath });
}
const rules = context.window.soaSaveRules;

function validSave(overrides = {}) {
  return {
    id: "junction", hp: 75, en: 80, money: 1200, time: 7, alert: 0,
    seen: [], flags: {}, enemy: null,
    log: ["Progress kept"],
    ...overrides,
  };
}

test("validates and normalizes older offline saves without dropping their state", () => {
  const save = validSave({ id: "new-hero-start", equipment: ["Worn Practice Dagger"], flags: { visited: true } });
  const normalized = rules.validateOfflineSave(save);
  assert.equal(normalized.en, 80);
  assert.equal(normalized.money, 1200);
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.equipment)), ["Worn Practice Dagger"]);
  assert.equal(normalized.flags.visited, true);

  const partial = rules.validateOfflineSave({ id: "junction", hp: 40 });
  assert.equal(partial.en, 100);
  assert.equal(partial.money, 0);
  assert.equal(partial.time, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(partial.log)), []);
});

test("fresh installs get a clean save instead of embedded playthrough progress", () => {
  const fresh = rules.freshOfflineSave();
  assert.equal(fresh.id, "new-hero-start");
  assert.equal(fresh.hp, 100);
  assert.equal(fresh.money, 1500);
  assert.equal(fresh.time, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(fresh.log)), ["A new journey begins.", "Starting funds: 15 silver."]);
});

test("rejects invalid scenes, out-of-range stats, and malformed encounters", () => {
  assert.throws(() => rules.validateOfflineSave(validSave({ id: "not-a-scene" })), /unknown scene/);
  assert.throws(() => rules.validateOfflineSave(validSave({ hp: 101 })), /Health/);
  assert.throws(() => rules.validateOfflineSave(validSave({ money: -1 })), /Save values/);
  assert.throws(() => rules.validateOfflineSave(validSave({ id: "combat", enemy: null })), /no saved opponent/);
  assert.throws(() => rules.validateOfflineSave(validSave({ enemy: { name: "Guard", hp: 80, max: 40, damage: 6 } })), /Encounter/);
  assert.throws(() => rules.validateOfflineSave(validSave({ log: "not an array" })), /Journal/);
});

function validArchive(overrides = {}) {
  const person = { id: "snacky", name: "Snacky Lugnuts", race: "Gnome", faction: "Alliance", className: "Rogue" };
  const slot = {
    "soa-save-v1": JSON.stringify(validSave()),
    "soa-campaign-v1": JSON.stringify({ turn: 4, history: [] }),
    "soa-companions-v1": null,
    "soa-reputation-v1": null,
    "soa-campaign-enabled": "0",
    "soa-progression-v1": null,
  };
  return {
    kind: "shadows-of-azeroth-multi-character-backup", version: 1,
    roster: { version: 1, active: "snacky", characters: [person] },
    slots: { snacky: slot }, portraits: {},
    ...overrides,
  };
}

test("accepts a complete roster archive and rejects broken character/save mappings", () => {
  const archive = rules.validateRosterBackup(validArchive());
  assert.equal(archive.roster.active, "snacky");
  assert.equal(archive.slots.snacky["soa-campaign-enabled"], "0");

  assert.throws(() => rules.validateRosterBackup(validArchive({ slots: {} })), /slots do not match/);
  assert.throws(() => rules.validateRosterBackup(validArchive({
    roster: { version: 1, active: "snacky", characters: [{ id: "snacky", name: "Snacky", race: "Gnome", faction: "Horde", className: "Rogue" }] },
  })), /invalid profile/);
  assert.throws(() => rules.validateRosterBackup(validArchive({
    slots: { snacky: { ...validArchive().slots.snacky, "soa-save-v1": "{broken" } },
  })), /unreadable save/);
  assert.throws(() => rules.validateRosterBackup(validArchive({
    portraits: { snacky: "data:image/png;base64,AAAA" },
  })), /portrait data/);
});

test("rejects malformed quest objectives and personal journal entries in imported backups", () => {
  const campaign = {
    turn: 48,
    chronicle: {
      schema: 1, act: 2, chapter: 1, actTitle: "Shadows Over Stormwind", chapterTitle: "The Threat in the Capital",
      archives: [],
      quests: [{ id: "active", title: "The Threat", status: "active", objectives: [{ id: "step", label: "Investigate", done: "yes" }] }],
      entries: [],
    },
  };
  assert.throws(() => rules.validateCampaignSave(campaign), /quest objective/);
  campaign.chronicle.quests[0].objectives[0].done = false;
  campaign.chronicle.entries = [{ id: "entry-1", text: "A clue", createdAt: "not a date" }];
  assert.throws(() => rules.validateCampaignSave(campaign), /journal entry/);
  assert.throws(() => rules.validateRosterBackup(validArchive({
    slots: { snacky: { ...validArchive().slots.snacky, "soa-campaign-v1": JSON.stringify(campaign) } },
  })), /journal entry/);
});

test("malformed local JSON raises an integrity lock without changing the saved bytes", () => {
  const saved = "{unfinished campaign";
  const store = new Map([["soa-campaign-v1", saved]]);
  context.localStorage = { getItem: key => store.get(key) ?? null };
  const parsed = rules.readStoredJSON("soa-campaign-v1");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.corrupt, true);
  assert.equal(rules.isIntegrityBlocked(), true);
  assert.equal(store.get("soa-campaign-v1"), saved);
  rules.clearCorruption("soa-campaign-v1");
  assert.equal(rules.isIntegrityBlocked(), false);
});

test("validates the local character roster without repairing malformed profiles", () => {
  const roster = {
    version: 1, active: "snacky",
    characters: [{ id: "snacky", name: "Snacky Lugnuts", race: "Gnome", faction: "Alliance", className: "Rogue", professions: {} }],
  };
  assert.equal(rules.validateCharacterRoster(roster).characters[0].name, "Snacky Lugnuts");
  assert.throws(() => rules.validateCharacterRoster({ ...roster, active: "missing" }), /active slot/);
  assert.throws(() => rules.validateCharacterRoster({ ...roster, characters: [{ ...roster.characters[0], professions: [] }] }), /invalid profile/);
});
