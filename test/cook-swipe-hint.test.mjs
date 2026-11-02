import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const motion = readFileSync(new URL("../src/design-system/motion.css", import.meta.url), "utf8");
const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));

test("the swipe hint in cooking mode is readable: at least 12px and not faded", () => {
  const rule = motion.match(/\.atelier \.cook-stage:after \{[^}]*\}/)[0];
  const size = Number(rule.match(/(\d+)px\/[\d.]+ ui-sans-serif/)[1]);
  assert.ok(size >= 12, `font size ${size}px`);
  assert.doesNotMatch(rule, /opacity:\s*0?\.\d/);
});

test('the German restore confirmation reads "Die Version vom <date>"', () => {
  assert.match(de.editorRestoreConfirm, /^Die Version vom \{time\} /);
});
