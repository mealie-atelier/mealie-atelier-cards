import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Enter in the timer label or minutes field presses the start button", () => {
  const card = makeCard(loadCards());
  let clicks = 0;
  const start = { click: () => clicks++ };
  card.shadowRoot.querySelector = (selector) =>
    selector === '[data-action="timer-start"]' ? start : null;
  const key = (key, extra = {}) => ({
    key,
    target: { matches: (s) => /data-timer-label/.test(s) || /data-timer-minutes/.test(s) },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extra,
  });
  const enter = key("Enter");
  card._handleKeyDown(enter);
  assert.equal(clicks, 1);
  assert.equal(enter.defaultPrevented, true);
  card._handleKeyDown(key("Enter", { isComposing: true }));
  card._handleKeyDown(key("a"));
  assert.equal(clicks, 1, "IME composition and other keys do not start the timer");
});

test("Enter in a prompt dialog confirms instead of activating Cancel", async () => {
  const listeners = {};
  const input = {
    value: "Sahne",
    addEventListener: (type, fn) => (listeners[type] = fn),
    focus() {},
  };
  const confirm = { value: "confirm" };
  const dlg = {
    style: { setProperty() {} },
    setAttribute() {},
    addEventListener: (type, fn) => (listeners[`dlg-${type}`] = fn),
    showModal() {},
    remove() {},
    returnValue: "",
    querySelector(selector) {
      if (selector === ".at-prompt-input" || selector === "input") return input;
      if (selector === "form") return form;
      if (selector === 'button[value="confirm"]') return confirm;
      return null;
    },
  };
  const form = {
    requestSubmit(button) {
      dlg.returnValue = button.value;
      listeners["dlg-close"]();
    },
  };
  const cards = loadCards({
    document: { createElement: () => dlg, visibilityState: "visible", addEventListener() {} },
  });
  const card = makeCard(cards);
  const result = card._atelierDialog({ kind: "prompt", title: "Replace" });
  let prevented = false;
  listeners.keydown({ key: "Enter", isComposing: false, preventDefault: () => (prevented = true) });
  assert.equal(prevented, true);
  assert.equal(await result, "Sahne");
});

test("a finished shared timer in cooking mode shows READY and a remove button", () => {
  const card = makeCard(loadCards());
  const done = { id: "t1", name: "Pan", deadline: Date.now() - 1000 };
  const running = { id: "t2", name: "Oven", deadline: Date.now() + 600000 };
  const html = card._sharedTimerCard(done);
  assert.match(html, /is-done/);
  assert.match(html, /READY/);
  assert.match(html, /00:00/);
  assert.match(html, /data-action="studio-timer-remove" data-id="t1"/);
  const live = card._sharedTimerCard(running);
  assert.doesNotMatch(live, /is-done/);
  assert.match(live, /RUNNING/);
  card._kidView = true;
  assert.doesNotMatch(card._sharedTimerCard(done), /studio-timer-remove/);
});

test("the editor heading is sentence case in English and German", () => {
  for (const [language, expected] of [
    ["en", "Recipe name &amp; description"],
    ["de", "Rezeptname &amp; Beschreibung"],
  ]) {
    const card = makeCard(loadCards(), { hass: { language, callWS: async () => ({}) } });
    assert.equal(card.t("editorNameAndDescription").replace("&", "&amp;"), expected);
  }
  assert.match(
    read("src/components/dialogs.js"),
    /<h3>\$\{esc\(this\.t\("editorNameAndDescription"\)\)\}<\/h3>/,
  );
});

test("light theme error text uses the themed danger token everywhere", () => {
  for (const file of ["foundation.css", "recipe-editor.css", "recipe-picker.css"])
    assert.doesNotMatch(read(`src/design-system/${file}`), /#f6b6a4/i, file);
  assert.match(
    read("src/design-system/tokens.css"),
    /\.atelier\.light \{[^}]*--at-danger: #8f2f1d/,
  );
});

test("a recipe search without a match names the search, an empty library keeps its own text", () => {
  const card = makeCard(loadCards(), { hass: { language: "de", callWS: async () => ({}) } });
  card._data.recipes = { items: [], total: 0 };
  card._query = "xyzzy";
  assert.match(card._recipes(), /Keine Rezepte zu „xyzzy“ gefunden\./);
  card._query = "";
  assert.match(card._recipes(), /In deinem Mealie gibt es noch keine Rezepte/);
  assert.equal(card.t("noRecipes"), "Keine Rezepte gefunden.");
});

test("a typed shopping note keeps its leading 1, a folded quantity is dropped", () => {
  const card = makeCard(loadCards());
  assert.equal(
    card._shoppingLabel({ note: "1 Zwiebel, in Streifen", quantity: 1 }),
    "1 Zwiebel, in Streifen",
  );
  assert.equal(
    card._shoppingLabel({ display: "1 Zwiebel", note: "Zwiebel", quantity: 1 }),
    "Zwiebel",
  );
  assert.equal(card._shoppingLabel({ display: "2 Eier", note: "Eier", quantity: 2 }), "2 Eier");
});

test("the picker filter fields span the dialog and share the form row gap", () => {
  const css = read("src/design-system/recipe-picker.css");
  assert.match(css, /\.picker-filter-row > \.field \{[^}]*flex: 1 1 100%;[^}]*margin: 0;/);
  assert.match(css, /\.atelier \.picker \{[^}]*gap: var\(--ds-space-4\)/);
  assert.match(css, /\.picker-filters \{[^}]*gap: var\(--ds-space-4\)/);
});

test("the shared family step stops at the last step of the recipe", async () => {
  const writes = [];
  const card = makeCard(loadCards());
  const session = {
    id: "s1",
    slug: "pancakes",
    name: "Pancakes",
    step: 2,
    started: "2030-01-01T00:00:00Z",
    tasks: [],
    timers: [],
  };
  card._studio = { revision: 1, family: { members: [], session }, journal: {} };
  card._ws = async () => ({
    slug: "pancakes",
    recipeInstructions: [{ text: "a" }, { text: "b" }, { text: "c" }],
  });
  card._studioWrite = async (action, payload) => writes.push([action, payload]);
  card._render = () => {};
  const next = { dataset: { action: "studio-session-next" }, closest: () => next };
  await card._handleClick({ target: { closest: () => next }, preventDefault() {} });
  assert.deepEqual(
    JSON.parse(JSON.stringify(writes)),
    [],
    "already on the last step, nothing is sent",
  );
  assert.match(card._studioFamily(), /Shared step 3 of 3/);
  assert.match(card._studioFamily(), /data-action="studio-session-next" disabled/);
  session.step = 1;
  await card._handleClick({ target: { closest: () => next }, preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [
    ["session_step", { session_id: "s1", step: 2 }],
  ]);
  session.step = 7;
  assert.match(
    card._studioFamily(),
    /Shared step 3 of 3/,
    "a stale step beyond the end shows the last step",
  );
});
