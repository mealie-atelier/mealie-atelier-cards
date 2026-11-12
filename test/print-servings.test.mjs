import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const writes = [];
const popup = {
  document: {
    open() {},
    write: (html) => writes.push(html),
    close() {},
    getElementById: () => null,
  },
  focus() {},
};
const cards = loadCards({ window: { open: () => popup } });
const rows = [
  { quantity: 2, food: { name: "Eier" }, display: "2 Eier" },
  { quantity: 1, food: { name: "Zwiebel <b>" }, display: "1 Zwiebel <b>" },
];
const make = (recipe, kind = "recipe") => {
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card._detail = {
    slug: "r",
    name: "Rührei",
    recipeIngredient: rows,
    recipeServings: 2,
    ...recipe,
  };
  card._printKind = kind;
  card._render = () => {};
  return card;
};
const printed = (card) => {
  writes.length = 0;
  card._print();
  return writes[0];
};

test("scaled recipe print shows the target amount, the recipe base and scaled rows", () => {
  const card = make();
  card._servingsSet(4);
  const html = printed(card);
  assert.match(html, /<strong>4 Portionen<\/strong><small>Rezept: 2 Portionen<\/small>/);
  assert.match(html, /<span>4 Eier<\/span>/);
  assert.doesNotMatch(html, /<span>2 Eier<\/span>/);
});

test("scaled values are escaped", () => {
  const card = make();
  card._servingsSet(4);
  const html = printed(card);
  assert.match(html, /<span>\d Zwiebeln? &lt;b&gt;<\/span>/);
  assert.ok(!html.includes("Zwiebel <b>"));
});

test("yield mode labels the meta with the yield word and escapes the unit", () => {
  const card = make({ recipeServings: 0, recipeYieldQuantity: 1, recipeYield: "Blech <i>" });
  card._servingsSet(2);
  const html = printed(card);
  assert.match(
    html,
    /<span>Ergibt<\/span><strong>2 Blech &lt;i&gt;<\/strong><small>Rezept: 1 Blech &lt;i&gt;<\/small>/,
  );
});

test("factor mode shows the factor and no base line", () => {
  const card = make({ recipeServings: 0 });
  card._servingsSet(2);
  const html = printed(card);
  assert.match(html, /<strong>×2<\/strong><\/div>/);
  assert.doesNotMatch(html, /<small>/);
});

test("unscaled print equals today's output", () => {
  const card = make();
  const html = printed(card);
  assert.match(html, /<strong>2 Portionen<\/strong>/);
  assert.doesNotMatch(html, /<small>/);
  assert.match(html, /<span>2 Eier<\/span>/);
});

test("shopping print is unaffected by a scaled recipe", () => {
  const card = make({}, "shopping");
  card._servingsSet(4);
  card._data = { shopping: { lists: [{ id: "1", name: "Markt" }], items: [] } };
  const html = printed(card);
  assert.ok(html.includes("Markt"));
  assert.doesNotMatch(html, /Rezept: 2 Portionen/);
});
