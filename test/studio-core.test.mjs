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
  assert.ok(
    pantryRanked.every(
      (x) => !x.reasons.some((reason) => reason.key === "studioReasonPantryUnchecked"),
    ),
  );
});
test("Kochinspo recognises meat and fish inside German compound words", () => {
  const soup = recipe(
    "Haehnchensuppe",
    ["450 g Hähnchenbrust", "1,2 l Hühnerbrühe", "2 Möhren"],
    50,
    4,
  );
  const ragu = recipe("Ragu", ["500 g Rinderhackfleisch", "1 Dose Tomaten"], 60, 4);
  const salmon = recipe("Lachsnudeln", ["200 g Lachsfilet", "250 g Nudeln"], 25, 2);
  const shrimp = recipe("Garnelenpfanne", ["300 g Garnelen", "1 Zucchini"], 20, 2);
  const veggie = recipe(
    "Pilzpfanne",
    ["300 g Austernpilze", "250 g Muschelnudeln", "1 Stück Parmesanrinde"],
    25,
    2,
  );
  const items = [soup, ragu, salmon, shrimp, veggie];
  const slugs = (profile) =>
    Studio.suggest(items, profile)
      .map((x) => x.slug)
      .sort();
  assert.deepEqual(slugs({ mealStyle: "meat" }), ["Haehnchensuppe", "Ragu"]);
  assert.deepEqual(slugs({ mealStyle: "fish" }), ["Garnelenpfanne", "Lachsnudeln"]);
  assert.deepEqual(slugs({ mealStyle: "vegetarian" }), ["Pilzpfanne"]);
});
test("Kochinspo finds the animal at the end of a compound and ignores look-alikes", () => {
  const dish = (slug, ...ingredients) => recipe(slug, ingredients, 30, 2);
  const items = [
    dish("Miesmuscheln", "1 kg Miesmuscheln", "200 ml Weißwein"),
    dish("Seelachs", "400 g Seelachsfilet"),
    dish("Lammschulter", "1,2 kg Lammschulter", "4 Knoblauchzehen"),
    dish("Hackbaellchen", "500 g Hackbällchen"),
    dish("Tomatensalat", "4 Fleischtomaten", "1 Zwiebel"),
    dish("Mangolassi", "Fruchtfleisch von 1 Mango", "300 g Joghurt"),
    dish("Ruehrei", "4 Hühnereier", "1 Entenei"),
    dish("Spiegelei", "1 Entenei", "1 Prise Salz"),
    dish("Veggiegrill", "4 vegane Bratwurst", "200 g Erbsenprotein Hack"),
    dish("Flammkuchen", "1 Flammkuchenteig", "2 EL Flachssamen", "1 Clementine"),
  ];
  const slugs = (profile) =>
    Studio.suggest(items, profile)
      .map((x) => x.slug)
      .sort();
  assert.deepEqual(slugs({ mealStyle: "meat" }), ["Hackbaellchen", "Lammschulter"]);
  assert.deepEqual(slugs({ mealStyle: "fish" }), ["Miesmuscheln", "Seelachs"]);
  assert.deepEqual(slugs({ mealStyle: "vegetarian" }), [
    "Flammkuchen",
    "Mangolassi",
    "Ruehrei",
    "Spiegelei",
    "Tomatensalat",
    "Veggiegrill",
  ]);
  assert.deepEqual(slugs({ mealStyle: "vegan" }), ["Flammkuchen", "Tomatensalat", "Veggiegrill"]);
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
  assert.ok(
    ranked.reasons.some((r) => r.key === "studioReasonServingsBase" && r.values.servings === 2),
  );
});
test("Kochinspo sorts single ingredient lines into meat, fish and vegetarian", () => {
  const style = (line) =>
    ["meat", "fish", "vegetarian"]
      .filter((mealStyle) => Studio.suggest([recipe(line, [line])], { mealStyle }).length)
      .join(",");
  const expected = {
    meat: [
      "500 g Gehacktes, halb und halb",
      "500 g Gehacktes (gemischt)",
      "2 Steaks",
      "Hüftsteak",
      "Salsiccia",
      "Gyros",
      "500 g Wild, gewürfelt",
      "Hähnchenbrust, gewürzt",
      "Hähnchenschenkel (in Sojasauce mariniert)",
      "Lachsschinken",
      "Rinderbrühe",
      "200 g Putensteak",
      "Hähnchenbrust",
      "Hühnerbrühe",
      "Rinderhackfleisch",
      "Lammschulter",
      "Lammkoteletts",
      "Lammrücken",
      "Lammhack",
      "Hackbällchen",
      "Wildschweinkeule",
      "Hirschgulasch",
      "Rehrücken",
      "Kaninchen",
      "Geflügelleber",
      "Kasseler",
      "Rumpsteak",
      "Leberkäse",
      "500 g Gehacktes",
      "Weihnachtsgans",
      "Entenbrust",
      "Wildfond",
      "lamb shoulder",
      "pork sausage",
      "beef mince",
      "500 g Wild",
      "Speckwürfel",
      "Schweinefilet",
      "Putenschnitzel",
    ],
    fish: [
      "2 tuna steaks",
      "Thunfischsteak",
      "Pangasiusfilet",
      "crabmeat",
      "Miesmuscheln",
      "Jakobsmuscheln",
      "Seelachs",
      "Meeresfrüchte",
      "Thunfisch",
      "Tintenfisch",
      "Räucheraal",
      "Garnelen",
      "Austernsauce",
      "Wildlachs",
      "cod fillet",
      "crab meat",
      "Fischsauce",
      "Rotbarsch",
      "Flusskrebse",
    ],
    vegetarian: [
      "1 TL Hirschhornsalz",
      "1 TL Steakpfeffer",
      "1 EL Steakgewürz",
      "1 Blumenkohl, in Steaks geschnitten",
      "2 Sellerie-Steaks",
      "2 EL Tamarindenpaste",
      "2 tbsp tamarind paste",
      "200 g gooseberries",
      "1 TL Geflügelgewürz",
      "1 Pck. Hähnchengewürz",
      "1 Beyond Meat Burger",
      "1 cup coconut meat",
      "4 vegane Mühlen Frikadellen",
      "100 ml Lambrusco",
      "800 g Kürbisfleisch (Hokkaido)",
      "200 g Mangofleisch",
      "1 Parmesan rind",
      "finely grated rind of 1 lemon",
      "grated rind of 1 orange",
      "1 lb vegan ground beef",
      "1 lb plant-based ground beef",
      "250 g Hackfleisch (vegan)",
      "250 g Hack, vegan",
      "2 vegetarische Rügenwalder Bratwürste",
      "200 g Austernseitlinge",
      "200 g Austern-Pilze",
      "2 cups wild arugula",
      "Wild Brokkoli",
      "3 EL gehacktes Basilikum",
      "Sojasauce",
      "1 TL chicken seasoning",
      "4 Fleischtomaten",
      "Fruchtfleisch von 1 Mango",
      "Kokosfleisch",
      "Kürbisfruchtfleisch",
      "2 Hühnereier",
      "1 Entenei",
      "vegane Bratwurst",
      "Erbsenprotein Hack",
      "Sojahack",
      "Austernpilze",
      "Muschelnudeln",
      "Parmesanrinde",
      "Wildreis",
      "wild rice",
      "lemon rind",
      "Flachssamen",
      "Flammkuchenteig",
      "Clementine",
      "Nudeln al dente",
      "Petersilie, gehackt",
      "gehackte Mandeln",
      "Schmetterlingsnudeln",
      "Feldsalat",
      "lamb's lettuce",
      "Blumenkohlsteak",
      "cauliflower steaks",
      "beefsteak tomatoes",
      "Auberginenkaviar",
      "wild garlic",
      "Grünkern",
      "Tofu",
      "minced garlic",
      "Saal",
    ],
  };
  for (const [want, lines] of Object.entries(expected))
    for (const line of lines) assert.equal(style(line), want, line);
});
test("Kochinspo keeps eggs and dairy out of vegan suggestions but not plant drinks", () => {
  const vegan = (line) => Studio.suggest([recipe(line, [line])], { mealStyle: "vegan" }).length > 0;
  for (const line of [
    "vegane Butter",
    "200 ml Hafer Sahne",
    "200 ml Hafer-Sahne",
    "200 ml pflanzliche Sahne",
    "200 ml Kokosrahm",
    "200 ml Hafer Rahm",
    "400 ml coconut milk",
    "2 EL peanut butter",
    "200 ml oat milk",
    "Butternut-Kürbis",
  ])
    assert.equal(vegan(line), true, line);
  for (const line of [
    "2 Eiweiß",
    "250 g Eiernudeln",
    "2 Wachteleier",
    "2 Eigelb",
    "4 Eier",
    "100 g Butter",
    "200 ml Sahne",
    "200 g Sauerrahm",
    "200 ml Schlagrahm",
    "100 g saure Sahne",
    "150 g Rahm",
    "200 ml Kaffeerahm",
  ])
    assert.equal(vegan(line), false, line);
});
test("Kochinspo judges the product as written, not the alternative or a dairy label", () => {
  const style = (line) =>
    ["meat", "fish", "vegetarian", "vegan"]
      .filter((mealStyle) => Studio.suggest([recipe(line, [line])], { mealStyle }).length)
      .join(",");
  const expected = {
    meat: [
      "100 g Speck (vegetarisch: Räuchertofu)",
      "500 g Hähnchenbrust oder Tofu",
      "400 g Rinderhack (oder Sojagranulat)",
      "4 Nackensteaks",
      "4 Minutensteaks",
      "2 Filetsteaks",
      "2 Wildenten",
      "4 Wachteln",
      "1 Hase",
      "1 lb brisket",
      "2 Rib-Eye Steaks",
      "500 g Hähnchenschenkel, gewürzt",
    ],
    fish: ["2 EL Fischsauce (vegan: Sojasauce)", "1 tbsp Worcestershire sauce"],
    vegetarian: [
      "50 g Parmesan (vegetarisch)",
      "125 g Mozzarella (vegetarisch)",
      "250 g High Protein Quark",
      "1 Protein-Joghurt",
      "1 EL Honig (vegan: Agavendicksaft)",
      "50 g vegetarischer Hartkäse",
    ],
    "vegetarian,vegan": [
      "100 g Cashewkäse",
      "1 TL Fleischgewürz",
      "4 Gewürzgurken",
      "250 g Hackfleisch (vegan)",
    ],
  };
  for (const [want, lines] of Object.entries(expected))
    for (const line of lines) assert.equal(style(line), want, line);
});
test("Kochinspo selects a time choice for every saved limit", () => {
  assert.deepEqual([...Studio.DISCOVER_MINUTES], [20, 35, 50, 80]);
  assert.equal(Studio.discoverMinutes(40), 50);
  assert.equal(Studio.discoverMinutes(undefined), 50);
  assert.equal(Studio.discoverMinutes(35), 35);
  assert.equal(Studio.discoverMinutes(10), 20);
  assert.equal(Studio.discoverMinutes(240), 80);
});
test("Kochinspo keeps every option of a line and named cheeses out of plant diets", () => {
  const style = (line) =>
    ["meat", "vegetarian", "vegan"]
      .filter((mealStyle) => Studio.suggest([recipe(line, [line])], { mealStyle }).length)
      .join(",");
  for (const line of [
    "500 ml Gemüse- oder Hühnerbrühe",
    "500 ml Gemüse- oder Fleischbrühe",
    "4 cups vegetable or chicken stock",
    "1 cup vegetable or chicken broth",
  ])
    assert.equal(style(line), "meat", line);
  for (const line of [
    "200 g Feta",
    "100 g Gouda, gerieben",
    "250 g Ricotta",
    "250 g Mascarpone",
    "1 cup cheddar",
    "200 g Schmand",
    "200 g Sauerrahm",
    "200 ml Schlagrahm",
    "200 g Crème fraîche",
    "2 tbsp ghee",
    "100 g Skyr",
    "200 g Schlagsahne",
    "200 g Feta- oder Hirtenkäse",
  ])
    assert.equal(style(line), "vegetarian", line);
  assert.equal(style("400 ml Kokosmilch"), "vegetarian,vegan");
  assert.equal(style("200 ml Hafersahne"), "vegetarian,vegan");
  for (const line of [
    "500 ml Pflanzenmilch",
    "200 ml Pflanzensahne",
    "400 ml Kokosnussmilch",
    "200 ml Haferkochsahne",
    "500 ml Haselnussmilch",
    "500 ml Hanfmilch",
    "150 g Lupinenjoghurt",
    "200 ml Kokos-Schlagsahne",
  ])
    assert.equal(style(line), "vegetarian,vegan", line);
  assert.equal(style("200 ml Kondensmilch"), "vegetarian");
});
