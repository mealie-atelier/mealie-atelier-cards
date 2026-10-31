import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function setup() {
  const card = makeCard(loadCards(), { hass: { language: "en", callWS: async () => ({}) } });
  Object.defineProperty(card, "_permissions", { value: { can_write: true, features: {} } });
  return card;
}

test("a failed shopping load without lists shows the load-failed notice and no actions", () => {
  const card = setup();
  card._data = { shopping: null };
  card._failedParts = new Set(["shopping"]);
  const html = card._shopping();
  assert.match(html, /notice load-failed" role="status"/);
  assert.ok(html.includes(card.t("offline")));
  assert.doesNotMatch(html, /create-list-form/);
  assert.doesNotMatch(html, /toolbar/);
});

test("a successful empty shopping load keeps the create-list action", () => {
  const card = setup();
  card._data = { shopping: { lists: [], items: [] } };
  card._failedParts = new Set();
  const html = card._shopping();
  assert.match(html, /create-list-form/);
  assert.doesNotMatch(html, /load-failed/);
});
