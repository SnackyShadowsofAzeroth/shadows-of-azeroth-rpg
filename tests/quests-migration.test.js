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

test("bounty boards are available in faction capitals and named Horde hubs", () => {
  const expected = [
    ["Stormwind", "Stormwind Bounty Board"], ["Ironforge", "Ironforge Bounty Board"],
    ["Darnassus", "Darnassus Bounty Board"], ["The Exodar", "The Exodar Bounty Board"],
    ["Orgrimmar", "Orgrimmar Bounty Board"], ["Thunder Bluff", "Thunder Bluff Bounty Board"],
    ["Undercity", "Undercity Bounty Board"], ["Silvermoon City", "Silvermoon City Bounty Board"],
    ["Darkshire", "Darkshire Bounty Board"], ["The Crossroads", "The Crossroads Bounty Board"],
    ["Razor Hill", "Razor Hill Bounty Board"], ["Brill", "Brill Bounty Board"],
  ];
  for (const [location, place] of expected) assert.equal(quests.boardAt(location)?.place, place, location);
  assert.equal(quests.boardAt("The Barrens")?.place, "The Crossroads Bounty Board");
  assert.equal(quests.boardAt("Somewhere else"), undefined);
});

test("Horde hub contracts accept, track defeats, and pay at their local board", () => {
  const campaign = { turn: 4, quests: {} };
  const accepted = quests.accept(campaign, "cr-harpy", "The Crossroads");
  assert.match(accepted.message, /Windfury Harpy/);
  quests.onDefeat(campaign, "Windfury Harpy");
  assert.equal(campaign.quests.completed["cr-harpy"].target, "Windfury Harpy");
  const paid = quests.claim(campaign, "cr-harpy", "The Crossroads", 1000);
  assert.equal(paid.copper, 8500);
  assert.equal(paid.wallet, 9500);
  assert.ok(campaign.quests.claimed["cr-harpy"]);
  assert.equal(quests.claim(campaign, "cr-harpy", "Orgrimmar", paid.wallet).error, "Return to the issuing board after defeating the tracked target.");
});
