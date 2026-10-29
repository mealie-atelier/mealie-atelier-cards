import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function keyEvent(key, target, extra = {}) {
  const event = {
    key,
    target,
    defaultPrevented: false,
    shiftKey: false,
    composedPath: () => [target],
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...extra,
  };
  return event;
}

test("focus after a render is retried until the element is really focusable", async () => {
  // Home Assistant's ha-card renders its slot asynchronously: the first focus() does nothing.
  const card = makeCard(loadCards());
  const el = { calls: 0 };
  el.focus = () => {
    el.calls++;
    if (el.calls >= 3) card.shadowRoot.activeElement = el;
  };
  card._focusAfterRender(() => el);
  await tick();
  await tick();
  await tick();
  assert.equal(el.calls, 3);
  assert.equal(card.shadowRoot.activeElement, el);
});

test("a newer render cancels the pending focus retries of an older one", async () => {
  const card = makeCard(loadCards());
  const stale = { calls: 0, focus: () => stale.calls++ };
  const fresh = { calls: 0 };
  fresh.focus = () => {
    fresh.calls++;
    card.shadowRoot.activeElement = fresh;
  };
  card._focusAfterRender(() => stale);
  card._focusAfterRender(() => fresh);
  await tick();
  await tick();
  assert.equal(stale.calls, 1);
  assert.equal(fresh.calls, 1);
});

test("the page shortcut opens the palette in Home Assistant while nothing has focus", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callService() {}, callWS: async () => ({}) },
  });
  card.getClientRects = () => [{}];
  card._render = () => {};
  const body = {};
  cards.document.body = body;
  const ev = keyEvent("k", body, { ctrlKey: true });
  card._boundPageKeyDown(ev);
  assert.equal(card._modal, "command");
});

test("the page shortcut leaves a focused element in Home Assistant alone", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callService() {}, callWS: async () => ({}) },
  });
  card.getClientRects = () => [{}];
  card._render = () => {};
  cards.document.body = {};
  card._boundPageKeyDown(keyEvent("k", { tagName: "HOME-ASSISTANT" }, { ctrlKey: true }));
  card._boundPageKeyDown(keyEvent("/", { tagName: "HOME-ASSISTANT" }));
  assert.equal(card._modal, null);
});

test("the page shortcut is registered on connect and removed on disconnect", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._render = () => {};
  card.connectedCallback();
  assert.ok(cards.listeners.has("keydown"));
  card.disconnectedCallback();
  assert.ok(!cards.listeners.has("keydown"));
});

test("Escape closes an open dialog even when focus fell back to the body", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callService() {}, callWS: async () => ({}) },
  });
  card.getClientRects = () => [{}];
  card._render = () => {};
  const body = {};
  cards.document.body = body;
  card._modal = "settings";
  card._boundPageKeyDown(keyEvent("Escape", body));
  assert.equal(card._modal, null);
});

test("Tab pulls focus back into the dialog when it sits outside, and traps at the edges", () => {
  const card = makeCard(loadCards());
  const first = { focused: 0, getClientRects: () => [{}], focus: () => first.focused++ };
  const last = { focused: 0, getClientRects: () => [{}], focus: () => last.focused++ };
  const dialog = {
    contains: (node) => node === first || node === last,
    querySelectorAll: () => [first, last],
  };
  card.shadowRoot.querySelector = (selector) => (selector === '[role="dialog"]' ? dialog : null);
  card._modal = "settings";
  const outside = {};
  const ev = keyEvent("Tab", outside);
  card._handleKeyDown(ev);
  assert.ok(ev.defaultPrevented);
  assert.equal(first.focused, 1);
  const back = keyEvent("Tab", last);
  card._handleKeyDown(back);
  assert.equal(first.focused, 2);
  const shift = keyEvent("Tab", first, { shiftKey: true });
  card._handleKeyDown(shift);
  assert.equal(last.focused, 1);
});
