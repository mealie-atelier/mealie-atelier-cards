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

test("removing a finished server-armed timer still tries to cancel and drops it when already dispatched", async () => {
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
  assert.deepEqual(calls, ["alarm_cancel"]);
});

test("removing a timer the server no longer knows or has just started sending drops it", async () => {
  for (const [error, offset] of [
    [Object.assign(new Error("Timer not found"), { code: "timer_not_found" }), 600000],
    [new Error("busy"), 20000],
  ]) {
    const { card, flashes } = setup();
    card._ws = async () => {
      throw error;
    };
    card._timers = [{ id: "t1", label: "x", deadline: Date.now() + offset, serverArmed: true }];
    await click(card, "timer-remove", "t1");
    assert.equal(card._timers.length, 0);
    assert.equal(flashes.length, 0);
  }
});

test("a failed cancel of a running timer keeps it and reports the error", async () => {
  const { card, flashes } = setup();
  card._ws = async () => {
    throw new Error("offline");
  };
  card._timers = [{ id: "t1", label: "x", deadline: Date.now() + 600000, serverArmed: true }];
  await click(card, "timer-remove", "t1");
  assert.equal(card._timers.length, 1);
  assert.equal(flashes[0].kind, "error");
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

test("an invalid duration marks and focuses the re-rendered input and keeps the typed value", async () => {
  const { card } = setup();
  const make = (value) => {
    const attrs = {};
    return {
      value,
      attrs,
      focused: false,
      setAttribute: (k, v) => (attrs[k] = v),
      removeAttribute() {},
      focus() {
        this.focused = true;
      },
    };
  };
  let current = make("181");
  const label = { value: "Pasta" };
  card.shadowRoot.querySelector = (s) =>
    s === "[data-timer-minutes]" ? current : s === "[data-timer-label]" ? label : null;
  // A flash re-renders the card: the old input is detached and a fresh one carries the default value.
  card._flash = () => {
    current = make("10");
  };
  const old = current;
  await click(card, "timer-start");
  assert.equal(old.attrs["aria-invalid"], undefined);
  assert.equal(current.attrs["aria-invalid"], "true");
  assert.equal(current.focused, true);
  assert.equal(current.value, "181");
});

test("the audio context is created inside the start click", async () => {
  let created = 0;
  const cards = loadCards({
    globals: {
      crypto: { randomUUID: () => "id-1" },
      AudioContext: class {
        constructor() {
          created++;
        }
        resume() {}
      },
    },
  });
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  card._render = () => {};
  card._flash = () => {};
  const input = { value: "5", setAttribute() {}, removeAttribute() {}, focus() {} };
  card.shadowRoot.querySelector = (s) => (s === "[data-timer-minutes]" ? input : null);
  await click(card, "timer-start");
  assert.equal(created, 1);
});

test("a late tick still alerts a timer that ran out while the card was open", () => {
  const { card, flashes } = setup();
  card._timers = [{ id: "t", label: "Pasta", deadline: Date.now() - 90000, done: false }];
  card._timerWatchSince = Date.now() - 300000;
  card._tickTimers();
  assert.equal(flashes.length, 1);
});

test("a timer that expired before the card existed does not alert", () => {
  const { card, flashes } = setup();
  card._timers = [{ id: "t", label: "Pasta", deadline: Date.now() - 90000, done: false }];
  card._tickTimers();
  assert.equal(flashes.length, 0);
});

test("a timer alerts once even when two cards hold it", () => {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } });
  const t = { id: "x", label: "Pasta", deadline: Date.now() - 100, done: false };
  cards.storage.set("mealie-atelier:timers", JSON.stringify([t]));
  const a = makeCard(cards);
  const b = makeCard(cards);
  let flashes = 0;
  for (const card of [a, b]) {
    card._render = () => {};
    card._flash = () => flashes++;
    card._tickTimers();
  }
  assert.equal(flashes, 1);
});

test("a timer removed in one card does not come back from another card", () => {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } });
  const t = { id: "x", label: "Pasta", deadline: Date.now() + 600000 };
  cards.storage.set("mealie-atelier:timers", JSON.stringify([t]));
  const a = makeCard(cards);
  const b = makeCard(cards);
  a._timers = [];
  a._persistTimers();
  b._persistTimers();
  assert.deepEqual(JSON.parse(cards.storage.get("mealie-atelier:timers")), []);
  assert.equal(b._timers.length, 0);
});

test("a refused background alarm without a known code shows the translated local notice", async () => {
  const { card, flashes } = setup();
  card._ws = async () => {
    throw new Error("No background notification destination. Configure Home Assistant notify.");
  };
  const input = { value: "5", setAttribute() {}, removeAttribute() {}, focus() {} };
  card.shadowRoot.querySelector = (s) => (s === "[data-timer-minutes]" ? input : null);
  await click(card, "timer-start");
  assert.equal(card._timers.length, 1);
  assert.equal(flashes[0].text, "The timer runs on this device only.");
});

test("a URL in quotes is linked without the quote", () => {
  const { card } = setup();
  card._detail = {
    slug: "s",
    name: "S",
    description: 'See "https://example.org/a" and https://example.org/b?x=1&y=2.',
    recipeInstructions: [{ text: "a" }],
  };
  card._modal = "recipe";
  const html = card._modalHtml();
  assert.match(
    html,
    /<a href="https:\/\/example\.org\/a" target="_blank"[^>]*>https:\/\/example\.org\/a<\/a>&quot;/,
  );
  assert.match(html, /href="https:\/\/example\.org\/b\?x=1&amp;y=2"/);
});

test("a URL in the cooking step text is linked", () => {
  const { card } = setup();
  card._detail = {
    slug: "s",
    name: "S",
    recipeInstructions: [{ text: "Watch https://example.org/v now" }],
  };
  card._modal = "cook";
  card._cookIndex = 0;
  assert.match(
    card._modalHtml(),
    /<a href="https:\/\/example\.org\/v" target="_blank" rel="noopener noreferrer">/,
  );
});
