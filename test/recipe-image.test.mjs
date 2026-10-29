import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const tile = (id, image, sig) => ({
  id,
  slug: id,
  name: id,
  image,
  imageUrl: `/api/mealie_atelier/image/e1/${id}?authSig=${sig}`,
});

function render(cards, card, recipes) {
  card._data.recipes = { items: recipes };
  card._render();
  return [...cards.document.markup.matchAll(/<img class="[^"]*" src="([^"]*)"/g)].map((m) => m[1]);
}

test("a re-render keeps the first signed photo URL so the browser cache is reused", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._view = "recipes";
  const first = render(cards, card, [tile("soup", "aaaa", "one")]);
  const again = render(cards, card, [tile("soup", "aaaa", "two")]);
  assert.deepEqual(first, ["/api/mealie_atelier/image/e1/soup?authSig=one"]);
  assert.deepEqual(again, first);
});

test("a new photo for the same recipe gets its fresh signed URL", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._view = "recipes";
  render(cards, card, [tile("stew", "aaaa", "one")]);
  const changed = render(cards, card, [tile("stew", "bbbb", "two")]);
  assert.deepEqual(changed, ["/api/mealie_atelier/image/e1/stew?authSig=two"]);
});

test("two entries backed by one Mealie keep their own signed photo URLs", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._view = "recipes";
  const other = {
    ...tile("pie", "aaaa", "two"),
    imageUrl: "/api/mealie_atelier/image/e2/pie?authSig=two",
  };
  render(cards, card, [tile("pie", "aaaa", "one")]);
  assert.deepEqual(render(cards, card, [other]), [other.imageUrl]);
});

test("relative demo photo paths render, absolute and traversing URLs do not", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._view = "recipes";
  const photo = (imageUrl) => render(cards, card, [{ ...tile("tart", "", ""), imageUrl }]);
  assert.deepEqual(photo("../photos/lemon-tart.webp"), ["../photos/lemon-tart.webp"]);
  assert.deepEqual(photo("./photos/lemon-tart.webp"), ["./photos/lemon-tart.webp"]);
  assert.deepEqual(photo("https://example.com/photos/lemon-tart.webp"), []);
  assert.deepEqual(photo("../../photos/lemon-tart.webp"), []);
});
