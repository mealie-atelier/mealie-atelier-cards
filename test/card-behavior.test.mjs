import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const failing = (message) => async () => {
  throw new Error(message);
};

function shoppingCard(language, callWS) {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language, callWS } });
  card._activeList = "l1";
  card._data.shopping = {
    lists: [{ id: "l1", name: "Market" }],
    items: [
      { id: "i1", shoppingListId: "l1", note: "Milk", checked: false },
      { id: "i2", shoppingListId: "l1", note: "Eggs", checked: true },
    ],
  };
  card._data.mealplan = [{ id: "m1", date: "2030-01-02", entryType: "dinner", recipe: { name: "Soup" } }];
  return { cards, card };
}

// Dispatch a click on a [data-action] element the way the shadow root listener sees it.
const click = (card, dataset) => {
  const el = { dataset, disabled: false, closest: () => el };
  return card._handleClick({ target: el });
};

function toastOf(cards) {
  return cards.document.markup.match(/<div class="toast[^"]*" role="(\w+)" aria-live="(\w+)">(.*?)<\/div>/s);
}

test("failed shopping toggle rolls back the checkbox and raises an accessible localized alert", async () => {
  const { cards, card } = shoppingCard("de", failing("Server down"));
  await click(card, { action: "shopping-toggle", id: "i1", checked: "false" });
  assert.equal(card._data.shopping.items[0].checked, false, "optimistic check must be undone");
  const toast = toastOf(cards);
  assert.ok(toast, "an error toast is rendered");
  assert.equal(toast[1], "alert");
  assert.equal(toast[2], "assertive");
  assert.match(toast[3], /Speichern fehlgeschlagen: Server down/);
  assert.match(toast[3], /rückgängig/);
});

test("successful shopping toggle keeps the optimistic state and uses a polite status toast", async () => {
  const { cards, card } = shoppingCard("en", async (message) =>
    message.type === "mealie_atelier/shopping" ? card._data.shopping : {},
  );
  const seen = [];
  const original = card._render.bind(card);
  card._render = () => {
    seen.push(card._data.shopping.items[0].checked);
    original();
  };
  await click(card, { action: "shopping-toggle", id: "i1", checked: "false" });
  assert.equal(seen[0], true, "UI flips before the server answers");
  assert.equal(toastOf(cards)[1], "status");
});

test("failed shopping add removes the pending row again", async () => {
  const { cards, card } = shoppingCard("en", failing("Boom"));
  await card._mutate(
    "shopping_add",
    { list_id: "l1", note: "Bread" },
    "shopping",
    () => card._optimisticAdd("shopping", { id: "pending-1", shoppingListId: "l1", note: "Bread" }),
  );
  assert.deepEqual(
    card._data.shopping.items.map((x) => x.id),
    ["i1", "i2"],
  );
  assert.equal(toastOf(cards)[1], "alert");
  assert.match(toastOf(cards)[3], /Could not save: Boom/);
});

test("failed meal plan delete restores the entry, failed add removes the pending entry", async () => {
  const { cards, card } = shoppingCard("en", failing("Nope"));
  await click(card, { action: "remove-meal", value: "m1" });
  assert.deepEqual(card._data.mealplan.map((x) => x.id), ["m1"]);
  assert.equal(toastOf(cards)[1], "alert");
  await card._mutate("mealplan_add", { date: "2030-01-03", meal_type: "lunch", recipe_id: "r1" }, "mealplan", () =>
    card._optimisticAdd("mealplan", { id: "pending-2", date: "2030-01-03" }),
  );
  assert.deepEqual(card._data.mealplan.map((x) => x.id), ["m1"]);
});

test("a skipped recipe fetch in the cookbook print is surfaced and the rest is still printed", async () => {
  const written = [];
  const popup = { document: { write: (html) => written.push(html), open() {}, close() {} } };
  const cards = loadCards({ window: { open: () => popup } });
  const card = makeCard(cards, {
    hass: {
      language: "en",
      callWS: async (message) => {
        if (message.slug === "broken") throw new Error("gone");
        return { slug: message.slug, name: `Recipe ${message.slug}`, recipeIngredient: [], recipeInstructions: [] };
      },
    },
  });
  card._fullCatalog = [{ slug: "broken", name: "Broken Pie" }, { slug: "a" }, { slug: "b" }];
  card._bookSelected = new Set(["a", "broken", "b"]);
  await card._studioPrintBook({ title: "Book", subtitle: "", photos: false });
  const html = written.join("");
  assert.ok(html.includes("Recipe a") && html.includes("Recipe b"), "remaining recipes are kept");
  assert.ok(!html.includes("Broken Pie"));
  const toast = toastOf(cards);
  assert.equal(toast[1], "alert");
  assert.match(toast[3], /1 recipes could not be loaded and were skipped: Broken Pie/);
});

test("hitting the Home Assistant provider limit shows a localized incompleteness notice", async () => {
  for (const [language, pattern] of [
    ["en", /first 500 matches[\s\S]*incomplete[\s\S]*Bridge/],
    ["de", /ersten 500 Treffer[\s\S]*unvollständig[\s\S]*Bridge/],
  ]) {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._providerActive = "home_assistant";
    card._view = "recipes";
    const rows = (count) => Array.from({ length: count }, (_, i) => ({ slug: `r${i}`, name: `R${i}` }));
    card._nativeAction = async () => ({ recipes: rows(500) });
    card._data.recipes = await card._nativeRecipes("");
    assert.equal(card._providerTruncated, true);
    card._render();
    assert.match(cards.document.markup, pattern);
    card._nativeAction = async () => ({ recipes: rows(3) });
    card._data.recipes = await card._nativeRecipes("");
    assert.equal(card._providerTruncated, false);
    card._render();
    assert.doesNotMatch(cards.document.markup, /may be incomplete|möglicherweise unvollständig/);
  }
});
