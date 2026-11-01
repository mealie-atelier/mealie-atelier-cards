import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the Bring! password input takes its name from the label text only, not the reveal button", () => {
  const wizard = read("src/components/bring-wizard.js");
  assert.match(wizard, /<span id="bw-password-label">/);
  assert.match(wizard, /data-input="sync-bring-password"/);
  const input = wizard.match(/<input [^>]*data-input="sync-bring-password"[^>]*>/)[0];
  assert.match(input, /aria-labelledby="bw-password-label"/);
});

test("a long cooking title is clamped to three lines instead of growing out of the photo strip", () => {
  const css = read("src/design-system/mobile-forms.css");
  const rule = css.match(/\.atelier \.modal \.cook-visual \.cook-brand \{[^}]*\}/)[0];
  assert.match(rule, /-webkit-line-clamp: 3;/);
  assert.match(rule, /display: -webkit-box;/);
  assert.match(rule, /overflow: hidden;/);
  assert.match(
    css,
    /@media \(max-width: 520px\) \{\s*\.atelier \.modal \.cook-visual \.cook-brand \{\s*-webkit-line-clamp: 2;/,
  );
  assert.match(
    read("src/components/dialogs.js"),
    /<div class="cook-brand" title="\$\{esc\(this\._detail\.name\)\}">/,
  );
});

test("design system comments carry no dash punctuation and no stale version labels", () => {
  const dir = new URL("../src/design-system/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
    const comments = readFileSync(new URL(file, dir), "utf8").match(/\/\*[\s\S]*?\*\//g) || [];
    for (const c of comments) {
      assert.doesNotMatch(c, / [—–] /, `${file}: ${c.slice(0, 60)}`);
      assert.doesNotMatch(c, /Atelier 0\.\d+ /, `${file}: ${c.slice(0, 60)}`);
    }
  }
});
