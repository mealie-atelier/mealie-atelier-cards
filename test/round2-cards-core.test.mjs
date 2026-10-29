import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function printed(kind, language) {
  const written = [];
  const popup = {
    document: {
      write: (html) => written.push(html),
      open() {},
      close() {},
      getElementById: () => null,
    },
    focus() {},
  };
  const cards = loadCards({ window: { open: () => popup } });
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
  card._data.shopping = { lists: [{ id: "l1", name: "Market" }], items: [] };
  card._data.mealplan = [];
  card._activeList = "l1";
  card._printKind = kind;
  card._print();
  return written.join("");
}

test("theme auto follows the Home Assistant light or dark mode", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", themes: { darkMode: false }, callWS: async () => ({}) },
  });
  card._render();
  assert.match(cards.document.markup, /class="atelier light /);
  card.hass = { language: "en", themes: { darkMode: true }, callWS: async () => ({}) };
  assert.match(cards.document.markup, /class="atelier dark /);
  card._setDesign("theme", "light");
  assert.match(cards.document.markup, /class="atelier light /);
});

test("light theme names and paints the default accent swatch plum", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._design.theme;
  card._local = { theme: "light" };
  card._modal = "settings";
  const html = card._modalHtml();
  const swatch = html.match(/<button class="swatch chosen"[^>]*>/)[0];
  assert.match(swatch, /background:#75465d/);
  assert.match(swatch, /Plum/);
  assert.doesNotMatch(swatch, /Sage/);
});

test("print masthead is translated, notes heading fits the kind, week range uses an en dash", () => {
  const de = printed("mealplan", "de");
  assert.match(de, /KÜCHENSTUDIO · DRUCKAUSGABE/);
  assert.doesNotMatch(de, /PRINT EDITION|letzten Mal/);
  assert.doesNotMatch(de, /\d — /);
  assert.match(de, /<h2>Notizen<\/h2>/);
  assert.match(de, /atelier-credit a\{[^}]*color:inherit/);
  assert.match(printed("mealplan", "en"), /KITCHEN STUDIO · PRINT EDITION/);
});

test("German sidebar and dialogs carry no hardcoded English labels", () => {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card._render();
  assert.match(cards.document.markup, /KÜCHENSTUDIO/);
  assert.match(cards.document.markup, /MENÜ/);
  assert.doesNotMatch(cards.document.markup, />MENU<|>KITCHEN STUDIO</);
  card._modal = "settings";
  assert.match(card._modalHtml(), /ATELIER DESIGNSYSTEM/);
});

test("English view names agree between navigation and card picker", () => {
  const window = { customCards: [] };
  const cards = loadCards({ window });
  const card = makeCard(cards);
  assert.equal(card.t("mealplan"), "Meal plan");
  const names = window.customCards.map((c) => c.name);
  assert.ok(names.includes("Mealie Atelier · Meal plan"));
  assert.ok(names.includes("Mealie Atelier · Complete kitchen"));
  for (const c of window.customCards) assert.doesNotMatch(c.description, /beautiful|polished/);
});

test("the card picker follows the language at access time", () => {
  const window = { customCards: [] };
  const navigator = { language: "en-US" };
  loadCards({ navigator, window });
  const today = window.customCards.find((c) => c.type === "mealie-atelier-today");
  assert.equal(today.name, "Mealie Atelier · Today");
  navigator.language = "de-DE";
  assert.equal(today.name, "Mealie Atelier · Heute");
});

test("Design Studio offers auto and the editor defaults to it without relabelling", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._modal = "settings";
  const html = card._modalHtml();
  assert.match(html, /data-field="theme" data-value="auto" aria-pressed="true"/);
  assert.match(html, /data-value="dark" aria-pressed="false"/);
  card._setDesign("theme", "auto");
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language: "en" };
  editor._wizardMode = false;
  editor.setConfig({ type: "custom:mealie-atelier-card" });
  const markup = editor.shadowRoot.innerHTML;
  assert.match(markup, /<option value="auto"\s+selected\s*>Automatic</);
  assert.doesNotMatch(markup, /not a preset/);
  assert.doesNotMatch(markup, /Evening studio/);
});

test("print document titles are not all caps", () => {
  assert.match(printed("shopping", "de"), /<title>Einkaufsliste<\/title>/);
  assert.match(printed("mealplan", "en"), /<title>Weekly plan<\/title>/);
});
