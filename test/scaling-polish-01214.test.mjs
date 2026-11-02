// Binding spec for the 0.12.14 scaling and shopping name polish.
// Part 1 lists the expected improvements (they fail before the fix). Part 2 pins the outputs that earlier
// attempts broke: German measure words, English rows that must stay English, bracket sizes, unknown English
// containers, weight rows, processed forms and range upper bounds. Each case is its own test.
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
const scale = (row, to, from, locale) => Studio.scaleIngredient(row, to, from, locale);
// One recipe per line, each for 2 people, planned for 2 people: [name, quantity, unit, category] per row.
const needs = (locale, ...lines) =>
  Array.from(
    Studio.shoppingNeeds(
      lines.map((line, i) => ({ name: "R" + i, recipeYield: "2", recipeIngredient: [line] })),
      [],
      { people: 2, locale },
    ),
    (r) => [r.name, r.quantity, r.unit, r.category],
  );
const scaleCases = (title, locale, cases) => {
  for (const [row, to, from, want] of cases)
    test(`${title}: ${locale} "${row}" ${to}/${from}`, () => {
      const got = scale(row, to, from, locale);
      if (want instanceof RegExp) assert.match(got, want);
      else assert.equal(got, want);
    });
};

// ---------------------------------------------------------------------------------------------------------
// Part 1: expected improvements
// ---------------------------------------------------------------------------------------------------------

// Open bugs: agreement follows the language of the ingredient, not the UI locale.
scaleCases("a German compound agrees in the English UI", "en", [
  ["1 Knoblauchzehe", 2, 1, "2 Knoblauchzehen"],
  ["2 Knoblauchzehen", 1, 2, "1 Knoblauchzehe"],
  ["1 Hähnchenbrustfilet", 2, 1, "2 Hähnchenbrustfilets"],
]);
scaleCases("an English orange takes the English plural", "en", [
  ["1 orange, juiced", 2, 1, "2 oranges, juiced"],
]);
scaleCases("the uninflected colour orange is skipped and the noun agrees", "de", [
  ["1 orange Paprikaschote", 2, 1, "2 orange Paprikaschoten"],
]);
for (const locale of ["en", "de"])
  test(`a lowercase English orange stays English on the ${locale} shopping list`, () => {
    const rows = needs(locale, "1 orange", "1 orange");
    assert.equal(rows.length, 1);
    assert.match(rows[0][0], /^oranges?$/);
    assert.equal(rows[0][1], 2);
  });

