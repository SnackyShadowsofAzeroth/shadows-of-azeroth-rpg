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
