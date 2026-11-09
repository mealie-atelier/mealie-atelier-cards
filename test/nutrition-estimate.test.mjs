import test from "node:test";
import assert from "node:assert/strict";
import {
  usdaQuery,
  sortFoods,
  estimateGrams,
  prepareNutritionRow,
} from "../src/components/nutrition-estimate.js";
import { loadCards, makeCard } from "./support/card-harness.mjs";

test("usdaQuery maps German ingredients tolerantly and leaves the rest alone", () => {
  assert.equal(usdaQuery("Milch"), "milk, whole");
  assert.equal(usdaQuery("  BIO Eier "), "egg, whole, raw, fresh");
  assert.equal(usdaQuery("frische Tomaten"), "tomatoes, red, ripe, raw");
  assert.equal(usdaQuery("Käse"), "cheese, cheddar");
  assert.equal(usdaQuery("Walnüsse"), "nuts, walnuts, english");
  assert.equal(usdaQuery("Olivenöl"), "oil, olive, salad or cooking");
  assert.equal(usdaQuery("Eiweiß"), "egg, white, raw, fresh");
  assert.equal(usdaQuery("saure Sahne"), "cream, sour, cultured");
  assert.equal(usdaQuery("2 EL Zucker"), "sugars, granulated");
  assert.equal(usdaQuery("milk"), "milk");
  assert.equal(usdaQuery("Erdnussbutter"), "Erdnussbutter");
  assert.equal(usdaQuery("Zaubertrank"), "Zaubertrank");
  assert.equal(usdaQuery(""), "");
});

test("usdaQuery knows at least 80 distinct ingredients", () => {
  const names =
    `Milch Sahne Joghurt Quark Butter Käse Parmesan Mozzarella Feta Ei Eigelb Mehl Vollkornmehl Haferflocken
    Backpulver Hefe Zucker Puderzucker Vanillezucker Vanillinzucker Honig Salz Pfeffer Zimt Kurkuma Muskat Oregano Thymian Curry Senf Essig Wasser
    Öl Olivenöl Rapsöl Margarine Schmalz Zwiebel Knoblauch Kartoffel Tomate Tomatenmark Karotte Paprika Gurke Zucchini
    Brokkoli Blumenkohl Spinat Salat Lauch Sellerie Champignons Kürbis Mais Kohl Aubergine Ingwer Petersilie Basilikum
    Schnittlauch Apfel Zitrone Banane Orange Birne Erdbeeren Himbeeren Blaubeeren Trauben Rosinen Kirschen Ananas
    Avocado Hackfleisch Rindfleisch Hähnchen Pute Lamm Speck Schinken Lachs Thunfisch Kabeljau Garnelen Nudeln Reis
    Linsen Kichererbsen Erbsen Bohnen Tofu Mandeln Walnüsse Haselnüsse Cashew Erdnüsse Sesam Kakao Schokolade`.split(
      /\s+/,
    );
  const mapped = names.filter((name) => usdaQuery(name) !== name);
  assert.ok(names.length >= 80);
  assert.deepEqual(
    names.filter((name) => !mapped.includes(name)),
    [],
  );
});

test("sortFoods orders Foundation, SR Legacy, Branded and keeps order inside a group", () => {
  const foods = [
    { id: 1, data_type: "Branded" },
    { id: 2, data_type: "SR Legacy" },
    { id: 3, data_type: "Foundation" },
    { id: 4, data_type: "Branded" },
    { id: 5, data_type: "Foundation" },
  ];
  assert.deepEqual(
    sortFoods(foods).map((food) => food.id),
    [3, 5, 2, 1, 4],
  );
  assert.equal(foods[0].id, 1);
});

test("estimateGrams handles weights, volumes, spoons, pinches and piece counts", () => {
  assert.deepEqual(estimateGrams("500 g Mehl", "Mehl"), { grams: 500, basis: { kind: "weight" } });
  assert.equal(estimateGrams("1,5 kg Kartoffeln", "Kartoffeln").grams, 1500);
  assert.equal(estimateGrams("250 mg Safran", "Safran").grams, 0.3);
  assert.equal(estimateGrams("500 ml Milch", "Milch").grams, 515);
  assert.equal(estimateGrams("2 dl Sahne", "Sahne").grams, 200);
  assert.equal(estimateGrams("1 l Olivenöl", "Olivenöl").grams, 920);
  assert.equal(estimateGrams("3 cl Rum", "Rum").grams, 30);
  assert.equal(estimateGrams("4 EL Zucker", "Zucker").grams, 50);
  assert.equal(estimateGrams("2 TL Salz", "Salz").grams, 12);
  assert.equal(estimateGrams("1 EL Honig", "Honig").grams, 21);
  assert.equal(estimateGrams("1 EL Zimt", "Zimt").grams, 15);
  assert.equal(estimateGrams("1 Prise Salz", "Salz").grams, 0.4);
  assert.equal(estimateGrams("2 Msp. Paprika", "Paprika").grams, 0.8);
  const eggs = estimateGrams("2 Eier Bio", "Eier");
  assert.deepEqual(eggs, { grams: 100, basis: { kind: "piece", per: 50 } });
  assert.equal(estimateGrams("1 große Zwiebel", "Zwiebel").grams, 110);
  assert.equal(estimateGrams("3 Zehen Knoblauch", "Knoblauch").grams, 9);
  assert.equal(estimateGrams("2 Stück Äpfel", "Äpfel").grams, 364);
});

