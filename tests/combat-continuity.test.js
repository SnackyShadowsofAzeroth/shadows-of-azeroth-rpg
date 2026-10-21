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
      } }),
    });
    const response = await onRequestPost({ request, env: { GEMINI_API_KEY: "test-key", AI_ACCESS_CODE: "test-access-code" } });
    assert.equal(response.status, 200);
    const instructions = geminiRequest.systemInstruction.parts[0].text;
    assert.match(instructions, /“defeated” means removed from the active combat roster and does NOT by itself mean dead/i);
    assert.match(instructions, /“Incapacitated,” “downed,” “unconscious,” “defeated,” and “dead” are distinct states/i);
    assert.match(instructions, /do not convert the fall into a killing blow/i);
    assert.match(instructions, /fate unconfirmed/i);
    const sentContext = JSON.parse(geminiRequest.contents[0].parts[0].text);
    assert.equal(sentContext.action, "Kick the conspirator off the catwalk");
    assert.match(sentContext.previousScene, /alive and incapacitated/i);
  } finally {
    global.fetch = previousFetch;
  }
});
