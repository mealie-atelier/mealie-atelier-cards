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
