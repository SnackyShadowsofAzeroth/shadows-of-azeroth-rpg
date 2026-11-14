"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

function character(overrides = {}) {
  return {
    id: "hero-custom", name: "Arel", system: "mnm", raceId: "human", race: "Human",
    classId: "fighter", className: "Fighter", level: 1, startingLocation: "night-harbor",
    stats: { str: 14, sta: 14, dex: 10, agi: 11, int: 10, wis: 10, cha: 11 },
    ...overrides,
  };
}

function makeGame(profile = character(), { render = false, random = Math.random } = {}) {
  const values = new Map();
  const timers = new Map();
  let timerId = 0;
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const saveRules = {
    isIntegrityBlocked: () => false,
    readStoredJSON(key) {
      const raw = localStorage.getItem(key);
      if (raw === null) return { ok: true, missing: true };
      try { return { ok: true, missing: false, value: JSON.parse(raw) }; }
      catch { return { ok: false, missing: false }; }
    },
    reportCorruption() {},
  };
  const fakeNode = () => ({
    children: [], dataset: {}, style: {},
    append(...nodes) { this.children.push(...nodes); },
    setAttribute() {},
    isConnected: true,
  });
  const document = render ? {
    body: { classList: { contains: () => true } },
    activeElement: null,
    addEventListener() {},
    querySelector() { return null; },
    createElement: fakeNode,
  } : undefined;
  const math = Object.create(Math);
  math.random = random;
  const window = {
    soaMnmRules: { abilityModifier: score => Math.floor((Number(score) - 10) / 2) },
    soaSaveRules: saveRules,
    soaReportStorageFailure() {},
    soaMnmAdventure: {
      regions: [
        { id: "night-harbor", name: "Night Harbor" },
        { id: "underdocks", name: "The Underdocks" },
        { id: "penshaw", name: "Penshaw" },
        { id: "faelindral", name: "Faelindral" },
        { id: "ail-vorith", name: "Ail'vorith" },
      ],
    },
    soaCharacters: { profile: () => profile },
  };
  const context = {
    window, localStorage, Date, Math: math, JSON, Number, Object, Array, Set, Map,
    document, CustomEvent: class CustomEvent {},
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const file = path.join(__dirname, "..", "public", "mnm-systems.js");
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  const systems = window.soaMnmSystems;
  const put = value => localStorage.setItem(systems.key, JSON.stringify(value));
  const stored = () => JSON.parse(localStorage.getItem(systems.key));
  put(systems.createSave(profile));
  return { profile, systems, localStorage, timers, put, stored, context };
}

test("custom RPG initializes a valid starter kit and migrates older system saves", () => {
  const game = makeGame();
  let save = game.stored();
  assert.equal(game.systems.validSave(save, game.profile), true);
  assert.equal(save.rpg.inventory.reduce((total, item) => total + item.quantity, 0), 6);
  assert.equal(save.rpg.coppers, 24);
  assert.equal(game.systems.progressFor(game.profile).level, 1);

  delete save.rpg;
  game.put(save);
  const migrated = game.systems.read(game.profile);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.save.rpg.inventory.some(item => item.id === "road-worn-weapon"), true);
});

test("custom combat awards XP, loot, currency, and a one-time chapter reward", () => {
  const game = makeGame();
  const start = game.systems.startEncounter(game.profile, "night-harbor", () => 0);
  assert.equal(start.ok, true);
  const first = game.systems.resolveRpgAction(game.profile, "attack", { random: () => 0.999 });
  assert.equal(first.ok, true);
  assert.equal(first.result.victory, undefined);
  const second = game.systems.resolveRpgAction(game.profile, "attack", { random: () => 0.999 });
  assert.equal(second.ok, true);
  assert.equal(second.result.victory, true);
  assert.equal(second.result.xp, 50);
  assert.equal(second.result.coins, 6);
  assert.equal(game.systems.progressFor(game.profile).totalXp, 50);
  assert.equal(game.systems.progressFor(game.profile).level, 1);

  const reward = game.systems.claimStoryReward(game.profile, "chapter-one", 100);
  assert.equal(reward.ok, true);
  assert.equal(reward.result.claimed, true);
  assert.equal(game.systems.progressFor(game.profile).level, 2);
  const scaled = game.systems.startEncounter({ ...game.profile, level: game.systems.progressFor(game.profile).level }, "night-harbor", () => 0.999);
  assert.equal(scaled.result.encounter.level, 3);
  const total = game.systems.progressFor(game.profile).totalXp;
  const repeated = game.systems.claimStoryReward(game.profile, "chapter-one", 100);
  assert.equal(repeated.ok, true);
  assert.equal(repeated.result.alreadyClaimed, true);
  assert.equal(game.systems.progressFor(game.profile).totalXp, total);
});

