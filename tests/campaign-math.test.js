"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "campaign.js"), "utf8");
function functionBlock(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`\nfunction ${nextName}(`, start);
  assert.notEqual(start, -1, `${name} is present`);
  assert.notEqual(end, -1, `${nextName} follows ${name}`);
  return source.slice(start, end);
}

function makeContext({ random = () => 0.5 } = {}) {
  const deterministicMath = Object.create(Math);
  deterministicMath.random = random;
  const context = {
    COMBAT_RESOURCE_RECOVERY: 25,
    ACTION_RESOURCE_RECOVERY: 10,
    Math: deterministicMath,
    s: { en: 100, hp: 100, money: 0, time: 0, alert: 1 },
    campaign: { flags: {} },
    window: {
      soaAbilities: {
        modifier: skill => skill === "stealth" || skill === "investigate" ? 2 : 0,
        get: () => ({ className: "Rogue", proficiency: 3, modifiers: { DEX: 4 } }),
      },
      soaProgression: {
        bonus: skill => skill === "stealth" || skill === "investigate" ? 1 : 0,
        level: () => 13,
      },
      soaCharacters: { profile: () => ({ className: "Rogue" }) },
      soaResources: { forClass: className => ({ label: className === "Paladin" ? "Mana" : className === "Warrior" ? "Rage" : className === "Hunter" ? "Focus" : "Energy" }) },
      soaEquipment: { modifiers: () => ({ attack: 2, damage: 3 }) },
      soaCombatRules: {
        weapon: (actor, ability) => ability === "kick"
          ? { die: 6, flat: 4 + (actor?.modifiers?.DEX || 0) }
          : actor?.className === "Warrior" || actor?.className === "Paladin"
            ? { die: 8, flat: 5 + (actor?.modifiers?.STR || 0) }
            : { die: 10, flat: 10 + (actor?.modifiers?.DEX || 0) },
        statBlock: () => ({ ac: 14 }),
      },
    },
    selectedCombatTarget: "Guard",
    livingEnemies: () => [{ name: "Guard", hp: 20, maxHp: 20 }],
    socialSkill: () => null,
    socialTarget: () => ({ bonus: 0, dc: 14 }),
    fightExchange: () => null,
    socialCheck: () => null,
  };
  vm.createContext(context);
  return context;
}

test("inferred skill drives preview, energy cost, effects, and practice", () => {
  const context = makeContext();
  vm.runInContext([
    functionBlock("actionOdds", "resolvedCombatAbility"),
    functionBlock("resolvedSkillName", "meaningfulSocialPractice"),
    functionBlock("result", "interfaceUI"),
    "globalThis.testApi = { actionOdds, resolvedSkillName, result };",
  ].join("\n"), context);

  const action = { type: "engineering", text: "Sneak past the guard", difficulty: "easy" };
  const odds = context.testApi.actionOdds(action);
  assert.equal(odds.skill, "stealth");
  assert.equal(odds.cost, 20);
  assert.equal(odds.target, 85);
  assert.equal(context.testApi.resolvedSkillName(action), "stealth");
  assert.match(context.testApi.result(action), /Snacky remains concealed/);
  assert.equal(context.s.en, 90);
  assert.equal(context.s.time, 1);

  const search = context.testApi.actionOdds({ type: "stealth", text: "Search the room" });
  assert.equal(search.skill, "investigate");
  assert.equal(search.cost, 10);
  assert.equal(context.testApi.resolvedSkillName({ type: "stealth", text: "Search the room" }), "investigate");
  context.livingEnemies = () => [];
  assert.equal(context.testApi.resolvedSkillName({ type: "combat", text: "Search the room" }), "investigate");
  context.livingEnemies = () => [{ name: "Guard", hp: 20, maxHp: 20 }];
  assert.equal(context.testApi.resolvedSkillName({ type: "combat", text: "Search the room" }), "combat");
});

