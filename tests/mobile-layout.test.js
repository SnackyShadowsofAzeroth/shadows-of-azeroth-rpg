"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "mobile-layout.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const characters = fs.readFileSync(path.join(__dirname, "..", "public", "characters.js"), "utf8");
const campaign = fs.readFileSync(path.join(__dirname, "..", "public", "campaign.js"), "utf8");
const chronicleStyles = fs.readFileSync(path.join(__dirname, "..", "public", "chronicle.css"), "utf8");
const serviceWorker = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");
const layoutCss = fs.readFileSync(path.join(__dirname, "..", "public", "mobile-layout.css"), "utf8");
const characterCss = fs.readFileSync(path.join(__dirname, "..", "public", "characters.css"), "utf8");
const portraitCss = fs.readFileSync(path.join(__dirname, "..", "public", "portraits.css"), "utf8");
const tabIds = ["adventure", "quest", "character", "dungeons", "settings"];

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
      if (selector === "button" || selector === "button.soa-quick-link") return children.filter(child => child.tagName === "BUTTON");
      return [];
    },
    remove() { this.removed = true; },
  };
}

function startLayout({ getItem = () => null, setItem = () => {}, readyState = "loading" } = {}) {
  const classes = new Set();
  const body = element("body");
  body.appended = [];
  body.append = (...nodes) => body.appended.push(...nodes);
  body.classList.add = name => classes.add(name);
  body.classList.remove = name => classes.delete(name);
  body.classList.contains = name => classes.has(name);
  const sections = [
    "campaign-box", "soa-adventure-story", "soa-legacy-ai", "soa-ai-narration", "soa-chronicle", "soa-contract-board", "soa-party-evidence", "soa-allies-screen", "soa-dungeons-screen",
    "soa-character-screen", "soa-character-tools", "companion-panel", "soa-standalone-reputation",
    "soa-save-settings",
  ].map(id => element("section", id));
  sections.find(section => section.id === "companion-panel").dataset.soaUnavailable = "true";
  const reports = [];
  const listeners = {};
  const legacyRemoved = new Set();
  const legacyElements = Object.fromEntries(["soa-mobile-nav", "soa-mobile-summary"].map(id => [id, { remove() { legacyRemoved.add(id); } }]));
  const storage = { getItem, setItem };
  let scrollCalls = 0;
  let organizationCalls = 0;
  const connection = { connected: false };
  const document = {
    body, readyState,
    createElement: tagName => element(tagName),
    querySelector: () => null,
    querySelectorAll: selector => selector.startsWith("main > section") ? sections : [],
    getElementById: id => legacyElements[id] || null,
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  const context = {
    document, localStorage: storage,
    window: {
      scrollTo() { scrollCalls++; },
      soaCharacters: { organizeSections() { organizationCalls++; } },
      soaAiDirector: { isConnected: () => connection.connected },
      soaReportStorageFailure: message => reports.push(message),
    },
  };
  vm.runInNewContext(source, context, { filename: "mobile-layout.js" });
  if (listeners.DOMContentLoaded) listeners.DOMContentLoaded();
  const nav = body.appended[0];
  const tabs = new Map(nav.children.map(button => [button.dataset.gameTab, button]));
  return { layout: context.window.soaLayout, nav, tabs, sections, reports, body, legacyRemoved, connection, get scrollCalls() { return scrollCalls; }, organizationCalls };
}

test("one five-destination bottom navigation is loaded and cached for offline play", () => {
  assert.match(html, /href="\.\/mobile-layout\.css"/);
  assert.match(html, /src="\.\/mobile-layout\.js" defer/);
  assert.match(serviceWorker, /"\.\/mobile-layout\.js"/);
  assert.match(serviceWorker, /"\.\/mobile-layout\.css"/);
  assert.match(serviceWorker, /"\.\/resource-rules\.js"/);
  assert.match(serviceWorker, /"\.\/class-abilities\.js"/);
  assert.match(serviceWorker, /"\.\/racial-abilities\.js"/);
  assert.match(source, /\["adventure","Adventure","campaign-box","Current scene and available actions"\],\s*\["quest","Quest","soa-chronicle"/);
  assert.match(source, /\["dungeons","Dungeons","soa-dungeons-screen"/);
  assert.doesNotMatch(source,/\["reputation","Reputation"/);
  assert.match(html, /id="soa-dungeons-screen"[\s\S]*id="soa-dungeons-controls"/);
  assert.match(serviceWorker, /shadows-of-azeroth-v\d+/);
  assert.match(layoutCss, /#soa-mobile-nav\{position:fixed;z-index:999;bottom:0/);
  assert.match(source, /function createNavigation\(\)/);
  assert.doesNotMatch(characters, /soa-quick-nav/);
});

test("contract and bounty board belongs to the Quest tab",()=>{
 const {layout,tabs,sections}=startLayout();
 layout.select("quest");
 assert.equal(sections.find(section=>section.id==="soa-contract-board").hidden,false);
 layout.select("adventure");
 assert.equal(sections.find(section=>section.id==="soa-contract-board").hidden,true);
});
test("dungeons has its own tab and allies stay accessible under Quest",()=>{
 const {layout,tabs,sections}=startLayout();
 assert.deepEqual([...tabs.keys()],tabIds);
 layout.select("dungeons");
 assert.equal(tabs.get("dungeons").getAttribute("aria-current"),"page");
 assert.equal(sections.find(section=>section.id==="soa-dungeons-screen").hidden,false);
 assert.equal(sections.find(section=>section.id==="campaign-box").hidden,true);
 layout.select("quest");
 assert.equal(sections.find(section=>section.id==="soa-allies-screen").hidden,false);
 assert.equal(sections.find(section=>section.id==="soa-dungeons-screen").hidden,true);
 assert.match(characters,/soa-allies-drawer/);
 assert.match(characters,/details:not\(\.soa-collapsible-quests\):not\(\.soa-create-new\):not\(\.soa-allies-drawer\)/);
 assert.match(characters,/reputationPanel\.parentElement!==content/);
 assert.match(campaign,/challengeMount\?\.append\(arenaPanel\)/);
 assert.match(campaign,/challengeMount\?\.append\(dungeonPanel\)/);
 assert.match(campaign,/drawCombatActions\(gameplayPanel\)/);
});
test("mobile roster keeps square portraits and Play/Delete actions within the card", () => {
  assert.match(portraitCss, /\.soa-character-item\{box-sizing:border-box;display:grid;grid-template-columns:58px minmax\(0,1fr\) 122px/);
  assert.match(portraitCss, /\.soa-character-item>\.soa-character-avatar\{box-sizing:border-box;width:58px;height:58px/);
  assert.match(portraitCss, /\.soa-character-item \.soa-character-actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(portraitCss, /\.soa-character-item \.soa-character-actions button\{box-sizing:border-box;width:100%;min-width:0;min-height:46px/);
});

test("new layout replaces legacy controls with one bottom menu", () => {
  const { legacyRemoved, layout, nav, body } = startLayout();
  assert.deepEqual([...legacyRemoved].sort(), ["soa-mobile-nav", "soa-mobile-summary"]);
  assert.equal(body.appended.length, 1);
  assert.equal(body.appended[0].id, "soa-mobile-nav");
  assert.equal(nav.children.length, 5);
  assert.equal(layout.version, 2);
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
  assert.equal(tabs.get("quest").getAttribute("aria-current"), "page");
  assert.equal(sections.find(section => section.id === "soa-allies-screen").hidden, false);
  assert.equal(sections.find(section => section.id === "companion-panel").hidden, true);
  assert.equal(state.scrollCalls, 2);
});

test("AI connection and narration controls belong to Settings", () => {
  const { layout, sections, connection } = startLayout();
  const director = sections.find(section => section.id === "soa-legacy-ai");
  const narration = sections.find(section => section.id === "soa-ai-narration");
  layout.select("adventure");
  assert.equal(director.hidden, true);
  assert.equal(narration.hidden, true);
  layout.select("settings");
  assert.equal(director.hidden, false);
  assert.equal(narration.hidden, false);
  connection.connected = true;
  layout.refresh();
  assert.equal(director.hidden, true);
  assert.equal(narration.hidden, false);
  connection.connected = false;
  layout.refresh();
  assert.equal(director.hidden, false);
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

test("combat and records follow the action-first tab hierarchy", () => {
  const { layout, sections } = startLayout();
  layout.select("quest");
  assert.equal(sections.find(section => section.id === "soa-contract-board").hidden, false);
  assert.equal(sections.find(section => section.id === "soa-party-evidence").hidden, false);
  layout.select("character");
  assert.equal(sections.find(section => section.id === "soa-character-tools").hidden, false);
  assert.match(campaign, /soa-foe-target/);
  assert.doesNotMatch(campaign, /Choose an enemy target/);
  assert.match(campaign, /Roll & event details/);
  assert.match(campaign, /Quests & Rewards/);
  assert.match(campaign, /Loadout & Equipment/);
  assert.match(layoutCss, /soa-exchange-details>summary/);
});

