"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: {} };
const sourcePath = path.join(__dirname, "..", "public", "quests.js");
vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });
const quests = context.window.soaQuests;

test("quest ledgers repair partial legacy state without discarding valid fields", () => {
  const campaign = { quests: { accepted: { "sw-master": { started: 3 } }, inventory: null, receipts: ["old-receipt"] } };
  const ledger = quests.ensure(campaign);
  assert.equal(ledger.accepted["sw-master"].started, 3);
  assert.deepEqual(Array.from(ledger.receipts), ["old-receipt"]);
  assert.deepEqual(JSON.parse(JSON.stringify(ledger.completed)), {});
  assert.deepEqual(Array.from(ledger.inventory), []);
  assert.deepEqual(Array.from(quests.ensure({}).accepted ? Object.keys(quests.ensure({}).accepted) : []), []);
  assert.equal(quests.ensure(null), null);
});

test("rare elite rewards are deterministic per character with roughly two percent eligibility", () => {
  const first = quests.stableRare("hero-a", "sw-master");
  assert.equal(quests.stableRare("hero-a", "sw-master"), first);
  let characterSpecific = false;
  for (let index = 0; index < 200; index++) if (quests.stableRare("hero-" + index, "sw-master") !== first) characterSpecific = true;
  assert.equal(characterSpecific, true);

  let eligible = 0;
  for (let index = 0; index < 1000; index++) if (quests.stableRare("hero-" + index, "sw-master")) eligible++;
  assert.ok(eligible >= 10 && eligible <= 30, `expected ~20 eligible characters; got ${eligible}`);
});