test("combat preview includes the same equipment attack and damage bonuses as resolution", () => {
  const context = makeContext();
  vm.runInContext([
    functionBlock("resourceName", "resolvedCombatAbility"),
    functionBlock("resolvedCombatAbility", "dicePreview"),
    functionBlock("dicePreview", "socialCheck"),
    "globalThis.testPreview = dicePreview; globalThis.testChance = d20SuccessChance;",
  ].join("\n"), context);

  const strike = context.testPreview({ type: "combat", ability: "strike", text: "Strike the Guard" });
  assert.match(strike.primary, /d20 \+ 9 vs AC 14 · 80% hit/);
  assert.equal(context.testChance(5, 12), 70, "+5 vs AC 12 hits on rolls 7–20");
  assert.equal(context.testChance(5, 12, 1), 91, "advantage hits unless both dice are 1–6");
  assert.match(strike.secondary, /1d10 \+ 17 raw damage · 0 Energy cost · up to \+25 recovery/);

  context.window.soaClassAbilities = {
    get: id => id === "sinister_strike" ? { id } : null,
    costOf: id => ({ sinister_strike: 30, evasion: 35, riposte: 30, strike: 0, kick: 35 })[id] ?? null,
  };
  const kick = context.testPreview({ type: "combat", ability: "kick", text: "Kick the Guard" });
  assert.match(kick.secondary, /1d6 \+ 11 raw damage · 35 Energy cost · up to \+25 recovery · interrupt on hit/);

  const riposte = context.testPreview({ type: "combat", ability: "riposte", text: "Riposte" });
  assert.match(riposte.secondary, /31 raw damage on a valid Riposte/);

  context.campaign.flags.advantage = true;
  const advantaged = context.testPreview({ type: "combat", ability: "strike", text: "Strike the Guard" });
  assert.match(advantaged.primary, /d20 with advantage \+ 9 vs AC 14 · 96% hit/);
  context.campaign.flags.advantage = false;

  context.window.soaAbilities.get = () => ({ className: "Warrior", proficiency: 3, modifiers: { DEX: 4, STR: 2 } });
  context.window.soaClassAbilities = {
    get: id => id === "sinister_strike" ? { id } : null,
    costOf: id => ({ sinister_strike: 30, evasion: 35, riposte: 30, strike: 0, kick: 35 })[id] ?? null,
  };
  context.window.soaCharacters.profile = () => ({ className: "Rogue" });
  const sinister = context.testPreview({ type: "combat", ability: "sinister_strike", text: "Sinister Strike the Guard" });
  assert.match(sinister.secondary, /30 Energy cost/);
  const evasive = context.testPreview({ type: "combat", ability: "evasion", text: "Evade the Guard" });
  assert.match(evasive.secondary, /35 Energy cost/);
  const ripostePreview = context.testPreview({ type: "combat", ability: "riposte", text: "Riposte" });
  assert.match(ripostePreview.secondary, /30 Energy cost · up to \+25 recovery/);

  context.window.soaCharacters.profile = () => ({ className: "Warrior" });
  const warriorStrike = context.testPreview({ type: "combat", ability: "strike", text: "Strike the Guard" });
  assert.match(warriorStrike.primary, /d20 \+ 7 vs AC 14/);
  assert.match(warriorStrike.secondary, /0 Rage cost · up to \+25 recovery/);
  context.window.soaCharacters.profile = () => ({ className: "Paladin" });
  context.socialSkill = () => "bluff";
  context.socialTarget = () => ({ bonus: 5, dc: 12 });
  const social = context.testPreview({ type: "social", text: "Bluff the guard" });
  assert.match(social.primary, /d20 \+ 5 vs DC 12 · 70% success/);
  context.socialSkill = () => null;
  const paladinStrike = context.testPreview({ type: "combat", ability: "strike", text: "Holy strike" });
  assert.match(paladinStrike.secondary, /0 Mana cost · up to \+25 recovery/);
  assert.match(warriorStrike.secondary, /1d8 \+ 10 raw damage/);
});

