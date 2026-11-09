import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const book = (slug, name, tag) => ({
  id: slug,
  slug,
  name,
  queryFilter: { parts: [{ attributeName: "tags.id", relationalOperator: "IN", value: [tag] }] },
});
const recipes = Array.from({ length: 150 }, (_, i) => ({
  slug: `r${i}`,
  name: `Recipe ${i}`,
  tags: [{ id: i % 3 === 0 ? "t1" : "t2" }],
}));

const newCard = () => {
  const card = makeCard(loadCards(), {
    hass: { language: "en", callWS: async () => ({}), callService: async () => ({}) },
  });
  card._render = () => {};
  card._cookbooksRequested = true;
  card._studioCookbooks = [
    book("soups", "Soups", "t1"),
    book("bakes", "Bakes", "t2"),
    { id: "x", slug: "odd", name: "Odd", queryFilter: { parts: [] } },
  ].filter((b) => b.queryFilter.parts.length);
  card._fullCatalog = recipes;
  card._data.recipes = { items: recipes.slice(0, 24), total: 150, page: 1, per_page: 24 };
  return card;
};
const click = (card, action, value) =>
  card._handleClick({
    target: { closest: () => ({ dataset: { action, value } }) },
    preventDefault() {},
  });

test("the Kochbuch page lists all recipes and all cookbooks with counts", () => {
  const card = newCard();
  const html = card._studioCookbook();
  assert.equal(html.match(/data-book="/g).length, 150);
  assert.match(html, /Your cookbooks/);
  assert.match(html, /data-value="soups"[^>]*aria-pressed="false"[^>]*>.*?50 recipes/s);
});

test("choosing a cookbook selects exactly its recipes and choosing it again removes them", async () => {
  const card = newCard();
  await click(card, "studio-book-pick", "soups");
  assert.equal(card._bookSelected.size, 50);
  assert.ok([...card._bookSelected].every((slug) => Number(slug.slice(1)) % 3 === 0));
  assert.match(card._studioCookbook(), /data-value="soups"[^>]*aria-pressed="true"/);
  await click(card, "studio-book-pick", "soups");
  assert.equal(card._bookSelected.size, 0);
});

test("select all covers every recipe, not only 120", async () => {
  const card = newCard();
  await click(card, "studio-book-all");
  assert.equal(card._bookSelected.size, 150);
});

test("the Rezepte cookbook filter narrows across all recipes and survives a re-render", () => {
  const card = newCard();
  assert.match(card._recipeTools(), /data-input="recipe-book"/);
  card._cookbookFilter = "soups";
  const tiles = (html) => html.match(/data-action="open-recipe"/g)?.length ?? 0;
  assert.equal(tiles(card._recipes()), 24);
  assert.match(card._pagination(), /1 \/ 3/);
  assert.match(card._recipeTools(), /<option value="soups" selected>/);
  card._page = 3;
  assert.equal(tiles(card._recipes()), 2);
  card._cookbookFilter = "";
  assert.equal(card._bookFilterList(), null);
});

test("picking a cookbook in the filter loads the catalog first", async () => {
  const card = newCard();
  card._fullCatalog = null;
  let loads = 0;
  card._studioCatalog = async () => {
    loads++;
    card._fullCatalog = recipes;
  };
  const rendered = [];
  card._render = () => rendered.push(card._bookFilterList()?.length);
  card._handleInput({
    target: {
      dataset: { input: "recipe-book" },
      value: "bakes",
      hasAttribute: () => false,
      matches: () => false,
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(loads, 1);
  assert.deepEqual(rendered, [100]);
});
