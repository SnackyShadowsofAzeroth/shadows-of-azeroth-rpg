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
    ACTION_RESOURCE_RECOVERY: 25,
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
    functionBlock("resolvedStoryVanish", "d20SuccessChance"),
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
  assert.equal(context.s.en, 100, "a capped story action cannot exceed 100 resource");
  assert.equal(context.s.time, 1);

  context.s.en = 45;
  context.testApi.result(action);
  assert.equal(context.s.en, 50, "a story action spends its cost and restores 25 resource");

  const search = context.testApi.actionOdds({ type: "stealth", text: "Search the room" });
  assert.equal(search.skill, "investigate");
  assert.equal(search.cost, 10);
  assert.equal(context.testApi.resolvedSkillName({ type: "stealth", text: "Search the room" }), "investigate");
  context.livingEnemies = () => [];
  assert.equal(context.testApi.resolvedSkillName({ type: "combat", text: "Search the room" }), "investigate");
  context.livingEnemies = () => [{ name: "Guard", hp: 20, maxHp: 20 }];
  assert.equal(context.testApi.resolvedSkillName({ type: "combat", text: "Search the room" }), "combat");
});

test("Vanish story choices use the learned combat ability with its stated cost and cooldown", () => {
  const context = makeContext();
  const enemy = { name: "Trogg Scout", hp: 45, maxHp: 45 };
  const vanish = { id: "vanish", name: "Vanish", cost: 40, effect: "guard", cooldown: 5, guaranteedEvade: true };
  let routed = null;
  let randomCalls = 0;
  context.Math.random = () => { randomCalls++; return 0.99; };
  context.campaign = { flags: {}, combatRound: 0, classCooldowns: {} };
  context.window.soaCharacters.profile = () => ({ name: "Snacky Lugnuts", className: "Rogue" });
  context.window.soaProgression = { level: () => 10 };
  context.window.soaClassAbilities = {
    get: id => id === "vanish" ? vanish : null,
    costOf: id => id === "vanish" ? 40 : 0,
  };
  context.livingEnemies = () => [enemy];
  context.fightExchange = action => { routed = action; return "Resolved shared Vanish ability."; };
  context.status = message => { context.statusMessage = message; };

  vm.runInContext([
    functionBlock("socialSkill", "bribeCopper"),
    functionBlock("resourceName", "classCooldownLeft"),
    functionBlock("resourceKey", "d20SuccessChance"),
    functionBlock("d20SuccessChance", "chanceLabel"),
    functionBlock("chanceLabel", "actionOdds"),
    functionBlock("actionOdds", "heroHealthCap"),
    functionBlock("dicePreview", "resourceForecast"),
    functionBlock("resourceForecast", "socialCheck"),
    functionBlock("resolvedStoryVanish", "d20SuccessChance"),
    functionBlock("result", "interfaceUI"),
    "globalThis.vanishTest = { resolvedStoryVanish, dicePreview, resourceForecast, result };",
  ].join("\n"), context);

  const choice = { type: "stealth", difficulty: "easy", text: "Vanish completely into the surrounding steam vents" };
  assert.equal(context.vanishTest.resolvedStoryVanish(choice), "vanish");
  const preview = context.vanishTest.dicePreview(choice);
  assert.match(preview.primary, /Guaranteed success · 100%/);
  assert.match(preview.secondary, /40 Energy cost · 5-exchange cooldown/);
  const forecast = context.vanishTest.resourceForecast(choice);
  assert.equal(forecast.cost, 40);
  assert.equal(forecast.after, 85);
  assert.match(forecast.text, /Energy 100 → 85\/100 · 40 cost · \+25 recovery · Vanish · 5-exchange cooldown/);
  assert.equal(context.vanishTest.result(choice), "Resolved shared Vanish ability.");
  assert.deepEqual({ type: routed.type, ability: routed.ability }, { type: "combat", ability: "vanish" });
  assert.equal(randomCalls, 0, "Vanish does not make a stealth percentage roll");
});

