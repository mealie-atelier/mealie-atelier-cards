import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync(new URL("../src/design-system/tokens.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../web/public/shell.css", import.meta.url), "utf8");
const light = tokens.match(/\.atelier\.light\s*\{([^}]*)\}/)[1];
const shellLight = shell.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1];
const declared = (block, name) => block.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();

const HERB = "#3e6b48";
const NIGHT = "#14201a";
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
const mixSpec = (value) => {
  const m = value.match(/color-mix\(in srgb, var\(--at-accent\) (\d+)%, (#[0-9a-f]{6})\)/);
  assert.ok(m, `unexpected mix: ${value}`);
  return mix(HERB, m[2], Number(m[1]));
};

test("light theme defaults use the Herb and Night brand colours without a magenta cast", () => {
  assert.equal(mixSpec(declared(light, "--ds-brand")).length, 3);
  assert.match(declared(light, "--ds-brand"), /#14201a\)$/);
  assert.match(declared(light, "--ds-ring"), /#14201a/);
  assert.match(shellLight, /--shell-accent:\s*#3e6b48/);
  for (const name of ["--at-ink", "--at-sub", "--at-surface", "--at-panel", "--at-panel2"]) {
    const [r, g, b] = rgb(declared(light, name));
    assert.ok(!(r > g && b > g), `${name} has a magenta cast`);
  }
});

test("light theme defaults keep WCAG AA contrast", () => {
  const surface = rgb(declared(light, "--at-surface"));
  const panel = rgb(declared(light, "--at-panel"));
  const panel2 = rgb(declared(light, "--at-panel2"));
  const ink = rgb(declared(light, "--at-ink"));
  const sub = rgb(declared(light, "--at-sub"));
  const brandText = mixSpec(declared(light, "--ds-brand-text"));
  const brand = mixSpec(declared(light, "--ds-brand"));
  const results = {
    "ink on surface": contrast(ink, surface),
    "ink on panel": contrast(ink, panel),
    "sub on surface": contrast(sub, surface),
    "sub on panel2": contrast(sub, panel2),
    "brand text on surface": contrast(brandText, surface),
    "brand text on panel": contrast(brandText, panel),
    "ink on brand fill": contrast(rgb("#fffdfa"), brand),
    "herb accent fill vs its ink": contrast(rgb("#fffdfa"), rgb(HERB)),
    "shell ink on shell page": contrast(rgb(declared(shellLight, "--shell-ink")), rgb("#f4f1eb")),
    "shell muted on shell page": contrast(
      rgb(declared(shellLight, "--shell-muted")),
      rgb("#f4f1eb"),
    ),
  };
  for (const [name, ratio] of Object.entries(results)) {
    assert.ok(ratio >= 4.5, `${name}: ${ratio.toFixed(2)} < 4.5`);
  }
  assert.equal(declared(light, "--ds-brand-text").includes(NIGHT), true);
  if (process.env.SHOW_CONTRAST) console.log(results);
});
