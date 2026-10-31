import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const cards = loadCards();
const card = (language) => makeCard(cards, { hass: { language, callWS: async () => ({}) } });
const json = (name) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8"));
const de = json("de");
const en = json("en");

function detail(extra = {}) {
  return {
    slug: "x",
    name: "Test",
    recipeServings: 0,
    recipeIngredient: [],
    recipeInstructions: [{ text: "Do it" }],
    ...extra,
  };
}
function open(c, modal, recipe) {
  c._detail = recipe;
  c._modal = modal;
  c._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  return c._modalHtml();
}
const printHtml = (language, kind) => {
  const c = card(language);
  c._printKind = kind;
  return open(c, "print", detail());
};

test("editor note says the built-in Mealie integration is not set up", () => {
  assert.match(en.editorNoBuiltInMealieIntegrationFound, /built-in Mealie integration/);
  assert.match(de.editorNoBuiltInMealieIntegrationFound, /integrierte Mealie-Integration/);
});

test("German sync copy counts items as Artikel only", () => {
  for (const [key, value] of Object.entries(de)) {
    if (key.startsWith("sync")) assert.doesNotMatch(value, /Eintr(ag|äge)/, key);
  }
  assert.match(de["syncAuditEntry.other"], /\{count\} Artikel/);
  assert.match(de.syncOutcomePartial, /Artikel/);
});

test("German palette hint and placeholder", () => {
  assert.equal(de.uiSearchConversionExample, "Umrechnen, z. B. 250 g in oz");
  assert.ok(de.uiSearchRecipesIngredientsOrViews.length <= 24);
  assert.ok(en.uiSearchRecipesIngredientsOrViews.length <= 24);
});

test("weekly plan print preview uses plan headings, recipes keep theirs", () => {
  const week = printHtml("en", "mealplan");
  assert.match(week, /DAY \/ MEAL/);
  assert.match(week, /NOTES/);
  assert.doesNotMatch(week, /INGREDIENTS \/ ITEMS|PREPARATION \/ NOTES/);
  assert.match(printHtml("de", "mealplan"), /TAG \/ GERICHT/);
  const recipe = printHtml("en", "recipe");
  assert.match(recipe, /INGREDIENTS \/ ITEMS/);
  assert.doesNotMatch(recipe, /DAY \/ MEAL/);
});

test("landscape sentence appears only for the weekly plan print dialog", () => {
  assert.match(printHtml("en", "mealplan"), /landscape automatically/);
  assert.doesNotMatch(printHtml("en", "shopping"), /weekly plan|landscape/i);
  assert.doesNotMatch(printHtml("de", "shopping"), /Wochenplan|Querformat/);
  assert.match(printHtml("de", "mealplan"), /Querformat/);
});

test("fractional servings use the locale decimal separator", () => {
  const recipe = detail({ recipeServings: 2.5 });
  const cookDe = open(card("de"), "cook", recipe);
  assert.match(cookDe, /2,5 Portionen/);
  assert.doesNotMatch(cookDe, /2\.5 Portionen/);
  assert.match(open(card("de"), "recipe", recipe), /2,5 Portionen/);
  assert.match(open(card("en"), "cook", recipe), /2\.5 servings/);
});

test("scaled yield text formats fractional targets", () => {
  const c = card("de");
  c._discoverResults = [{ slug: "x" }];
  c._discoverSelected = "x";
  c._discoverDraft = { people: 3.5 };
  const html = open(c, "recipe", detail({ recipeServings: 2 }));
  assert.match(html, /3,5 Portionen/);
});

test("long summary shrinks the cook heading", () => {
  const c = card("en");
  c._cookIndex = 0;
  const long = open(
    c,
    "cook",
    detail({ recipeInstructions: [{ summary: "word ".repeat(40), text: "Short" }] }),
  );
  assert.match(long, /<h2 class="cook-stage--long">/);
  const xlong = open(
    c,
    "cook",
    detail({ recipeInstructions: [{ summary: "word ".repeat(70), text: "Short" }] }),
  );
  assert.match(xlong, /<h2 class="cook-stage--long cook-stage--xlong">/);
  const short = open(c, "cook", detail({ recipeInstructions: [{ summary: "Sum", text: "x" }] }));
  assert.match(short, /<h2>Sum<\/h2>/);
});
