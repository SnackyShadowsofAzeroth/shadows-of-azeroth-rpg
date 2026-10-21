"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: { soaCharacters: { profile: () => ({ id: "test-hero" }) } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "public", "quests.js"), "utf8"), context, { filename: "quests.js" });
const quests = context.window.soaQuests;

test("basic bounty payments stay in silver and increase by target difficulty", () => {
  const expected = { easy: 2000, medium: 4000, hard: 7500 };
  const contracts = quests.contracts();
  assert.ok(contracts.length >= 20);
  for (const contract of contracts) {
    if (contract.rarity === "elite") continue;
    assert.ok(Object.hasOwn(expected, contract.difficulty), contract.title + " has a standard difficulty");
    assert.equal(contract.copper, expected[contract.difficulty], contract.title + " pays its difficulty tier");
    assert.ok(contract.copper < 10000, contract.title + " pays less than one gold");
    assert.equal(contract.copper % 100, 0, "payouts use clean silver amounts");
  }
});

test("elite bounty targets pay gold and guarantee high-rarity gear", () => {
  const elites = quests.contracts().filter(contract => contract.rarity === "elite");
  assert.ok(elites.length >= 3);
  for (const contract of elites) {
    assert.equal(contract.difficulty, "elite");
    assert.ok(contract.copper >= 40000, contract.title + " pays at least four gold");
    assert.ok(contract.items.length > 0, contract.title + " grants signature gear");
  }

  const campaign = { turn: 1, quests: {} };
  const contract = quests.definition("if-golem");
  assert.match(quests.accept(campaign, contract.id, "Ironforge").message, /Elite/);
  quests.onDefeat(campaign, contract.target);
  const payout = quests.claim(campaign, contract.id, "Ironforge", 1000);
  assert.equal(payout.wallet, 1000 + contract.copper);
  assert.ok(campaign.quests.inventory.some(item => item.rarity === "epic"));
  assert.ok(campaign.quests.inventory.every(item => item.rarity === "epic" || item.rarity === "rare"));
  assert.equal(quests.claim(campaign, contract.id, "Ironforge", payout.wallet).error, "Return to the issuing board after defeating the tracked target.");
});

test("named mission rewards match their difficulty; elite necromancer pays gold and rare gear", () => {
  const missions = quests.missions();
  const courier = missions.find(mission => mission.id === "si7-intelligence");
  const necromancer = missions.find(mission => mission.id === "duskwood-necromancer");
  const saboteur = missions.find(mission => mission.id === "ironforge-saboteur");
  assert.equal(courier.difficulty, "medium");
  assert.equal(courier.reward.copper, 4000);
  assert.equal(courier.reward.items[0].rarity, "uncommon");
  assert.equal(necromancer.difficulty, "elite");
  assert.equal(necromancer.reward.copper, 40000);
  assert.equal(necromancer.reward.items[0].rarity, "rare");
  assert.equal(saboteur.difficulty, "hard");
  assert.equal(saboteur.reward.copper, 7500);
  assert.equal(saboteur.reward.items[0].rarity, "uncommon");

  const campaign = { turn: 1, quests: {} };
  quests.startMission(campaign, necromancer.id, "Raven Hill");
  quests.missionDefeat(campaign, "Raven Hill Necromancer");
  const payout = quests.claimMission(campaign, necromancer.id, "Raven Hill", 0);
  assert.equal(payout.wallet, 40000);
  assert.equal(campaign.quests.inventory[0].rarity, "rare");
});

test("previously paid quest receipts and the fixed party mission reward remain unchanged", () => {
  const campaign = { turn: 2, quests: {} };
  const first = quests.grantStormwindMission(campaign, 1200);
  assert.equal(first.wallet, 51200);
  const retry = quests.grantStormwindMission(campaign, first.wallet);
  assert.equal(retry.alreadyPaid, true);
});
