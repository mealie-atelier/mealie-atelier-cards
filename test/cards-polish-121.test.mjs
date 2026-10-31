import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("demo footer credit matches the app sidebar wording", () => {
  const chrome = read("demo/site/chrome.mjs");
  assert.match(chrome, /`Mit \$\{heart\} von`/);
  assert.doesNotMatch(chrome, /gemacht von/);
});

test("cooking notes dialog spaces its intro and fits its phone title on one line", () => {
  const editorial = read("src/design-system/editorial.css");
  assert.match(editorial, /\.atelier \.journal-studio > h2 \+ p \{\s*margin-top: 14px;/);
  const forms = read("src/design-system/mobile-forms.css");
  assert.match(
    forms,
    /max-width: 420px\) \{\s*\.atelier \.modal \.modal-content\.journal-studio > h2 \{\s*font-size: 29px;/,
  );
});