test("binding wounds restores a small, capped amount of HP only when the action succeeds", () => {
  const context = makeContext();
  context.heroHealthCap = () => 100;
  vm.runInContext([
    functionBlock("actionOdds", "heroHealthCap"),
    functionBlock("resolvedStoryVanish", "d20SuccessChance"),
    functionBlock("result", "interfaceUI"),
    "globalThis.resolveAction = result;",
  ].join("\n"), context);

  context.s.hp = 42;
  const action = { type: "investigate", text: "Bind my wounds with a bandage", difficulty: "easy" };
  const result = context.resolveAction(action);
  assert.match(result, /You bind your wounds and restore 4 HP; the bleeding subsides/);
  assert.equal(context.s.hp, 46);
  assert.equal(context.s.en, 100);

  context.s.hp = 99;
  context.resolveAction(action);
  assert.equal(context.s.hp, 100, "wound care cannot raise HP above the character cap");

  const failingContext = makeContext({ random: () => 0.99 });
  failingContext.heroHealthCap = () => 100;
  failingContext.s.hp = 42;
  vm.runInContext([
    functionBlock("actionOdds", "heroHealthCap"),
    functionBlock("resolvedStoryVanish", "d20SuccessChance"),
    functionBlock("result", "interfaceUI"),
    "globalThis.resolveAction = result;",
  ].join("\n"), failingContext);
  const failure = failingContext.resolveAction({ type: "investigate", text: "Apply a field dressing to my wound", difficulty: "hard" });
  assert.match(failure, /no HP is restored/);
  assert.equal(failingContext.s.hp, 42);
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
  assert.equal(context.testChance(0, 20, 0, 19), 10, "a 19–20 critical range doubles the natural critical chance");
  assert.equal(context.testChance(0, 20), 5, "ordinary attacks still crit only on a natural 20");
  assert.match(strike.secondary, /1d10 \+ 17 raw damage · 0 Energy cost · up to \+25 recovery/);

  const killingSpree = { id: "spec_rogue_combat", name: "Killing Spree", strikes: 2, weaponDamage: true, criticalOn: 19, cost: 50, cooldown: 2 };
  const vanish = { id: "vanish", name: "Vanish", guaranteedEvade: true, cost: 40, cooldown: 5 };
  context.window.soaClassAbilities = {
    get: id => [killingSpree, vanish].find(ability => ability.id === id) || (id === "sinister_strike" ? { id } : null),
    costOf: id => ({ sinister_strike: 30, evasion: 35, riposte: 30, strike: 0, kick: 35, spec_rogue_combat: 50, vanish: 40 })[id] ?? null,
  };
  const spreePreview = context.testPreview({ type: "combat", ability: "spec_rogue_combat", text: "Use Killing Spree against the Guard" });
  assert.match(spreePreview.primary, /2 separate attack rolls: each d20 \+ 9 vs AC 14 · 80% hit · natural 19–20 critical/);
  assert.match(spreePreview.secondary, /2 weapon strikes · each 1d10 \+ 17 raw damage · 50 Energy cost/);
  const vanishPreview = context.testPreview({ type: "combat", ability: "vanish", text: "Vanish from the Guard" });
  assert.match(vanishPreview.primary, /Guaranteed success · 100%/);
  assert.match(vanishPreview.secondary, /5 exchange cooldown/);
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
  assert.match(evasive.primary, /50% dodge chance per incoming hit/);
  assert.match(evasive.secondary, /Lasts 2 rounds · 35 Energy cost · 2-round cooldown · up to \+25 Energy recovery/);
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
    roll: () => 50,
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
  assert.match(evasion, /activates Evasion/);
  assert.equal(capturedAdvantage, 0, "Evasion uses a separate dodge roll instead of changing the enemy attack roll");
  assert.equal(context.campaign.lastExchange.evasionRoll, 50);
  assert.equal(context.campaign.lastExchange.evaded, true);
  assert.equal(context.s.en, 90, "Evasion pays its cost before 25-point exchange recovery");
});



