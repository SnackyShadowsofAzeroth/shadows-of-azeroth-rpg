"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "campaign.js"), "utf8");
const start = source.indexOf("function reconcileAuthorizedMissionReward(){");
const end = source.indexOf("\nfunction draw(){", start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);
const rewardFunction = source.slice(start, end);

function setup(chronicle) {
  const campaign = { turn: 4, history: [], quests: {}, chronicle };
  const state = { money: 1200 };
  const calls = { grants: 0, stores: 0, saves: 0 };
  const context = {
    campaign,
    MAX: 24,
    s: state,
    window: {
      soaCharacters: { profile: () => ({ id: "snacky" }) },
      soaQuests: {
        ensure(value) { value.quests ||= { claimed: {} }; value.quests.claimed ||= {}; return value.quests; },
        grantStormwindMission(value, wallet) {
          calls.grants++;
          return { wallet: wallet + 50000, description: "Confirmed mission reward." };
        },
      },
    },
    store() { calls.stores++; },
    save() { calls.saves++; },
  };
  vm.createContext(context);
  vm.runInContext(rewardFunction + "\nglobalThis.runReward = reconcileAuthorizedMissionReward;", context);
  return { context, calls };
}

test("Stormwind mission payment requires explicit completion of every objective", () => {
  const { context, calls } = setup({ quests: [{
    id: "stormwind", status: "active", objectives: [{ done: true }, { done: false }],
  }] });

  context.runReward();

  assert.equal(calls.grants, 0);
  assert.equal(context.s.money, 1200);
  assert.equal(calls.stores, 0);
  assert.equal(calls.saves, 0);
});

test("confirmed Stormwind completion credits the one-time payment", () => {
  const { context, calls } = setup({ quests: [{
    id: "stormwind", status: "completed", objectives: [{ done: true }, { done: true }, { done: true }],
  }] });

  context.runReward();

  assert.equal(calls.grants, 1);
  assert.equal(context.s.money, 51200);
  assert.equal(calls.stores, 1);
  assert.equal(calls.saves, 1);
});
