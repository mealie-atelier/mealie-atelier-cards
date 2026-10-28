import test from "node:test";
import assert from "node:assert/strict";
import {
  prepare,
  nutrients,
  search,
  calculate,
  mealieNutrition,
  aiSuggest,
} from "../nutrition.mjs";

const recipe = {
  slug: "test-food",
  recipeServings: 2,
  recipeIngredient: [
    { display: "100 g Haferflocken", quantity: 100, unit: { name: "g" } },
    { display: "50 g Beeren", quantity: 50, unit: { name: "g" } },
  ],
};
const foods = {
  101: {
    fdcId: 101,
    description: "Oats",
    foodNutrients: [
      { nutrient: { id: 1008 }, amount: 300 },
      { nutrient: { id: 1003 }, amount: 10 },
      { nutrient: { id: 1004 }, amount: 5 },
      { nutrient: { id: 1005 }, amount: 50 },
      { nutrient: { id: 1093 }, amount: 4 },
    ],
  },
  102: {
    fdcId: 102,
    description: "Berries",
    foodNutrients: [
      { nutrient: { id: 1008 }, amount: 80 },
      { nutrient: { id: 1003 }, amount: 2 },
      { nutrient: { id: 1004 }, amount: 1 },
      { nutrient: { id: 1005 }, amount: 10 },
    ],
  },
};
function withFetchStub(handler, run) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = original;
    });
}
const mockFdc = async (url, opts) => {
  if (opts.method === "POST")
    return new Response(
      JSON.stringify({
        foods: Object.values(foods).map((f) => ({
          fdcId: f.fdcId,
          description: f.description,
          foodNutrients: f.foodNutrients.map((x) => ({
            nutrientId: x.nutrient.id,
            value: x.amount,
          })),
        })),
      }),
      { status: 200 },
    );
  const id = Number(new URL(url).pathname.split("/").pop());
  return new Response(JSON.stringify(foods[id]), { status: 200 });
};
test("prepare detects only reliable gram measurements, preserves originals", () => {
  const preview = prepare(
    {
      ...recipe,
      recipeIngredient: [
        ...recipe.recipeIngredient,
        { display: "2 EL Öl" },
        { quantity: 1, unit: { name: "kg" }, food: { name: "Tomato" } },
      ],
    },
    { fdcEnabled: true },
  );
  assert.equal(preview.ingredients[0].grams, 100);
  assert.equal(preview.ingredients[2].grams, null);
  assert.equal(preview.ingredients[3].grams, 1000);
  assert.equal(preview.ingredients[2].needs_review, true);
});
test("USDA lookup returns provenance and only complete nutrient candidates", async () =>
  withFetchStub(mockFdc, async () => {
    const list = await search("MOCK_API_KEY", "oats");
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 101);
    assert.match(list[0].url, /fdc.nal.usda.gov\/food-details\/101/);
  }));
test("per-portion nutrition uses database totals, never AI values", async () =>
  withFetchStub(mockFdc, async () => {
    const preview = prepare(recipe);
    const entries = [
      { index: 0, grams: 100, fdc_id: 101 },
      { index: 1, grams: 50, fdc_id: 102 },
    ];
    const report = await calculate("MOCK_API_KEY", recipe, entries, preview.hash);
    assert.equal(report.per_portion.calories, 170);
    assert.equal(report.per_portion.protein, 5.5);
    assert.equal(report.per_portion.fat, 2.8);
    assert.equal(report.per_portion.carbohydrate, 27.5);
    assert.equal(report.per_portion.fiber, null);
    assert.equal(report.coverage.fiber, "0/2");
    const payload = mealieNutrition(report);
    assert.deepEqual(
      Object.keys(payload).sort(),
      ["calories", "carbohydrateContent", "fatContent", "proteinContent", "sodiumContent"]
        .sort()
        .filter((key) => key !== "sodiumContent"),
    );
    assert.equal(payload.calories, "170.0 kcal");
  }));
test("edits since preview and unmatched ingredients block saving", async () =>
  withFetchStub(mockFdc, async () => {
    const preview = prepare(recipe);
    const entries = [
      { index: 0, grams: 100, fdc_id: 101 },
      { index: 1, grams: 50, fdc_id: 102 },
    ];
    await assert.rejects(
      () => calculate("MOCK_API_KEY", { ...recipe, recipeServings: 4 }, entries, preview.hash),
      /changed/,
    );
    await assert.rejects(
      () =>
        calculate(
          "MOCK_API_KEY",
          recipe,
          [entries[0], { index: 1, grams: 0, fdc_id: 102 }],
          preview.hash,
        ),
      /confirm grams/,
    );
    await assert.rejects(
      () => calculate("MOCK_API_KEY", recipe, [entries[0]], preview.hash),
      /Match each/,
    );
  }));
test("AI provides search queries only, with validated indices", async () =>
  withFetchStub(
    async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    suggestions: [
                      { index: 0, query: "oats", note: "" },
                      { index: 1, query: "berries", note: "fresh" },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    async () => {
      const result = await aiSuggest("MOCK_KEY", ["100 g Haferflocken", "50 g Beeren"]);
      assert.deepEqual(
        result.map((x) => x.query),
        ["oats", "berries"],
      );
      await assert.rejects(() => aiSuggest("", ["something"]), /not configured/);
    },
  ));
