import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function setup(lang = "en") {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: lang, callWS: async () => ({}) } });
  card._data = {
    recipes: { total: 1, items: [] },
    mealplan: [],
    shopping: { items: [], lists: [] },
  };
  return { cards, card };
}
const TYPES = ["drink", "dessert", "snack", "side", "dinner", "lunch", "breakfast"];

test("the week grid lists every entry of a day, sorted by meal type, with localized labels", () => {
  const { card } = setup("de");
  card._weekStart = new Date(2030, 0, 1);
  card._data.mealplan = TYPES.map((t) => ({
    id: t,
    date: "2030-01-01",
    entryType: t,
    title: `n-${t}`,
  }));
  const html = card._week();
  assert.equal((html.match(/<button class="day-meal/g) || []).length, 7);
  const order = [...html.matchAll(/<span class="day-meal-name">n-(\w+)</g)].map((m) => m[1]);
  assert.deepEqual(order, ["breakfast", "lunch", "dinner", "side", "snack", "dessert", "drink"]);
  assert.match(html, /<small>Beilage<\/small>/);
  assert.match(html, /<small>Getränk<\/small>/);
  assert.doesNotMatch(html, /<small>drink<\/small>/);
});

test("a day-meal button carries its day so a note opens the plan dialog for that day", async () => {
  const { card } = setup();
  card._weekStart = new Date(2030, 0, 1);
  card._data.mealplan = [{ id: "n", date: "2030-01-03", entryType: "dinner", title: "Note" }];
  assert.match(card._week(), /data-action="day-meal" data-value="" data-date="2030-01-03"/);
  card._render = () => {};
  await card._handleClick({
    target: { closest: () => ({ dataset: { action: "day-meal", value: "", date: "2030-01-03" } }) },
  });
  assert.equal(card._planDay, "2030-01-03");
  assert.equal(card._modal, "plan");
});

test("the plan dialog offers all meal types, names remove buttons and anchors the modal", () => {
  const { card } = setup();
  card._planDay = "2030-01-01";
  card._modal = "plan";
  card._data.mealplan = [
    { id: "a", date: "2030-01-01", entryType: "lunch", recipe: { name: "Soup" } },
  ];
  const html = card._modalHtml();
  for (const t of TYPES) assert.match(html, new RegExp(`<option value="${t}">`));
  assert.match(html, /aria-label="Remove: Soup \(Lunch\)"/);
  assert.doesNotMatch(html, /<h3>Planned<\/h3>/);
  assert.match(html, /class="modal plan-anchored"/);
  assert.match(file("src/design-system/layout.css"), /\.modal\.plan-anchored \{[^}]*align-self/);
});

test("a recipe tile without a time shows a book icon, not a clock", () => {
  const { card } = setup();
  card._data.recipes.items = [
    { slug: "a", name: "A" },
    { slug: "b", name: "B", totalTime: "20" },
  ];
  const html = card._recipes();
  const metas = [...html.matchAll(/<div class="tile-meta">(.*?)<\/div>/g)].map((m) => m[1]);
  assert.equal(metas.length, 2);
  assert.notEqual(metas[0].split("</svg>")[0], metas[1].split("</svg>")[0]);
  assert.match(metas[1], /20 min/);
});

test("narrow week strips scroll today into view and keep equal day heights", () => {
  const { card } = setup();
  const grid = {
    scrollWidth: 2000,
    clientWidth: 400,
    scrollLeft: 0,
    getBoundingClientRect: () => ({ left: 0, right: 400 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ left: 900, right: 1100 }) }),
  };
  card.shadowRoot.querySelector = (sel) => (sel === ".week-grid" ? grid : null);
  card._revealToday();
  assert.equal(grid.scrollLeft, 900);
  assert.doesNotMatch(
    file("src/design-system/layout.css").match(/max-width: 760px\) \{[\s\S]*?\n\}/)[0],
    /align-items: start/,
  );
});

test("the recipe picker formats times and the tag filter is not a pill", () => {
  const { card } = setup("en");
  const rows = card._pickerRowsMarkup({
    items: [{ id: "1", name: "Stew", totalTime: "25" }],
    selected: null,
    open: false,
    active: -1,
    id: "p",
    loading: false,
    hasMore: false,
  });
  assert.match(rows, /25 min/);
  const css = file("src/design-system/recipe-picker.css");
  assert.match(css, /\.picker-disclosure \{[^}]*border-radius: var\(--ds-radius-md\)/);
  assert.match(css, /fit-content\(30%\)/);
  assert.equal(JSON.parse(file("src/i18n/de.json")).pickerTag, "Schlagwörter");
});
