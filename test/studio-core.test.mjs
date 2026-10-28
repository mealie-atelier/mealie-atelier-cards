import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const code = readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8");
const Studio = runInNewContext(code + "\nAtelierStudio", {
  Date,
  Intl,
  Number,
  Math,
  String,
  Set,
  Map,
});
const recipe = (id, ingredients, time = 25, servings = 2) => ({
  id,
  slug: id,
  name: id,
  totalTime: time,
  recipeServings: servings,
  recipeIngredient: ingredients.map((display) => ({ display })),
  recipeInstructions: [{ text: "Wasche die Tomaten." }],
});
test("ingredient normalization and unit conversions", () => {
  assert.equal(Studio.parseIngredient("1,5 kg Kartoffeln").quantity, 1500);
  assert.equal(Studio.parseIngredient("2 EL Öl").estimated, true);
  assert.equal(Studio.parseIngredient("250 ml Milch").unit, "ml");
  assert.equal(Studio.scaleIngredient("200 g Mehl", 3, 2), "300 g Mehl");
  assert.equal(Studio.scaleIngredient("1,5 EL Öl", 4, 2), "3 EL Öl");
  assert.equal(
    Studio.scaleIngredient("½ Zitrone", 4, 2),
    "½ Zitrone",
    "uncertain free-text quantities remain untouched",
  );
});
test("recommendations prefer recipes using pantry / respecting time / ratings", () => {
  const items = [
    recipe("A", ["500 g Tomaten", "100 g Nudeln"], 20),
    recipe("B", ["2 kg Pilze"], 60),
  ];
  const scores = Studio.suggest(
    items,
    { maxMinutes: 25 },
    [{ name: "Tomaten", amount: 500, unit: "g" }],
    { A: { rating: 5 } },
  );
  assert.equal(scores[0].slug, "A");
  assert.equal(scores[0].available, 1);
});
test("week plans avoid occupied dinner, use overlap and leftovers without overwriting", () => {
  const items = [
    recipe("A", ["500 g Tomaten", "100 g Nudeln"], 20, 4),
    recipe("B", ["300 g Tomaten", "80 g Reis"], 20, 2),
  ];
  const plan = Studio.planWeek(
    items,
    { people: 2, maxMinutes: 40 },
    [],
    {},
    [{ date: "2026-10-28", entryType: "dinner" }],
    new Date("2026-10-28T12:00:00Z"),
  );
  assert.ok(plan.every((x) => !(x.date === "2026-10-28" && x.meal_type === "dinner")));
  assert.ok(plan.some((x) => x.meal_type === "lunch"));
});
test("shopping groups quantities and removes known stock, warns on unknown measures", () => {
  const a = recipe("A", ["500 g Tomaten", "2 EL Öl"]),
    b = recipe("B", ["300 g Tomaten"]);
  const list = Studio.shoppingNeeds([a, b], [{ name: "Tomaten", amount: 500, unit: "g" }]);
  assert.equal(list.find((x) => x.name === "Tomaten").needed, 300);
  assert.ok(list.find((x) => x.name === "Öl").uncertain);
});
test("audit flags missing measures and duplicate rows, child tasks forbid dangerous steps", () => {
  const r = recipe("X", ["Tomaten", "Tomaten"]);
  r.recipeInstructions.push({ text: "Das Messer zum Schneiden nutzen." });
  assert.ok(Studio.audit(r).problems.length >= 2);
  assert.equal(Studio.safeHelperTasks(r).length, 1);
  assert.ok(Studio.substitutions("Sahne").length > 0);
});
test("expired and empty pantry stock must not be advertised as available", () => {
  const ingredients = recipe("A", ["400 g Kartoffeln"]);
  const expired = [{ name: "Kartoffeln", amount: 900, unit: "g", expires: "2020-01-01" }];
  assert.equal(Studio.recommendation(ingredients, { maxMinutes: 40 }, expired, {}).available, 0);
  const empty = [{ name: "Kartoffeln", amount: 0, unit: "g" }];
  assert.equal(Studio.shoppingNeeds([ingredients], empty, { people: 2 })[0].needed, 400);
});
test("household scale, favorite ratings and explicitly marked staple stock", () => {
  const items = [recipe("A", ["100 g Reis"], 25, 2), recipe("B", ["200 g Brot"], 25, 2)];
  const needs = Studio.shoppingNeeds(
    [items[0]],
    [{ name: "Reis", amount: 0, unit: "g", staple: true }],
    { people: 4 },
  );
  assert.equal(needs.length, 0, "Staples manually confirmed as always available");
  assert.equal(Studio.shoppingNeeds([items[0]], [], { people: 4 })[0].needed, 200);
  const sorted = Studio.suggest(items, { maxMinutes: 40 }, [], {
    A: { favorite: true, rating: 5 },
  });
  assert.equal(sorted[0].slug, "A");
});

