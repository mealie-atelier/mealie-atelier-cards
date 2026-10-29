import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function setup(callWS = async () => ({})) {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } });
  const card = makeCard(cards, { hass: { language: "en", callWS } });
  card._render = () => {};
  const flashes = [];
  card._flash = (text, kind) => flashes.push({ text, kind });
  return { card, flashes };
}
const click = (card, action, value = "") => {
  const button = { dataset: { action, value }, disabled: false, closest: () => button };
  return card._handleClick({ target: { closest: () => button }, preventDefault() {} });
};

test("removing a finished server-armed timer works without calling alarm_cancel", async () => {
  const calls = [];
  const { card } = setup(async (msg) => calls.push(msg.type));
  card._ws = async (op) => {
    calls.push(op);
    throw new Error("The kitchen timer has already been dispatched");
  };
  card._timers = [
    { id: "t1", label: "x", deadline: Date.now() - 5000, done: true, serverArmed: true },
  ];
  await click(card, "timer-remove", "t1");
  assert.equal(card._timers.length, 0);
  assert.deepEqual(calls, []);
});

test("an invalid timer duration explains the allowed range", async () => {
  const { card, flashes } = setup();
  for (const value of ["0", "181", "2.5"]) {
    const input = { value, setAttribute() {}, removeAttribute() {}, focus() {} };
    card.shadowRoot.querySelector = (s) => (s === "[data-timer-minutes]" ? input : null);
    await click(card, "timer-start");
  }
  assert.equal(flashes.length, 3);
  assert.match(flashes[0].text, /1 to 180/);
  assert.equal(card._timers.length, 0);
});

test("the timer still runs locally when the server refuses a background alarm", async () => {
  const { card, flashes } = setup();
  card._ws = async () => {
    const err = new Error("No background notification destination");
    err.code = "unknown";
    throw err;
  };
  const input = { value: "5", setAttribute() {}, removeAttribute() {}, focus() {} };
  card.shadowRoot.querySelector = (s) => (s === "[data-timer-minutes]" ? input : null);
  await click(card, "timer-start");
  assert.equal(card._timers.length, 1);
  assert.equal(card._timers[0].serverArmed, undefined);
  assert.equal(flashes.length, 1);
});

test("a timer that runs out raises a visible alert", () => {
  const { card, flashes } = setup();
  card._timers = [{ id: "t", label: "Pasta", deadline: Date.now() - 100, done: false }];
  card._tickTimers();
  assert.equal(card._timers[0].done, true);
  assert.equal(flashes[0].text, "Pasta is done.");
});

test("persisting timers keeps local timers written by another card", () => {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } });
  const a = makeCard(cards);
  const b = makeCard(cards);
  a._timers = [{ id: "a1", label: "A", deadline: Date.now() + 60000 }];
  a._persistTimers();
  b._timers = [];
  b._persistTimers();
  const stored = JSON.parse(cards.storage.get("mealie-atelier:timers") ?? "[]");
  assert.deepEqual(
    stored.map((x) => x.id),
    ["a1"],
  );
});

test("a timer this card removed is not resurrected from storage", () => {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } });
  const a = makeCard(cards);
  a._timers = [{ id: "a1", label: "A", deadline: Date.now() + 60000 }];
  a._persistTimers();
  a._timers = [];
  a._persistTimers();
  const stored = JSON.parse(cards.storage.get("mealie-atelier:timers") ?? "[]");
  assert.deepEqual(stored, []);
});

test("Escape and the close button in cooking mode return to the recipe", async () => {
  const { card } = setup();
  card._detail = { slug: "s", name: "S", recipeInstructions: [{ text: "a" }] };
  card._modal = "cook";
  card._handleKeyDown?.({ key: "Escape", preventDefault() {}, target: {} });
  assert.equal(card._modal, "recipe");
  card._modal = "cook";
  await click(card, "close-modal");
  assert.equal(card._modal, "recipe");
  card._modal = "cook";
  await click(card, "cook-to-recipe");
  assert.equal(card._modal, "recipe");
  await click(card, "close-modal");
  assert.equal(card._modal, null);
});

test("timer cards use the singular for one minute", () => {
  const { card } = setup();
  card._detail = { slug: "s", name: "S", recipeInstructions: [{ text: "a" }, { text: "b" }] };
  card._modal = "cook";
  card._timers = [
    { id: "1", label: "A", deadline: Date.now() + 60000, startedAt: Date.now(), durationMs: 60000 },
    {
      id: "2",
      label: "B",
      deadline: Date.now() + 120000,
      startedAt: Date.now(),
      durationMs: 120000,
    },
  ];
  const html = card._modalHtml();
  assert.match(html, /1 minute</);
  assert.match(html, /2 minutes/);
});

test("recipe detail shows category, notes, tags, source, ingredient groups and full nutrition", () => {
  const { card } = setup();
  card._detail = {
    slug: "s",
    name: "S",
    description: "See https://example.org/a.",
    recipeCategory: [{ name: "Mains" }],
    tags: [{ name: "Quick" }],
    orgURL: "https://example.org/src",
    notes: [{ title: "Tip", text: "Salt well" }],
    recipeIngredient: [
      { display: "1 potato", title: "Puree" },
      { display: "2 eggs", title: "Puree" },
      { display: "salt", title: "Sauce" },
    ],
    recipeInstructions: [{ text: "a" }],
    nutrition: { calories: "612", fiberContent: "5", sugarContent: "3", sodiumContent: "400" },
  };
  card._modal = "recipe";
  const html = card._modalHtml();
  assert.match(html, /<div class="eyebrow">Mains<\/div>/);
  assert.match(html, /Salt well/);
  assert.match(html, /Quick/);
  assert.match(
    html,
    /href="https:\/\/example\.org\/src" target="_blank" rel="noopener noreferrer"/,
  );
  assert.equal((html.match(/<h4 class="step-section">(Puree|Sauce)/g) || []).length, 2);
  assert.match(html, /<strong>612 kcal<\/strong>/);
  assert.match(html, /Fiber 5/);
  assert.match(html, /Sugar 3/);
  assert.match(html, /Sodium 400 mg/);
  assert.match(html, /<a href="https:\/\/example\.org\/a" target="_blank"/);
});
