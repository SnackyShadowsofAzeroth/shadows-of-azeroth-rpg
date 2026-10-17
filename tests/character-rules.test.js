"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const rulesPath = path.join(__dirname, "..", "public", "character-rules.js");
vm.runInNewContext(fs.readFileSync(rulesPath, "utf8"), context, { filename: rulesPath });
const rules = context.window.soaCharacterRules;
assert.ok(rules, "character rules are exposed to the game");

let checks = 0;
for (const [raceName, race] of Object.entries(rules.races)) {
  if (race.faction === "Choose") continue;
  const opposingFaction = race.faction === "Alliance" ? "Horde" : "Alliance";
  const options = Array.from(rules.factionOptions(raceName));

  assert.equal(options.find(option => option.value === race.faction)?.disabled, false);
  assert.equal(options.find(option => option.value === opposingFaction)?.disabled, true);
  checks += 2;

  for (const className of race.classes) {
    assert.equal(rules.validSelection({ race: raceName, faction: race.faction, className }), true);
    assert.equal(rules.validSelection({ race: raceName, faction: opposingFaction, className }), false);
    checks += 2;
  }
}

const sharedSkyborneClasses = ["Warrior", "Hunter", "Rogue", "Druid"];
for (const faction of ["Alliance", "Horde"]) {
  const choices = Array.from(rules.factionOptions("Skyborne"));
  assert.equal(choices.length, 2);
  assert.equal(choices.every(option => !option.disabled), true);
  checks += 2;

  for (const className of sharedSkyborneClasses) {
    assert.equal(rules.validSelection({ race: "Skyborne", faction, className }), true);
    checks++;
  }
}

assert.equal(rules.validSelection({ race: "Skyborne", faction: "Alliance", className: "Mage" }), true);
assert.equal(rules.validSelection({ race: "Skyborne", faction: "Alliance", className: "Shaman" }), false);
assert.equal(rules.validSelection({ race: "Skyborne", faction: "Horde", className: "Shaman" }), true);
assert.equal(rules.validSelection({ race: "Skyborne", faction: "Horde", className: "Mage" }), false);
assert.equal(rules.displayFaction({ race: "Skyborne", faction: "Alliance" }), "High Order Skyborne (Alliance)");
assert.equal(rules.displayFaction({ race: "Skyborne", faction: "Horde" }), "Windshaper Skyborne (Horde)");
assert.equal(rules.validSelection({ race: "Unknown", faction: "Alliance", className: "Warrior" }), false);
assert.equal(rules.validSelection({ race: "Skyborne", faction: "Neutral", className: "Warrior" }), false);
checks += 8;

console.log(`Character faction rules: ${checks} assertions passed.`);
