"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "functions", "api", "campaign.js"), "utf8");
const start = source.indexOf("async function fetchGeminiWithRetry(");
const end = source.indexOf("\nfunction polishNarrative(", start);
assert.notEqual(start, -1, "retry helper exists");
assert.notEqual(end, -1, "retry helper ends before narrative helpers");
const helper = source.slice(start, end);

function loadRetry(fetcher) {
  const context = { fetch: fetcher, setTimeout };
  vm.createContext(context);
  vm.runInContext(helper + "\nglobalThis.runRetry = fetchGeminiWithRetry;", context);
  return context.runRetry;
}

test("a transient Gemini 503 is retried once and can recover", async () => {
  let calls = 0;
  const options = { method: "POST", body: "saved action context" };
  const responses = [
    { ok: false, status: 503, body: { cancel: async () => {} } },
    { ok: true, status: 200, body: null },
  ];
  const retry = loadRetry(async (_url, init) => {
    calls++;
    assert.equal(init, options, "both attempts reuse the same generation request");
    return responses.shift();
  });
  const response = await retry("https://gemini.example/generate", options, undefined, async delay => {
    assert.equal(delay, 400);
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("non-transient Gemini errors are returned without retry", async () => {
  let calls = 0;
  const retry = loadRetry(async () => {
    calls++;
    return { ok: false, status: 400, body: null };
  });
  const response = await retry("https://gemini.example/generate", {}, undefined, async () => {
    assert.fail("a permanent request error should not be retried");
  });
  assert.equal(response.status, 400);
  assert.equal(calls, 1);
});
