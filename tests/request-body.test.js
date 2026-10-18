"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "functions", "_lib", "read-json.js"), "utf8");
const encoded = Buffer.from(source).toString("base64");
const rulesPromise = import(`data:text/javascript;base64,${encoded}`);

function requestFromBytes(bytes, headers = new Headers()) {
  return {
    headers,
    body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }),
  };
}

test("reads valid UTF-8 JSON even when a multibyte character crosses chunks", async () => {
  const { readJsonLimited } = await rulesPromise;
  const bytes = new TextEncoder().encode('{"name":"é"}');
  const split = Array.from(bytes);
  const request = {
    headers: new Headers(),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.from(split.slice(0, 10)));
        controller.enqueue(Uint8Array.from(split.slice(10)));
        controller.close();
      },
    }),
  };
  assert.deepEqual(await readJsonLimited(request, 32), { ok: true, value: { name: "é" } });
});

test("enforces the actual byte cap when Content-Length is absent", async () => {
  const { readJsonLimited } = await rulesPromise;
  let cancelled = false;
  const request = {
    headers: new Headers(),
    body: new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(9)); },
      cancel() { cancelled = true; },
    }),
  };
  const result = await readJsonLimited(request, 8);
  assert.deepEqual(result, { ok: false, tooLarge: true });
  assert.equal(cancelled, true);
});

test("rejects advertised oversize, malformed JSON, and invalid UTF-8", async () => {
  const { readJsonLimited } = await rulesPromise;
  const oversizedHeader = requestFromBytes(new TextEncoder().encode("{}"), new Headers({ "content-length": "1000" }));
  assert.deepEqual(await readJsonLimited(oversizedHeader, 8), { ok: false, tooLarge: true });
  assert.deepEqual(await readJsonLimited(requestFromBytes(new TextEncoder().encode("{")), 8), { ok: false, tooLarge: false });
  assert.deepEqual(await readJsonLimited(requestFromBytes(Uint8Array.from([0xff])), 8), { ok: false, tooLarge: false });
});