scaleCases("English nouns agree with the amount", "en", [
  ["2 apples", 1, 2, "1 apple"],
  ["1 apple", 3, 1, "3 apples"],
  ["4 tomatoes", 1, 4, "1 tomato"],
  ["1 tomato", 2, 1, "2 tomatoes"],
  ["2 potatoes", 1, 2, "1 potato"],
  ["2 lemons, juiced", 1, 2, "1 lemon, juiced"],
  ["2 cherries", 1, 2, "1 cherry"],
  ["1 cherry", 2, 1, "2 cherries"],
  ["1 peach", 2, 1, "2 peaches"],
  ["2 chilies", 1, 2, "1 chili"],
  ["2 chillies", 1, 2, "1 chilli"],
  ["1 chili", 2, 1, "2 chilies"],
  ["1–2 chilies", 1, 2, "½–1 chili"],
  ["1-2 apples", 1, 2, "½-1 apple"],
]);
scaleCases("English nouns agree behind a size, colour or freshness word", "en", [
  ["2 large peaches", 1, 2, "1 large peach"],
  ["1 large onion", 2, 1, "2 large onions"],
  ["1 fresh lemon", 2, 1, "2 fresh lemons"],
  ["1 red onion, sliced", 2, 1, "2 red onions, sliced"],
  ["1 red pepper", 2, 1, "2 red peppers"],
  ["1 large egg", 2, 1, "2 large eggs"],
  ["2 large eggs", 1, 2, "1 large egg"],
]);
scaleCases("English noun phrases agree on the last word", "en", [
  ["2 chicken breasts", 1, 2, "1 chicken breast"],
  ["1 chicken breast", 2, 1, "2 chicken breasts"],
  ["3 egg yolks", 1, 3, "1 egg yolk"],
  ["3 egg yolks", 6, 3, "6 egg yolks"],
  ["1 egg yolk", 2, 1, "2 egg yolks"],
  ["2 garlic cloves, minced", 1, 2, "1 garlic clove, minced"],
  ["1 garlic clove", 2, 1, "2 garlic cloves"],
  ["1 red bell pepper", 2, 1, "2 red bell peppers"],
]);
scaleCases("English measure words agree and the food behind them stays", "en", [
  ["1 bunch parsley", 2, 1, "2 bunches parsley"],
  ["1 head garlic", 3, 1, "3 heads garlic"],
  ["1 stick butter", 2, 1, "2 sticks butter"],
  ["3 sticks butter", 1, 3, "1 stick butter"],
  ["1 handful basil", 2, 1, "2 handfuls basil"],
  ["1 envelope unflavored gelatin", 2, 1, "2 envelopes unflavored gelatin"],
  ["1 leaf sage", 2, 1, "2 leaves sage"],
  ["1 shot espresso", 2, 1, "2 shots espresso"],
  ["3 shots espresso", 1, 3, "1 shot espresso"],
  ["1 bar chocolate", 2, 1, "2 bars chocolate"],
  ["1 sachet vanilla sugar", 2, 1, "2 sachets vanilla sugar"],
  ["1 bulb fennel", 2, 1, "2 bulbs fennel"],
  ["1 loaf bread", 2, 1, "2 loaves bread"],
  ["1 glass milk", 2, 1, "2 glasses milk"],
  ["1 jar tomato sauce", 2, 1, "2 jars tomato sauce"],
  ["2 cans chickpeas", 1, 2, "1 can chickpeas"],
  ["2 cans of beans", 1, 2, "1 can of beans"],
  ["2 bunches scallions", 1, 2, "1 bunch scallions"],
  ["1 cup cherry tomatoes", 1, 2, "½ cup cherry tomatoes"],
]);
test("a plural food behind a known container is never singularized", () => {
  assert.doesNotMatch(scale("2 bunches scallions", 1, 2, "en"), /scallion\b/);
});
scaleCases("a hedge word before the amount stays and the amount scales", "de", [
  ["ca. 200 g Mehl", 4, 2, "ca. 400 g Mehl"],
  ["circa 200 g Mehl", 4, 2, "circa 400 g Mehl"],
  ["etwa 2 EL Öl", 4, 2, "etwa 4 EL Öl"],
]);
scaleCases("a hedge word before the amount stays and the amount scales", "en", [
  ["about 2 cups milk", 4, 2, "about 4 cups milk"],
  ["approx. 100 g sugar", 4, 2, "approx. 200 g sugar"],
  ["approximately 2 cups milk", 4, 2, "approximately 4 cups milk"],
  ["~2 cups milk", 4, 2, "~4 cups milk"],
]);