test("estimateGrams parses fractions, decimals and ranges to the upper end", () => {
  assert.equal(estimateGrams("1/2 l Milch", "Milch").grams, 515);
  assert.equal(estimateGrams("½ l Milch", "Milch").grams, 515);
  assert.equal(estimateGrams("1½ EL Zucker", "Zucker").grams, 18.8);
  assert.equal(estimateGrams("1 1/2 Zitronen", "Zitronen").grams, 87);
  assert.equal(estimateGrams("¾ l Wasser", "Wasser").grams, 750);
  assert.equal(estimateGrams("0.5 l Wasser", "Wasser").grams, 500);
  assert.equal(estimateGrams("2-3 Eier", "Eier").grams, 150);
  assert.equal(estimateGrams("100 bis 200 g Mehl", "Mehl").grams, 200);
});

test("estimateGrams never guesses packs, cans, bunches or unknown foods", () => {
  for (const [text, name] of [
    ["1 Dose Tomaten", "Tomaten"],
    ["1 Bund Petersilie", "Petersilie"],
    ["1 Packung Hefe", "Hefe"],
    ["1 Scheibe Zitrone", "Zitrone"],
    ["2 Zimtstangen", "Zimtstangen"],
    ["Salz nach Geschmack", "Salz"],
    ["3 Zaubertränke", "Zaubertränke"],
    ["", ""],
  ])
    assert.equal(estimateGrams(text, name), null, text);
});

test("prepareNutritionRow fills the English term and replaces wrong backend grams", () => {
  const milk = prepareNutritionRow({ text: "500 ml Milch", query: "Milch", grams: 500 });
  assert.equal(milk.query, "milk, whole");
  assert.equal(milk.germanQuery, "Milch");
  assert.equal(milk.grams, 515);
  assert.equal(milk.estimate.basis.kind, "volume");
  const flour = prepareNutritionRow({ text: "500 g Mehl", query: "Mehl", grams: 500 });
  assert.equal(flour.grams, 500);
  assert.equal(flour.estimate, null);
  const eggs = prepareNutritionRow({ text: "2 Eier Bio", query: "Eier", grams: null });
  assert.equal(eggs.grams, 100);
  const can = prepareNutritionRow({ text: "1 Dose Tomaten", query: "Tomaten", grams: null });
  assert.equal(can.grams, null);
  assert.equal(can.estimate, null);
});

const dialog = (rows, callWS = async () => []) => {
  const card = makeCard(loadCards(), { hass: { language: "de", callWS } });
  card._nutrition = {
    busy: false,
    notice: "",
    report: null,
    choices: [],
    active: -1,
    preview: { name: "Soup", servings: 4, fdc_enabled: true, ai_enabled: false, slug: "s" },
    rows: rows.map((row) => ({ ...prepareNutritionRow(row), selected: null })),
  };
  return card;
};

test("the nutrition dialog shows the English term, a hint line and a weigh prompt", () => {
  const html = dialog([
    { index: 0, text: "2 Eier Bio", query: "Eier", grams: null },
    { index: 1, text: "1 Dose Tomaten", query: "Tomaten", grams: null },
  ])._nutritionMarkup();
  assert.match(html, /value="egg, whole, raw, fresh"/);
  assert.match(html, /<strong>2 Eier Bio<\/strong>/);
  assert.match(html, /value="100"/);
  assert.match(html, /2 Eier Bio ≈ 100 g, 50 g je Stück\. Geschätzt, bitte prüfen\./);
  assert.match(html, /Wiege Tomaten ab/);
  assert.match(html, /placeholder="Abwiegen"/);
  assert.doesNotMatch(html, /z\. B\. 200/);
});

test("the empty search result suggests an English term", () => {
  const card = dialog([{ index: 0, text: "1 Prise Salz", query: "Salz", grams: null }]);
  card._nutrition.active = 0;
  assert.match(card._nutritionMarkup(), /englische Namen[^<]*milk/);
});

test("searching sorts by data type and a user edit is searched verbatim", async () => {
  const card = dialog([{ index: 0, text: "1 Prise Salz", query: "Salz", grams: null }]);
  const queries = [];
  card._ws = async (type, opts) => {
    queries.push(opts.query);
    return [
      { id: 1, name: "SALT", data_type: "Branded", per_100g: { calories: 1 } },
      { id: 2, name: "Salt, table", data_type: "Foundation", per_100g: { calories: 1 } },
      { id: 3, name: "Milch, roh", data_type: "Branded", per_100g: { calories: 1 } },
    ];
  };
  const field = { value: " Milch " };
  const original = card.shadowRoot.querySelector.bind(card.shadowRoot);
  card.shadowRoot.querySelector = (selector) =>
    selector.startsWith("[data-nutri-query") ? field : original(selector);
  const el = {
    dataset: { action: "nutri-search", index: "0" },
    disabled: false,
    closest: () => el,
  };
  await card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(queries, ["Milch"]);
  assert.equal(card._nutrition.choices.map((choice) => choice.id).join(), "3,2,1");
});

test("sortFoods puts foods named after the search word ahead of better data types", () => {
  const foods = [
    { id: 1, name: "Cheese, ricotta, whole milk", data_type: "Foundation" },
    { id: 2, name: "Milk, whole, 3.25% milkfat", data_type: "SR Legacy" },
    { id: 3, name: "Milk, whole", data_type: "Foundation" },
    { id: 4, name: "Milk, buttermilk, fluid, whole", data_type: "Foundation" },
  ];
  assert.deepEqual(
    sortFoods(foods, "milk, whole").map((food) => food.id),
    [3, 2, 4, 1],
  );
});

test("no dictionary term carries a character USDA search rejects", () => {
  for (const word of ["Hackfleisch", "Margarine", "Schokolade"])
    assert.doesNotMatch(usdaQuery(word), /[%/]/, word);
  assert.equal(usdaQuery("Hähnchenbrustfilet"), usdaQuery("Hähnchen"));
  assert.equal(usdaQuery("Frischkäse"), "cheese, cream");
});
