"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "wrangler.jsonc"), "utf8"));
const workerPromise = import(pathToFileURL(path.join(__dirname, "..", "worker.mjs")));

test("Wrangler preview config points at the game assets and has a previews block", () => {
  assert.deepEqual(config.previews, {});
  assert.equal(config.assets.directory, "./public");
  assert.equal(config.main, "./worker.mjs");
});

test("Workers preview serves assets and reuses both Pages API handlers", async () => {
  const { default: worker } = await workerPromise;
  const env = { ASSETS: { fetch: async () => new Response("game asset") } };
  const asset = await worker.fetch(new Request("https://game.example/"), env, {});
  assert.equal(await asset.text(), "game asset");

  const story = await worker.fetch(new Request("https://game.example/api/story"), env, {});
  assert.equal(story.status, 200);
  assert.match((await story.json()).status, /endpoint available/i);

  const campaign = await worker.fetch(new Request("https://game.example/api/campaign"), env, {});
  assert.equal(campaign.status, 200);
  assert.match((await campaign.json()).status, /endpoint online/i);

  const missing = await worker.fetch(new Request("https://game.example/api/unknown"), env, {});
  assert.equal(missing.status, 404);
});
