import test from "node:test";
import assert from "node:assert/strict";
import { syncedYield } from "../recipe-yield.mjs";

test("a decimal comma yield keeps its comma", () => {
  assert.deepEqual(syncedYield(1.5, 2.5, "1,5 Portionen"), {
    recipeYield: "2,5 Portionen",
    recipeYieldQuantity: 2.5,
  });
});

test("a whole number yield is replaced", () => {
  assert.deepEqual(syncedYield(4, 6, "4 servings"), {
    recipeYield: "6 servings",
    recipeYieldQuantity: 6,
  });
});

test("a decimal point and a fraction yield are recognised", () => {
  assert.equal(syncedYield(1.5, 3, "1.5 cups").recipeYield, "3 cups");
  assert.equal(syncedYield(1.5, 4, "1 1/2 loaves").recipeYield, "4 loaves");
  assert.equal(syncedYield(0.5, 1, "1/2 tray").recipeYield, "1 tray");
});

test("a yield that does not state the old servings stays", () => {
  assert.equal(syncedYield(12, 6, "1 Blech"), null);
  assert.equal(syncedYield(4, 6, ""), null);
  assert.equal(syncedYield(4, 6, "serves 4"), null);
  assert.equal(syncedYield(4, 6, undefined), null);
  assert.equal(syncedYield(4, 6, "40 pieces"), null);
  assert.equal(syncedYield(2, 3, "2-3 Portionen"), null);
  assert.equal(syncedYield(2, 3, "2 – 3 Portionen"), null);
  assert.equal(syncedYield(4, 6, "4 to 6 servings"), null);
  assert.equal(syncedYield(2, 3, "2 bis 3 Portionen"), null);
});
