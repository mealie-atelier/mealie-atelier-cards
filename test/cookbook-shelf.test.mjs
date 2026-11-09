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

const evt = (key, target = { closest: (sel) => (sel === ".recipe-book-filter" ? {} : null) }) => {
  const e = { key, target, prevented: false, preventDefault: () => (e.prevented = true) };
  return e;
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("the Rezepte cookbook filter is a labelled button, not a native select", () => {
  const card = newCard();
  const html = card._recipeTools();
  assert.doesNotMatch(html, /<select/);
  assert.match(html, /<button[^>]*data-action="book-toggle"[^>]*aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /book-value">All cookbooks</);
  assert.doesNotMatch(html, /role="listbox"/);
});

test("the Rezepte cookbook filter narrows across all recipes and survives a re-render", () => {
  const card = newCard();
  card._cookbookFilter = "soups";
  const tiles = (html) => html.match(/data-action="open-recipe"/g)?.length ?? 0;
  assert.equal(tiles(card._recipes()), 24);
  assert.match(card._pagination(), /1 \/ 3/);
  assert.match(card._recipeTools(), /book-value">Soups</);
  card._page = 3;
  assert.equal(tiles(card._recipes()), 2);
  card._cookbookFilter = "";
  assert.equal(card._bookFilterList(), null);
});

test("a fresh card ticks the All row when the panel opens", () => {
  const card = newCard();
  card._bookOpen = true;
  const rows = card._recipeTools().match(/<li role="option".*?<\/li>/g);
  assert.match(rows[0], /aria-selected="true"[^>]*data-value=""/);
  assert.match(rows[0], /<svg/);
  assert.doesNotMatch(rows[1], /aria-selected="true"/);
});

test("the open panel lists All plus the cookbooks and ticks the chosen row at its end", () => {
  const card = newCard();
  card._cookbookFilter = "soups";
  card._bookOpen = true;
  const html = card._recipeTools();
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /<ul[^>]*role="listbox"/);
  const rows = html.match(/<li role="option".*?<\/li>/g);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /aria-selected="false"[^>]*data-value=""[^>]*>.*All cookbooks/);
  assert.match(rows[1], /aria-selected="true"[^>]*data-value="soups"/);
  assert.match(rows[1], /Soups<\/span><svg/);
  assert.doesNotMatch(rows[2], /<svg/);
  assert.doesNotMatch(html, /data-input="book-search"/);
});

test("the open state lives on the card, so a re-render keeps the panel", () => {
  const card = newCard();
  click(card, "book-toggle");
  assert.equal(card._bookOpen, true);
  assert.match(card._bookFilterField(), /role="listbox"/);
  click(card, "book-toggle");
  assert.equal(card._bookOpen, false);
  assert.doesNotMatch(card._bookFilterField(), /role="listbox"/);
});

test("the cookbook panel gets a search field from 16 cookbooks and it narrows the rows", () => {
  const card = newCard();
  const many = (n) =>
    Array.from({ length: n }, (_, i) => book(`b${i}`, i === 3 ? "Pasta" : `Book ${i}`, "t1"));
  card._bookOpen = true;
  card._studioCookbooks = many(15);
  assert.doesNotMatch(card._bookFilterField(), /data-input="book-search"/);
  card._studioCookbooks = many(16);
  assert.match(card._bookFilterField(), /<input[^>]*data-input="book-search"/);
  card._handleInput({
    target: {
      dataset: { input: "book-search" },
      value: "pas",
      hasAttribute: () => false,
      matches: () => false,
    },
  });
  const html = card._bookFilterField();
  assert.equal(html.match(/<li role="option"/g).length, 1);
  assert.match(html, /data-value="b3"/);
});

test("arrows move, Enter picks, Escape closes and returns focus to the button", async () => {
  const card = newCard();
  const opener = evt("ArrowDown");
  assert.equal(card._bookKeydown(opener), true);
  assert.equal(card._bookOpen, true);
  assert.equal(opener.prevented, true);
  assert.equal(card._bookActive, 0);
  card._bookKeydown(evt("ArrowDown"));
  card._bookKeydown(evt("ArrowDown"));
  card._bookKeydown(evt("ArrowDown"));
  assert.equal(card._bookActive, 2, "stops at the last row");
  card._bookKeydown(evt("ArrowUp"));
  assert.equal(card._bookActive, 1);
  card._bookKeydown(evt("Home"));
  assert.equal(card._bookActive, 0);
  card._bookKeydown(evt("End"));
  assert.equal(card._bookActive, 2);
  card._bookKeydown(evt("Enter"));
  await settle();
  assert.equal(card._cookbookFilter, "bakes");
  assert.equal(card._bookOpen, false);
  assert.equal(card._bookFocus, "trigger");
  card._bookOpen = true;
  card._bookFocus = "";
  const esc = evt("Escape");
  assert.equal(card._bookKeydown(esc), true);
  assert.equal(card._bookOpen, false);
  assert.equal(card._bookFocus, "trigger");
  assert.equal(esc.prevented, true);
});

test("keys elsewhere on the page are left alone", () => {
  const card = newCard();
  card._bookOpen = true;
  assert.equal(card._bookKeydown(evt("Escape", { closest: () => null })), false);
  assert.equal(card._bookOpen, true);
});

test("a press outside the panel closes it, a press inside does not", () => {
  const card = newCard();
  const panel = {};
  card.shadowRoot.querySelector = (sel) => (sel === ".book-panel" ? panel : null);
  card._bookOpen = true;
  card._boundBookOutside({ composedPath: () => [panel] });
  assert.equal(card._bookOpen, true);
  card._boundBookOutside({ composedPath: () => [{}] });
  assert.equal(card._bookOpen, false);
  assert.equal(card._bookFocus, "");
});

test("picking All clears the cookbook filter", async () => {
  const card = newCard();
  card._cookbookFilter = "soups";
  await click(card, "book-pick", "");
  assert.equal(card._cookbookFilter, "");
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
  card._bookOpen = true;
  await click(card, "book-pick", "bakes");
  await settle();
  assert.equal(loads, 1);
  assert.deepEqual(rendered, [100]);
  assert.equal(card._bookOpen, false);
});
