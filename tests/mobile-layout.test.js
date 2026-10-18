"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "mobile-layout.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const characters = fs.readFileSync(path.join(__dirname, "..", "public", "characters.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");
const tabIds = ["adventure", "quest", "character", "reputation", "settings"];

function element(tagName, id = "", tab = "") {
  const children = [];
  const classes = new Set();
  const attributes = {};
  return {
    tagName: tagName.toUpperCase(), id, children, dataset: tab ? { gameTab: tab } : {}, attributes,
    hidden: false, onclick: null,
    classList: {
      add: name => classes.add(name),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      },
    },
    append(...nodes) { children.push(...nodes); },
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name] ?? null; },
    querySelectorAll(selector) {
      if (selector === "button.soa-quick-link") return children.filter(child => child.tagName === "BUTTON");
      return [];
    },
  };
}

function startLayout({ getItem = () => null, setItem = () => {}, readyState = "loading" } = {}) {
  const classes = new Set();
  const body = element("body");
  body.classList.add = name => classes.add(name);
  body.classList.remove = name => classes.delete(name);
  body.classList.contains = name => classes.has(name);
  const nav = element("nav");
  const tabs = new Map(tabIds.map(id => [id, element("button", "", id)]));
  nav.append(...tabs.values());
  const sections = [
    "campaign-box", "soa-adventure-story", "soa-chronicle", "soa-party-evidence",
    "soa-character-screen", "companion-panel", "soa-standalone-reputation",
    "soa-legacy-ai", "soa-save-settings",
  ].map(id => element("section", id));
  sections.find(section => section.id === "companion-panel").dataset.soaUnavailable = "true";
  const reports = [];
  const listeners = {};
  const storage = { getItem, setItem };
  let scrollCalls = 0;
  let organizationCalls = 0;
  const document = {
    body, readyState,
    querySelector: selector => selector === ".soa-quick-nav" ? nav : null,
    querySelectorAll: selector => selector.startsWith("main > section") ? sections : [],
    getElementById: () => null,
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  const context = {
    document, localStorage: storage,
    window: {
      scrollTo() { scrollCalls++; },
      soaCharacters: { organizeSections() { organizationCalls++; } },
      soaReportStorageFailure: message => reports.push(message),
    },
  };
  vm.runInNewContext(source, context, { filename: "mobile-layout.js" });
  if (listeners.DOMContentLoaded) listeners.DOMContentLoaded();
  return { layout: context.window.soaLayout, nav, tabs, sections, reports, body, get scrollCalls() { return scrollCalls; }, organizationCalls };
}

test("one five-destination top navigation is loaded and cached for offline play", () => {
  assert.match(html, /href="\.\/mobile-layout\.css"/);
  assert.match(html, /src="\.\/mobile-layout\.js" defer/);
  assert.match(serviceWorker, /"\.\/mobile-layout\.js"/);
  assert.match(serviceWorker, /"\.\/mobile-layout\.css"/);
  assert.match(characters, /\[\["adventure","Adventure","campaign-box"\],\["quest","Quest","soa-chronicle"\],\["character","Character","soa-character-screen"\],\["reputation","Reputation"/);
  assert.doesNotMatch(source, /soa-mobile-nav|soa-mobile-summary|position:\s*fixed/);
});

test("tab selection displays only its screen and maps old saved tab names", () => {
  const state = startLayout({ getItem: () => "journal" });
  const { layout, tabs, sections } = state;
  assert.equal(tabs.get("quest").getAttribute("aria-current"), "page");
  assert.equal(sections.find(section => section.id === "soa-chronicle").hidden, false);
  assert.equal(sections.find(section => section.id === "soa-party-evidence").hidden, false);
  assert.equal(sections.find(section => section.id === "campaign-box").hidden, true);
  layout.select("character");
  assert.equal(tabs.get("character").getAttribute("aria-current"), "page");
  assert.equal(sections.find(section => section.id === "soa-character-screen").hidden, false);
  assert.equal(sections.find(section => section.id === "soa-chronicle").hidden, true);
  layout.select("companions");
  assert.equal(tabs.get("reputation").getAttribute("aria-current"), "page");
  assert.equal(sections.find(section => section.id === "soa-standalone-reputation").hidden, false);
  assert.equal(sections.find(section => section.id === "companion-panel").hidden, true);
  assert.equal(state.scrollCalls, 2);
});

test("invalid tabs and storage failures do not break section navigation", () => {
  const { layout, tabs, reports } = startLayout({
    getItem() { throw new Error("storage disabled"); },
    setItem() { throw new Error("storage full"); },
  });
  assert.equal(tabs.get("adventure").getAttribute("aria-current"), "page");
  layout.select("missing-tab");
  assert.equal(tabs.get("adventure").getAttribute("aria-current"), "page");
  layout.select("quest");
  assert.equal(tabs.get("quest").getAttribute("aria-current"), "page");
  assert.equal(reports.length, 2);
});

test("deferred startup waits for DOMContentLoaded before organizing the game screens", () => {
  const state = startLayout({ readyState: "interactive" });
  assert.equal(typeof state.layout.select, "function");
  assert.equal(state.organizationCalls, 1);
  assert.equal(state.tabs.get("adventure").getAttribute("aria-current"), "page");
});

test("the character view separates overview from skills without changing game state", () => {
  assert.match(characters, /Character views/);
  assert.match(characters, /soa-character-status/);
  assert.match(characters, /Skills & Professions/);
  assert.match(characters, /organizeSections:organizeGameSections/);
});
