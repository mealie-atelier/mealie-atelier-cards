import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const cards = loadCards({
  globals: {
    FormData: class {
      constructor(form) {
        this.values = form.values;
      }
      entries() {
        return Object.entries(this.values)[Symbol.iterator]();
      }
    },
  },
});
const FLAGS = { recipe_scale: true, session_servings: true };
const recipe = {
  slug: "eggs",
  id: "r1",
  recipeServings: 2,
  recipeIngredient: [{ quantity: 2, food: { name: "Eier" } }],
};

function make({ features } = {}) {
  const card = makeCard(cards, {
    permissions: { can_write: true, can_manage: true, ...(features ? { features } : {}) },
  });
  card._detail = recipe;
  card._modal = "recipe";
  card._render = () => {};
  return card;
}
const button = (action, value, disabled = false) => {
  const el = {
    dataset: { action, value },
    getAttribute: (name) => (name === "aria-disabled" && disabled ? "true" : null),
    matches: (selector) => selector === `[data-action="${action}"]`,
  };
  el.closest = () => el;
  return el;
};
const click = (card, el) => card._handleClick({ target: el, preventDefault() {} });
const key = (card, el, name, modifiers = {}) => {
  const event = {
    key: name,
    ...modifiers,
    target: el,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
  card._handleKeyDown(event);
  return event;
};

test("servings-step click moves the target and ignores an aria-disabled button", async () => {
  const card = make();
  await click(card, button("servings-step", "1"));
  assert.equal(card._servingsTarget(), 3);
  await click(card, button("servings-step", "-1"));
  assert.equal(card._servingsTarget(), 2);
  await click(card, button("servings-step", "1", true));
  assert.equal(card._servingsTarget(), 2);
});

test("servings-set click sets the value", async () => {
  const card = make();
  await click(card, button("servings-set", "5"));
  assert.equal(card._servingsTarget(), 5);
  await click(card, button("servings-set", "2"));
  assert.equal(card._servingsTarget(), 2);
});

test("arrow keys on a stepper button step and prevent the default", () => {
  const card = make();
  const step = button("servings-step", "1");
  for (const name of ["ArrowUp", "ArrowRight"]) assert.equal(key(card, step, name).prevented, true);
  assert.equal(card._servingsTarget(), 4);
  for (const name of ["ArrowDown", "ArrowLeft"])
    assert.equal(key(card, step, name).prevented, true);
  assert.equal(card._servingsTarget(), 2);
  assert.equal(key(card, button("servings-step", "1", true), "ArrowUp").prevented, true);
});

test("other keys on a stepper button and arrows elsewhere do not step", () => {
  const card = make();
  assert.equal(key(card, button("servings-step", "1"), "Enter").prevented, false);
  const other = { matches: () => false };
  key(card, other, "ArrowUp");
  assert.equal(card._servingsTarget(), 2);
  // With a modifier the arrow keeps its browser meaning (Alt+Left goes back, Cmd+Up scrolls).
  for (const mod of ["altKey", "ctrlKey", "metaKey", "shiftKey"])
    assert.equal(
      key(card, button("servings-step", "1"), "ArrowLeft", { [mod]: true }).prevented,
      false,
    );
  assert.equal(card._servingsTarget(), 2);
});

async function submitList(card) {
  const calls = [];
  card._mutate = async (action, payload) => (calls.push([action, payload]), true);
  const form = {
    dataset: { form: "recipe-to-list" },
    values: { list_id: "l1" },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  await card._handleSubmit({ target: { closest: () => form }, preventDefault() {} });
  return calls.map(([action, payload]) => [action, JSON.parse(JSON.stringify(payload))]);
}

test("recipe-to-list submit sends scale only with the flag and a scaled recipe", async () => {
  const flagged = make({ features: FLAGS });
  flagged._servingsSet(3);
  assert.deepEqual(await submitList(flagged), [
    ["shopping_from_recipe", { list_id: "l1", recipe_id: "r1", scale: 1.5 }],
  ]);
  const old = make();
  old._servingsSet(3);
  assert.deepEqual(await submitList(old), [
    ["shopping_from_recipe", { list_id: "l1", recipe_id: "r1" }],
  ]);
  assert.deepEqual(await submitList(make({ features: FLAGS })), [
    ["shopping_from_recipe", { list_id: "l1", recipe_id: "r1" }],
  ]);
});

function openable(card, detail) {
  card._ws = async () => detail;
  card._loadFeedback = async () => {};
  return card;
}

test("opening another recipe resets the servings", async () => {
  const card = openable(make(), { ...recipe, slug: "other" });
  card._servingsSet(5);
  await card._openRecipe("other");
  assert.equal(card._servings, null);
});

test("a same-slug reload from cook keeps the servings", async () => {
  const card = openable(make(), recipe);
  card._servingsSet(5);
  card._modal = "cook";
  await card._openRecipe("eggs");
  assert.equal(card._servingsTarget(), 5);
});

test("the same recipe opened after the dialog was closed starts fresh", async () => {
  const card = openable(make(), recipe);
  card._servingsSet(5);
  card._modal = null;
  await card._openRecipe("eggs");
  assert.equal(card._servingsTarget(), 2);
});
