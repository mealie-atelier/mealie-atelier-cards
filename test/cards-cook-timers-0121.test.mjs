import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function cookCard(timers, alarms, { language = "en" } = {}) {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
  const deadline = Date.now() + 60000;
  const session = {
    id: "s1",
    slug: "pancakes",
    name: "Pancakes",
    step: 0,
    timers: timers.map((x) => ({ deadline, name: "Pasta", ...x })),
  };
  card._detail = { slug: "pancakes", name: "Pancakes", recipeInstructions: [{ text: "Mix" }] };
  card._studio = { revision: 1, family: { session } };
  card._modal = "cook";
  card._ws = async (op) => (op === "alarms" ? { alarms } : {});
  card._studioRefresh = async () => {};
  card._render = () => {};
  return { card, cards, session, deadline };
}
const alarm = (id, deadline) => ({ id, label: "Pasta", deadline, status: "scheduled" });
const cards_in = (html) => html.match(/class="cook-timer-card/g)?.length || 0;

test("a shared timer plus its Bridge alarm renders one card and counts once", async () => {
  const { card, deadline } = cookCard([{ id: "t1" }], []);
  card._ws = async (op) => (op === "alarms" ? { alarms: [alarm("t1", deadline)] } : {});
  // Run only the studio layer of the refresh: the core refresh needs a full Mealie backend.
  const refresh = Object.getPrototypeOf(card)._refresh;
  assert.equal(typeof refresh, "function");
  await refresh.call(card);
  assert.equal(card._timers.length, 0);
  assert.equal(card._timers.filter((x) => x.id === "t1").length, 0);
  const html = card._modalHtml();
  assert.equal(cards_in(html), 1);
  assert.match(html, /<span class="cook-timer-count">1 active/);
});

test("an unrelated local alarm still counts next to the shared timer", async () => {
  const { card, deadline } = cookCard([{ id: "t1" }], []);
  card._timers = [{ id: "own", label: "Eggs", deadline, done: false }];
  assert.match(card._modalHtml(), /<span class="cook-timer-count">2 active/);
});

test("the tick badge counts a timer id once", () => {
  const { card, deadline } = cookCard([{ id: "t1" }], []);
  card._timers = [{ id: "t1", label: "Pasta", deadline, done: false, serverArmed: true }];
  const badge = { textContent: "" };
  card.shadowRoot.querySelector = (sel) => (sel === ".cook-timer-count" ? badge : null);
  card._tickTimers();
  assert.equal(badge.textContent, "1 active");
});

test("a finished shared timer shows one READY card", async () => {
  const { card, session } = cookCard([{ id: "t1" }], []);
  session.timers[0].deadline = Date.now() - 1000;
  card._ws = async (op) =>
    op === "alarms" ? { alarms: [alarm("t1", session.timers[0].deadline)] } : {};
  await Object.getPrototypeOf(card)._refresh.call(card);
  assert.equal(cards_in(card._modalHtml()), 1);
});

function toggle(matches) {
  const cards = loadCards({
    globals: { matchMedia: () => ({ matches, addEventListener() {} }) },
  });
  const card = makeCard(cards);
  let focused = 0;
  const input = { focus: () => focused++ };
  const panel = { toggleAttribute() {}, querySelector: () => input };
  const button = {
    dataset: { action: "timer-compose-toggle", value: "" },
    disabled: false,
    closest: (sel) => (sel === ".cook-utility" ? panel : button),
    setAttribute() {},
  };
  card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  return focused;
}

test("opening the timer composer focuses the minutes field only with a fine pointer", () => {
  assert.equal(toggle(true), 1);
  assert.equal(toggle(false), 0);
});

test("opening the timer composer without matchMedia does not focus the field", () => {
  const cards = loadCards({ globals: { matchMedia: undefined } });
  const card = makeCard(cards);
  let focused = 0;
  const panel = { toggleAttribute() {}, querySelector: () => ({ focus: () => focused++ }) };
  const button = {
    dataset: { action: "timer-compose-toggle", value: "" },
    closest: (sel) => (sel === ".cook-utility" ? panel : button),
    setAttribute() {},
  };
  card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(focused, 0);
});

function preset(matches) {
  const cards = loadCards({
    globals: { matchMedia: () => ({ matches, addEventListener() {} }) },
  });
  const card = makeCard(cards);
  let focused = 0;
  const input = { value: "", focus: () => focused++ };
  card.shadowRoot.querySelector = (sel) => (sel === "[data-timer-minutes]" ? input : null);
  card._clearTimerError = () => {};
  const button = {
    dataset: { action: "timer-preset", value: "10" },
    disabled: false,
    closest: () => button,
    setAttribute() {},
  };
  card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  return { focused, value: input.value };
}

test("a timer preset fills the field and focuses it only with a fine pointer", () => {
  assert.deepEqual(preset(true), { focused: 1, value: "10" });
  assert.deepEqual(preset(false), { focused: 0, value: "10" });
});

test("a missing alarm channel shows the neutral local timer notice", async () => {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "t-1" } } });
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  card._modal = null;
  card._persistTimers = () => {};
  card._render = () => {};
  card._ws = async () => {
    throw Object.assign(new Error("No background notification destination."), {
      code: "no_notification_destination",
    });
  };
  const input = { value: "5" };
  card.shadowRoot.querySelector = (sel) => (sel === "[data-timer-minutes]" ? input : null);
  const flashes = [];
  card._flash = (text, kind) => flashes.push([text, kind]);
  card._announceTimer = () => {};
  card._prepareAudio = () => {};
  await card._handleClick({ target: { closest: () => ({ dataset: { action: "timer-start" } }) } });
  assert.deepEqual(flashes, [["The timer runs on this device only.", undefined]]);
});
