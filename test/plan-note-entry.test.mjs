import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

/** FormData stand-in: the submit handler only reads entries(). */
function formDataOf(values) {
  return class {
    entries() {
      return Object.entries(values)[Symbol.iterator]();
    }
  };
}

function planCard(values, language = "en") {
  const cards = loadCards({ globals: { FormData: formDataOf(values) } });
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
  card._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  card._modal = "plan";
  card._planDay = "2030-01-02";
  card._render = () => {};
  const calls = [];
  card._mutate = async (action, payload, scope, optimistic) => {
    // The card runs in its own realm: copy plain data out for strict comparisons.
    calls.push(JSON.parse(JSON.stringify({ action, payload, scope })));
    optimistic?.();
    return true;
  };
  return { card, calls };
}

async function submit(card) {
  const form = {
    dataset: { form: "plan" },
    closest: () => form,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  await card._handleSubmit({ target: form, preventDefault() {} });
}

test("the plan dialog offers a field for a meal without a recipe", () => {
  const { card } = planCard({}, "de");
  const html = card._modalHtml();
  assert.match(html, /<input type="text" name="note_title" maxlength="120"/);
  assert.match(html, /Oder ohne Rezept eintragen/);
  assert.match(html, /Pizza bestellen/);
});

test("a typed meal without a recipe becomes a note entry with that title", async () => {
  const { card, calls } = planCard({
    date: "2030-01-02",
    meal_type: "dinner",
    recipe_id: "",
    note_title: "  Pizza bestellen  ",
  });
  await submit(card);
  assert.deepEqual(calls, [
    {
      action: "mealplan_add",
      payload: { date: "2030-01-02", meal_type: "dinner", title: "Pizza bestellen" },
      scope: "mealplan",
    },
  ]);
  // The week view shows it right away, by its title.
  const pending = card._data.mealplan.at(-1);
  assert.equal(pending.title, "Pizza bestellen");
  assert.equal(pending.recipe, undefined);
});

test("a chosen recipe wins over a typed title", async () => {
  const { card, calls } = planCard({
    date: "2030-01-02",
    meal_type: "dinner",
    recipe_id: "r1",
    note_title: "Pizza bestellen",
  });
  await submit(card);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].payload, { date: "2030-01-02", meal_type: "dinner", recipe_id: "r1" });
});

test("neither recipe nor title adds nothing", async () => {
  const { card, calls } = planCard({ date: "2030-01-02", meal_type: "dinner", note_title: "  " });
  await submit(card);
  assert.equal(calls.length, 0);
});

test("typing a title enables the add button, clearing it disables it again", () => {
  const { card } = planCard({});
  const button = { disabled: true };
  card.shadowRoot.querySelector = (sel) => (sel === '[data-picker="submit"]' ? button : null);
  const input = {
    value: "Reste",
    matches: (sel) => sel === 'input[name="note_title"]',
    hasAttribute: () => false,
    dataset: {},
  };
  card._handleInput({ target: input });
  assert.equal(button.disabled, false);
  input.value = " ";
  card._handleInput({ target: input });
  assert.equal(button.disabled, true);
});
