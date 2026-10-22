"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const storyModule = import("../functions/api/story.js");
const credentials = { GEMINI_API_KEY: "test-gemini-key", AI_ACCESS_CODE: "test-access-code" };

test("AI connection check confirms configuration and validates the access code without generating narration", async () => {
  const { onRequestGet } = await storyModule;
  const request = new Request("https://game.example/api/story", { headers: { "X-Story-Access": "test-access-code" } });
  const response = await onRequestGet({ request, env: credentials });
  assert.equal(response.status, 200);
  assert.match((await response.json()).status, /verified/i);
});

test("AI connection check asks for setup when secrets are missing or the code is invalid", async () => {
  const { onRequestGet } = await storyModule;
  const request = new Request("https://game.example/api/story", { headers: { "X-Story-Access": "wrong-code" } });
  assert.equal((await onRequestGet({ request, env: {} })).status, 503);
  assert.equal((await onRequestGet({ request, env: credentials })).status, 401);
});

test("AI connection check rejects a foreign origin", async () => {
  const { onRequestGet } = await storyModule;
  const request = new Request("https://game.example/api/story", {
    headers: { "X-Story-Access": "test-access-code", Origin: "https://other.example" },
  });
  assert.equal((await onRequestGet({ request, env: credentials })).status, 403);
});


test("optional AI narration follows the supplied scene instead of a fixed location", async () => {
  const { onRequestPost } = await storyModule;
  const previousFetch = global.fetch;
  let requestBody;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "You bind the wound as the crypt air chills around you." }] } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const request = new Request("https://game.example/api/story", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Story-Access": "test-access-code" },
      body: JSON.stringify({
        scene: "You crouch in a dwarven crypt, binding your wound.",
        action: "Bind my wounds",
        state: { hp: 40, energy: 65, money: "15s", location: "Burial Vault", alert: 0, notes: [] },
      }),
    });
    const response = await onRequestPost({ request, env: credentials });
    assert.equal(response.status, 200);
    const instructions = requestBody.systemInstruction.parts[0].text;
    assert.match(instructions, /supplied scene, chosen action, and confirmed state/i);
    assert.doesNotMatch(instructions, /Hollow Raven|Raven Hill|Bromli \(dwarf fighter\)/i);
    assert.match(requestBody.contents[0].parts[0].text, /Burial Vault/);
    assert.match((await response.json()).story, /crypt air/);
  } finally {
    global.fetch = previousFetch;
  }
});
