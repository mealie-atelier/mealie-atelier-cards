import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const core = readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8");
const Studio = runInNewContext(core + "\nAtelierStudio", {
  Date,
  Intl,
  Number,
  Math,
  String,
  Set,
  Map,
  Array,
  Object,
  RegExp,
  JSON,
  Boolean,
  Error,
});
const template = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
const motion = readFileSync(new URL("../src/design-system/motion.css", import.meta.url), "utf8");

test("ranges scale on both ends and keep their separator", () => {
  assert.equal(Studio.scaleIngredient("2-3 Zweige", 4, 2, "de"), "4-6 Zweige");
  assert.equal(Studio.scaleIngredient("2–3 Zweige", 4, 2, "de"), "4–6 Zweige");
  assert.equal(Studio.scaleIngredient("1 - 2 EL Öl", 3, 2, "de"), "1½ - 3 EL Öl");
  assert.equal(Studio.scaleIngredient("1-2 tbsp oil", 4, 2, "en"), "2-4 tbsp oil");
});

test("a failure toast joins the top layer after the dialogs", () => {
  assert.match(
    template,
    /_raiseModal\(backdrop\);[\s\S]{0,200}querySelectorAll\("\.toast"\)\)\s*this\._raiseModal\(toast\)/,
  );
  assert.match(motion, /\.atelier \.toast\[popover\][^}]*top: auto/);
});

test("a failed import keeps the typed address in the open dialog", async () => {
  class FormData {
    entries() {
      return [["url", "http://127.0.0.1:1/x"]][Symbol.iterator]();
    }
  }
  const card = makeCard(loadCards({ globals: { FormData } }));
  card._modal = "import";
  const field = { value: "" };
  card.shadowRoot.querySelector = (sel) => (sel.includes('data-form="import"') ? field : null);
  card._mutate = async () => false;
  const form = {
    dataset: { form: "import" },
    closest: () => form,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  await card._handleSubmit({ target: form, preventDefault() {} });
  assert.equal(field.value, "http://127.0.0.1:1/x");
});

test("the read-only notice is hidden in an editor or picker preview", () => {
  const render = (preview) => {
    const cards = loadCards();
    const card = makeCard(cards, { permissions: { can_write: false } });
    if (preview) card.preview = true;
    card._body = () => "";
    card._render();
    return cards.document.markup;
  };
  assert.match(render(false), /Read-only/i);
  assert.doesNotMatch(render(true), /Read-only/i);
});

function cookCard(timers) {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = {
    slug: "gnocchi",
    name: "Gnocchi",
    recipeInstructions: [{ text: "Boil" }, { text: "Serve" }],
    recipeIngredient: [],
  };
  card._modal = "cook";
  card._studio = { family: { session: { id: "s1", slug: "gnocchi", step: 0, timers } } };
  return card;
}

test("the timer badge counts running shared timers", () => {
  const card = cookCard([
    { id: "a", label: "Pasta", deadline: Date.now() + 60000 },
    { id: "b", label: "Old", deadline: Date.now() - 1000 },
  ]);
  const html = card._modalHtml();
  const badge = html.match(/cook-timer-count">(\d+)/);
  assert.ok(badge, "badge rendered");
  assert.equal(badge[1], "1");
});

test("moving on or leaving the cooking dialog stops reading aloud", async () => {
  for (const action of [
    "cook-next",
    "cook-back",
    "cook-to-recipe",
    "close-modal",
    "backdrop",
    "cook-finish",
  ]) {
    const cancelled = [];
    const speech = { cancel: () => cancelled.push(1) };
    const cards = loadCards({
      window: { speechSynthesis: speech },
      globals: { speechSynthesis: speech },
    });
    const card = makeCard(cards);
    card._detail = { slug: "g", name: "G", recipeInstructions: [{ text: "a" }, { text: "b" }] };
    card._modal = "cook";
    card._render = () => {};
    card._readSpeaking = true;
    const el = { dataset: { action }, closest: () => el };
    await card
      ._handleClick({ target: el, preventDefault() {}, stopPropagation() {} })
      .catch(() => {});
    assert.equal(card._readSpeaking, false, action);
    assert.ok(cancelled.length > 0, `${action} cancels the speech`);
  }
});

function reauthCard(fromEnv) {
  const card = makeCard(loadCards());
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: { can_admin: true, can_write: true },
        bring: { state: "reauth", account: "", from_env: fromEnv },
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = { shopping: { lists: [] } };
  card._syncData().state = { rules: [], audit: [] };
  card._render = () => {};
  return card;
}

test("a refused env login explains the server environment and hides the disconnect promise", () => {
  const env = reauthCard(true);
  const envHtml = env._bwAccountHtml(env._syncCaps());
  assert.match(envHtml, /BRING_EMAIL/);
  assert.doesNotMatch(envHtml, /bw-privacy/);
  const stored = reauthCard(false);
  const storedHtml = stored._bwAccountHtml(stored._syncCaps());
  assert.doesNotMatch(storedHtml, /BRING_EMAIL/);
  assert.match(storedHtml, /bw-privacy/);
});