test("custom techniques enforce Focus and combat consumables spend inventory", () => {
  const game = makeGame();
  game.systems.startEncounter(game.profile, "night-harbor", () => 0);
  let save = game.stored();
  save.rpg.focus = 0;
  game.put(save);
  const denied = game.systems.resolveRpgAction(game.profile, "technique", { random: () => 0.999 });
  assert.equal(denied.ok, false);
  assert.match(denied.error, /not enough Focus/i);
  assert.equal(game.stored().rpg.encounter.round, 0);

  save = game.stored();
  save.rpg.focus = 6;
  save.rpg.hp = 10;
  game.put(save);
  const used = game.systems.resolveRpgAction(game.profile, { type: "item", id: "healing-poultice" }, { random: () => 0.999 });
  assert.equal(used.ok, true);
  assert.equal(used.result.turn, true);
  assert.equal(game.stored().rpg.hp, 18);
  assert.equal(game.stored().rpg.inventory.find(item => item.id === "healing-poultice").quantity, 1);
});

test("Night Harbor market, carry capacity, and safe rest enforce their custom rules", () => {
  const profile = character({ stats: { str: 3, sta: 14, dex: 10, agi: 11, int: 10, wis: 10, cha: 11 } });
  const game = makeGame(profile);
  let save = game.stored();
  save.rpg.coppers = 200;
  game.put(save);
  assert.equal(game.systems.purchaseRpgItem(profile, "saltwind-knife", 1, "underdocks").ok, false);
  assert.equal(game.systems.purchaseRpgItem(profile, "branchguard", 1, "night-harbor").ok, true);
  assert.equal(game.systems.purchaseRpgItem(profile, "waybread", 1, "night-harbor").ok, false);
  assert.equal(game.systems.sellRpgItem(profile, "branchguard", 1, "penshaw").ok, false);
  assert.equal(game.systems.restAtSafeHaven(profile, "night-harbor").ok, true);
  assert.equal(game.stored().restedMinutes, 20);
  assert.equal(game.systems.restAtSafeHaven(profile, undefined).ok, false);
});

test("defeat returns to bind point and requires travel back to the corpse region", () => {
  const profile = character({ startingLocation: "underdocks" });
  const game = makeGame(profile);
  let returnedTo = "";
  game.systems.startEncounter(profile, "underdocks", () => 0.999);
  const save = game.stored();
  save.rpg.hp = 1;
  save.rpg.encounter.attack = 100;
  game.put(save);
  const now = Date.now();
  const result = game.systems.resolveRpgAction(profile, "guard", {
    random: () => 0.999, now: () => now, returnToBindPoint: location => { returnedTo = location; },
  });
  assert.equal(result.ok, true);
  assert.equal(result.result.defeated, true);
  assert.equal(returnedTo, "underdocks");
  assert.equal(game.stored().corpse.locationId, "underdocks");
  assert.equal(game.stored().rpg.inventory.length, 0);
  assert.match(game.systems.recoverCorpse(profile, now + 1000, "night-harbor").error, /The Underdocks/);
  assert.equal(game.systems.recoverCorpse(profile, now + 1000, "underdocks").ok, true);
  assert.equal(game.stored().rpg.equipment.weapon, "road-worn-weapon");
});

test("Q auto-attack resolves repeated combat turns while the Combat view is open", () => {
  const game = makeGame(character(), { render: true, random: () => 0.999 });
  game.systems.startEncounter(game.profile, "night-harbor", () => 0.999);
  let panel;
  const refresh = () => { panel = game.systems.render("combat", game.profile, refresh, { locationId: "night-harbor" }); };
  refresh();
  const toggle = panel.children.find(node => String(node.textContent).startsWith("Q"));
  assert.ok(toggle);
  toggle.onclick();
  assert.equal(game.timers.size, 1);
  const timer = [...game.timers.values()][0];
  game.timers.clear();
  timer.callback();
  assert.equal(game.stored().rpg.encounter.round, 1);
  assert.equal(game.timers.size, 1);
  game.systems.stopAutoAttackRunner();
  assert.equal(game.timers.size, 0);
});
