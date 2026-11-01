import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = (name) => read(`src/design-system/${name}.css`);

test("dialog action buttons size by their label, so a label never breaks next to a short one", () => {
  const polish = css("polish");
  assert.doesNotMatch(polish, /\.form-actions \.btn \{[^}]*flex: 1 1 \d+px/);
  const rules = [...polish.matchAll(/\.atelier \.form-actions \.btn \{([^}]*)\}/g)].map(
    (m) => m[1],
  );
  assert.ok(rules.length >= 2);
  for (const body of rules) assert.match(body, /flex: 1 1 auto;/);
});

test("the editor intro keeps its button on one line and lets the text shrink or wrap above it", () => {
  const editor = css("editor");
  const top = editor.match(/\.settings-top \{\s*align-items: center;([^}]*)\}/)[1];
  assert.match(top, /flex-wrap: wrap;/);
  const button = editor.match(/\.settings-top > \.editor-secondary \{([^}]*)\}/)[1];
  assert.match(button, /flex: none;/);
  assert.match(button, /white-space: nowrap;/);
  assert.match(editor, /\.settings-top > div \{\s*flex: 1 1 260px;\s*min-width: 0;/);
});

test("on a short phone the cook close button and strip title sit fully inside the 56px photo band", () => {
  const refinement = css("control-refinement");
  const block = refinement.match(/A short phone \(iPhone SE class\)[\s\S]*?\n {2}\}\n/)[0];
  assert.match(block, /height: 56px;/);
  const close = block.match(/> \.modal-close \{([^}]*)\}/)[1];
  assert.match(close, /top: 6px;/);
  assert.match(close, /margin-top: 6px;/);
  assert.match(close, /margin-bottom: calc\(-6px - var\(--at-close-size\)\);/);
  assert.match(block, /> \.modal-bar-title \{\s*top: 6px;/);
  // 6px inset + 44px button + 6px gap = the 56px band.
  assert.match(refinement, /--at-close-size: 44px;/);
});

test("the cook sync note does not drop the feature name into the sentence", () => {
  const de = JSON.parse(read("src/i18n/de.json"));
  const en = JSON.parse(read("src/i18n/en.json"));
  assert.equal(de.studioSharedFamily, "Mit dem gemeinsamen Kochen synchronisiert");
  assert.equal(en.studioSharedFamily, "Synced with shared cooking");
});

test("the web app footer balances its lines and keeps the last words together", () => {
  const html = read("web/public/index.html");
  assert.match(html, /\.foot-copy \{[^}]*text-wrap: balance;/);
  assert.match(html, /POWERED\\u00a0BY\\u00a0MEALIE/);
  assert.match(html, /MIT\\u00a0MEALIE/);
  assert.match(html, /MIT&nbsp;MEALIE<\/span/);
});