scaleCases("German nouns and feminine counting words agree with the amount", "de", [
  ["1 Kugel Mozzarella", 2, 1, "2 Kugeln Mozzarella"],
  ["3 Kugeln Eis", 1, 3, "1 Kugel Eis"],
  ["1 Lorbeerblatt", 2, 1, "2 Lorbeerblätter"],
  ["1 Chilischote", 2, 1, "2 Chilischoten"],
  ["3 Bohnen", 1, 3, "1 Bohne"],
  ["1 Bohne", 3, 1, "3 Bohnen"],
  ["2 Schalotten", 1, 2, "1 Schalotte"],
  ["1 Salatgurke", 2, 1, "2 Salatgurken"],
  ["1 Pfirsich", 3, 1, "3 Pfirsiche"],
  ["2 Pfirsiche", 1, 2, "1 Pfirsich"],
  ["1 Avocado", 2, 1, "2 Avocados"],
  ["1 Aubergine", 2, 1, "2 Auberginen"],
  ["1 Mango", 2, 1, "2 Mangos"],
  ["1 Champignon", 2, 1, "2 Champignons"],
  ["1 Zimtstange", 2, 1, "2 Zimtstangen"],
  ["1 Tüte Vanillezucker", 2, 1, "2 Tüten Vanillezucker"],
  ["1 Flasche Wein", 2, 1, "2 Flaschen Wein"],
  ["2 Flaschen Wein", 1, 2, "1 Flasche Wein"],
  ["1 Rolle Blätterteig", 2, 1, "2 Rollen Blätterteig"],
  ["1 Tafel Schokolade", 2, 1, "2 Tafeln Schokolade"],
  ["2 Gläser Honig", 1, 2, "1 Glas Honig"],
  ["1 große Zwiebel", 2, 1, "2 große Zwiebeln"],
  ["1 rote Paprikaschote", 2, 1, "2 rote Paprikaschoten"],
  ["2 Lorbeerblätter", 1, 2, "1 Lorbeerblatt"],
  ["1 große Dose geschälte Tomaten", 2, 1, "2 große Dosen geschälte Tomaten"],
]);
// Masculine and neuter phrases: the adjective and the noun agree together, or the row stays as on main.
// A mixed form (inflected noun, old adjective ending) is never allowed.
for (const [row, to, from, allowed] of [
  ["1 großer Apfel", 2, 1, ["2 große Äpfel", "2 großer Apfel"]],
  ["2 große Eier", 1, 2, ["1 großes Ei", "1 große Eier"]],
])
  test(`German adjective and noun agree together or not at all: "${row}" ${to}/${from}`, () => {
    const got = scale(row, to, from, "de");
    assert.ok(allowed.includes(got), got);
  });
test("German measure words stay singular behind an adjective: 1 kleiner Kopf Salat", () => {
  const got = scale("1 kleiner Kopf Salat", 2, 1, "de");
  assert.match(got, /^2 klein\S* Kopf Salat$/);
  assert.doesNotMatch(got, /Köpfe/);
});

test("shopping: two identical rows with a two-letter food merge", () => {
  assert.deepEqual(needs("de", "1 EL Öl", "1 EL Öl"), [["Öl", 2, "el", "spices"]]);
});
for (const [locale, a, b] of [
  ["en", "1 onion", "2 green onions"],
  ["en", "1 onion", "2 red onions"],
  ["en", "1 potato", "2 sweet potatoes"],
  ["en", "1 tomato", "2 cherry tomatoes"],
  ["en", "1 egg", "2 egg yolks"],
  ["en", "2 peppers", "2 bell peppers"],
  ["de", "1 EL Öl", "1 EL Olivenöl"],
])
  test(`shopping: a different food never merges by its last word: ${a} + ${b}`, () => {
    assert.equal(needs(locale, a, b).length, 2);
  });
