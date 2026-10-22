"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const campaignModule = import("../functions/api/campaign.js");

test("campaign prompt preserves incapacitation and unresolved falls as nonfatal continuity states", async () => {
  const { onRequestPost } = await campaignModule;
  const previousFetch = global.fetch;
  let geminiRequest;
  global.fetch = async (_url, options) => {
    geminiRequest = JSON.parse(options.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: "The Catwalk",
      location: "Old Foundry",
      story: "The guard disappears below the railing. The clatter echoes through the foundry.",
      choices: [
        { text: "Look over the railing", type: "investigate", difficulty: "medium" },
        { text: "Call down to the fallen guard", type: "social", difficulty: "easy" },
      ],
      enemies: [],
      allies: [],
      journal: "",
    }) }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const request = new Request("https://game.example/api/campaign", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Story-Access": "test-access-code" },
      body: JSON.stringify({ context: {
        action: "Kick the conspirator off the catwalk",
        resolution: "Success: the kick connects and knocks the conspirator from the catwalk.",
        previousScene: "The conspirator is alive and incapacitated beside the railing.",
        character: { id: "snacky", name: "Snacky Lugnuts", gender: "Male", race: "Gnome", className: "Rogue" },
      } }),
    });
    const response = await onRequestPost({ request, env: { GEMINI_API_KEY: "test-key", AI_ACCESS_CODE: "test-access-code" } });
    assert.equal(response.status, 200);
    const instructions = geminiRequest.systemInstruction.parts[0].text;
    assert.match(instructions, /“defeated” means removed from the active combat roster and does NOT by itself mean dead/i);
    assert.match(instructions, /“Incapacitated,” “downed,” “unconscious,” “defeated,” and “dead” are distinct states/i);
    assert.match(instructions, /do not convert the fall into a killing blow/i);
    assert.match(instructions, /fate unconfirmed/i);
    assert.match(instructions, /male gnome SI:7 Combat Swords rogue and uses he\/him pronouns/i);
    assert.match(instructions, /Never call him “lass”, “girl”, or other feminine terms/i);
    const sentContext = JSON.parse(geminiRequest.contents[0].parts[0].text);
    assert.equal(sentContext.action, "Kick the conspirator off the catwalk");
    assert.equal(sentContext.character.gender, "Male");
    assert.match(sentContext.previousScene, /alive and incapacitated/i);
  } finally {
    global.fetch = previousFetch;
  }
});


function sceneResponse(overrides = {}) {
  return {
    title: "A New Scene",
    location: "Service Tunnel, Upper Gantry, Ice-Drill Site, Dun Morogh",
    story: "You take stock of the chamber and the machinery around you.",
    choices: [
      { text: "Inspect the local controls", type: "investigate", difficulty: "easy" },
      { text: "Listen for movement", type: "investigate", difficulty: "medium" },
    ],
    enemies: [],
    allies: [],
    journal: "",
    ...overrides,
  };
}

function geminiReply(scene) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(scene) }] } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function campaignRequest(context = {}) {
  return new Request("https://game.example/api/campaign", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Story-Access": "test-access-code" },
    body: JSON.stringify({ context }),
  });
}

test("campaign prompt follows the saved quest state instead of hard-coding a stale plot arc", async () => {
  const { onRequestPost } = await campaignModule;
  const previousFetch = global.fetch;
  let geminiRequest;
  global.fetch = async (_url, options) => {
    geminiRequest = JSON.parse(options.body);
    return geminiReply(sceneResponse());
  };

  try {
    const response = await onRequestPost({
      request: campaignRequest({
        action: "Inspect the nearby junction",
        location: "Service Tunnel, Upper Gantry, Ice-Drill Site, Dun Morogh",
        chronicle: {
          primaryQuest: { title: "Explore the crypt", objective: "Find the sealed lower chamber" },
          activeQuests: [{ title: "Map the crypt", objectives: ["Reach the lower chamber"] }],
        },
        character: { id: "snacky", name: "Snacky Lugnuts", gender: "Male", race: "Gnome", className: "Rogue" },
      }),
      env: { GEMINI_API_KEY: "test-key", AI_ACCESS_CODE: "test-access-code" },
    });
    assert.equal(response.status, 200);
    const instructions = geminiRequest.systemInstruction.parts[0].text;
    const context = JSON.parse(geminiRequest.contents[0].parts[0].text);
    assert.match(instructions, /Do not hard-code a current plot arc or objective/i);
    assert.match(instructions, /Do not infer a current objective from historical campaignOrigin text/i);
    assert.doesNotMatch(instructions, /current campaign arc is a threat involving explosives in Stormwind/i);
    assert.deepEqual(context.chronicle.primaryQuest, { title: "Explore the crypt", objective: "Find the sealed lower chamber" });
  } finally {
    global.fetch = previousFetch;
  }
});

test("campaign API rejects unchosen regional relocation but permits explicitly selected travel", async () => {
  const { onRequestPost } = await campaignModule;
  const previousFetch = global.fetch;
  let generatedLocation = "Stormwind City";
  global.fetch = async () => geminiReply(sceneResponse({ location: generatedLocation }));

  try {
    const context = {
      location: "Service Tunnel, Upper Gantry, Ice-Drill Site, Dun Morogh",
      action: "Inspect the local machinery",
      character: { id: "snacky", name: "Snacky Lugnuts", gender: "Male", race: "Gnome", className: "Rogue" },
    };
    const env = { GEMINI_API_KEY: "test-key", AI_ACCESS_CODE: "test-access-code" };
    let response = await onRequestPost({ request: campaignRequest(context), env });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /resource costs are preserved/i);

    context.action = "Travel to Stormwind City through a portal";
    generatedLocation = "Stormwind City";
    response = await onRequestPost({ request: campaignRequest(context), env });
    assert.equal(response.status, 200);

    context.action = "Do not travel to Stormwind; inspect the local machinery";
    generatedLocation = "Stormwind City";
    response = await onRequestPost({ request: campaignRequest(context), env });
    assert.equal(response.status, 409);
  } finally {
    global.fetch = previousFetch;
  }
});

test("campaign API preserves zero HP and clamps combat health to valid maximums", async () => {
  const { onRequestPost } = await campaignModule;
  const previousFetch = global.fetch;
  global.fetch = async () => geminiReply(sceneResponse({
    allies: [
      { name: "Bromli Ironkeg", role: "Protection Paladin", hp: 0, maxHp: 120 },
      { name: "Pippa Sparkwhistle", role: "Subtlety Rogue", hp: 80, maxHp: 45 },
      { name: "Lethariel Moonguard", role: "Restoration Priest", hp: null, maxHp: 90 },
    ],
    enemies: [
      { name: "Fallen Guard", hp: 0, maxHp: 45 },
      { name: "Crypt Stalker", hp: 20, maxHp: 45 },
    ],
  }));

  try {
    const response = await onRequestPost({
      request: campaignRequest({ action: "Check the corridor", location: "Dun Morogh" }),
      env: { GEMINI_API_KEY: "test-key", AI_ACCESS_CODE: "test-access-code" },
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.allies.map(ally => [ally.name, ally.hp, ally.maxHp]), [
      ["Bromli Ironkeg", 0, 120],
      ["Pippa Sparkwhistle", 45, 45],
      ["Lethariel Moonguard", null, null],
    ]);
    assert.deepEqual(result.enemies.map(enemy => [enemy.name, enemy.hp, enemy.maxHp]), [
      ["Crypt Stalker", 20, 45],
    ]);
  } finally {
    global.fetch = previousFetch;
  }
});