test("combat rules preserve ordinary criticals and allow a 19–20 ability crit range", () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "public", "combat-rules.js"), "utf8"), { window });
  const attack = window.soaCombatRules.attack;
  const criticalNineteen = attack(0, 25, { criticalOn: 19, rng: () => 0.9 });
  assert.equal(criticalNineteen.die, 19);
  assert.equal(criticalNineteen.critical, true);
  assert.equal(criticalNineteen.hit, true, "a natural 19 critical always hits");
  const ordinaryNineteen = attack(0, 25, { rng: () => 0.9 });
  assert.equal(ordinaryNineteen.critical, false);
  assert.equal(ordinaryNineteen.hit, false);
  const ordinaryTwenty = attack(0, 25, { rng: () => 0.99 });
  assert.equal(ordinaryTwenty.critical, true);
  assert.equal(ordinaryTwenty.hit, true);
});

test("Killing Spree rolls two weapon attacks separately and uses its expanded critical range", () => {
  const context = makeContext({ random: () => 0.9 });
  const enemy = { name: "Guard", hp: 100, maxHp: 100 };
  const ability = { id: "spec_rogue_combat", name: "Killing Spree", cost: 50, effect: "damage", stat: "DEX", die: 12, flat: 8, damageType: "slashing", cooldown: 2, strikes: 2, weaponDamage: true, criticalOn: 19 };
  const attackCalls = [], damageCalls = [];
  context.campaign = { flags: {}, enemies: [enemy], combatRound: 0, encounterSerial: 0, defeatedEnemies: [], classCooldowns: {} };
  context.selectedCombatTarget = "Guard";
  context.livingEnemies = () => context.campaign.enemies.filter(x => x.hp > 0);
  context.startProgressionEncounter = () => context.encounter = { id: "test", defeated: [], party: [] };
  context.partyExperienceIds = () => [];
  context.recordCombatDelta = () => {};
  context.status = message => { context.statusMessage = message; };
  context.resourceName = () => "Energy";
  context.window.soaCharacters.profile = () => ({ name: "Snacky Lugnuts", className: "Rogue", race: "Gnome" });
  context.window.soaProgression = { level: () => 10 };
  context.window.soaClassAbilities = { get: id => id === ability.id ? ability : null };
  context.window.soaAbilities.get = () => ({ name: "Snacky Lugnuts", className: "Rogue", proficiency: 3, modifiers: { DEX: 4 }, armorClass: 16, initiative: 1 });
  context.window.soaEquipment.modifiers = () => ({ attack: 2, damage: 3 });
  context.window.soaCombatRules = {
    statBlock: () => ({ ac: 14, type: "guard", bonus: 3, die: 4 }),
    weapon: actor => ({ die: 10, flat: 10 + (actor?.modifiers?.DEX || 0), type: "piercing" }),
    attack: (bonus, ac, options = {}) => {
      attackCalls.push({ bonus, ac, options });
      const number = attackCalls.length;
      const die = number === 1 ? 19 : number === 2 ? 4 : 1;
      return { die, total: die + bonus, bonus, ac, critical: die >= (options.criticalOn || 20), hit: die !== 1 && (die >= (options.criticalOn || 20) || die + bonus >= ac) };
    },
    damage: (die, flat, critical) => { damageCalls.push({ die, flat, critical }); return flat + 10 + (critical ? 10 : 0); },
    mitigate: amount => amount,
    initiative: () => 10,
  };
  vm.runInContext([
    functionBlock("resourceName", "classCooldownLeft"),
    functionBlock("classAbilityExchange", "fightExchange"),
    "globalThis.runClassAbility = classAbilityExchange;",
    "globalThis.cooldownLeft = classCooldownLeft;",
  ].join("\n"), context);

  const result = context.runClassAbility({ text: "Snacky uses Killing Spree against Guard" }, ability, [enemy]);
  assert.match(result, /Strike 1 hit \(critical\)/);
  assert.match(result, /Strike 2 miss/);
  assert.equal(attackCalls.filter(call => call.options.criticalOn === 19).length, 2, "each strike rolls a separate d20 with a 19–20 critical range");
  assert.equal(damageCalls.length, 1, "a missed strike does not roll a damage die");
  assert.deepEqual(damageCalls[0], { die: 10, flat: 17, critical: true }, "critical uses the weapon die and equipment damage bonus");
  assert.equal(enemy.hp, 63);
  assert.equal(context.s.en, 75, "50 Energy is spent and one combat exchange restores 25");
  assert.equal(context.campaign.combatRound, 1, "two strikes still consume one combat exchange");
  assert.equal(context.campaign.classCooldowns[ability.id], 4);
  assert.equal(context.cooldownLeft(ability), 2);
  assert.equal(context.campaign.lastExchange.strikes.length, 2);
  assert.equal(context.campaign.lastExchange.strikes[0].critical, true);
});

