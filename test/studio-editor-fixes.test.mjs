import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

test("cooking mode renders the Studio tools inside the cook utility section", () => {
  const card = makeCard(loadCards());
  card._detail = {
    slug: "gnocchi",
    name: "Gnocchi",
    recipeInstructions: [{ text: "Boil." }, { text: "Serve." }],
    recipeIngredient: [],
  };
  card._cookStep = 0;
  card._modal = "cook";
  card._studio = {
    family: {
      session: {
        slug: "gnocchi",
        name: "Gnocchi",
        timers: [{ id: "t1", name: "Pasta", deadline: Date.now() + 120000 }],
      },
    },
  };
  const html = card._modalHtml();
  for (const action of ["studio-read-step", "studio-voice-command", "studio-replacement"])
    assert.ok(html.includes(`data-action="${action}"`), action);
  assert.ok(html.includes('data-shared-timer="t1"'));
});

function dialogHarness() {
  const focused = [];
  const makeButton = (value) => ({ value, focus: () => focused.push(value) });
  const buttons = {};
  const dlg = {
    style: { setProperty() {} },
    setAttribute() {},
    addEventListener() {},
    remove() {},
    showModal() {},
    set innerHTML(html) {
      this.html = html;
    },
    querySelector(selector) {
      if (selector === 'button[value="cancel"]') return (buttons.cancel ||= makeButton("cancel"));
      if (selector === ".btn.primary") return (buttons.confirm ||= makeButton("confirm"));
      return null;
    },
  };
  const document = {
    visibilityState: "visible",
    createElement: () => dlg,
    addEventListener() {},
    removeEventListener() {},
  };
  const card = makeCard(loadCards({ document }));
  card.shadowRoot.querySelector = () => null;
  card.shadowRoot.appendChild = () => {};
  return { card, dlg, focused };
}

test("a destructive confirm focuses Cancel and offers a local-only choice", () => {
  const { card, dlg, focused } = dialogHarness();
  card._atelierDialog({ title: "T", body: "B", secondaryLabel: "Only here", focusCancel: true });
  assert.deepEqual(focused, ["cancel"]);
  assert.match(dlg.html, /value="secondary">Only here</);
});

test("a plain confirm still focuses the primary button", () => {
  const { card, focused } = dialogHarness();
  card._atelierDialog({ title: "T", body: "B" });
  assert.deepEqual(focused, ["confirm"]);
});

test("ticking a cookbook recipe updates the localized selection heading", () => {
  const card = makeCard(loadCards());
  const heading = { textContent: "0 recipes selected" };
  card._view = "cookbook";
  card.shadowRoot.querySelector = (sel) =>
    sel === "[data-book-selected-count]" ? heading : { disabled: true };
  const tick = (checked, slug) =>
    card._handleInput({ target: { hasAttribute: () => true, checked, dataset: { book: slug } } });
  tick(true, "a");
  assert.equal(heading.textContent, "1 recipe selected");
  tick(true, "b");
  assert.equal(heading.textContent, "2 recipes selected");
});

test("the cookbook heading carries the live-count hook", () => {
  const card = makeCard(loadCards());
  card._studio = { pantry: [], family: {} };
  card._catalog = [];
  card._bookSelected = new Set();
  assert.match(card._studioCookbook(), /<h2 data-book-selected-count>/);
});

test("a successful system check names each status once and announces the result", () => {
  const card = makeCard(loadCards());
  card._diagnostics = [{ name: "Bridge", ok: true, detail: "" }];
  const html = card._studioDiagnosticsPanel();
  assert.equal(html.match(/Reachable/g).length, 1);
  assert.ok(html.includes("All five connection checks passed."));
  assert.ok(!html.includes("<small>"));
});

test("read-only mode is not blamed on the user's permissions in the sync dialog", () => {
  const card = makeCard(loadCards(), {
    permissions: { can_write: false, can_manage: false, read_only: true },
  });
  card._providerActive = "mealie";
  const html = card._syncSyncHtml();
  assert.ok(html.includes("read-only mode"));
  assert.ok(!html.includes("may view the sync"));
  card._status.entries[0].read_only = false;
  assert.ok(card._syncSyncHtml().includes("may view the sync"));
});

function cookCard(timers) {
  const card = makeCard(loadCards());
  card._detail = {
    slug: "gnocchi",
    name: "Gnocchi",
    recipeInstructions: [{ text: "Boil." }],
    recipeIngredient: [],
  };
  card._cookStep = 0;
  card._modal = "cook";
  card._studio = { family: { session: { slug: "gnocchi", name: "Gnocchi", timers } } };
  return card;
}

test("shared timers replace the empty timer state and the tools open the timer section", () => {
  const html = cookCard([{ id: "t1", name: "Pasta", deadline: Date.now() + 120000 }])._modalHtml();
  assert.ok(html.includes('data-shared-timer="t1"'));
  assert.ok(!html.includes("cook-timers-empty"));
  const section = html.indexOf('<section class="cook-utility"');
  // The tools are the first child of the timer section (see the cooking tools test in cards-design-copy-fixes).
  assert.ok(section >= 0 && html.indexOf('data-action="studio-read-step"') > section);
});

test("the substitute button reports a missing AI key in the card language", async () => {
  const card = makeCard(loadCards(), { hass: { language: "de", callWS: async () => ({}) } });
  card._detail = { slug: "s", name: "Suppe" };
  card._ws = async () => {
    throw new Error("AI is not configured");
  };
  card._atelierDialog = async (opts) => (opts.kind === "prompt" ? "Drachenfrucht" : true);
  const el = { dataset: { action: "studio-replacement" }, disabled: false, closest: () => el };
  await card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
  assert.match(card._aiSwap, /kein KI-Schlüssel/);
  assert.doesNotMatch(card._aiSwap, /not configured/);
});
