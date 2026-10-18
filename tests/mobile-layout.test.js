"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "mobile-layout.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");

function element(tagName) {
  const children = [];
  const classes = new Set();
  const attributes = {};
  return {
    tagName: tagName.toUpperCase(), children, dataset: {}, attributes, hidden: false,
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
    prepend(...nodes) { children.unshift(...nodes); },
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name] ?? null; },
    querySelectorAll(selector) { return selector === "button" ? children.filter(child => child.tagName === "BUTTON") : []; },
  };
}

function startLayout({ getItem = () => null, setItem = () => {} } = {}) {
  const main = element("main");
  const body = element("body");
  const reports = [];
  const document = {
    body,
    createElement: element,
    querySelector: selector => selector === "main" ? main : null,
    querySelectorAll: () => [],
    getElementById: () => null,
  };
  const context = {
    document,
    localStorage: { getItem, setItem },
    MutationObserver: class { observe() {} },
    window: {
      scrollTo() {},
      soaReportStorageFailure: message => reports.push(message),
    },
  };
  vm.runInNewContext(source, context, { filename: "mobile-layout.js" });
  return { layout: context.window.soaLayout, nav: body.children[0], reports };
}

function tabButton(nav, tab) {
  return nav.children.find(button => button.dataset.tab === tab);
}

test("mobile navigation assets are loaded and included in offline cache", () => {
  assert.match(html, /href="\.\/mobile-layout\.css"/);
  assert.match(html, /src="\.\/mobile-layout\.js" defer/);
  assert.match(serviceWorker, /"\.\/mobile-layout\.js"/);
  assert.match(serviceWorker, /"\.\/mobile-layout\.css"/);
});

test("unknown saved tab falls back safely and invalid selections are ignored", () => {
  const { layout, nav } = startLayout({ getItem: () => "missing-tab" });
  assert.equal(tabButton(nav, "adventure").getAttribute("aria-current"), "page");
  layout.select("missing-tab");
  assert.equal(tabButton(nav, "adventure").getAttribute("aria-current"), "page");
});

test("storage exceptions do not break navigation", () => {
  const { layout, nav, reports } = startLayout({
    getItem() { throw new Error("storage disabled"); },
    setItem() { throw new Error("storage full"); },
  });
  assert.equal(tabButton(nav, "adventure").getAttribute("aria-current"), "page");
  assert.equal(reports.length, 1);
  layout.select("journal");
  assert.equal(tabButton(nav, "journal").getAttribute("aria-current"), "page");
  assert.equal(reports.length, 2);
});
