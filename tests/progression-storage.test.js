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
  const calls = { writes: 0, warnings: [], levelUpRestores: 0, heroVitals: { hp: 42, resource: 17 }, failLevelUpRestore: false };
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
    window: {
      soaReportStorageFailure: message => calls.warnings.push(message),
      soaHeroLevelUp: { restore() {
        calls.levelUpRestores++;
        if (calls.failLevelUpRestore) return false;
        calls.heroVitals.hp = 100;
        calls.heroVitals.resource = 100;
        return true;
      } },
    },
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


test("a hero level-up refills health and the active class resource once, including multiple levels", () => {
  const harness = setup();
  const result = harness.progression.battle({
    receipt: "encounter-level-up",
    defeated: [{ maxHp: 500 }, { maxHp: 500 }, { maxHp: 500 }],
    allies: [],
  });

  assert.equal(result.levels, 2);
  assert.equal(result.vitalsRestored, true);
  assert.equal(harness.calls.levelUpRestores, 1);
  assert.deepEqual(harness.calls.heroVitals, { hp: 100, resource: 100 });
  assert.equal(harness.progression.progress().level, 12);

  const duplicate = harness.progression.battle({
    receipt: "encounter-level-up",
    defeated: [{ maxHp: 500 }, { maxHp: 500 }, { maxHp: 500 }],
    allies: [],
  });
  assert.equal(duplicate.levels, undefined);
  assert.equal(harness.calls.levelUpRestores, 1);
});

test("XP below the next level does not refill hero vitals", () => {
  const harness = setup();
  const result = harness.progression.check({
    receipt: "short-of-level",
    name: "investigate",
    success: true,
    difficulty: "hard",
  });

  assert.equal(result.levels, 0);
  assert.equal(harness.calls.levelUpRestores, 0);
  assert.deepEqual(harness.calls.heroVitals, { hp: 42, resource: 17 });
});

test("a failed level-up refill rolls the XP transaction back", () => {
  const harness = setup();
  harness.calls.failLevelUpRestore = true;

  const result = harness.progression.battle({
    receipt: "restore-failure",
    defeated: [{ maxHp: 500 }, { maxHp: 500 }],
    allies: [],
  });

  assert.equal(result.awarded, 0);
  assert.equal(result.levels, 0);
  assert.equal(result.storageWarning, true);
  assert.equal(harness.progression.progress().level, 10);
  assert.equal(harness.progression.progress().totalXp, 0);
  assert.equal(harness.calls.levelUpRestores, 1);
  assert.deepEqual(harness.calls.heroVitals, { hp: 42, resource: 17 });
});

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
