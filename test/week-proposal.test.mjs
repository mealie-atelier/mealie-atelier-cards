import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const polish = readFileSync(new URL("../src/design-system/polish.css", import.meta.url), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));

const MAIN = "11111111-1111-1111-1111-111111111111";
const OTHER = "33333333-3333-3333-3333-333333333333";
const SWEET = "22222222-2222-2222-2222-222222222222";
const book = {
  slug: "mains",
  name: "Mains",
  queryFilter: {
    parts: [{ attributeName: "recipe_category.id", relationalOperator: "IN", value: [MAIN] }],
  },
};
const recipe = (slug, category, id) => ({
  id: slug,
  slug,
  name: slug,
  totalTime: "PT20M",
  recipeServings: 2,
  recipeIngredient: [],
  recipeCategory: [{ id, name: category }],
});
const stew = recipe("stew", "Hauptgericht", MAIN);
const soup = recipe("soup", "Hauptgericht", MAIN);
const side = recipe("side", "Beilage", OTHER);
const brownie = recipe("brownie", "Süßspeise", SWEET);
const pancake = recipe("breakfast", "Frühstück", SWEET);

const newCard = () => {
  const card = makeCard(loadCards(), {
    hass: { language: "de", callWS: async () => ({}), callService: async () => ({}) },
  });
  card._studio = { revision: 0, journal: {}, profile: {}, family: { members: [] }, pantry: [] };
  card._render = () => {};
  return card;
};
const click = (card, action) =>
  card._handleClick({
    target: { closest: () => ({ dataset: { action }, disabled: false }) },
    composedPath: () => [],
    preventDefault() {},
    stopPropagation() {},
  });
const propose = async (card, { plan = [] } = {}) => {
  const asked = [];
  card._ws = async (type, args) => {
    asked.push({ type, ...args });
    return plan;
  };
  await click(card, "studio-plan-preview");
  return asked;
};
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("a saved cookbook narrows the week instead of emptying it", async () => {
  const card = newCard();
  card._studio.profile = { cookbooks: ["mains"] };
  card._studioCookbooks = [book];
  card._fullCatalog = [stew, side];
  await propose(card);
  const slugs = new Set(plain(card._weekProposal).map((x) => x.slug));
  assert.deepEqual([...slugs], ["stew"]);
  assert.equal(card._weekProposalNote, "");
});

test("dessert and breakfast categories stay out of the dinners", async () => {
  const card = newCard();
  card._fullCatalog = [brownie, pancake, stew, soup];
  await propose(card);
  const slugs = new Set(plain(card._weekProposal).map((x) => x.slug));
  assert.ok(slugs.size > 0);
  assert.ok(!slugs.has("brownie") && !slugs.has("breakfast"));
});

test("a recipe box of only desserts still gets a proposal", async () => {
  const card = newCard();
  card._fullCatalog = [brownie];
  await propose(card);
  assert.ok(card._weekProposal.length > 0);
});

test("the week starts today and asks Mealie for exactly those seven days", async () => {
  const card = newCard();
  card._fullCatalog = [stew, soup];
  const past = new Date();
  past.setDate(past.getDate() - 3);
  card._weekStart = past;
  const asked = await propose(card);
  const today = ymd(new Date());
  const last = new Date();
  last.setDate(last.getDate() + 6);
  assert.deepEqual(plain(asked), [{ type: "mealplan", start: today, end: ymd(last) }]);
  assert.ok(plain(card._weekProposal).every((x) => x.date >= today));
});

test("a week opened in the future keeps its own start", async () => {
  const card = newCard();
  card._fullCatalog = [stew];
  const next = new Date();
  next.setDate(next.getDate() + 10);
  card._weekStart = next;
  const asked = await propose(card);
  assert.equal(asked[0].start, ymd(next));
});

test("evenings planned in Mealie after the page loaded are not proposed again", async () => {
  const card = newCard();
  card._fullCatalog = [stew];
  card._data.mealplan = [];
  const today = ymd(new Date());
  await propose(card, { plan: [{ date: today, entryType: "dinner" }] });
  assert.ok(!plain(card._weekProposal).some((x) => x.date === today && x.meal_type === "dinner"));
});

test("an empty proposal says that nothing fits", async () => {
  const card = newCard();
  card._discoverDraft = { step: 3, mealStyle: "any", cookbooks: [], people: 2, exclude: [] };
  card._discoverResults = true;
  card._fullCatalog = [];
  card._studioCatalog = async () => [];
  await propose(card);
  assert.equal(card._weekProposalNote, "studioPlanNoMatch");
  const markup = card._studioDiscover();
  assert.match(markup, /studio-plan-note/);
  assert.match(markup, new RegExp(card.t("studioPlanNoMatch")));
});

test("a fully planned week says so", async () => {
  const card = newCard();
  card._fullCatalog = [stew];
  const plan = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { date: ymd(d), entryType: "dinner" };
  });
  await propose(card, { plan });
  assert.equal(card._weekProposal.length, 0);
  assert.equal(card._weekProposalNote, "studioPlanAllPlanned");
});

test("the remove button is visible on touch against the hidden default", () => {
  assert.match(
    polish,
    /@media \(hover: none\) \{\s*\.atelier \.day-entry \.day-meal-remove \{\s*opacity: 1;/,
  );
});
