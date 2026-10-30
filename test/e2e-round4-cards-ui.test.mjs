import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const locale = (name) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8"));
const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("setConfig rejects an unknown mode, theme and non-positive columns with a clear message", () => {
  const card = makeCard(loadCards());
  assert.throws(
    () => card.setConfig({ type: "custom:mealie-atelier-card", mode: "bogus" }),
    /Invalid option mode: 'bogus'\. Allowed: dashboard, .*recipes/,
  );
  assert.throws(
    () => card.setConfig({ type: "custom:mealie-atelier-card", theme: "purple" }),
    /Invalid option theme: 'purple'\. Allowed: auto, light, dark/,
  );
  for (const columns of [-3, 0, 1.5, "abc"])
    assert.throws(
      () => card.setConfig({ type: "custom:mealie-atelier-card", columns }),
      /Invalid option columns/,
    );
  card.setConfig({
    type: "custom:mealie-atelier-card",
    mode: "recipes",
    theme: "dark",
    columns: 4,
  });
  assert.equal(card._view, "recipes");
});

const journalCard = (entry) => {
  const card = makeCard(loadCards());
  card._data = { recipes: [] };
  card._journal = { soup: entry };
  card._detail = { slug: "soup", name: "Soup", recipeInstructions: [{ text: "Stir" }] };
  card._modal = "recipe";
  return card;
};

test("the recipe dialog shows the saved rating and favorite mark, not only the note", () => {
  const card = journalCard({ note: "", rating: 4, favorite: true });
  const html = card._modalHtml();
  assert.match(html, /class="journal-rating"[^>]*>★★★★ 4\/5/);
  assert.match(html, /class="journal-favorite">Favorite recipe/);
  const plain = journalCard({ note: "", rating: 0, favorite: false });
  assert.doesNotMatch(plain._modalHtml(), /journal-hint/);
  for (const lang of ["de", "en"]) assert.ok(locale(lang).journalFavoriteChip);
});

test("every cooking tool button carries an icon", () => {
  const line = source("studio-ui.js")
    .split("\n")
    .find((l) => l.includes('class="studio-cook-tools"'));
  const buttons = [
    ...line.matchAll(/<button class="btn" data-action="studio-[^"]+">([^<]*(?:<[^b][^>]*>)?)/g),
  ];
  assert.ok(buttons.length >= 3);
  for (const [, inner] of buttons) assert.match(inner, /^\$\{icon\(/);
});

test("the closed version history toggle differs from the section heading", () => {
  assert.match(source("components/recipe-editor.js"), /"editorHistoryHide" : "editorHistoryShow"/);
  for (const lang of ["de", "en"]) {
    const l = locale(lang);
    assert.ok(l.editorHistoryShow);
    assert.notEqual(l.editorHistoryShow, l.editorHistory);
  }
});

test("an invalid timer duration is explained inside the cooking dialog", async () => {
  const card = makeCard(loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } }));
  card._render = () => {};
  card._flash = () => {};
  const input = {
    value: "0",
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    removeAttribute(k) {
      delete this.attrs[k];
    },
    focus() {},
  };
  card.shadowRoot.querySelector = (s) => (s === "[data-timer-minutes]" ? input : null);
  const button = { dataset: { action: "timer-start" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(card._timerError, "Enter a whole number of minutes from 1 to 180.");
  card._detail = { slug: "soup", name: "Soup", recipeInstructions: [{ text: "Stir" }] };
  card._modal = "cook";
  const html = card._modalHtml();
  assert.match(
    html,
    /<p class="cook-timer-error" role="alert" id="cook-timer-err">Enter a whole number/,
  );
  assert.match(
    html,
    /data-timer-minutes[^>]*aria-invalid="true" aria-describedby="cook-timer-err"/,
  );
  card._clearTimerError();
  assert.equal(card._timerError, "");
});
