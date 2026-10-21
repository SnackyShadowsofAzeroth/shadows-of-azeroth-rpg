"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(path.join(__dirname, "..", "public", "resource-rules.js"), "utf8");
vm.runInNewContext(source, context, { filename: "resource-rules.js" });
const rules = context.window.soaResources;

test("classes use their primary class resource", () => {
  const expected = {
    Warrior: "Rage", Paladin: "Mana", Hunter: "Focus", Rogue: "Energy",
    Priest: "Mana", Mage: "Mana", Warlock: "Mana", Druid: "Mana", Shaman: "Mana",
  };
  for (const [className, label] of Object.entries(expected)) {
    assert.equal(rules.forClass(className).label, label, className);
  }
});

test("Druid form resources are ready for form-specific abilities", () => {
  assert.equal(rules.forClass("Druid", "cat").label, "Energy");
  assert.equal(rules.forClass("Druid", "bear").label, "Rage");
  assert.equal(rules.forClass("Druid", "caster").label, "Mana");
});

test("unknown classes fall back safely", () => {
  assert.equal(rules.forClass("Unknown").label, "Energy");
  assert.deepEqual({ ...rules.forClass("Paladin") }, { key: "mana", label: "Mana" });
});