test("shopping: English singular and plural merge and the name follows the amount", () => {
  assert.deepEqual(needs("en", "1 onion", "2 onions"), [["onions", 3, "stück", "produce"]]);
  assert.deepEqual(needs("en", "2 tomatoes", "1 tomato"), [["tomatoes", 3, "stück", "produce"]]);
});
test("shopping: a bare count of chopped tomatoes merges singular and plural", () => {
  assert.deepEqual(needs("en", "3 chopped tomatoes", "1 chopped tomato"), [
    ["chopped tomatoes", 4, "stück", "produce"],
  ]);
});
test("shopping: Kugeln, Tassen and Würfel are counting units, not part of the food", () => {
  assert.deepEqual(needs("de", "3 Kugeln Eis")[0].slice(0, 3), ["Eis", 3, "Kugeln"]);
  assert.deepEqual(needs("de", "2 Tassen Mehl")[0].slice(0, 3), ["Mehl", 2, "Tassen"]);
  assert.deepEqual(needs("de", "1 Würfel Hefe", "1 Würfel frische Hefe"), [
    ["Hefe", 2, "Würfel", "produce"],
  ]);
  assert.equal(needs("de", "2 Eiswürfel")[0][0], "Eiswürfel");
  assert.equal(needs("de", "1 Brühwürfel")[0][0], "Brühwürfel");
});
test("shopping: pc and pcs are the piece unit and merge with a bare count", () => {
  for (const unit of ["pc", "pcs"])
    assert.equal(
      Studio.parseIngredient({ quantity: 2, unit: { name: unit }, food: { name: "eggs" } }).unit,
      "stück",
      unit,
    );
  assert.deepEqual(needs("en", "2 pcs eggs", "3 eggs"), [["eggs", 5, "stück", "chilled"]]);
});
for (const [locale, line] of [
  ["en", "1 can black beans"],
  ["en", "1 jar beans"],
  ["de", "1 Dose Kidneybohnen"],
  ["de", "1 Dose Tomaten"],
])
  test(`shopping: canned food goes to the pantry aisle: ${line}`, () => {
    assert.equal(needs(locale, line)[0][3], "pantry");
  });

// Processed tomatoes (chopped, peeled, diced, strained) by weight or in a container are a pantry product,
// keep their form and never merge with plain tomatoes. A bare count ("4 gehackte Tomaten") stays fresh.
for (const [locale, line, name, unit] of [
  ["de", "400 g gehackte Tomaten", "gehackte Tomaten", "g"],
  ["de", "200 g passierte Tomaten", "passierte Tomaten", "g"],
  ["de", "500 ml passierte Tomaten", "passierte Tomaten", "ml"],
  ["de", "1 Dose geschälte Tomaten", "geschälte Tomaten", "Dose"],
  ["en", "1 can diced tomatoes", "diced tomatoes", "can"],
  ["en", "150 g strained tomatoes", "strained tomatoes", "g"],
])
  test(`processed forms: ${line} is a pantry product`, () => {
    assert.deepEqual(needs(locale, line), [[name, Number(line.split(" ")[0]), unit, "pantry"]]);
  });
for (const [locale, line, form] of [
  ["en", "1 tin diced tomatoes", "diced"],
  ["de", "1 große Dose geschälte Tomaten", "geschälte"],
  ["en", "1 (14.5 ounce) can diced tomatoes", "diced"],
  ["en", "2 (14.5 oz) cans diced tomatoes", "diced"],
  ["en", "1 14-oz can diced tomatoes", "diced"],
  ["de", "1 (400 g) Dose gehackte Tomaten", "gehackte"],
])
  test(`processed forms: ${line} keeps its form and goes to the pantry`, () => {
    const [row] = needs(locale, line);
    assert.match(row[0], new RegExp(`${form} tomat`, "i"));
    assert.equal(row[3], "pantry");
  });
for (const [locale, a, b] of [
  ["de", "400 g gehackte Tomaten", "400 g Tomaten"],
  ["de", "1 Dose gehackte Tomaten", "1 Dose Tomaten"],
  ["de", "1 Glas geschälte Tomaten", "1 Glas Tomaten"],
])
  test(`processed forms: ${a} and ${b} stay two rows`, () => {
    assert.equal(needs(locale, a, b).length, 2);
  });

// ---------------------------------------------------------------------------------------------------------
// Part 2: regressions from earlier reviews (these hold today and must keep holding)
// ---------------------------------------------------------------------------------------------------------

