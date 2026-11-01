import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const Studio = runInNewContext(read("../src/studio-core.js") + "\nAtelierStudio", {
  Date,
  Intl,
  Number,
  Math,
  String,
  Set,
  Map,
  Object,
  RegExp,
});

test("superscript, mixed, vulgar and plain fractions parse as quantities", () => {
  const cases = [
    ["¹/₂ Mehl", 0.5, "Mehl"],
    ["¹⁄₂ Mehl", 0.5, "Mehl"],
    ["2 ¹/₂ Eier", 2.5, "Eier"],
    ["⅓ Zucker", 1 / 3, "Zucker"],
    ["1/2 Salz", 0.5, "Salz"],
  ];
  for (const [text, qty, label] of cases) {
    const p = Studio.parseIngredient(text);
    assert.ok(p.quantity !== null, text);
    assert.ok(Math.abs(p.quantity - qty) < 0.001, `${text} -> ${p.quantity}`);
    assert.equal(p.label, label);
  }
});

test("a row without a food prefers its numeric quantity", () => {
  const p = Studio.parseIngredient({ quantity: 0.25, note: "Zucker" });
  assert.equal(p.quantity, 0.25);
});

test("the recipe audit no longer flags fraction amounts as unclear", () => {
  const audit = Studio.audit({
    name: "Kuchen",
    recipeIngredient: ["¹/₂ Mehl", "2 ¹/₂ Eier", "⅓ Zucker", "1/2 Salz"].map((display) => ({
      display,
    })),
    recipeInstructions: [{ text: "Mischen." }],
  });
  const keys = JSON.stringify(audit);
  assert.ok(!keys.includes("studioAuditAmountUnclear"), keys);
});

test("review rows for removed items offer only Dismiss", () => {
  const src = read("../src/components/shopping-sync.js");
  assert.match(src, /record\.state === "removed_after_send" \? "" : button\("sync-resend"/);
});

test("the week grid uses seven columns on wide cards and empty days stay compact", () => {
  const css = read("../src/design-system/polish.css");
  assert.match(
    css,
    /min-width: 1100px\) \{\s*\.atelier \.shell\.single \.week-grid \{\s*grid-template-columns: repeat\(7/,
  );
  assert.match(css, /min-width: 920px\) \{\s*\.atelier \.week-grid \{[^}]*align-items: start/);
  assert.match(css, /\.day:has\(> \.day-empty\) \{\s*min-height: 0/);
});
