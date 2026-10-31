import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) =>
  readFileSync(new URL(`../src/design-system/${name}`, import.meta.url), "utf8");
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("photoless tile gradients keep the white title at 4.5:1 or better", () => {
  const css = read("foundation.css");
  const rules = [
    ...css.matchAll(/\.atelier \.tile-image(?:\.tint\d)?\s*\{[^}]*linear-gradient\([^)]*\)/g),
  ];
  assert.ok(rules.length >= 4);
  for (const [rule] of rules) {
    for (const stop of rule.match(/#[0-9a-f]{6}/g)) {
      assert.ok(contrast("#fffdfa", stop) >= 4.5, `${stop} in ${rule.split("{")[0].trim()}`);
    }
  }
});

test("setup presets use three aligned columns and a visible preview edge", () => {
  const css = read("editor.css");
  assert.match(css, /\.setup-presets\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.setup-preset\s*\{[^}]*grid-template-rows:\s*auto auto 1fr/);
  assert.match(css, /\.preset-art\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px/);
});

// Rendered checks (action rows, badge contrast, checkbox rows, lining figures) live in
// web/test/dialog-actions-browser.py, which runs the real bundle in Chromium and WebKit.
