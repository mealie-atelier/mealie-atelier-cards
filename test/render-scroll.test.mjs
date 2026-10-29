import test from "node:test";
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