test("Killing Spree redirects its second strike to another living enemy after a takedown", () => {
  const context = makeContext({ random: () => 0.9 });
  const first = { name: "Guard", hp: 5, maxHp: 5 };
  const second = { name: "Archer", hp: 50, maxHp: 50 };
  const ability = { id: "spec_rogue_combat", name: "Killing Spree", cost: 50, effect: "damage", stat: "DEX", die: 12, flat: 8, damageType: "slashing", cooldown: 2, strikes: 2, weaponDamage: true, criticalOn: 19 };
  const attackCalls = [];
  context.campaign = { flags: {}, enemies: [first, second], combatRound: 0, encounterSerial: 0, defeatedEnemies: [], classCooldowns: {} };
  context.selectedCombatTarget = "Guard";
  context.livingEnemies = () => context.campaign.enemies.filter(x => x.hp > 0);
  context.startProgressionEncounter = () => context.encounter = { id: "test", defeated: [], party: [] };
  context.partyExperienceIds = () => [];
  context.recordCombatDelta = (enemy, dealt, taken, recipient, before, after, additional) => { context.delta = { enemy, dealt, additional }; };
  context.status = () => {};
  context.resourceName = () => "Energy";
  context.window.soaCharacters.profile = () => ({ name: "Snacky Lugnuts", className: "Rogue", race: "Gnome" });
  context.window.soaProgression = { level: () => 10 };
  context.window.soaClassAbilities = { get: id => id === ability.id ? ability : null };
  context.window.soaAbilities.get = () => ({ className: "Rogue", proficiency: 3, modifiers: { DEX: 4 }, armorClass: 16, initiative: 1 });
  context.window.soaEquipment.modifiers = () => ({ attack: 2, damage: 3 });
  context.window.soaCombatRules = {
    statBlock: () => ({ ac: 14, type: "guard", bonus: 3, die: 4 }),
    weapon: actor => ({ die: 10, flat: 10 + (actor?.modifiers?.DEX || 0), type: "piercing" }),
    attack: (bonus, ac, options = {}) => {
      attackCalls.push({ bonus, ac, options });
      const die = attackCalls.length === 1 ? 20 : attackCalls.length === 2 ? 19 : 1;
      return { die, total: die + bonus, bonus, ac, critical: die >= (options.criticalOn || 20), hit: die !== 1 && (die >= (options.criticalOn || 20) || die + bonus >= ac) };
    },
    damage: (die, flat, critical) => flat + 10 + (critical ? 10 : 0),
    mitigate: amount => amount,
    initiative: () => 10,
  };
  vm.runInContext([
    functionBlock("resourceName", "classCooldownLeft"),
    functionBlock("classAbilityExchange", "fightExchange"),
    "globalThis.runClassAbility = classAbilityExchange;",
  ].join("\n"), context);

  context.runClassAbility({ text: "Snacky uses Killing Spree against Guard" }, ability, [first, second]);
  assert.equal(first.hp, 0);
  assert.equal(second.hp, 13, "the second hit is applied to the next living target");
  assert.deepEqual(Array.from(context.campaign.lastExchange.strikes, x => x.target), ["Guard", "Archer"]);
  assert.deepEqual(Array.from(context.campaign.lastExchange.defeatedTargets, x => x.name), ["Guard"]);
  assert.equal(context.delta.enemy.name, "Guard");
  assert.equal(context.delta.dealt, 5);
  assert.equal(context.delta.additional[0].enemy.name, "Archer");
  assert.equal(context.delta.additional[0].dealt, 37);
});

