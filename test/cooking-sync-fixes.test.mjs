import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function cookCard(session) {
  const cards = loadCards();
  const card = makeCard(cards);
  const steps = ["Mix", "Whisk", "Bake"].map((text) => ({ text }));
  card._detail = { slug: "pancakes", name: "Pancakes", recipeInstructions: steps };
  card._studio = { revision: 4, family: { session } };
  card._ws = async () => ({ revision: 4, family: { session }, journal: {} });
  let renders = 0;
  card._render = () => renders++;
  card._atelierDialog = async () => true;
  return { card, renders: () => renders };
}

test("joining a running shared session opens cooking mode at the shared step", async () => {
  const session = { id: "s1", slug: "pancakes", name: "Pancakes", step: 1, timers: [] };
  const { card } = cookCard(session);
  const button = { dataset: { action: "cook-start" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(card._modal, "cook");
  assert.equal(card._cookIndex, 1);
});

test("a silent poll re-renders when it moves the cooking step, even with an unchanged revision", async () => {
  const session = { id: "s1", slug: "pancakes", name: "Pancakes", step: 2, timers: [] };
  const { card, renders } = cookCard(session);
  card._modal = "cook";
  card._cookIndex = 0;
  await card._studioRefresh({ silent: true });
  assert.equal(card._cookIndex, 2);
  assert.equal(renders(), 1);
  await card._studioRefresh({ silent: true });
  assert.equal(renders(), 1, "nothing changed, nothing re-rendered");
});

test("an open cooking mode in a shared session polls every few seconds, other views stay slow", () => {
  const ticks = [];
  const cards = loadCards({
    globals: { setInterval: (fn, ms) => (ticks.push({ fn, ms }), 1) },
  });
  const card = makeCard(cards);
  card._render = () => {};
  card.connectedCallback();
  card.disconnectedCallback();
  const tick = ticks.find((t) => t.ms === 3000);
  assert.ok(tick, "a short interval is registered");
  let refreshes = 0;
  card._studioRefresh = async () => refreshes++;
  card._view = "recipes";
  card._modal = "cook";
  card._studio = { family: { session: { id: "s1", slug: "pancakes", step: 0, timers: [] } } };
  tick.fn();
  tick.fn();
  tick.fn();
  assert.equal(refreshes, 3, "every tick refreshes while cooking in a shared session");
  refreshes = 0;
  card._modal = "";
  card._view = "family";
  tick.fn();
  tick.fn();
  assert.equal(refreshes, 0, "the family view keeps the slow cadence after a recent poll");
});
