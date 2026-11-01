import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function cookCard() {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card._didLoad = true;
  card._modal = "cook";
  return card;
}

test("a live language change re-renders the card once, an unrelated hass update does not", () => {
  const card = cookCard();
  let renders = 0;
  card._render = () => {
    renders += 1;
  };
  card.hass = { language: "de", callWS: async () => ({}) };
  assert.equal(renders, 0);
  card.hass = { language: "en", callWS: async () => ({}) };
  assert.equal(renders, 1);
  assert.equal(card.t("uiStartTimer"), "Start timer");
});

test("a language change keeps the cook step and timers (state is untouched)", () => {
  const card = cookCard();
  card._render = () => {};
  card._cookIndex = 3;
  card._timers = [{ id: "a", label: "x", deadline: Date.now() + 60000 }];
  card.hass = { language: "en", callWS: async () => ({}) };
  assert.equal(card._cookIndex, 3);
  assert.equal(card._timers.length, 1);
});

test("invalid timer minutes in the cook dialog show the inline alert and no toast", async () => {
  const card = cookCard();
  card._hass = { language: "en", callWS: async () => ({}) };
  let flashes = 0;
  card._flash = () => {
    flashes += 1;
  };
  card._detail = { slug: "p", name: "P", recipeInstructions: [{ text: "Mix" }] };
  const input = { value: "0.5" };
  card.shadowRoot.querySelector = (sel) => (sel === "[data-timer-minutes]" ? input : null);
  const button = { dataset: { action: "timer-start" } };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(card._timerError, "Enter a whole number of minutes from 1 to 180.");
  assert.equal(flashes, 0);
  assert.match(
    card._modalHtml(),
    /<p class="cook-timer-error" role="alert" id="cook-timer-err">Enter a whole number/,
  );
});

test("outside the cook dialog the invalid minutes still toast", () => {
  const src = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  assert.match(
    src,
    /if \(this\._modal === "cook"\) this\._render\(\);\s+else this\._flash\(this\._timerError, "error"\)/,
  );
});