test("class combat abilities charge the class resource and resolve attacks and healing locally", () => {
  const context = makeContext();
  const enemy = { name: "Guard", hp: 40, maxHp: 40 };
  let capturedAdvantage = null;
  context.campaign = { flags: {}, enemies: [enemy], combatRound: 0, encounterSerial: 0, defeatedEnemies: [] };
  context.selectedCombatTarget = "Guard";
  context.livingEnemies = () => context.campaign.enemies.filter(x => x.hp > 0);
  context.startProgressionEncounter = () => context.encounter = { id: "test", defeated: [], party: [] };
  context.partyExperienceIds = () => [];
  context.recordCombatDelta = () => {};
  context.status = message => { context.statusMessage = message; };
  context.resourceName = () => "Mana";
  context.window.soaCharacters.profile = () => ({ name: "Test Paladin", className: "Paladin" });
  context.window.soaAbilities.get = () => ({ name: "Test Paladin", className: "Paladin", proficiency: 2, modifiers: { STR: 3, WIS: 2 }, armorClass: 16, initiative: 1 });
  context.window.soaCombatRules = {
    statBlock: () => ({ ac: 12, type: "guard", bonus: 0, die: 4 }),
    attack: (bonus, ac, options = {}) => { capturedAdvantage = options.advantage ?? 0; return { die: 15, total: bonus + 15, bonus, ac, critical: false, hit: capturedAdvantage !== -1 }; },
    damage: (die, flat) => Math.ceil(die / 2) + flat,
    mitigate: amount => amount,
    initiative: () => 10,
  };
  vm.runInContext(`${functionBlock("classAbilityExchange", "fightExchange")}\nglobalThis.runClassAbility = classAbilityExchange;`, context);

  context.s.en = 60;
  const strike = context.runClassAbility({ text: "Test Paladin uses Crusader Strike against Guard" }, {
    id: "crusader_strike", name: "Crusader Strike", cost: 30, effect: "damage", stat: "STR", die: 8, flat: 5, damageType: "radiant",
  }, [enemy]);
  assert.match(strike, /uses Crusader Strike/);
  assert.equal(enemy.hp, 25, "spell damage includes ability and equipped damage modifiers");
  assert.equal(context.s.en, 55, "30 Mana is spent and 25 is restored after one exchange");
  assert.equal(context.campaign.combatRound, 1);

  context.s.hp = 60;
  context.campaign.enemies = [enemy];
  const heal = context.runClassAbility({ text: "Test Paladin uses Flash of Light" }, {
    id: "flash_of_light", name: "Flash of Light", cost: 35, effect: "heal", stat: "WIS", die: 8, flat: 5, damageType: "radiant",
  }, [enemy]);
  assert.match(heal, /restores 11 HP/);
  assert.equal(context.s.hp, 67, "healing applies before the enemy's retaliation");
  assert.equal(context.s.en, 45, "35 Mana is spent and 25 is restored after one exchange");

  context.s.en = 100;
  context.window.soaCharacters.profile = () => ({ name: "Test Rogue", className: "Rogue" });
  const evasion = context.runClassAbility({ text: "Test Rogue uses Evasion" }, {
    id: "evasion", name: "Evasion", cost: 35, effect: "guard", stat: "DEX", die: 0, flat: 0, damageType: "physical",
  }, [enemy]);
  assert.match(evasion, /evades the incoming attack/);
  assert.equal(capturedAdvantage, -1, "defensive abilities give the incoming attack disadvantage");
  assert.equal(context.s.en, 90, "Evasion pays its cost before 25-point exchange recovery");
});

