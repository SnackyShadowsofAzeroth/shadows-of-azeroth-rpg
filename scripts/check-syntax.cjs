"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");

const roots = ["functions", "public", "tests", "scripts"];
const files = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
  }
}
for (const root of roots) if (fs.existsSync(root)) visit(root);

for (const file of files) {
  const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (checked.status !== 0) {
    process.stderr.write(checked.stderr || checked.stdout);
    process.exit(checked.status || 1);
  }
}

const html = fs.readFileSync(path.join("public", "index.html"), "utf8");
let inlineCount = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
  new vm.Script(match[2], { filename: `public/index.html inline script ${++inlineCount}` });
}

process.stdout.write(`Parsed ${files.length} JavaScript files and ${inlineCount} inline HTML script(s).\n`);
