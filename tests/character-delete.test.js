"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "characters.js"), "utf8");
const start = source.indexOf("function deleteCharacter(");
const end = source.indexOf("\nfunction create(", start);
assert.notEqual(start, -1, "deleteCharacter exists");
assert.notEqual(end, -1, "create follows deleteCharacter");
const deleteSource = source.slice(start, end);

function setup({ characters = [{ id: "hero-a", name: "Hero A" }, { id: "hero-b", name: "Hero B" }], activeId = "hero-a", confirm = true, snapshotOk = true, commitOk = true } = {}) {
  const events = { alerts: [], confirms: [], restores: [], removals: [], reloads: 0, menuDraws: 0, snapshots: [] };
  const roster = { version: 1, active: activeId, characters: characters.slice() };
  const context = {
    roster,
    active: roster.characters.find(character => character.id === activeId),
    rosterLoadBlocked: false,
    SLOT_PREFIX: "slot:",
    ENTER_KEY: "entered",
    window: { soaSaveRules: { isIntegrityBlocked: () => false }, confirm: message => { events.confirms.push(message); return confirm; } },
    alert: message => events.alerts.push(message),
    snapshot: id => { events.snapshots.push(id); return snapshotOk; },
    restore: id => { events.restores.push(id); return true; },
    commitRoster: () => commitOk,
    localStorage: { removeItem: key => events.removals.push(key) },
    sessionStorage: { setItem: (key, value) => events.sessionSet = [key, value] },
    location: { reload: () => events.reloads++ },
    drawMenu: () => events.menuDraws++,
  };
  vm.createContext(context);
  vm.runInContext(deleteSource + "\nglobalThis.runDeleteCharacter = deleteCharacter;", context);
  return { context, events };
}

test("deleting the active character switches to another hero and removes only that character's local data", () => {
  const { context, events } = setup();
  context.runDeleteCharacter("hero-a");

  assert.equal(context.roster.active, "hero-b");
  assert.deepEqual(JSON.parse(JSON.stringify(context.roster.characters)), [{ id: "hero-b", name: "Hero B" }]);
  assert.equal(context.active.id, "hero-b");
  assert.deepEqual(events.restores, ["hero-b"]);
  assert.deepEqual(events.removals, ["slot:hero-a", "soa-portrait-v1-hero-a"]);
  assert.equal(events.reloads, 1);
});

test("deleting an inactive character keeps the active save selected", () => {
  const { context, events } = setup();
  context.runDeleteCharacter("hero-b");

  assert.equal(context.roster.active, "hero-a");
  assert.equal(context.active.id, "hero-a");
  assert.deepEqual(JSON.parse(JSON.stringify(context.roster.characters)), [{ id: "hero-a", name: "Hero A" }]);
  assert.deepEqual(events.removals, ["slot:hero-b", "soa-portrait-v1-hero-b"]);
  assert.equal(events.menuDraws, 1);
  assert.equal(events.reloads, 0);
});

test("deletion is cancelled safely and the last roster character cannot be removed", () => {
  const cancelled = setup({ confirm: false });
  cancelled.context.runDeleteCharacter("hero-a");
  assert.equal(cancelled.context.roster.characters.length, 2);
  assert.equal(cancelled.events.removals.length, 0);

  const last = setup({ characters: [{ id: "hero-a", name: "Hero A" }] });
  last.context.runDeleteCharacter("hero-a");
  assert.equal(last.context.roster.characters.length, 1);
  assert.equal(last.events.confirms.length, 0);
  assert.equal(last.events.alerts.length, 1);
});

test("a roster write failure restores the active character and keeps its save slot", () => {
  const { context, events } = setup({ commitOk: false });
  context.runDeleteCharacter("hero-a");

  assert.equal(context.roster.active, "hero-a");
  assert.equal(context.active.id, "hero-a");
  assert.equal(context.roster.characters.length, 2);
  assert.deepEqual(events.restores, ["hero-b", "hero-a"]);
  assert.equal(events.removals.length, 0);
  assert.equal(events.alerts.length, 1);
});
