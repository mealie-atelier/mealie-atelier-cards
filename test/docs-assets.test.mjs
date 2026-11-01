import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("unused stale screenshots and uncredited food images are gone", () => {
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
