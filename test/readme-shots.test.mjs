import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync(new URL("../scripts/capture-readme-shots.py", import.meta.url), "utf8");
const block = (name) => {
  const start = script.indexOf(`def ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const next = script.indexOf("\ndef ", start + 1);
  return script.slice(start, next < 0 ? undefined : next);
};

test("the recipe README shot ends between two rows instead of slicing a card", () => {
  const fit = block("fit_recipe_top");
  assert.match(fit, /modal\.evaluate\(CUTS, True\) == 0/);
  assert.match(fit, /raise SystemExit/);
});

test("the phone cooking shot scrolls the tools and timer clear of the step bar", () => {
  const main = block("main");
  const cook = main.slice(main.indexOf('if step == "cook":', main.indexOf("PHONE, True")));
  assert.match(cook.slice(0, 200), /start_cooking\(page\)\s+scroll_cook_dialog\(page, True\)/);
  assert.match(block("scroll_cook_dialog"), /eval\(cuts\)\(m, true\) === 0/);
});

test("unused stale screenshots and uncredited food images are gone", () => {
  assert.ok(!script.includes("dashboard-dark"));
  assert.ok(!existsSync(new URL("../assets/screens/dashboard-dark.webp", import.meta.url)));
  assert.ok(!existsSync(new URL("../demo/food", import.meta.url)));
});

test("docs use American spelling and the English Bring! label", () => {
  const log = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  assert.doesNotMatch(log, /cancell|unlabell|recognis/i);
  assert.match(log, /\*\*Bring! account\*\*, German: Bring!-Konto/);
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  // Home Assistant removed Advanced mode in 2026.6; the Resources menu needs no switch.
  assert.doesNotMatch(readme, /Advanced mode/);
  const faq = readFileSync(new URL("../docs/FAQ.md", import.meta.url), "utf8");
  assert.doesNotMatch(faq, /Advanced mode/);
});
