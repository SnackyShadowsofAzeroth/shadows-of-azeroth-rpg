"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: { soaResources: { forClass: name => ({ label: name === "Rogue" ? "Energy" : name === "Warrior" ? "Rage" : name === "Hunter" ? "Focus" : "Mana" }) } }, document: { createElement: () => ({ append() {}, className: "", textContent: "" }) } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "public", "class-abilities.js"), "utf8"), context, { filename: "class-abilities.js" });
const kits = context.window.soaClassAbilities;

test("every selectable class has a distinct level-one starter kit", () => {
  for (const name of ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Mage", "Warlock", "Druid", "Shaman"]) {
    const starter = kits.available(name, 1);
    assert.ok(starter.length >= 2, `${name} should start with multiple abilities`);
    assert.ok(starter.some(x => ["damage", "interrupt", "riposte"].includes(x.effect)), `${name} needs an offensive ability`);
    assert.ok(starter.every(x => x.level === 1), `${name} should not have future unlocks at level 1`);
  }
});

test("abilities unlock at their defined levels and remain unavailable before them", () => {
  for (const name of ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Mage", "Warlock", "Druid", "Shaman"]) {
    const all = kits.all(name);
    assert.equal(new Set(all.map(x => x.id)).size, all.length, `${name} ability IDs should be unique`);
    for (const ability of all) {
      assert.equal(kits.get(ability.id, name, ability.level)?.id, ability.id);
      if (ability.level > 1) assert.equal(kits.get(ability.id, name, ability.level - 1), null);
    }
  }
  assert.equal(kits.get("mortal_strike", "Warrior", 9), null);
  assert.equal(kits.get("mortal_strike", "Warrior", 10).name, "Mortal Strike");
});

test("the established Rogue kit and level gates are preserved", () => {
  const atLevelOne = kits.available("Rogue", 1).map(x => x.name);
  assert.ok(atLevelOne.includes("Evasion"));
  assert.ok(atLevelOne.includes("Kick"));
  assert.equal(kits.get("riposte", "Rogue", 4), null);
  for (const name of ["Sprint", "Blade Flurry", "Vanish", "Riposte"]) {
    assert.ok(kits.available("Rogue", 10).some(x => x.name === name), `${name} should be available to level-10 Snacky`);
  }
  assert.equal(kits.get("riposte", "Rogue", 5).effect, "riposte");
});

test("resource costs use consistent power tiers and recoverability", () => {
  const costs = new Set();
  for (const name of ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Mage", "Warlock", "Druid", "Shaman"]) {
    for (const ability of kits.all(name)) {
      costs.add(ability.cost);
      assert.ok([10, 15, 20].includes(ability.cost), `${name} ${ability.name} should use a deliberate cost tier`);
      assert.equal(kits.costOf(ability.id, name, ability.level), ability.cost);
    }
  }
  assert.deepEqual([...costs].sort((a, b) => a - b), [10, 15, 20]);
  assert.equal(kits.costOf("strike", "Rogue", 10), 15);
  assert.equal(kits.costOf("evasion", "Warrior", 1), 15);
});

test("Rogue costs distinguish basic attacks, control, defense, and finishers", () => {
  const cost = id => kits.get(id, "Rogue", 10).cost;
  assert.equal(cost("sinister_strike"), 15);
  assert.equal(cost("kick"), 15);
  assert.equal(cost("sprint"), 10);
  assert.equal(cost("evasion"), 15);
  assert.equal(cost("vanish"), 15);
  assert.equal(cost("riposte"), 15);
  assert.equal(cost("blade_flurry"), 20);
});

test("all ability effects, costs, and level ranges are valid", () => {
  const effects = new Set(["damage", "interrupt", "heal", "drain", "guard", "riposte"]);
  for (const name of ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Mage", "Warlock", "Druid", "Shaman"]) {
    for (const ability of kits.all(name)) {
      assert.ok(effects.has(ability.effect), `${name} ${ability.name} has a supported effect`);
      assert.ok(Number.isInteger(ability.cost) && ability.cost >= 10 && ability.cost <= 20);
      assert.ok(Number.isInteger(ability.level) && ability.level >= 1 && ability.level <= 60);
      assert.ok(Number.isInteger(ability.die) && ability.die >= 0);
      assert.ok(typeof ability.description === "string" && ability.description.length > 5);
    }
  }
});