test("Vanish always evades the incoming attack and blocks for exactly five exchanges", () => {
  const context = makeContext();
  const enemy = { name: "Guard", hp: 40, maxHp: 40 };
  const ability = { id: "vanish", name: "Vanish", cost: 40, effect: "guard", stat: "DEX", die: 0, flat: 0, damageType: "physical", cooldown: 5, guaranteedEvade: true };
  let attackCalls = 0;
  context.campaign = { flags: {}, enemies: [enemy], combatRound: 0, encounterSerial: 0, defeatedEnemies: [], classCooldowns: {} };
  context.selectedCombatTarget = "Guard";
  context.livingEnemies = () => context.campaign.enemies.filter(x => x.hp > 0);
  context.startProgressionEncounter = () => context.encounter = { id: "test", defeated: [], party: [] };
  context.partyExperienceIds = () => [];
  context.recordCombatDelta = () => {};
  context.status = message => { context.statusMessage = message; };
  context.resourceName = () => "Energy";
  context.window.soaCharacters.profile = () => ({ name: "Snacky Lugnuts", className: "Rogue", race: "Gnome" });
  context.window.soaProgression = { level: () => 10 };
  context.window.soaClassAbilities = { get: id => id === ability.id ? ability : null };
  context.window.soaAbilities.get = () => ({ className: "Rogue", proficiency: 3, modifiers: { DEX: 4 }, armorClass: 16, initiative: 1 });
  context.window.soaCombatRules = {
    statBlock: () => ({ ac: 14, type: "guard", bonus: 5, die: 8 }),
    attack: () => { attackCalls++; return { die: 20, total: 25, hit: true, critical: false }; },
    damage: () => 8,
    mitigate: amount => amount,
    initiative: () => 10,
  };
  vm.runInContext([
    functionBlock("resourceName", "classCooldownLeft"),
    functionBlock("classAbilityExchange", "fightExchange"),
    "globalThis.runClassAbility = classAbilityExchange;",
    "globalThis.cooldownLeft = classCooldownLeft;",
  ].join("\n"), context);

  const result = context.runClassAbility({ text: "Snacky uses Vanish" }, ability, [enemy]);
  assert.match(result, /100% success/);
  assert.equal(context.campaign.lastExchange.evaded, true);
  assert.equal(context.campaign.lastExchange.taken, 0);
  assert.equal(context.s.en, 85, "Vanish pays 40 Energy and the exchange restores 25");
  assert.equal(attackCalls, 0, "guaranteed Vanish skips the enemy attack roll entirely");
  assert.equal(context.campaign.classCooldowns.vanish, 7);
  assert.equal(context.cooldownLeft(ability), 5);
  for (let round = 2; round <= 6; round++) {
    context.campaign.combatRound = round;
    assert.equal(context.cooldownLeft(ability), 7 - (round + 1), "the cooldown counts five full exchanges after use");
  }
  context.campaign.combatRound = 1;
  assert.equal(context.campaign.combatRound, 1);

  const energy = context.s.en;
  assert.equal(context.runClassAbility({ text: "Snacky uses Vanish" }, ability, [enemy]), null, "cooldown blocks reuse without resolving an action");
  assert.equal(context.campaign.combatRound, 1);
  assert.equal(context.s.en, energy);
  assert.match(context.statusMessage, /5 more exchanges/);
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
    { id: "vanish", name: "Vanish" },
    { id: "spec_rogue_combat", name: "Killing Spree" },
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
  assert.equal(context.resolveCombatAbility({ type: "combat", text: "Use Killing Spree against the pair." }), "spec_rogue_combat");
  assert.equal(context.resolveCombatAbility({ type: "combat", text: "Vanish before the guard strikes." }), "vanish");
  assert.equal(context.resolveCombatAbility({ type: "combat", ability: "strike", text: "A measured weapon attack." }), "strike");
});

