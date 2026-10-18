"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const rulesSource = fs.readFileSync(path.join(root, "public", "save-rules.js"), "utf8");
const progressionSource = fs.readFileSync(path.join(root, "public", "progression.js"), "utf8");

function setup(initial = {}) {
  const values = new Map(Object.entries(initial));
  const calls = { writes: 0, warnings: [] };
  let failNextWrite = false;
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      calls.writes++;
      if (failNextWrite) { failNextWrite = false; throw new Error("quota exceeded"); }
      values.set(key, String(value));
    },
  };
  const context = {
    localStorage,
    structuredClone,
    document: { addEventListener() {}, getElementById() { return null; } },
    window: { soaReportStorageFailure: message => calls.warnings.push(message) },
  };
  vm.createContext(context);
  vm.runInContext(rulesSource, context, { filename: "save-rules.js" });
  vm.runInContext(progressionSource, context, { filename: "progression.js" });
  return {
    values, calls, context,
    failNextWrite() { failNextWrite = true; },
    progression: context.window.soaProgression,
  };
}

test("XP and skill practice roll back together if persistence fails", () => {
  const harness = setup();
  const before = harness.values.get("soa-progression-v1");
  harness.failNextWrite();

  const result = harness.progression.check({ receipt: "turn-1", name: "investigate", success: true, difficulty: "hard" });

  assert.equal(result.awarded, 0);
  assert.equal(result.storageWarning, true);
  assert.equal(result.rankUp, false);
  assert.equal(harness.progression.progress().totalXp, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(harness.progression.skill("hero", "investigate"))), { rank: 0, practice: 0, attempts: 0, successes: 0 });
  assert.equal(harness.values.get("soa-progression-v1"), before);
  assert.equal(harness.calls.warnings.length, 1);
});

test("battle XP for hero and companions is one storage transaction", () => {
  const harness = setup();
  const before = harness.values.get("soa-progression-v1");
  harness.failNextWrite();

  const result = harness.progression.battle({ receipt: "encounter-1", defeated: [{ maxHp: 50 }], allies: ["pippa"] });

  assert.equal(result.awarded, 0);
  assert.equal(result.storageWarning, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.party)), []);
  assert.equal(harness.progression.progress().totalXp, 0);
  assert.equal(harness.progression.progress("pippa").totalXp, 0);
  assert.equal(harness.values.get("soa-progression-v1"), before);
});

test("corrupt progression data is preserved and cannot be overwritten with defaults", () => {
  const original = "{broken progression";
  const harness = setup({ "soa-progression-v1": original });
  const result = harness.progression.check({ receipt: "turn-1", name: "investigate", success: true, difficulty: "hard" });

  assert.equal(result.storageWarning, true);
  assert.equal(harness.values.get("soa-progression-v1"), original);
  assert.equal(harness.context.window.soaSaveIntegrityBlocked, true);
});
