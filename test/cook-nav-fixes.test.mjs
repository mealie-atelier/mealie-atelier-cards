import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function cookCard(dialogAnswer) {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = { slug: "gnocchi", name: "Gnocchi" };
  card._studio = { family: { session: { slug: "pancakes", name: "Pancakes" } } };
  card._render = () => {};
  const writes = [];
  card._studioWrite = async (op, payload) => writes.push([op, payload]);
  let stale = false;
  card._atelierDialog = async () => {
    // By the time the user answers, the original event has finished dispatching.
    stale = true;
    return dialogAnswer;
  };
  const button = { dataset: { action: "cook-start" }, disabled: false, closest: () => button };
  const target = { closest: () => (stale ? null : button) };
  return { card, writes, target };
}

test("cancelling the replace dialog starts nothing", async () => {
  const { card, writes, target } = cookCard(false);
  await card._handleClick({ target, preventDefault() {} });
  assert.notEqual(card._modal, "cook");
  assert.equal(writes.length, 0);
});

test("choosing to cook here only opens cooking mode and leaves the shared session alone", async () => {
  const { card, writes, target } = cookCard("secondary");
  await card._handleClick({ target, preventDefault() {} });
  assert.equal(card._modal, "cook");
  assert.equal(writes.length, 0);
});

test("confirming the replace dialog opens cooking mode and replaces the shared session", async () => {
  const { card, writes, target } = cookCard(true);
  await card._handleClick({ target, preventDefault() {} });
  assert.equal(card._modal, "cook");
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [
    ["session_start", { slug: "gnocchi", name: "Gnocchi", replace_existing: true }],
  ]);
});

test("a view change scrolls the active tab into the visible rail", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._view = "manage";
  card._lastRenderedView = "recipes";
  const rail = {
    scrollLeft: 0,
    getBoundingClientRect: () => ({ left: 12, right: 378, width: 366 }),
    querySelector: () => ({
      getBoundingClientRect: () => ({
        left: 872 - rail.scrollLeft,
        right: 958 - rail.scrollLeft,
        width: 86,
      }),
    }),
  };
  const root = card.shadowRoot;
  const query = root.querySelector;
  root.querySelector = (selector) => (selector === ".sidebar .nav" ? rail : query(selector));
  card._render();
  assert.ok(rail.scrollLeft > 600, `rail scrolled to ${rail.scrollLeft}`);
});

test("the nav hover tint only applies where hover exists, so touch taps leave no stale tab", () => {
  const css = readFileSync(new URL("../src/design-system/foundation.css", import.meta.url), "utf8");
  assert.match(
    css,
    /@media \(hover: hover\) \{\s*\.atelier \.nav button:hover \{[^}]*background: var\(--at-panel2\)/,
  );
});

test("quick back and next in a shared session keep the newest step", async () => {
  const cards = loadCards();
  const card = makeCard(cards);
  const steps = [{ text: "a" }, { text: "b" }, { text: "c" }];
  // The server keeps the shared session and refuses a write against an older revision.
  const server = { revision: 1, step: 2 };
  const state = () => ({
    revision: server.revision,
    family: { members: [], session: { id: "s1", slug: "gnocchi", step: server.step } },
    journal: {},
  });
  card._detail = { slug: "gnocchi", name: "Gnocchi", recipeInstructions: steps };
  card._modal = "cook";
  card._cookIndex = 2;
  card._studio = state();
  card._render = () => {};
  card.shadowRoot.activeElement = null;
  const sent = [];
  const pending = [];
  card._ws = (type, payload) => {
    if (type === "studio_update")
      return new Promise((resolve, reject) =>
        pending.push(() => {
          if (payload.expected_revision !== server.revision) {
            reject(Object.assign(new Error("conflict"), { code: "conflict" }));
            return;
          }
          sent.push(payload.payload.step);
          server.step = payload.payload.step;
          server.revision += 1;
          resolve(state());
        }),
      );
    if (type === "studio_state") return Promise.resolve(state());
    return Promise.resolve({});
  };
  const click = (action) => {
    const button = { dataset: { action }, disabled: false, closest: () => button };
    return card._handleClick({ target: button, preventDefault() {} });
  };
  const settle = () => new Promise((r) => setTimeout(r, 0));
  // Back, then next while the back step is still on its way to the server.
  const back = click("cook-back");
  await settle();
  const next = click("cook-next");
  await settle();
  assert.equal(card._cookIndex, 2, "local step follows the clicks at once");
  // The server answers one write at a time, as it would over the wire.
  for (let i = 0; i < 10 && pending.length; i++) {
    pending.shift()();
    await settle();
    await settle();
  }
  await Promise.all([back, next]);
  assert.equal(card._cookIndex, 2, "an older answer never moves the dialog back");
  assert.equal(server.step, 2, "the shared session ends on the newest step");
  assert.equal(sent.at(-1), 2);
});

test("a failed shared step write shows the step the session really has", async () => {
  const cards = loadCards();
  const card = makeCard(cards);
  const steps = [{ text: "a" }, { text: "b" }, { text: "c" }];
  const state = () => ({
    revision: 1,
    family: { members: [], session: { id: "s1", slug: "gnocchi", step: 1 } },
    journal: {},
  });
  card._detail = { slug: "gnocchi", name: "Gnocchi", recipeInstructions: steps };
  card._modal = "cook";
  card._cookIndex = 1;
  card._studio = state();
  card._render = () => {};
  card.shadowRoot.activeElement = null;
  card._ws = (type) => {
    if (type === "studio_update")
      return Promise.reject(Object.assign(new Error("offline"), { code: "offline" }));
    if (type === "studio_state") return Promise.resolve(state());
    return Promise.resolve({});
  };
  const button = { dataset: { action: "cook-next" }, disabled: false, closest: () => button };
  await card._handleClick({ target: button, preventDefault() {} });
  assert.equal(card._cookStepSync, null, "the sync guard is released");
  assert.equal(card._cookIndex, 1, "the dialog falls back to the session step");
});