test("two ingredients cannot consume the same stock twice", () => {
  const dish = recipe("double", ["500 g Tomaten", "500 g Tomaten"]);
  const result = Studio.recommendation(dish, {}, [{ name: "Tomaten", amount: 700, unit: "g" }], {});
  assert.equal(result.available, 1);
  assert.equal(result.missing, 1);
  assert.equal(result.unknown, 0);
});
test("Kochinspo filters by meal style, child-friendly heat, and ranks portions/pantry choices", () => {
  const vegan = recipe("Linsen-Bowl", ["200 g Linsen", "1 Stück Karotte"], 20, 4);
  vegan.tags = [{ name: "Vegan" }, { name: "Familie" }];
  const meat = recipe("Bacon-Pasta", ["100 g Speck", "100 g Nudeln"], 30, 2);
  const fish = recipe("Lachs", ["200 g Lachs", "200 g Kartoffeln"], 35, 2);
  const spicy = recipe("Chili-Pasta", ["100 g Nudeln", "1 EL Chili"], 20, 2);
  spicy.tags = [{ name: "Vegan" }];
  const items = [vegan, meat, fish, spicy];
  assert.deepEqual(
    Studio.suggest(items, { mealStyle: "vegan" })
      .map((x) => x.slug)
      .sort(),
    ["Chili-Pasta", "Linsen-Bowl"],
  );
  assert.deepEqual(
    Studio.suggest(items, { mealStyle: "vegetarian" })
      .map((x) => x.slug)
      .sort(),
    ["Chili-Pasta", "Linsen-Bowl"],
  );
  assert.deepEqual(
    Studio.suggest(items, { mealStyle: "meat" }).map((x) => x.slug),
    ["Bacon-Pasta"],
  );
  assert.deepEqual(
    Studio.suggest(items, { mealStyle: "fish" }).map((x) => x.slug),
    ["Lachs"],
  );
  assert.deepEqual(
    Studio.suggest([vegan, spicy], { mealStyle: "vegan", kidFriendly: true }).map((x) => x.slug),
    ["Linsen-Bowl"],
  );
  const pantryRanked = Studio.suggest([vegan, meat], { people: 4, usePantry: false }, [], {});
  assert.equal(pantryRanked[0].servings, 4);
  assert.ok(pantryRanked.every((x) => !x.reasons.some((reason) => reason.includes("Vorrat"))));
});
test("Kochinspo filters against exact Mealie cookbook tag and category IDs", () => {
  const tagBook = {
    name: "Kindgerecht",
    slug: "kindgerecht",
    queryFilter: {
      parts: [{ attributeName: "tags.id", relationalOperator: "IN", value: ["tag-kids"] }],
    },
  };
  const categoryBook = {
    name: "Hauptgerichte",
    slug: "hauptgerichte",
    queryFilter: {
      parts: [
        { attributeName: "recipe_category.id", relationalOperator: "IN", value: ["category-main"] },
      ],
    },
  };
  const unsafeBook = {
    name: "Unsafe",
    slug: "unsafe",
    queryFilterString: 'tags.id IN ["tag-kids"]',
  };
  const kid = recipe("Kid", ["100 g Kartoffeln"]);
  kid.tags = [{ id: "tag-kids", name: "Kindgerecht" }];
  const main = recipe("Main", ["100 g Reis"]);
  main.recipeCategory = [{ id: "category-main", name: "Hauptgericht" }];
  const other = recipe("Other", ["100 g Bohnen"]);
  const books = [tagBook, categoryBook, unsafeBook];
  assert.deepEqual(
    Studio.supportedCookbooks(books)
      .map((x) => x.slug)
      .sort(),
    ["hauptgerichte", "kindgerecht"],
  );
  assert.deepEqual(
    Studio.suggest([kid, main, other], { cookbooks: ["kindgerecht"] }, [], {}, books).map(
      (x) => x.slug,
    ),
    ["Kid"],
  );
  assert.deepEqual(
    Studio.suggest(
      [kid, main, other],
      { cookbooks: ["kindgerecht", "hauptgerichte"] },
      [],
      {},
      books,
    )
      .map((x) => x.slug)
      .sort(),
    ["Kid", "Main"],
  );
  assert.deepEqual(
    Studio.suggest([kid, main, other], {}, [], {}, books)
      .map((x) => x.slug)
      .sort(),
    ["Kid", "Main", "Other"],
  );
  assert.deepEqual(
    Studio.suggest([kid, main, other], { cookbooks: ["unsafe"] }, [], {}, books),
    [],
  );
});
test("global search classifies recipe names, ingredients, combined matches, and broad backend matches", () => {
  const recipe = {
    name: "Frische Eierspätzle mit Bacon",
    description: "Cremige Soße",
    tags: [{ name: "Familie" }],
    recipeCategory: [{ name: "Hauptgericht" }],
    recipeIngredient: [{ display: "200 g Kirschtomaten" }, { food: { name: "Lauch" } }],
  };
  assert.equal(Studio.searchMatch(recipe, "eierspatzle"), "recipe");
  assert.equal(Studio.searchMatch(recipe, "Kirschtomaten"), "ingredient");
  assert.equal(Studio.searchMatch(recipe, "Bacon Lauch"), "mixed");
  assert.equal(
    Studio.searchMatch(recipe, "Familie"),
    "match",
    "Tags and descriptions are not mislabeled as recipe-name matches",
  );
  assert.equal(
    Studio.searchMatch(recipe, "creme fraiche"),
    "match",
    "Fuzzy backend results must not be mislabeled as exact title or ingredient matches",
  );
});
test("quick search converts kitchen units accurately without guessing density", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(Studio.convertMeasurementQuery("250 g to oz"))), {
    amount: 250,
    sourceUnit: "g",
    converted: 8.8185,
    targetUnit: "oz",
    family: "mass",
  });
  assert.equal(Studio.convertMeasurementQuery("1 cup in ml").converted, 236.5882);
  assert.equal(Studio.convertMeasurementQuery("1 1/2 cups to ml").converted, 354.8824);
  assert.equal(Studio.convertMeasurementQuery("1 fl oz to ml").converted, 29.5735);
  assert.equal(Studio.convertMeasurementQuery("1/2 tbsp in ml").converted, 7.3934);
  assert.equal(Studio.convertMeasurementQuery("180 °C to °F").converted, 356);
  assert.equal(Studio.convertMeasurementQuery("1,5 kg nach g").converted, 1500);
  assert.equal(Studio.convertMeasurementQuery("250 g to ml").unsupported, "density-required");
  assert.equal(Studio.convertMeasurementQuery("2 handfuls to grams"), null);
  assert.equal(Studio.convertMeasurementQuery("-3 oz to g"), null);
});
test("structured Mealie ingredient quantity and unit override legacy display text", () => {
  const row = {
    display: "falsche Anzeige 100 g",
    quantity: 2,
    unit: { name: "kg" },
    food: { name: "Kartoffeln" },
  };
  assert.equal(Studio.parseIngredient(row).quantity, 2000);
  assert.equal(Studio.parseIngredient(row).label, "Kartoffeln");
  assert.equal(
    Studio.recommendation(
      { ...recipe("A", []), recipeIngredient: [row] },
      {},
      [{ name: "Kartoffeln", amount: 2.5, unit: "kg" }],
      {},
    ).available,
    1,
  );
});
test("pantry matching is strict enough to not claim tomato sauce equals tomatoes", () => {
  const r = recipe("A", ["300 g Tomaten"]);
  const res = Studio.recommendation(r, {}, [{ name: "Tomatensauce", amount: 900, unit: "g" }], {});
  assert.equal(res.available, 0);
  assert.equal(
    Studio.shoppingNeeds([r], [{ name: "Tomatensauce", amount: 900, unit: "g" }])[0].needed,
    300,
  );
});
test("unverified spoons cannot be claimed fully available by grams", () => {
  const r = recipe("A", ["2 EL Olivenöl"]);
  const result = Studio.recommendation(r, {}, [{ name: "Olivenöl", amount: 300, unit: "g" }], {});
  assert.equal(result.available, 0);
  assert.equal(result.unknown, 1);
  assert.equal(Studio.shoppingNeeds([r], [])[0].needed, null);
});
test("household recipe scaling works in both directions", () => {
  const r = recipe("A", ["800 g Mehl"], 25, 4);
  assert.equal(Studio.shoppingNeeds([r], [], { people: 2 })[0].needed, 400);
  assert.equal(Studio.shoppingNeeds([r], [], { people: 8 })[0].needed, 1600);
});
test("multiple pantry jars accumulate but expired jars never count", () => {
  const r = recipe("A", ["700 g Tomaten"]);
  const pantry = [
    { name: "Tomaten", amount: 400, unit: "g" },
    { name: "Tomaten", amount: 400, unit: "g" },
    { name: "Tomaten", amount: 200, unit: "g", expires: "2020-01-01" },
  ];
  assert.equal(Studio.recommendation(r, {}, pantry, {}).available, 1);
  assert.equal(Studio.shoppingNeeds([r], pantry)[0], undefined);
});

