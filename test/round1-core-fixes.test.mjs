import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function setup(lang = "en") {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: lang, callWS: async () => ({}) } });
  card._data = { recipes: { total: 1, items: [] } };
  return { cards, card };
}
const flashes = (card) => {
  const out = [];
  card._flash = (text, kind) => out.push({ text, kind });
  return out;
};

test("raw error messages get a closing period so the follow-up sentence reads cleanly", () => {
  const { card } = setup();
  assert.equal(card._errorSentence(new Error("HTTP 500")), "HTTP 500.");
  assert.equal(card._errorSentence(new Error("Already done.")), "Already done.");
  const out = flashes(card);
  card._ws = async () => {
    throw new Error("Missing CSRF protection header");
  };
  return card
    ._mutate("shopping_add", { name: "x" }, "none", () => () => {})
    .then(() => {
      assert.match(out[0].text, /Missing CSRF protection header\. Your change was undone\./);
    });
});

test("a failed recipe import never claims a rollback and explains the URL", async () => {
  const { card } = setup();
  const out = flashes(card);
  card._ws = async () => {
    const err = new Error("bad");
    err.code = "invalid_request";
    throw err;
  };
  await card._mutate("recipe_import", { url: "http://127.0.0.1:1/x" }, "all");
  assert.match(out[0].text, /could not be imported/);
  assert.doesNotMatch(out[0].text, /undone/);
});

test("a mutation without optimistic change does not claim to undo anything", async () => {
  const { card } = setup();
  const out = flashes(card);
  card._ws = async () => {
    throw new Error("Nope");
  };
  await card._mutate("recipe_create", { name: "x" }, "all");
  assert.equal(out[0].text, "Could not save: Nope.");
});

test("a network failure on load shows the translated offline text and marks the load failed", async () => {
  const { card } = setup();
  card._ws = async () => {
    throw new TypeError("Failed to fetch");
  };
  card._data = { recipes: null };
  await card._refresh();
  assert.equal(card._error, card.t("offline"));
  assert.equal(card._loadFailed, true);
  assert.doesNotMatch(card._recipes(), /notice/);
});

test("command results use a translated label and singular forms", () => {
  const { card } = setup();
  card._commandResults = [{ recipe: { slug: "a", name: "Pasta" }, match: "recipe" }];
  card._commandTotal = 1;
  const html = card._commandResultsMarkup();
  assert.match(html, /aria-label="Open Pasta"/);
  assert.match(html, /1 result</);
  assert.match(html, /See the result/);
  card._commandTotal = 3;
  assert.match(card._commandResultsMarkup(), /3 results/);
  const de = setup("de").card;
  de._commandResults = card._commandResults;
  de._commandTotal = 1;
  assert.match(de._commandResultsMarkup(), /aria-label="Pasta öffnen"/);
});

test("Esc with a nested Atelier dialog open leaves the card dialog alone", () => {
  const { card } = setup();
  card._modal = "recipe";
  card.shadowRoot.querySelector = (sel) => (sel.includes("at-premium-dialog") ? {} : null);
  let prevented = false;
  card._handleKeyDown({ key: "Escape", preventDefault: () => (prevented = true) });
  assert.equal(card._modal, "recipe");
  assert.equal(prevented, false);
});

test("command search filters views and actions by label", () => {
  const { card } = setup();
  const mk = (text) => ({
    textContent: text,
    hidden: false,
    toggleAttribute(name, on) {
      this.hidden = on;
    },
  });
  const items = [mk("Meal plan"), mk("Shopping"), mk("Refresh")];
  const block = mk("");
  card.shadowRoot.querySelectorAll = () => items;
  card.shadowRoot.querySelector = () => block;
  assert.equal(card._commandFilterViews("shop"), 1);
  assert.deepEqual(
    items.map((i) => i.hidden),
    [true, false, true],
  );
  assert.equal(block.hidden, false);
  assert.equal(card._commandFilterViews("zzz"), 0);
  assert.equal(block.hidden, true);
  assert.equal(card._commandFilterViews(""), 3);
});

test("the Verwalten section no longer shows the admin warning to admins", () => {
  const { card } = setup();
  card._view = "manage";
  card._data = { recipes: { total: 1, items: [] } };
  assert.doesNotMatch(card._body(), /requires a Home Assistant admin/);
});

test("a missing provider shows a setup state without actions or retry", () => {
  const { cards, card } = setup();
  card._error = "Mealie Atelier is not set up yet.";
  card._errorCode = "not_configured";
  card._data = { recipes: null };
  card._render();
  assert.match(cards.document.markup, /\/config\/integrations/);
  assert.match(cards.document.markup, /Check again/);
  assert.doesNotMatch(cards.document.markup, /Try again|class="hero"|statline/);
});

test("an empty library gets onboarding copy, no hero plan button and a distinct hero line", () => {
  const { card } = setup();
  card._view = "dashboard";
  card._data = { recipes: { total: 0, items: [] }, mealplan: [], shopping: { items: [] } };
  const html = card._body();
  assert.match(html, /has no recipes yet/);
  assert.doesNotMatch(card._hero(), /<button/);
  assert.doesNotMatch(card._hero(), /Your kitchen, reimagined/);
});

test("a not_configured rejection on the default provider reaches the setup state", async () => {
  const { card } = setup();
  card._config = { ...card._config, provider: "auto" };
  card._ws = async () => {
    const err = new Error("Mealie Atelier is not set up yet.");
    err.code = "not_configured";
    throw err;
  };
  card._data = { recipes: null };
  await card._refresh();
  assert.equal(card._errorCode, "not_configured");
  assert.equal(card._setupMissing, true);
});

test("a partial network failure marks the load failed with the offline text", async () => {
  const { card } = setup();
  card._ws = async (type) => {
    if (type === "shopping") return { lists: [], items: [] };
    throw new TypeError("Failed to fetch");
  };
  card._data = { recipes: null };
  await card._refresh();
  assert.equal(card._error, card.t("offline"));
  assert.equal(card._loadFailed, true);
});

test("a programming TypeError is not reported as offline", () => {
  const { card } = setup();
  assert.equal(card._isNetworkFailure(new TypeError("x is not a function")), false);
  assert.equal(card._isNetworkFailure(new TypeError("Failed to fetch")), true);
});
