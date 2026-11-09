import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../src/design-system/", import.meta.url);

// Strips comments, then returns every rule as { selector, body } (nested at-rules are flattened).
const rules = (css) => {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  while ((match = re.exec(clean))) out.push({ selector: match[1].trim(), body: match[2] });
  return out;
};

test("no non-panel .atelier rule fills the viewport height", () => {
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
    for (const { selector, body } of rules(readFileSync(new URL(file, dir), "utf8"))) {
      // The standalone web app is the whole page and never sits in a masonry or sections view.
      if (selector.includes(":host([data-web-app])")) continue;
      if (!/\.atelier\b/.test(selector) || /\.panel\b/.test(selector)) continue;
      assert.doesNotMatch(
        body,
        /min-height:\s*(100[sdl]?vh|calc\(100[sdl]?vh)/,
        `${file}: "${selector}" must size to its content in masonry and sections views`,
      );
    }
  }
});

test("the panel layout still fills the view", () => {
  const css = readFileSync(new URL("foundation.css", dir), "utf8");
  assert.match(css, /\.atelier\.panel \{[^}]*min-height: calc\(100vh/);
});
