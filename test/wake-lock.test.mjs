import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

// Minimal navigator.wakeLock stand-in that records requests and lets tests fire "release".
function stubWakeLock({ reject = false } = {}) {
  const state = { requests: 0, releases: 0, sentinels: [] };
  const nav = {
    language: "en-US",
    wakeLock: {
      async request(kind) {
        assert.equal(kind, "screen");
        state.requests++;
        if (reject) throw new Error("NotAllowedError");
        const handlers = {};
        const sentinel = {
          released: false,
          addEventListener: (type, fn) => (handlers[type] = fn),
          async release() {
            sentinel.released = true;
            state.releases++;
          },
          fire(type) {
            sentinel.released = true;
            handlers[type]?.();
          },
        };
        state.sentinels.push(sentinel);
        return sentinel;
      },
    },
  };
  return { nav, state };
}

test("wake lock controller acquires, re-acquires after a browser release and releases on demand", async () => {
  const { nav, state } = stubWakeLock();
  const { AtelierWakeLock } = loadCards({ navigator: nav });
  const lock = AtelierWakeLock.create(nav);
  await lock.set(true);
  await lock.set(true);
  assert.equal(state.requests, 1, "repeated set(true) must not stack locks");
  assert.equal(lock.active, true);
  state.sentinels[0].fire("release");
  assert.equal(lock.active, false, "browser release (tab hidden) clears the sentinel");
  await lock.resume();
  assert.equal(state.requests, 2);
  await lock.set(false);
  assert.equal(state.releases, 1);
  assert.equal(lock.active, false);
  await lock.resume();
  assert.equal(state.requests, 2, "no re-acquire once the lock is no longer wanted");
});

test("wake lock is a graceful no-op without the API or when the request is refused", async () => {
  const bare = { language: "en-US" };
  const { AtelierWakeLock } = loadCards({ navigator: bare });
  assert.equal(AtelierWakeLock.supported(bare), false);
  const lock = AtelierWakeLock.create(bare);
  await lock.set(true);
  await lock.resume();
  await lock.set(false);
  assert.equal(lock.active, false);
  const { nav, state } = stubWakeLock({ reject: true });
  const refused = AtelierWakeLock.create(nav);
  await refused.set(true);
  assert.equal(state.requests, 1);
  assert.equal(refused.active, false);
});

function cookCard(nav, language = "en") {
  const cards = loadCards({ navigator: nav });
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
  card._detail = {
    slug: "soup",
    name: "Soup",
    recipeInstructions: [{ text: "Chop." }, { text: "Simmer." }],
    recipeIngredient: [],
  };
  return { cards, card };
}

test("cook mode holds the wake lock while open, re-acquires on visibilitychange and releases on exit", async () => {
  const { nav, state } = stubWakeLock();
  const { cards, card } = cookCard(nav);
  card._didLoad = true;
  card.connectedCallback();
  assert.ok(cards.listeners.has("visibilitychange"));
  card._modal = "cook";
  card._render();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.requests, 1);
  assert.match(cards.document.markup, /data-input="keep-awake" checked/);
  assert.match(cards.document.markup, /Keep screen awake while cooking/);
  // The browser drops the lock when the tab is hidden; returning must take it back.
  state.sentinels[0].fire("release");
  cards.listeners.get("visibilitychange")();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.requests, 2);
  card._modal = "recipe";
  card._render();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.releases, 1, "leaving cook mode releases the lock");
  card.disconnectedCallback();
});

test("the keep-awake toggle is persisted per browser and releases the lock when switched off", async () => {
  const { nav, state } = stubWakeLock();
  const { cards, card } = cookCard(nav, "de");
  card._modal = "cook";
  card._render();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.requests, 1);
  assert.match(cards.document.markup, /Bildschirm beim Kochen anlassen/);
  const input = { dataset: { input: "keep-awake" }, checked: false, hasAttribute: () => false };
  card._handleInput({ target: input });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(card._design.keep_awake, false);
  assert.equal(card._local.keep_awake, false, "stored with the other look settings");
  assert.equal(state.releases, 1);
  assert.doesNotMatch(cards.document.markup, /data-input="keep-awake" checked/);
});

test("cook mode renders without a toggle and without errors when the API is unsupported", async () => {
  const { cards, card } = cookCard({ language: "en-US" });
  card._modal = "cook";
  card._render();
  assert.doesNotMatch(cards.document.markup, /keep-awake/);
});
