import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/design-system/bring-wizard.css", import.meta.url), "utf8");
const bundle = readFileSync(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");
/** Declarations of the first rule whose selector list contains exactly this selector. */
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(?:^|\\n|,\\s*)${escaped}\\s*(?:,[^{]*)?\\{([^}]*)\\}`))?.[1] || "";
};

test("radio choices are circles; the editor card field rule does not square them off", () => {
  const radio = rule('.atelier .sync-panel .editor-card input[type="radio"]');
  assert.match(radio, /border-radius:\s*50%/);
  assert.match(radio, /padding:\s*0/);
});

test("a danger button exists and is built from the danger token", () => {
  const danger = rule(".atelier .btn.danger");
  assert.match(danger, /color:\s*var\(--bw-danger\)/);
  assert.match(danger, /border-color:[^;]*var\(--bw-danger\)/);
  assert.match(css, /\.atelier\.light\s*\{\s*--bw-danger:/, "a light theme value exists");
});

test("the wizard action row has air above it and stays in view", () => {
  assert.match(rule(".atelier .bw-panel > .bw-nav"), /margin-block-start:\s*var\(--ds-space-5\)/);
  const nav = rule(".atelier .bw-panel .bw-nav");
  assert.match(nav, /position:\s*sticky/);
  assert.match(nav, /inset-block-end:\s*0/);
  assert.match(nav, /background:\s*var\(--bw-nav-bg\)/);
});

test("the header cart glyph has no button-like circle and is hidden from assistive tech", () => {
  const stamp = rule(".atelier .sync-panel .editor-stamp");
  assert.match(stamp, /border:\s*0/);
  assert.match(stamp, /background:\s*transparent/);
  assert.match(bundle, /class="editor-stamp" aria-hidden="true"/);
});

test("the phone layout drops the inner card frame and fills the screen", () => {
  const phone = css.slice(css.indexOf("/* Phone:"));
  assert.match(phone, /@container atelier-card \(max-width: 460px\)/);
  assert.match(phone, /\.atelier \.modal\.sync-modal\s*\{[^}]*border-radius:\s*0/);
  assert.match(phone, /\.atelier \.bw-wizard \.bw-panel\s*\{[^}]*border:\s*0/);
});

test("More options is a text disclosure and its panel has no frame of its own", () => {
  assert.doesNotMatch(rule(".atelier .bw-more-panel"), /border:/);
  assert.match(rule(".atelier .bw-more-toggle"), /background:\s*transparent/);
  assert.match(rule(".atelier .bw-more"), /border-block-start:\s*1px solid/);
});
