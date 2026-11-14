"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: { addEventListener() {} }, document: { readyState: "interactive", addEventListener() {} } };
for (const file of ["mnm-rules.js", "mnm-ai-chronicle.js", "mnm-adventure.js"]) {
  const fullPath = path.join(__dirname, "..", "public", file);
  vm.runInNewContext(fs.readFileSync(fullPath, "utf8"), context, { filename: fullPath });
}
const rules = context.window.soaMnmRules;
const adventure = context.window.soaMnmAdventure;

test("M&M race starts normalize to their assigned city and keep the expected starting stats", () => {
  const human = rules.normalizeCharacter({ id: "human-1", raceId: "human", classId: "fighter" });
  assert.equal(rules.startLocationForRace("human"), "night-harbor");
  assert.equal(human.startingLocation, "night-harbor");
  assert.deepEqual(JSON.parse(JSON.stringify(human.stats)), {
    str: 14, sta: 14, dex: 10, agi: 11, int: 10, wis: 10, cha: 11
  });
  assert.equal(rules.startLocationForRace("halfling"), "night-harbor");
  assert.equal(rules.startLocationForRace("gnome"), "night-harbor");
  assert.equal(rules.startLocationForRace("dwarf"), "night-harbor");
  assert.equal(rules.startLocationForRace("deep_gnome"), "underdocks");
  assert.equal(rules.startLocationForRace("deep_elf"), "underdocks");
  assert.equal(rules.startLocationForRace("goblin"), "underdocks");
  assert.equal(rules.startLocationForRace("ogre"), "underdocks");
  assert.equal(rules.startLocationForRace("wood_elf"), "penshaw");
  for (const race of ["deep_dwarf", "high_elf", "troll"]) assert.equal(rules.startLocationForRace(race), "night-harbor");
});

test("new M&M adventure saves begin in each race's assigned starting city", () => {
  const human = rules.normalizeCharacter({ id: "human-2", raceId: "human", classId: "fighter" });
  const humanSave = adventure.createSave(human);
  assert.equal(humanSave.stage, "briefing");
  assert.equal(humanSave.origin, "night-harbor");
  assert.equal(humanSave.currentLocation, "night-harbor");
  assert.equal(humanSave.aiCampaign.status, "idle");
  assert.equal(humanSave.aiCampaign.locationId, "night-harbor");
  assert.equal(adventure.validSave(humanSave, human), true);
  assert.match(humanSave.journal[0], /Night Harbor/);

  const gnome = rules.normalizeCharacter({ id: "gnome-1", raceId: "gnome", classId: "fighter" });
  const gnomeSave = adventure.createSave(gnome);
  assert.equal(gnomeSave.stage, "briefing");
  assert.equal(gnomeSave.origin, "night-harbor");
  assert.equal(gnomeSave.currentLocation, "night-harbor");
  const deepElf = rules.normalizeCharacter({ id: "deep-elf-1", raceId: "deep_elf", classId: "wizard" });
  const deepElfSave = adventure.createSave(deepElf);
  assert.equal(deepElfSave.origin, "underdocks");
  assert.equal(deepElfSave.currentLocation, "underdocks");
  const woodElf = rules.normalizeCharacter({ id: "wood-elf-1", raceId: "wood_elf", classId: "ranger" });
  const woodElfSave = adventure.createSave(woodElf);
  assert.equal(woodElfSave.origin, "penshaw");
  assert.equal(woodElfSave.currentLocation, "penshaw");
});

test("race starting cities cannot be changed through the old origin picker", () => {
  const gnome = rules.normalizeCharacter({ id: "gnome-3", raceId: "gnome", classId: "fighter" });
  const legacyOriginSave = { ...adventure.createSave(gnome), stage: "origin", origin: "" };
  assert.throws(
    () => adventure.transition(legacyOriginSave, gnome, { type: "origin", region: "faelindral" }),
    /This race begins in Night Harbor/
  );
  const save = adventure.createSave(gnome);
  assert.throws(() => adventure.transition(save, gnome, { type: "origin", region: "penshaw" }), /not available in the current chapter/);
});