scaleCases("German masculine and neuter measure words stay singular after a number", "de", [
  ["4 Blatt Gelatine", 2, 1, "8 Blatt Gelatine"],
  ["1 Blatt Gelatine", 3, 2, "1½ Blatt Gelatine"],
  ["2 Glas Honig", 2, 1, "4 Glas Honig"],
  ["1 Glas Honig", 2, 1, "2 Glas Honig"],
  ["2 Kopf Salat", 2, 1, "4 Kopf Salat"],
  ["1 Kopf Salat", 2, 1, "2 Kopf Salat"],
  ["2 Paket Hefe", 2, 1, "4 Paket Hefe"],
  ["1 Paket Hefe", 2, 1, "2 Paket Hefe"],
  ["1 Bund Petersilie", 2, 1, "2 Bund Petersilie"],
  ["1 Würfel Hefe", 2, 1, "2 Würfel Hefe"],
  ["1 Prise Salz", 2, 1, "2 Prisen Salz"],
  ["200 g Glasnudeln", 2, 1, "400 g Glasnudeln"],
  ["2 Rosmarinzweige", 1, 2, "1 Rosmarinzweig"],
]);
// German nouns that keep their form in the plural, whatever the UI language.
for (const locale of ["de", "en"])
  scaleCases("German nouns that do not change in the plural keep their form", locale, [
    ["1 Brötchen", 2, 1, "2 Brötchen"],
    ["1 Fenchel", 2, 1, "2 Fenchel"],
    ["1 Ananas", 2, 1, "2 Ananas"],
    ["2 Radieschen", 1, 2, "1 Radieschen"],
    ["1 Zucchini", 2, 1, "2 Zucchini"],
    ["2 Paprika", 1, 2, "1 Paprika"],
    ["1 Päckchen Backpulver", 2, 1, "2 Päckchen Backpulver"],
    ["1 Becher Sahne", 2, 1, "2 Becher Sahne"],
  ]);
scaleCases("German display forms never appear in English rows", "en", [
  ["1 orange", 2, 1, /^2 oranges?$/],
  ["1 Orange", 2, 1, /^2 Oranges?$/],
  ["1 mango", 2, 1, /^2 mango(e?s)?$/],
  ["1 avocado", 2, 1, /^2 avocados?$/],
  ["1 aubergine", 2, 1, /^2 aubergines?$/],
]);
scaleCases("the colour orange never takes a German plural", "de", [
  ["1 orange Paprikaschote", 2, 1, /^2 orange /],
]);
test("German display forms never appear on an English shopping list", () => {
  const names = needs(
    "en",
    "1 aubergine",
    "1 avocado",
    "1 mango",
    "1 aubergine",
    "1 avocado",
    "1 mango",
  )
    .map((r) => r[0])
    .sort();
  assert.equal(names.length, 3);
  assert.match(names[0], /^aubergines?$/);
  assert.match(names[1], /^avocados?$/);
  assert.match(names[2], /^mango(e?s)?$/);
});

for (const [locale, lines, want] of [
  ["de", ["2 Eier (Größe M)", "3 Eier"], [["Eier (Größe M)", 5, "stück", "chilled"]]],
  ["de", ["1 Ei (Größe M)"], [["Ei (Größe M)", 1, "stück", "chilled"]]],
  ["de", ["3 Eier der Größe L"], [["Eier der Größe L", 3, "stück", "chilled"]]],
  ["de", ["2 Kartoffeln (Größe: mittel)"], [["Kartoffeln (Größe: mittel)", 2, "stück", "produce"]]],
  ["en", ["1 onion (medium size)"], [["onion (medium size)", 1, "stück", "produce"]]],
  ["en", ["2 potatoes (large ones)"], [["potatoes (large ones)", 2, "stück", "produce"]]],
])
  test(`a size in brackets stays whole: ${lines.join(" + ")}`, () => {
    const rows = needs(locale, ...lines);
    // "Eier (Größe M)" may also read plain "Eier"; a bracket is never left half open.
    if (lines[0] === "2 Eier (Größe M)") assert.match(rows[0][0], /^Eier(?: \(Größe M\))?$/);
    else assert.deepEqual(rows, want);
    for (const [name] of rows)
      assert.equal(name.split("(").length, name.split(")").length, `balanced brackets in ${name}`);
  });

