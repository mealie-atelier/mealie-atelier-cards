import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const cssFiles = readdirSync(new URL("../src/design-system/", import.meta.url))
  .filter((name) => name.endsWith(".css"))
  .map((name) => `src/design-system/${name}`);
cssFiles.push("web/public/shell.css");

const tokens = read("src/design-system/tokens.css");
const shell = read("web/public/shell.css");
const template = read("src/card-core.template.js");
const light = tokens.match(/\.atelier\.light\s*\{([^}]*)\}/)[1];
const shellLight = shell.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1];
const declared = (block, name) => block.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();

// The default accent and the ink chooser come from the real card source.
const darkDefaultAccent = template.match(/const DEFAULTS = \{[^}]*?accent:\s*"(#[0-9a-f]{6})"/s)[1];
const lightAccent = template.match(
  /configuredAccent\.toLowerCase\(\) === DEFAULTS\.accent\s*\?\s*"(#[0-9a-f]{6})"/,
)[1];
const accentInk = new Function(
  `${template.match(/const accentInk = [\s\S]*?\n\};\n/)[0]}; return accentInk;`,
)();

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, pctA) => rgb(a).map((v, k) => (v * pctA + rgb(b)[k] * (100 - pctA)) / 100);
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mixSpec = (value, accent = lightAccent) => {
  const m = value.match(/color-mix\(in srgb, var\(--at-accent\) (\d+)%, (#[0-9a-f]{6})\)/);
  assert.ok(m, `unexpected mix: ${value}`);
  return mix(accent, m[2], Number(m[1]));
};

// Colours with a magenta cast (red and blue both clearly above green) used by light-theme rules.
const castColours = (text) => {
  const found = [];
  for (const m of text.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    found.push([m[0], [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16))]);
  }
  for (const m of text.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)) {
    found.push([m[0], [1, 2, 3].map((k) => Number(m[k]))]);
  }
  return found.filter(([, [r, g, b]]) => r > g + 2 && b > g + 2).map(([text]) => text);
};
const lightRules = (css) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) =>
    /\.atelier\.light|data-theme="light"/.test(selector),
  );

test("light theme rules carry no magenta or plum colour", () => {
  let scanned = 0;
  for (const file of cssFiles) {
    for (const [, selector, body] of lightRules(read(file))) {
      scanned += 1;
      assert.deepEqual(castColours(body), [], `${file}: ${selector.trim()}`);
    }
  }
  assert.ok(scanned > 10, "light-theme rules were found");
  assert.equal(lightAccent, "#3e6b48");
  assert.notEqual(lightAccent, darkDefaultAccent);
  for (const name of ["--at-ink", "--at-sub", "--at-surface", "--at-panel", "--at-panel2"]) {
    assert.deepEqual(castColours(declared(light, name)), [], name);
  }
});

test("light theme defaults keep WCAG AA contrast", () => {
  const surface = rgb(declared(light, "--at-surface"));
  const panel = rgb(declared(light, "--at-panel"));
  const panel2 = rgb(declared(light, "--at-panel2"));
  const ink = rgb(declared(light, "--at-ink"));
  const sub = rgb(declared(light, "--at-sub"));
  const brand = mixSpec(declared(light, "--ds-brand"));
  const brandText = mixSpec(declared(light, "--ds-brand-text"));
  const focus = mixSpec(
    read("src/design-system/motion.css").match(
      /\.atelier\.light\s*\{[^}]*--at-focus:\s*([^;]+);/s,
    )[1],
  );
  const accentFillInk = rgb(accentInk(lightAccent));
  const brandFillInk = rgb(accentInk(lightAccent, 0.12));
  const results = {
    "ink on surface": [contrast(ink, surface), 4.5],
    "ink on panel": [contrast(ink, panel), 4.5],
    "sub on surface": [contrast(sub, surface), 4.5],
    "sub on panel2": [contrast(sub, panel2), 4.5],
    "brand text on surface": [contrast(brandText, surface), 4.5],
    "brand text on panel": [contrast(brandText, panel), 4.5],
    "ink on brand fill": [contrast(brandFillInk, brand), 4.5],
    "ink on accent fill": [contrast(accentFillInk, rgb(lightAccent)), 4.5],
    "focus ring on surface": [contrast(focus, surface), 3],
    "focus ring on panel": [contrast(focus, panel), 3],
    "shell ink on page": [contrast(rgb(declared(shellLight, "--shell-ink")), surface), 4.5],
    "shell muted on page": [contrast(rgb(declared(shellLight, "--shell-muted")), surface), 4.5],
    "shell accent on page": [contrast(rgb(declared(shellLight, "--shell-accent")), surface), 4.5],
  };
  for (const [name, [ratio, min]] of Object.entries(results)) {
    assert.ok(ratio >= min, `${name}: ${ratio.toFixed(2)} < ${min}`);
  }
  if (process.env.SHOW_CONTRAST) console.log(results);
});