test("M&M adventure startup organizes the character screen before mounting it", () => {
  const calls = [];
  let load;
  const context = {
    window: { soaCharacters: { organizeSections() { calls.push("organize"); }, profile() { calls.push("profile"); return null; } }, addEventListener(name, callback) { if (name === "load") load = callback; } },
    document: { readyState: "interactive" }
  };
  const fullPath = path.join(__dirname, "..", "public", "mnm-adventure.js");
  vm.runInNewContext(fs.readFileSync(fullPath, "utf8"), context, { filename: fullPath });
  assert.equal(typeof load, "function");
  assert.deepEqual(calls, []);
  load();
  assert.deepEqual(calls, ["organize", "profile"]);
});

test("unstarted saves migrate to the character's assigned starting city", () => {
  const human = { id: "human-4", raceId: "human" };
  const pending = { ...adventure.createSave({ id: human.id, raceId: "gnome" }), stage: "origin", origin: "" };
  assert.equal(adventure.migrateHumanStartingCity(pending, human), true);
  assert.equal(pending.origin, "night-harbor");
  assert.equal(pending.currentLocation, "night-harbor");
  assert.equal(pending.stage, "briefing");
  assert.match(pending.journal[0], /Night Harbor/);
  assert.equal(adventure.migrateHumanStartingCity(pending, human), false);

  const gnome = { id: "gnome-2", raceId: "gnome" };
  const gnomePending = { ...adventure.createSave(gnome), stage: "origin", origin: "" };
  assert.equal(adventure.migrateStartingLocation(gnomePending, gnome), true);
  assert.equal(gnomePending.stage, "briefing");
  assert.equal(gnomePending.origin, "night-harbor");
  assert.equal(gnomePending.currentLocation, "night-harbor");
});