scaleCases("an unknown English container leaves the noun alone", "en", [
  ["1 pint cherry tomatoes, halved", 1, 2, "½ pint cherry tomatoes, halved"],
  ["½ pint cherry tomatoes", 2, 1, "1 pint cherry tomatoes"],
  ["1 pint blueberries", 1, 2, "½ pint blueberries"],
  ["1 quart strawberries", 1, 2, "½ quart strawberries"],
  ["1 kilo potatoes", 1, 2, "½ kilo potatoes"],
  ["1 c blueberries", 1, 2, "½ c blueberries"],
  ["1 heaping cup raisins", 1, 2, "½ heaping cup raisins"],
  ["1 scant cup walnuts", 1, 2, "½ scant cup walnuts"],
  ["1 rack ribs", 1, 2, "½ rack ribs"],
  ["1 sleeve graham crackers", 1, 2, "½ sleeve graham crackers"],
  ["1 punnet raspberries", 1, 2, "½ punnet raspberries"],
  ["1 tray chicken thighs", 1, 2, "½ tray chicken thighs"],
  ["1 pkg noodles", 1, 2, "½ pkg noodles"],
]);
scaleCases("invariant and uncountable English words keep their form", "en", [
  ["12 shrimp", 2, 1, "24 shrimp"],
  ["12 shrimp", 1, 2, "6 shrimp"],
  ["1 dozen eggs", 1, 2, "½ dozen eggs"],
  ["2 dozen eggs", 1, 2, "1 dozen eggs"],
  ["2 whole fish", 4, 2, "4 whole fish"],
  ["2 star anise", 4, 2, "4 star anise"],
  ["2 gnocchi", 4, 2, "4 gnocchi"],
  ["2 halibut", 4, 2, "4 halibut"],
  ["2 tilapia", 1, 2, "1 tilapia"],
  ["2 cod", 4, 2, "4 cod"],
  ["1 pizza dough", 2, 1, "2 pizza dough"],
  ["1 cumin", 2, 1, "2 cumin"],
  ["1 bacon", 2, 1, "2 bacon"],
  ["1 black pepper", 2, 1, "2 black pepper"],
  ["1 salt and pepper", 2, 1, "2 salt and pepper"],
  ["1 all-purpose flour", 2, 1, "2 all-purpose flour"],
  ["2 asparagus", 1, 2, "1 asparagus"],
  ["2 hummus", 1, 2, "1 hummus"],
  ["2 molasses", 1, 2, "1 molasses"],
  ["2 cups couscous", 1, 2, "1 cup couscous"],
  ["4 leaves gelatin", 1, 2, "2 leaves gelatin"],
  ["1 tbsp olive oil", 2, 1, "2 tbsp olive oil"],
  ["1 can (400 g) tomatoes", 4, 2, "2 cans (400 g) tomatoes"],
  ["2 cloves garlic", 1, 2, "1 clove garlic"],
]);

for (const pair of [
  ["1 onion", "1 lb onions"],
  ["1 large onion", "1 lb onions"],
  ["1 small onion", "8 oz onions"],
  ["1 tomato", "1 lb tomatoes"],
  ["1 lemon", "1 lb lemons"],
  ["3 large carrots", "1 lb carrots"],
  ["2 large chicken breasts", "1 lb chicken breasts"],
  ["12 large shrimp", "1 lb shrimp"],
])
  test(`a weight row never merges into a piece count: ${pair.join(" + ")}`, () => {
    assert.ok(needs("en", ...pair).length >= 2);
  });

for (const [locale, a, b, form] of [
  ["de", "1 kleine Dose gehackte Tomaten", "1 Dose Tomaten", "gehackte"],
  ["de", "1 große Dose geschälte Tomaten", "1 Dose Tomaten", "geschälte"],
  ["en", "1 small can diced tomatoes", "1 can tomatoes", "diced"],
  ["en", "1 large can diced tomatoes", "2 cans tomatoes", "diced"],
  ["en", "1 (14 oz) can diced tomatoes", "1 (14 oz) can tomatoes", "diced"],
])
  test(`a processed form behind a size or container stays apart: ${a} + ${b}`, () => {
    const rows = needs(locale, a, b);
    assert.ok(rows.length >= 2);
    assert.ok(rows.some((r) => r[0].includes(form)));
  });
