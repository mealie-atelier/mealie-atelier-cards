import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");
const expected = [
  "mealie-atelier-card",
  "mealie-atelier-today",
  "mealie-atelier-recipes",
  "mealie-atelier-mealplan",
  "mealie-atelier-shopping",
  "mealie-atelier-manage",
  "mealie-atelier-discover",
  "mealie-atelier-pantry",
  "mealie-atelier-family",
  "mealie-atelier-cookbook",
];
test("all ten Lovelace card variants are bundled", () => {
  for (const tag of expected)
    assert.ok(source.includes(`"${tag}"`) || source.includes(`'${tag}'`), `missing ${tag}`);
  assert.match(source, /const VERSION = ["']\d+\.\d+\.\d+["']/);
  assert.ok(source.includes("class MealieAtelierEditor"));
});
test("Print Studio has all three paper layouts and separate printable document", () => {
  for (const label of [
    "editorial",
    "compact",
    "minimal",
    "A4 landscape",
    "A4 portrait",
    "buildPrintDocument",
  ])
    assert.ok(source.includes(label), label);
  assert.ok(source.includes("page-break-inside:avoid"));
});
test("sensitive tokens are absent from distributed JS", () => {
  assert.ok(!source.includes("MEALIE_API_TOKEN="));
  assert.ok(!source.includes("Authorization: `Bearer"));
});

test("Nutrition Lab and cooking utilities ship in the HA bundle", () => {
  for (const item of [
    "mealie_atelier/nutrition_",
    "nutrition_prepare",
    "nutri-ai",
    "nutri-calc",
    "nutri-save",
    "cook-utility",
    "journal-open",
    "timer-start",
  ])
    assert.ok(
      source.includes(item.replace("mealie_atelier/nutrition_", "nutrition_")) ||
        source.includes(item),
      item,
    );
});

test("Atelier 0.7 ships motion controls, command palette and reduced-motion support", () => {
  for (const snippet of [
    "motion-balanced",
    "prefers-reduced-motion",
    "command-open",
    "command-search",
    "_handleKeyDown",
    "_isApplePlatform",
    "_shortcutLabel",
    "Ctrl+K",
    "_searchCommandRecipes",
    "command-all-results",
    "searchMatch",
    "aria-busy",
    "at-view-enter",
    "at-dialog-enter",
    "at-toast-in",
    "_styleReady",
    "is-entering",
  ])
    assert.ok(source.includes(snippet), snippet);
});
