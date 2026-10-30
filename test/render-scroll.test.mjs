import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

/** A card whose previous ha-card is swapped while the page reports the given card tops. */
function swappingCard(tops) {
  const cards = loadCards();
  const scrolled = [];
  cards.document.scrollingElement = { scrollBy: (x, y) => scrolled.push([x, y]) };
  const card = makeCard(cards);
  const queue = [...tops];
  card.getBoundingClientRect = () => ({ top: queue.shift() });
  const root = card.shadowRoot;
  const query = root.querySelector;
  root.querySelector = (selector) =>
    selector === "ha-card" ? { replaceWith() {} } : query(selector);
  return { card, scrolled };
}

test("a re-render that shifts the page is scrolled back so the card stays in place", () => {
  // WebKit re-anchors after the swap and jumps the page down by the card's height.
  const { card, scrolled } = swappingCard([120, -742]);
  card._render();
  assert.deepEqual(scrolled, [[0, -862]]);
});

test("a re-render that keeps the card in place does not scroll", () => {
  const { card, scrolled } = swappingCard([120, 120.5]);
  card._render();
  assert.deepEqual(scrolled, []);
});

test("a card that fills a panel view runs edge to edge, elsewhere it keeps its frame", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._render();
  assert.doesNotMatch(cards.document.markup, /class="atelier [^"]*\bpanel\b/);
  card.layout = "panel";
  assert.match(cards.document.markup, /class="atelier [^"]*\bpanel\b/);
});

test("re-rendering an open dialog does not replay the backdrop or heading enter animation", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = {
    slug: "gnocchi",
    name: "Gnocchi",
    recipeInstructions: [{ text: "a" }, { text: "b" }],
  };
  card._modal = "cook";
  card._render();
  assert.match(cards.document.markup, /class="modal-backdrop"/);
  card._cookIndex = 1;
  card._render();
  assert.match(cards.document.markup, /class="modal-backdrop modal-stable"/);
  assert.match(cards.document.markup, /class="modal modal-stable /);
});

test("the first open of a dialog still animates, also right after another dialog", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = { slug: "g", name: "G", recipeInstructions: [{ text: "a" }, { text: "b" }] };
  card._modal = "loading";
  card._render();
  card._modal = "cook";
  card._render();
  assert.match(cards.document.markup, /class="modal-backdrop"/);
  assert.doesNotMatch(cards.document.markup, /modal-stable/);
});

test("the stable marker really switches off the backdrop and step heading animations", () => {
  const css = readFileSync(new URL("../src/design-system/motion.css", import.meta.url), "utf8");
  const block = css.match(/[^{}]*\.modal-stable[^{}]*\{[^}]*\}/g).join("\n");
  for (const selector of [
    ".atelier .modal.modal-stable",
    ".atelier .modal-backdrop.modal-stable",
    ".atelier .modal-stable .cook-stage h2",
  ])
    assert.ok(block.includes(selector), selector);
  assert.match(block, /animation:\s*none\s*!important/);
});

test("stepping keeps the progress bar growing from its previous width", () => {
  const cards = loadCards({
    globals: {
      getComputedStyle: () => ({ transitionDuration: "0.48s", transitionTimingFunction: "ease" }),
    },
  });
  const card = makeCard(cards);
  const animations = [];
  const fill = {
    style: { width: "50%" },
    animate: (frames, options) => animations.push({ frames, options }),
  };
  card.shadowRoot.querySelector = (s) => (s === ".cook-fill" ? fill : null);
  card._keepCookingMotionContinuous("25%");
  assert.equal(animations.length, 1);
  assert.equal(JSON.stringify(animations[0].frames), '[{"width":"25%"},{"width":"50%"}]');
  assert.equal(animations[0].options.duration, 480);
});