for (const [locale, line, name] of [
  ["en", "1 (8 oz) package chopped spinach", "(8 oz) package chopped spinach"],
  ["en", "1 (16 oz) package diced ham", "(16 oz) package diced ham"],
  ["en", "1 (14 oz) large can tomatoes", "(14 oz) large can tomatoes"],
  ["de", "2 gehackte Zwiebeln", "gehackte Zwiebeln"],
  ["en", "2 diced onions", "diced onions"],
  ["de", "200 g geriebener Käse", "geriebener Käse"],
])
  test(`a processed form stays in the name: ${line}`, () => {
    assert.equal(needs(locale, line)[0][0], name);
  });
test("a processed form after a container keeps its label", () => {
  assert.match(
    needs("en", "1 (14.5 ounce) can diced tomatoes")[0][0],
    /^\(14\.5 ounce\) can diced tomatoes$/,
  );
});
test("bare counts of chopped food still merge with the plain food and stay fresh", () => {
  assert.deepEqual(needs("de", "4 gehackte Tomaten", "2 Tomaten"), [
    ["gehackte Tomaten", 6, "stück", "produce"],
  ]);
  assert.deepEqual(needs("de", "2 gehackte Zwiebeln", "1 Zwiebel, gehackt"), [
    ["gehackte Zwiebeln", 3, "stück", "produce"],
  ]);
});
test("fresh yeast keeps its word, dry yeast never merges with fresh yeast", () => {
  assert.match(needs("de", "½ Würfel frische Hefe")[0][0], /frische Hefe$/);
  assert.equal(needs("de", "1 Würfel Hefe", "1 Würfel Trockenhefe").length, 2);
  assert.equal(needs("de", "1 Würfel Hefe", "1 Päckchen Trockenhefe").length, 2);
  assert.equal(needs("de", "1 Päckchen Trockenhefe", "1 Päckchen Hefe").length, 2);
  assert.equal(needs("en", "7 g dry yeast", "7 g yeast").length, 2);
  assert.deepEqual(needs("de", "250 g frische Pasta", "250 g Pasta"), [
    ["frische Pasta", 500, "g", "pantry"],
  ]);
});

test("ranges keep the upper bound for shopping amounts", () => {
  for (const line of ["200-250 g Butter", "200 g - 250 g Butter", "200g-250g Butter"]) {
    assert.equal(Studio.parseIngredient(line).quantity, 250, line);
    assert.deepEqual(needs("de", line), [["Butter", 250, "g", "chilled"]], line);
  }
  assert.equal(needs("en", "1-2 onions")[0][1], 2);
  assert.equal(scale("200-250 g Butter", 2, 1, "de"), "400-500 g Butter");
});

test("ice cream never merges with eggs", () => {
  assert.equal(needs("de", "1 Eis", "2 Eier").length, 2);
  assert.deepEqual(needs("de", "2 Eier", "1 Ei", "1 Eiern"), [["Eier", 4, "stück", "chilled"]]);
});

for (const [locale, line, category] of [
  ["de", "200 g Beeren", "produce"],
  ["de", "300 g Beerenmischung", "produce"],
  ["en", "1 eggplant", "produce"],
  ["en", "1 graham crackers", "pantry"],
  ["en", "200 g green beans", "produce"],
  ["en", "1 cup pepperoni", "protein"],
  ["de", "400 g Tomaten", "produce"],
])
  test(`aisles stay as they are: ${line}`, () => {
    assert.equal(needs(locale, line)[0][3], category);
  });
test("whole cloves stay one spice row", () => {
  assert.deepEqual(needs("en", "4 whole cloves"), [["whole cloves", 4, "stück", "spices"]]);
});