test("localized Mealie durations preserve display text and enforce conservative time budgets", () => {
  assert.equal(Studio.durationMinutes("25 – 30 Minuten"), 30);
  assert.equal(Studio.durationMinutes("35 min, fertig in 1 h 55 min"), 115);
  assert.equal(Studio.durationMinutes("40 Minuten Zubereitungszeit, 40 Minuten Backzeit"), 80);
  assert.equal(Studio.durationMinutes("1 Stunde 30 Minuten"), 90);
  assert.equal(Studio.durationMinutes("30"), 30);
  assert.equal(Studio.durationMinutes("35 min, ready in 1 h 55 min"), 115);
  assert.equal(Studio.durationMinutes("Zeit nach Gefühl"), null);
  assert.equal(Studio.formatTime("25 – 30 Minuten"), "25 – 30 Minuten");
  assert.equal(Studio.formatTime("30", "en"), "30 min");
  assert.equal(Studio.formatTime(30, "de"), "30 Min.");
  const ranged = recipe("Range", ["200 g Nudeln"], "25 – 30 Minuten");
  const unknown = recipe("Unknown", ["200 g Reis"], "Zeit nach Gefühl");
  assert.deepEqual(
    Studio.suggest([ranged, unknown], { maxMinutes: 25 }, [], {}).map((x) => x.slug),
    ["Unknown"],
  );
});

test("explicit people yield provides a serving basis while piece yield never does", () => {
  const people = recipe("People", ["400 g Nudeln"], 30, 0);
  people.recipeYieldQuantity = 2;
  people.recipeYield = "Personen";
  const cake = recipe("Cake", ["400 g Mehl"], 30, 0);
  cake.recipeYieldQuantity = 20;
  cake.recipeYield = "Stücke";
  assert.equal(Studio.recipeServings(people), 2);
  assert.equal(Studio.recipeServings(cake), null);
  assert.equal(
    Studio.audit(people).problems.some((problem) => problem.field === "servings"),
    false,
  );
  assert.equal(
    Studio.audit(cake).problems.some((problem) => problem.field === "servings"),
    true,
  );
  assert.equal(Studio.shoppingNeeds([people], [], { people: 4 })[0].quantity, 800);
  assert.equal(Studio.shoppingNeeds([cake], [], { people: 4 })[0].quantity, 400);
  const ranked = Studio.recommendation(people, { people: 2 }, [], {});
  assert.equal(ranked.servings, 2);
  assert.ok(ranked.reasons.includes("Rezeptbasis: 2 Portionen"));
});
