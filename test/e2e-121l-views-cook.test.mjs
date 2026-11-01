import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const today = new Date();
const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const recipe = {
  slug: "pasta",
  name: "Pasta",
  image: "abc",
  imageUrl: "/api/mealie_atelier/image/e1/r1?authSig=s",
  id: "r1",
  recipeId: "r1",
};

function setup(design = {}) {
  const card = makeCard(loadCards());
  Object.assign(card._config, design);
  card._data = {
    recipes: { items: [recipe], total: 1 },
    mealplan: [{ date: ymd, entryType: "dinner", recipe }],
  };
  card._failedParts = new Set();
  return card;
}
const IMG = /<img\b/;

test("photos show by default in hero, today, meal plan and picker", () => {
  const card = setup();
  assert.match(card._hero(), IMG);
  assert.match(card._today(), IMG);
  assert.match(card._week(), IMG);
});

test("show_images false hides the hero photo and keeps the hero art", () => {
  const html = setup({ show_images: false })._hero();
  assert.doesNotMatch(html, IMG);
  assert.match(html, /hero-art/);
});

test("show_images false hides today photos and keeps the meal badge", () => {
  const html = setup({ show_images: false })._today();
  assert.doesNotMatch(html, IMG);
  assert.match(html, /meal-badge/);
});

test("show_images false hides meal plan photos", () => {
  const html = setup({ show_images: false })._week();
  assert.doesNotMatch(html, IMG);
  assert.doesNotMatch(html, /has-photo/);
});

test("show_images false hides gallery photos", () => {
  assert.doesNotMatch(setup({ show_images: false })._recipes(), IMG);
});

test("show_images false hides the photo helper for every other caller", () => {
  const card = setup({ show_images: false });
  assert.equal(card._photo(recipe), "");
  assert.match(setup()._photo(recipe), IMG);
});

test("a connection error banner replaces the load-failed boxes", () => {
  for (const [part, call] of [
    ["shopping", (c) => c._shopping()],
    ["mealplan", (c) => c._week()],
  ]) {
    const card = setup();
    card._data = { shopping: null, mealplan: [] };
    card._failedParts = new Set([part]);
    card._error = "Connection not found";
    assert.doesNotMatch(call(card), /load-failed/);
    card._error = "";
    assert.match(call(card), /load-failed/);
  }
});

test("recipes view skips the load-failed box while the banner is up", () => {
  const card = setup();
  card._data = { recipes: { items: [], total: 0 } };
  card._loadFailed = true;
  card._failedParts = new Set(["recipes"]);
  const view = () => card._recipes();
  card._error = "Connection not found";
  assert.doesNotMatch(view(), /load-failed/);
  card._error = "";
  assert.match(view(), /load-failed/);
});

test("every cook step change resets the stage scroll and re-judges the bar", () => {
  const card = setup();
  const stage = { scrollTop: 90 };
  const modal = { scrollTop: 5 };
  const content = { scrollTop: 7 };
  const map = { ".modal": modal, ".cook-content": content, ".cook-stage": stage };
  card.shadowRoot.querySelector = (sel) => map[sel] || null;
  let watched = 0;
  card._watchModalBar = () => watched++;
  card._resetCookScroll();
  assert.equal(stage.scrollTop, 0);
  assert.equal(modal.scrollTop, 0);
  assert.equal(content.scrollTop, 0);
  assert.equal(watched, 1);
});

test("next, back and voice steps call the scroll reset after rendering", () => {
  const card = setup();
  card._detail = { slug: "p", recipeInstructions: [{ text: "a" }, { text: "b" }, { text: "c" }] };
  const order = [];
  card._render = () => order.push("render");
  card._resetCookScroll = () => order.push("reset");
  card._cookIndex = 1;
  card._handleClick({
    target: { closest: () => ({ dataset: { action: "cook-next" } }) },
    preventDefault() {},
  });
  card._handleClick({
    target: { closest: () => ({ dataset: { action: "cook-back" } }) },
    preventDefault() {},
  });
  card._voiceStep(1);
  assert.deepEqual(order.slice(0, 6), ["render", "reset", "render", "reset", "render", "reset"]);
});