test("story choices route named cooldown abilities through the shared ability exchange", () => {
  const context = makeContext();
  const enemy = { name: "Trogg Scout", hp: 34, maxHp: 45 };
  const kick = { id: "kick", name: "Kick", cost: 35, effect: "interrupt", cooldown: 1 };
  const killingSpree = { id: "spec_rogue_combat", name: "Killing Spree", cost: 50, effect: "damage", cooldown: 2, strikes: 2, weaponDamage: true, criticalOn: 19 };
  const vanish = { id: "vanish", name: "Vanish", cost: 40, effect: "guard", cooldown: 5, guaranteedEvade: true };
  const learned = [kick, killingSpree, vanish];
  context.campaign = { flags: {}, enemies: [enemy], combatRound: 4 };
  context.window.soaCharacters.profile = () => ({ name: "Test Rogue", className: "Rogue" });
  context.window.soaProgression = { level: () => 10 };
  context.livingEnemies = () => [enemy];
  context.window.soaClassAbilities = {
    available: () => learned,
    get: id => learned.find(ability => ability.id === id) || null,
    costOf: id => learned.find(ability => ability.id === id)?.cost ?? 0,
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
  assert.equal(context.runFightExchange({ type: "combat", text: "Use Killing Spree against the Trogg Scout." }), "Resolved shared class ability.");
  assert.equal(context.routedAbility.id, "spec_rogue_combat", "named A/B combat choices route the signature ability");
  assert.equal(context.runFightExchange({ type: "combat", text: "Vanish to evade the Trogg Scout's attack." }), "Resolved shared class ability.");
  assert.equal(context.routedAbility.id, "vanish", "named Vanish choices route through its cooldown-bearing class ability");
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

test("combat overview ignores a stale exchange from an earlier encounter", () => {
  const context = makeContext();
  context.campaign = {
    xpEncounter: { id: "encounter-9", active: true },
    lastExchange: { encounterId: "encounter-8", round: 74, ability: "spec_rogue_combat" },
  };
  vm.runInContext([
    functionBlock("currentEncounterExchange", "drawEnemyStatus"),
    "globalThis.currentExchange = currentEncounterExchange;",
  ].join("\n"), context);

  assert.equal(context.currentExchange(), null, "legacy and prior-encounter exchanges are not shown as current");
  const current = { encounterId: "encounter-9", round: 1, ability: "kick" };
  context.campaign.lastExchange = current;
  assert.equal(context.currentExchange(), current, "the active encounter's latest exchange remains visible");
});

test("a story action after victory starts a fresh encounter and clears combat cooldowns", () => {
  const context = makeContext();
  const oldFoe = { name: "Trogg Mechanic", hp: 0, maxHp: 60 };
  context.campaign = {
    enemyLocation: "Thunderbrew Distillery Service Tunnel",
    enemies: [oldFoe],
    pending: { combat: false },
    xpEncounter: { id: "encounter-7", active: true, pendingVictory: true, defeated: [{ name: oldFoe.name, maxHp: oldFoe.maxHp }] },
    combatRound: 74,
    classCooldowns: { spec_rogue_combat: 77, kick: 75 },
    supportCooldowns: { bromli_guard: 76 },
    evasionUntil: 75, guardUntil: 76, snareUntil: 77, snaredEnemy: "Old Guard",
    parryReady: true, initiativeFor: "Thunderbrew Distillery Service Tunnel",
    initiativeRoll: 21, enemyInitiative: 12,
  };
  context.livingEnemies = () => context.campaign.enemies.filter(enemy => enemy.hp > 0);
  context.concludeCalls = [];
  context.concludeProgressionEncounter = allowNextRoster => {
    context.concludeCalls.push(allowNextRoster);
    context.campaign.xpEncounter.active = false;
    context.campaign.xpEncounter.completed = true;
    context.campaign.xpEncounter.pendingVictory = false;
    return { awarded: 10 };
  };
  vm.runInContext([
    functionBlock("resetEncounterCombatState", "startProgressionEncounter"),
    functionBlock("updateLivingEnemies", "hydrateKnownAllyHP"),
    "globalThis.updateEnemies = updateLivingEnemies;",
  ].join("\n"), context);

  context.updateEnemies({
    location: "Thunderbrew Distillery Service Tunnel",
    enemies: [{ name: "Trogg Scout", hp: 45, maxHp: 45 }],
  });

  assert.deepEqual(Array.from(context.concludeCalls), [true], "the completed encounter is finalized before adding the scout");
  assert.equal(context.campaign.xpEncounter.active, false);
  assert.equal(context.campaign.enemies[0].name, "Trogg Scout");
  assert.deepEqual({ ...context.campaign.classCooldowns }, {});
  assert.deepEqual({ ...context.campaign.supportCooldowns }, {});
  assert.equal(context.campaign.combatRound, 0);
  assert.equal(context.campaign.evasionUntil, 0);
  assert.equal(context.campaign.guardUntil, 0);
  assert.equal(context.campaign.snareUntil, 0);
  assert.equal(context.campaign.parryReady, false);
  assert.equal(context.campaign.initiativeFor, null);
});

test("reinforcements after a combat action remain in the same encounter", () => {
  const context = makeContext();
  context.campaign = {
    enemyLocation: "Thunderbrew Distillery Service Tunnel",
    enemies: [{ name: "Trogg Mechanic", hp: 0, maxHp: 60 }],
    pending: { combat: true },
    xpEncounter: { id: "encounter-7", active: true, pendingVictory: true, defeated: [{ name: "Trogg Mechanic", maxHp: 60 }] },
    combatRound: 74,
    classCooldowns: { spec_rogue_combat: 77 },
  };
  context.livingEnemies = () => context.campaign.enemies.filter(enemy => enemy.hp > 0);
  context.concludeProgressionEncounter = () => { throw new Error("combat reinforcements must not close the encounter"); };
  vm.runInContext([
    functionBlock("resetEncounterCombatState", "startProgressionEncounter"),
    functionBlock("updateLivingEnemies", "hydrateKnownAllyHP"),
    "globalThis.updateEnemies = updateLivingEnemies;",
  ].join("\n"), context);

  context.updateEnemies({
    location: "Thunderbrew Distillery Service Tunnel",
    enemies: [{ name: "Trogg Scout", hp: 45, maxHp: 45 }],
  });

  assert.equal(context.campaign.xpEncounter.active, true);
  assert.equal(context.campaign.xpEncounter.pendingVictory, false);
  assert.equal(context.campaign.classCooldowns.spec_rogue_combat, 77);
  assert.equal(context.campaign.combatRound, 74);
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
  assert.equal(investigate.after, 60);
  assert.match(investigate.text, /Energy 45 → 60\/100 · 10 cost · \+25 recovery/);

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

  context.s.en = 95;
  const capped = context.forecast({ type: "investigate", difficulty: "medium" });
  assert.equal(capped.after, 100, "story-action recovery is capped at the resource maximum");
});


test("Evasion dodges on 1–50, lasts two rounds, and cools down for two rounds", () => {
  const context = makeContext();
  const enemy = { name: "Guard", hp: 1000, maxHp: 1000 };
  const dodgeRolls = [50, 51];
  const attackAdvantages = [];
  context.campaign = { flags: {}, enemies: [enemy], combatRound: 0, encounterSerial: 0, defeatedEnemies: [], classCooldowns: {}, enemyLocation: "crypt" };
  context.selectedCombatTarget = "Guard";
  context.livingEnemies = () => context.campaign.enemies.filter(x => x.hp > 0);
  context.startProgressionEncounter = () => context.encounter = { id: "test", defeated: [], party: [] };
  context.partyExperienceIds = () => [];
  context.recordCombatDelta = () => {};
  context.status = message => { context.statusMessage = message; };
  context.resourceName = () => "Energy";
  context.classCooldownLeft = ability => Math.max(0, (Number(context.campaign.classCooldowns?.[ability.id]) || 0) - ((Number(context.campaign.combatRound) || 0) + 1));
  context.window.soaCharacters.profile = () => ({ name: "Snacky", className: "Rogue" });
  context.window.soaAbilities.get = () => ({ name: "Snacky", className: "Rogue", proficiency: 3, modifiers: { DEX: 4 }, armorClass: 16, initiative: 10 });
  const evasion = { id: "evasion", name: "Evasion", cost: 35, effect: "guard", stat: "DEX", die: 0, flat: 0, damageType: "physical", cooldown: 2 };
  context.window.soaClassAbilities = { get: id => id === "evasion" ? evasion : null };
  context.window.soaCombatRules = {
    statBlock: () => ({ ac: 12, type: "guard", bonus: 0, die: 4, initiative: 0 }),
    attack: (bonus, ac, options = {}) => {
      attackAdvantages.push(options.advantage ?? 0);
      return { die: 15, total: bonus + 15, bonus, ac, critical: false, hit: true };
    },
    damage: (die, flat) => Math.ceil(die / 2) + flat,
    mitigate: amount => amount,
    initiative: () => 10,
    roll: sides => { assert.equal(sides, 100); return dodgeRolls.shift(); },
  };
  vm.runInContext(`${functionBlock("classAbilityExchange", "fightExchange")}\nglobalThis.runClassAbility = classAbilityExchange;`, context);

  context.s.en = 70;
  const activation = context.runClassAbility({ text: "Snacky uses Evasion against Guard" }, evasion, [enemy]);
  assert.match(activation, /50% dodge chance per incoming hit/);
  assert.equal(context.campaign.lastExchange.evasionRoll, 50, "50 is inside the successful half");
  assert.equal(context.campaign.lastExchange.evaded, true);
  assert.equal(context.campaign.lastExchange.evasionUntil, 2);
  assert.equal(context.campaign.lastExchange.evasionRemaining, 1);
  assert.equal(context.s.hp, 100, "the activation round's incoming hit is dodged");
  assert.equal(context.s.en, 60, "35 cost and +25 combat recovery net to -10 Energy");
  assert.equal(context.classCooldownLeft(evasion), 2);

  const beforeBlockedUse = { hp: context.s.hp, en: context.s.en, round: context.campaign.combatRound };
  assert.equal(context.runClassAbility({ text: "Snacky uses Evasion against Guard" }, evasion, [enemy]), null);
  assert.match(context.statusMessage, /cooling down for 2 more exchanges/);
  assert.deepEqual({ hp: context.s.hp, en: context.s.en, round: context.campaign.combatRound }, beforeBlockedUse, "cooldown rejects a use without spending an action or resource");

  const strike = { id: "test_strike", name: "Test Strike", cost: 0, effect: "damage", stat: "DEX", die: 1, flat: 0, damageType: "physical" };
  context.runClassAbility({ text: "Snacky uses Test Strike against Guard" }, strike, [enemy]);
  assert.equal(context.campaign.lastExchange.evasionActive, true, "Evasion remains active for the following round");
  assert.equal(context.campaign.lastExchange.evasionRoll, 51, "51 is outside the successful half");
  assert.equal(context.campaign.lastExchange.evaded, false);
  assert.equal(context.s.hp, 96, "a hit lands when the dodge roll is 51");
  assert.equal(context.campaign.lastExchange.evasionRemaining, 0);
  assert.equal(context.classCooldownLeft(evasion), 1);

  context.runClassAbility({ text: "Snacky uses Test Strike against Guard" }, strike, [enemy]);
  assert.equal(context.campaign.lastExchange.evasionActive, false, "Evasion expires after two incoming-attack rounds");
  assert.equal(context.campaign.lastExchange.evasionRoll, null, "expired Evasion does not roll");
  assert.equal(context.s.hp, 92, "the later hit lands normally");
  assert.equal(context.classCooldownLeft(evasion), 0, "the two-round cooldown expires after two later exchanges");
  assert.equal(dodgeRolls.length, 0, "exactly the two active rounds requested a dodge roll");
  assert.ok(attackAdvantages.every(value => value === 0), "Evasion does not alter enemy d20 advantage");
});
