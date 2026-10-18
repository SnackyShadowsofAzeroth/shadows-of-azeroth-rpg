"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "characters.js"), "utf8");
function functionBlock(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`\nfunction ${nextName}(`, start);
  assert.notEqual(start, -1, `${name} is present`);
  assert.notEqual(end, -1, `${nextName} follows ${name}`);
  return source.slice(start, end);
}

const SAVES = ["soa-save-v1", "soa-campaign-v1", "soa-companions-v1", "soa-reputation-v1", "soa-campaign-enabled", "soa-progression-v1"];

function storageHarness({ failReadAt = null, failWriteAt = null, initial = {} } = {}) {
  const values = { ...initial };
  const calls = { reads: 0, writes: 0, removes: 0, alerts: [] };
  let readFailureUsed = false;
  let writeFailureUsed = false;
  const localStorage = {
    getItem(key) {
      calls.reads++;
      if (!readFailureUsed && calls.reads === failReadAt) { readFailureUsed = true; throw new Error("storage read failed"); }
      return Object.hasOwn(values, key) ? values[key] : null;
    },
    setItem(key, value) {
      calls.writes++;
      if (!writeFailureUsed && calls.writes === failWriteAt) { writeFailureUsed = true; throw new Error("storage write failed"); }
      values[key] = String(value);
    },
    removeItem(key) { calls.removes++; delete values[key]; },
    get length() { return 0; },
    key() { return null; },
  };
  return { values, calls, localStorage };
}

function restoreContext(harness) {
  const target = Object.fromEntries(SAVES.map(key => [key, "new:" + key]));
  const context = {
    SAVES,
    SLOT_PREFIX: "slot:",
    localStorage: harness.localStorage,
    window: { soaSaveRules: { isIntegrityBlocked: () => false } },
    read: key => key === "slot:target-slot" ? target : null,
    alert: message => harness.calls.alerts.push(message),
  };
  vm.createContext(context);
  vm.runInContext(functionBlock("restore", "baseState") + "\nglobalThis.runRestore = restore;", context);
  return context;
}

test("character switch does not delete saves when its snapshot read fails", () => {
  const initial = Object.fromEntries(SAVES.map(key => [key, "old:" + key]));
  const harness = storageHarness({ failReadAt: 1, initial });
  const context = restoreContext(harness);

  assert.equal(context.runRestore("target-slot"), false);
  assert.deepEqual(harness.values, initial);
  assert.equal(harness.calls.writes, 0);
  assert.equal(harness.calls.removes, 0);
});

test("character switch restores the full previous save after a partial write", () => {
  const initial = Object.fromEntries(SAVES.map(key => [key, "old:" + key]));
  const harness = storageHarness({ failWriteAt: 3, initial });
  const context = restoreContext(harness);

  assert.equal(context.runRestore("target-slot"), false);
  assert.deepEqual(harness.values, initial);
  assert.equal(harness.calls.alerts.length, 1);
});

test("roster restore leaves storage untouched when its pre-mutation snapshot fails", () => {
  const initial = Object.fromEntries(SAVES.map(key => [key, "old:" + key]));
  initial["soa-character-roster-v1"] = "old-roster";
  const harness = storageHarness({ failReadAt: 1, initial });
  const archive = { roster: { active: "hero-a", characters: [{ id: "hero-a" }] } };
  const context = {
    SAVES,
    ROSTER_KEY: "soa-character-roster-v1",
    SLOT_PREFIX: "soa-character-slot-v1-",
    ENTER_KEY: "soa-character-entered",
    active: { id: "hero-a" },
    rosterLoadBlocked: false,
    localStorage: harness.localStorage,
    window: { soaSaveRules: { validateRosterBackup: value => value, isIntegrityBlocked: () => false, clearAllCorruption() {} } },
    confirm: () => true,
    snapshot: () => true,
    alert: message => harness.calls.alerts.push(message),
  };
  vm.createContext(context);
  vm.runInContext(functionBlock("restoreRosterBackup", "importRosterBackupFile") + "\nglobalThis.runRestore = restoreRosterBackup;", context);

  assert.equal(context.runRestore(archive), false);
  assert.deepEqual(harness.values, initial);
  assert.equal(harness.calls.writes, 0);
  assert.equal(harness.calls.removes, 0);
});
