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

test("narrow cards keep checkbox rows vertically centered", () => {
  assert.doesNotMatch(
    read("components.css"),
    /\.studio-form \.studio-inline\s*\{[^}]*align-items:\s*flex-start/,
  );
});

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

test("buttons in form and studio action rows stretch to equal height", () => {
  assert.match(
    read("control-refinement.css"),
    /:is\(\.form-actions, \.studio-actions, \.at-dialog-actions\) > :is\(\.btn, \.icon-btn\)\s*\{\s*align-self:\s*stretch/,
  );
});

test("setup presets use three aligned columns and a visible preview edge", () => {
  const css = read("editor.css");
  assert.match(css, /\.setup-presets\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.setup-preset\s*\{[^}]*grid-template-rows:\s*auto auto 1fr/);
  assert.match(css, /\.preset-art\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px/);
});

test("serif numerals use lining figures", () => {
  assert.match(read("tokens.css"), /:host\s*\{\s*font-feature-settings:\s*"lnum"/);
  assert.match(read("editor.css"), /:host\s*\{[^}]*font-feature-settings:\s*"lnum"/);
});

const bundleCss = () => {
  const build = readFileSync(
    new URL("../scripts/build-design-system.mjs", import.meta.url),
    "utf8",
  );
  const files = [...build.matchAll(/"(src\/design-system\/[\w-]+\.css)"/g)].map((m) => m[1]);
  return files
    .map((f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8"))
    .join("\n")
    .replace(/:host\b/g, ":root");
};

const loadChromium = async () => {
  try {
    return (await import("playwright")).chromium;
  } catch {
    return null;
  }
};

test("action rows sit right below the last field and paired buttons share a height", async (t) => {
  const chromium = await loadChromium();
  if (!chromium) return t.skip("playwright is not installed");
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.ATELIER_CHROMIUM || undefined });
  } catch {
    return t.skip("no chromium available");
  }
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await page.setContent(`<style>${bundleCss()}</style><div class="atelier" style="container-type:inline-size;container-name:atelier-card;width:350px">
      <section class="editor-card"><form class="editor-form"><label class="field"><span>Name</span><input name="name"></label><div class="form-actions"><button class="btn primary">Neues Rezept</button></div></form></section>
      <div class="studio-actions"><button class="btn">Aktualisieren Live-Status</button><button class="btn">Helferansicht</button></div>
      <div class="at-premium-dialog"><div class="at-dialog-actions"><button class="btn">Abbrechen</button><button class="btn primary">Erledigte entfernen</button></div></div></div>`);
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const gap = r(".form-actions").top - r(".editor-form .field").bottom;
      const heights = (s) =>
        [...document.querySelectorAll(`${s} > .btn`)].map((b) => b.getBoundingClientRect().height);
      return { gap, studio: heights(".studio-actions"), dialog: heights(".at-dialog-actions") };
    });
    assert.ok(m.gap <= 20, `gap above buttons was ${m.gap}px`);
    assert.ok(Math.abs(m.studio[0] - m.studio[1]) < 0.5, `studio ${m.studio}`);
    assert.ok(Math.abs(m.dialog[0] - m.dialog[1]) < 0.5, `dialog ${m.dialog}`);
  } finally {
    await browser.close();
  }
});