test("M&M race/class and stat rules keep representative supplied values", () => {
  assert.equal(rules.isValidSelection({ raceId: "deep_gnome", classId: "bard" }), true);
  const deepElfArcher = rules.startingStats("deep_elf", "archer");
  assert.deepEqual(JSON.parse(JSON.stringify(deepElfArcher.stats)), {
    str: 10, sta: 9, dex: 14, agi: 14, int: 13, wis: 11, cha: 9
  });
});
test("user-supplied race and class modifier tables stay exact", () => {
  const nonzero = vector => Object.fromEntries(
    Object.entries(JSON.parse(JSON.stringify(vector))).filter(([, value]) => value !== 0)
  );
  const expectedRaces = {
    deep_elf: { str: -2, sta: -1, agi: 2, int: 3, wis: 1, cha: -1 },
    deep_gnome: { str: -2, sta: -1, agi: 2, dex: 2, int: 3, wis: -2 },
    dwarf: { str: 1, sta: 1, agi: -1, dex: 2, cha: -1 },
    gnome: { str: -2, sta: -1, dex: 3, int: 4, wis: -1, cha: -1 },
    goblin: { str: -1, sta: -1, agi: 3, dex: 3, int: 1, cha: -3 },
    halfling: { str: -1, sta: 1, agi: 1, int: -2, wis: 4, cha: -1 },
    human: { sta: 1, cha: 1 },
    ogre: { str: 4, sta: 3, agi: -2, dex: -1, wis: -1, cha: -1 },
    wood_elf: { str: -2, sta: -2, agi: 4, dex: 2, int: -1, wis: 1 }
  };
  const expectedClasses = {
    archer: { str: 2, agi: 2, dex: 4 },
    bard: { str: 1, dex: 3, cha: 4 },
    beastmaster: { str: 4, agi: 2, wis: 2 },
    cleric: { str: 2, sta: 2, wis: 3, cha: 1 },
    druid: { agi: 2, wis: 4, cha: 2 },
    elementalist: { sta: 4, int: 4 },
    enchanter: { int: 4, cha: 4 },
    fighter: { str: 4, sta: 3, agi: 1 },
    inquisitor: { str: 1, sta: 3, dex: 1, int: 2, cha: 1 },
    monk: { str: 1, agi: 4, dex: 3 },
    necromancer: { dex: 4, int: 4 },
    paladin: { str: 2, sta: 4, wis: 2 },
    ranger: { str: 1, agi: 2, dex: 3, wis: 2 },
    rogue: { agi: 4, dex: 4 },
    shadow_knight: { str: 3, sta: 2, int: 3 },
    shaman: { str: 1, sta: 2, dex: 1, wis: 4 },
    spellblade: { str: 2, dex: 3, int: 3 },
    wizard: { str: 3, dex: 1, int: 4 }
  };

  for (const [raceId, expected] of Object.entries(expectedRaces)) {
    assert.deepEqual(nonzero(rules.raceBonuses[raceId]), expected, raceId);
  }
  for (const [classId, expected] of Object.entries(expectedClasses)) {
    assert.deepEqual(nonzero(rules.classBonuses[classId]), expected, classId);
  }

  for (const race of rules.selectableRaces()) {
    for (const klass of rules.classesForRace(race.id)) {
      const sheet = rules.startingStats(race.id, klass.id);
      for (const key of rules.statKeys) {
        assert.equal(
          sheet.stats[key],
          rules.statBase + sheet.racialBonuses[key] + sheet.classBonuses[key],
          race.id + "/" + klass.id + "/" + key
        );
      }
    }
  }
});
test("race class access matches the maintained M&M lore matrix", () => {
  const expected = {
    human: ["archer", "bard", "beastmaster", "cleric", "druid", "elementalist", "enchanter", "fighter", "inquisitor", "monk", "necromancer", "paladin", "ranger", "rogue", "shadow_knight", "shaman", "spellblade", "wizard"],
    gnome: ["cleric", "elementalist", "enchanter", "fighter", "necromancer", "paladin", "rogue", "spellblade", "wizard"],
    deep_gnome: ["beastmaster", "bard", "druid", "elementalist", "enchanter", "necromancer", "rogue", "shaman", "wizard"],
    dwarf: ["bard", "cleric", "elementalist", "enchanter", "fighter", "paladin", "ranger", "rogue", "spellblade", "wizard"],
    deep_dwarf: ["cleric", "elementalist", "fighter", "inquisitor", "necromancer", "paladin", "shadow_knight", "spellblade"],
    high_elf: ["archer", "cleric", "elementalist", "enchanter", "inquisitor", "paladin", "spellblade", "wizard"],
    wood_elf: ["archer", "bard", "beastmaster", "druid", "fighter", "ranger", "rogue", "shaman"],
    deep_elf: ["archer", "cleric", "elementalist", "enchanter", "fighter", "inquisitor", "monk", "necromancer", "paladin", "ranger", "rogue", "shadow_knight", "spellblade", "wizard"],
    ogre: ["archer", "beastmaster", "elementalist", "fighter", "monk", "ranger", "shadow_knight", "shaman"],
    halfling: ["archer", "bard", "beastmaster", "cleric", "druid", "fighter", "paladin", "ranger", "rogue"],
    troll: ["beastmaster", "druid", "enchanter", "fighter", "necromancer", "rogue", "shadow_knight", "shaman"],
    goblin: ["archer", "beastmaster", "druid", "enchanter", "fighter", "necromancer", "ranger", "rogue", "shadow_knight", "shaman"]
  };
  for (const [raceId, classIds] of Object.entries(expected)) {
    assert.deepEqual(
      Array.from(rules.classesForRace(raceId), klass => klass.id).sort(),
      classIds.slice().sort(),
      raceId
    );
  }
  assert.equal(rules.raceById("varnai").selectable, false);
  for (const race of rules.selectableRaces()) {
    assert.equal(rules.isSelectableRace(race.id), true, race.id);
  }
  for (const raceId of ["deep_dwarf", "high_elf", "troll", "varnai"]) {
    assert.equal(rules.isSelectableRace(raceId), false, raceId);
  }
  assert.equal(rules.isSelectableRace("unknown"), false);
});