test("story combat text resolves every learned class ability by its displayed name", () => {
  const context = makeContext();
  context.window.soaCharacters.profile = () => ({ className: "Rogue" });
  context.window.soaProgression = { level: () => 5 };
  const learned = [
    { id: "sinister_strike", name: "Sinister Strike" },
    { id: "kick", name: "Kick" },
    { id: "evasion", name: "Evasion" },
    { id: "blade_flurry", name: "Blade Flurry" },
  ];
  context.window.soaClassAbilities = {
    available: () => learned,
    get: (id) => learned.find(ability => ability.id === id) || null,
  };
  vm.runInContext([
    functionBlock("resolvedCombatAbility", "d20SuccessChance"),
    "globalThis.resolveCombatAbility = resolvedCombatAbility;",
  ].join("\n"), context);
  assert.equal(context.resolveCombatAbility({ type: "combat", text: "Follow up with a swift Sinister Strike." }), "sinister_strike");
  assert.equal(context.resolveCombatAbility({ type: "combat", text: "Kick the guard before he can shout." }), "kick");
  assert.equal(context.resolveCombatAbility({ type: "combat", text: "Use Blade Flurry against the pair." }), "blade_flurry");
  assert.equal(context.resolveCombatAbility({ type: "combat", ability: "strike", text: "A measured weapon attack." }), "strike");
});

test("story choices route named cooldown abilities through the shared ability exchange", () => {
  const context = makeContext();
  const enemy = { name: "Trogg Scout", hp: 34, maxHp: 45 };
  const kick = { id: "kick", name: "Kick", cost: 35, effect: "interrupt", cooldown: 1 };
  context.campaign = { flags: {}, enemies: [enemy], combatRound: 4 };
  context.window.soaCharacters.profile = () => ({ name: "Test Rogue", className: "Rogue" });
  context.window.soaProgression = { level: () => 3 };
  context.livingEnemies = () => [enemy];
  context.window.soaClassAbilities = {
    available: () => [kick],
    get: id => id === "kick" ? kick : null,
    costOf: id => id === "kick" ? kick.cost : 0,
  };
  context.window.soaRacialAbilities = { get: () => null };
  context.classAbilityExchange = (action, ability, targets) => {
    context.routedAbility = ability;
    context.routedTarget = targets[0];
    return "Resolved shared class ability.";
  };
  vm.runInContext([
    functionBlock("resolvedCombatAbility", "d20SuccessChance"),
    functionBlock("fightExchange", "updateLivingEnemies"),
    "globalThis.runFightExchange = fightExchange;",
  ].join("\n"), context);
  assert.equal(context.runFightExchange({ type: "combat", text: "Use Kick against the Trogg Scout." }), "Resolved shared class ability.");
  assert.equal(context.routedAbility.id, "kick");
  assert.equal(context.routedTarget.name, "Trogg Scout");
});

test("combat overview stays hidden after the last hostile is defeated", () => {
  const context = makeContext();
  context.campaign = {
    combatAllies: [{ name: "Companion" }],
    scene: { choices: [{ type: "combat", text: "An old combat choice" }] },
    lastExchange: { defeated: true, target: "Guard" },
  };
  context.livingEnemies = () => [];
  context.document = { createElement: () => { throw new Error("inactive combat must not render an overview"); } };
  context.drawnCombat = [];
  vm.runInContext([
    functionBlock("drawEnemyStatus", "drawCombatActions"),
    "globalThis.renderEnemyStatus = drawEnemyStatus;",
  ].join("\n"), context);
  context.testBox = { append: node => context.drawnCombat.push(node) };
  context.renderEnemyStatus(context.testBox);
  assert.equal(context.drawnCombat.length, 0);
});

test("class ability cooldowns block only the intended number of exchanges", () => {
  const context = makeContext();
  context.campaign = { combatRound: 1, classCooldowns: { kick: 3 } };
  vm.runInContext(`${functionBlock("classCooldownLeft", "resourceKey")}\nglobalThis.cooldownLeft = classCooldownLeft;`, context);
  assert.equal(context.cooldownLeft({ id: "kick" }), 1);
  context.campaign.combatRound = 2;
  assert.equal(context.cooldownLeft({ id: "kick" }), 0);
  assert.equal(context.cooldownLeft({ id: "unknown" }), 0);
});

