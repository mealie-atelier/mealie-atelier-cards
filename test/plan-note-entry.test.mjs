import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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
  assert.match(html, /Oder ohne Rezept einplanen/);
  assert.match(html, /z\. B\. Pizza bestellen"/);
  assert.match(html, /enterkeyhint="done"/);
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

/** A card with the plan dialog open and the picker started, like after clicking "plan". */
function openPlanCard(detail = null) {
  const { card, calls } = planCard({});
  card._detail = detail;
  card._pickerStart();
  return { card, calls };
}

function noteField(html) {
  return html.match(/<input[^>]*name="note_title"[^>]*>/)?.[0] ?? "";
}

function submitButton(html) {
  return html.match(/<button[^>]*data-picker="submit"[^>]*>/)[0];
}

test("a typed title survives a re-render of the dialog and keeps the add button enabled", () => {
  const { card } = openPlanCard();
  card._handleInput({
    target: {
      value: "Pizza bestellen",
      matches: (sel) => sel === 'input[name="note_title"]',
      hasAttribute: () => false,
      dataset: {},
    },
  });
  const html = card._modalHtml();
  assert.match(noteField(html), /value="Pizza bestellen"/);
  assert.doesNotMatch(submitButton(html), /disabled/);
});

test("opening the plan dialog again starts with an empty title", () => {
  const { card } = openPlanCard();
  card._planNote = "Rest";
  card._pickerStart();
  assert.doesNotMatch(noteField(card._modalHtml()), /value="Rest"/);
  assert.match(submitButton(card._modalHtml()), /disabled/);
});

test("choosing a recipe disables the title field, clearing it enables the field again", () => {
  const { card } = openPlanCard();
  card._planNote = "Reste";
  assert.doesNotMatch(noteField(card._modalHtml()), /disabled/);
  card._picker.selected = { id: "r1", name: "Pasta" };
  const html = card._modalHtml();
  assert.match(noteField(html), /disabled/);
  assert.match(noteField(html), /value="Reste"/);
  // The live repaint after a pick toggles the same field.
  const note = { disabled: false };
  const button = { disabled: true };
  card.shadowRoot.querySelector = (sel) =>
    sel === 'input[name="note_title"]' ? note : sel === '[data-picker="submit"]' ? button : null;
  card._planNoteSync();
  assert.equal(note.disabled, true);
  assert.equal(button.disabled, false);
  card._picker.selected = null;
  card._planNoteSync();
  assert.equal(note.disabled, false);
  assert.equal(button.disabled, false, "the kept text still enables the button");
  card._planNote = "";
  card._planNoteSync();
  assert.equal(button.disabled, true);
});

test("a dialog opened for one recipe has no title field", () => {
  const { card } = openPlanCard({ id: "r1", name: "Pasta", slug: "pasta" });
  const html = card._modalHtml();
  assert.equal(noteField(html), "");
  assert.doesNotMatch(html, /plan-note/);
  assert.doesNotMatch(submitButton(html), /disabled/);
});

test("the demo backend stores the title of a meal without a recipe", () => {
  const source = readFileSync("demo/preview.html", "utf8");
  const start = source.indexOf('if (req.action === "mealplan_add") {');
  const end = source.indexOf('if (req.action === "mealplan_delete")', start);
  const handler = new Function(
    "req",
    "recipes",
    "meals",
    "state",
    `let nextMealId = state.next; ${source.slice(start, end)}`,
  );
  const recipes = [{ id: "r1" }];
  const meals = [];
  const add = (payload) =>
    handler({ action: "mealplan_add", payload }, recipes, meals, { next: 0 });
  add({ date: "2030-01-02", meal_type: "dinner", title: "Pizza bestellen" });
  add({ date: "2030-01-02", meal_type: "lunch", recipe_id: "r1" });
  assert.equal(meals[0].title, "Pizza bestellen");
  assert.equal(meals[0].recipe, null);
  assert.equal(meals[0].entryType, "dinner");
  assert.equal(meals[1].recipe.id, "r1");
  assert.equal(meals[1].title, undefined);
});