test("campaign save normalization repairs partial state and drops malformed scene data", () => {
  const context = makeContext();
  context.MAX = 24;
  context.make = () => ({ lastAction: "Start the next scene", lastResult: "No new action yet." });
  context.window.soaSaveRules = { validateCampaignSave: value => value };
  vm.runInContext([
    functionBlock("normalizeCampaignState", "safe"),
    "globalThis.normalize = normalizeCampaignState;",
  ].join("\n"), context);

  const normalized = context.normalize({
    turn: 3,
    scene: { story: "An open door.", choices: [{ text: "Investigate", type: "unknown", difficulty: "odd" }] },
    history: ["one", null, "two"], journal: "invalid", pending: { action: 4 },
    enemies: [{ name: "Guard", hp: 90, maxHp: 20 }, { name: "Scout", hp: 8, maxHp: 12 }],
    combatLog: [{ round: 2, events: [{ name: "Guard", after: 5, maxHp: 20 }] }, "bad row"],
  });
  assert.equal(normalized.turn, 3);
  assert.equal(normalized.scene.choices[0].type, "investigate");
  assert.equal(normalized.scene.choices[0].difficulty, "medium");
  assert.deepEqual(Array.from(normalized.history), ["one", "two"]);
  assert.deepEqual(Array.from(normalized.journal), []);
  assert.equal(normalized.pending, null);
  assert.equal(normalized.enemies.length, 1);
  assert.equal(normalized.enemies[0].name, "Scout");
  assert.equal(normalized.combatLog.length, 1);
  assert.equal(context.normalize(["not", "a", "campaign"]), null);
  assert.equal(context.normalize({ scene: { story: "broken", choices: "not choices" } }).scene, null);

  const bounded = context.normalize({
    pending: { action: "a".repeat(400), resolution: "r".repeat(900), startedAt: -1, dialogue: { target: "unknown", tone: "flirt" } },
    scene: { story: "Open.", choices: [{ text: "x".repeat(200) }] },
  });
  assert.equal(bounded.pending.action.length, 320);
  assert.equal(bounded.pending.resolution.length, 700);
  assert.equal(bounded.pending.startedAt, 0);
  assert.equal(bounded.pending.dialogue, null);
  assert.equal(bounded.scene.choices[0].text.length, 170);
});

test("choice resource forecasts show current reserve, cost, and post-exchange recovery", () => {
  const context = makeContext();
  vm.runInContext([
    functionBlock("socialSkill", "bribeCopper"),
    functionBlock("actionOdds", "heroHealthCap"),
    functionBlock("resourceName", "resolvedCombatAbility"),
    functionBlock("resolvedCombatAbility", "dicePreview"),
    functionBlock("resourceForecast", "socialCheck"),
    "globalThis.forecast = resourceForecast;",
  ].join("\n"), context);
  context.s.en = 45;
  context.window.soaClassAbilities = {
    get: () => null,
    costOf: () => 30,
  };
  const investigate = context.forecast({ type: "investigate", difficulty: "medium" });
  assert.equal(investigate.current, 45);
  assert.equal(investigate.cost, 10);
  assert.equal(investigate.after, 45);
  assert.match(investigate.text, /Energy 45 → 45\/100 · 10 cost · \+10 recovery/);

  const combat = context.forecast({ type: "combat", ability: "strike", text: "Strike the Guard" });
  assert.equal(combat.cost, 30);
  assert.equal(combat.after, 40);
  assert.match(combat.text, /Energy 45 → 40\/100 · 30 cost · \+25 recovery/);

  context.window.soaCharacters.profile = () => ({ className: "Warrior" });
  assert.equal(context.forecast({ type: "investigate", difficulty: "medium" }).label, "Rage");
  context.window.soaCharacters.profile = () => ({ className: "Paladin" });
  assert.equal(context.forecast({ type: "investigate", difficulty: "medium" }).label, "Mana");

  context.s.en = 8;
  context.window.soaCharacters.profile = () => ({ className: "Rogue" });
  const unavailable = context.forecast({ type: "investigate", difficulty: "medium" });
  assert.equal(unavailable.affordable, false);
  assert.match(unavailable.text, /Need 10 Energy · have 8\/100/);
});
