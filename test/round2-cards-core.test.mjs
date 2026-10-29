import { readFileSync } from "node:fs";
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

test("theme auto without Home Assistant themes follows prefers-color-scheme", () => {
  for (const [matchesLight, expected] of [
    [true, "light"],
    [false, "dark"],
  ]) {
    const cards = loadCards({ window: { matchMedia: () => ({ matches: matchesLight }) } });
    const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
    assert.equal(card._resolvedTheme("auto"), expected);
  }
});

test("family title and recipe print word are translated", () => {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  assert.equal(card.t("familyTitle"), "Family");
  assert.equal(card.t("printDocRecipe"), "Recipe");
});

test("provider banner eyebrow renders in the provider view", () => {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card._providerActive = "home_assistant";
  card._view = "shopping";
  assert.match(card._body(), /<span class="eyebrow">HOME ASSISTANT MEALIE<\/span>/);
});

test("print studio eyebrow is rendered in the print dialog per language", () => {
  for (const [language, expected] of [
    ["de", "MEALIE ATELIER / DRUCKSTUDIO"],
    ["en", "MEALIE ATELIER / PRINT STUDIO"],
  ]) {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._data.shopping = { lists: [{ id: "l1", name: "Market" }], items: [] };
    card._data.mealplan = [];
    card._activeList = "l1";
    card._printKind = "shopping";
    card._modal = "print";
    assert.ok(card._modalHtml().includes(`<div class="eyebrow">${expected}</div>`));
  }
});

test("wizard automatic preset renders its translated hint", () => {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language: "de" };
  editor._wizardMode = true;
  editor.setConfig({ type: "custom:mealie-atelier-card" });
  editor._step = 2;
  editor._render();
  assert.match(
    editor.shadowRoot.innerHTML,
    /Folgt dem hellen oder dunklen Modus von Home Assistant/,
  );
});

test("editor accent dot and option name show plum in the light theme", () => {
  for (const [darkMode, plum] of [
    [false, true],
    [true, false],
  ]) {
    const cards = loadCards();
    const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
    Object.defineProperty(editor, "isConnected", { value: true });
    editor._hass = { language: "en", themes: { darkMode } };
    editor._wizardMode = false;
    editor.setConfig({ type: "custom:mealie-atelier-card", theme: "auto" });
    const markup = editor.shadowRoot.innerHTML;
    assert.equal(markup.includes("background:#75465d"), plum);
    assert.equal(markup.includes("Plum (default in the light theme)"), plum);
    assert.equal(markup.includes("Sage green"), !plum);
  }
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language: "en", themes: { darkMode: false } };
  editor._wizardMode = false;
  editor.setConfig({ type: "custom:mealie-atelier-card", theme: "dark" });
  assert.ok(!editor.shadowRoot.innerHTML.includes("#75465d"));
});

test("card picker descriptions are parallel in English and German and match the README", () => {
  const source = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const text of [
    "Shopping lists to tick off, add to and edit, also offline",
    "Recipe gallery with search, details and cooking mode",
    "Einkaufslisten zum Abhaken, Ergänzen und Bearbeiten, auch offline",
    "Rezeptgalerie mit Suche, Details und Kochmodus",
  ])
    assert.ok(source.includes(`"${text}"`), text);
  assert.match(readme, /Shopping lists to tick off, add to and edit, also offline/);
  assert.match(readme, /Recipe gallery with search, details and cooking mode/);
});

test("the web app shell follows live system colour scheme changes", () => {
  const html = readFileSync(new URL("../web/public/index.html", import.meta.url), "utf8");
  assert.match(
    html,
    /matchMedia\?\.\("\(prefers-color-scheme: light\)"\)\?\.addEventListener\?\.\("change", \(\) => \{\s*if \(card\._design\.theme === "auto"\) syncShellTheme\("auto"\);/,
  );
});

function coreCard() {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  return card;
}

test("native fallback after a missing bridge clears the setup state and shows the recipes", async () => {
  const card = coreCard();
  card._config = { ...card._config, provider: "auto" };
  card._hass = {
    ...card._hass,
    entities: { "sensor.m": { platform: "mealie", config_entry_id: "e1" } },
    services: { mealie: { get_recipes: {}, get_recipe: {} } },
  };
  card._ws = async () => {
    const err = new Error("not configured");
    err.code = "not_configured";
    throw err;
  };
  card._nativeRecipes = async () => ({ items: [{ slug: "a", name: "Soup" }], total: 1 });
  const events = [];
  card.dispatchEvent = (e) => events.push(e);
  await card._refresh();
  assert.equal(card._providerActive, "home_assistant");
  assert.equal(card._errorCode, "");
  assert.equal(card._setupMissing, false);
  assert.equal(card._loadFailed, false);
  assert.equal(card._failedParts.size, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "config-changed");
  assert.equal(events[0].detail.config.mealie_entry_id, "e1");
});

test("a failed part shows a dash only on its own counter and recovers on reload", async () => {
  const card = coreCard();
  card._data = { recipes: { total: 7, items: [] }, mealplan: [], shopping: { items: [] } };
  card._failedParts = new Set(["mealplan"]);
  const stats = card._stats();
  assert.match(stats, /7/);
  assert.equal((stats.match(/<strong>—/g) || []).length, 1);
  card._ws = async () => [];
  await card._loadMealplan();
  assert.equal(card._failedParts.has("mealplan"), false);
  assert.equal((card._stats().match(/<strong>—/g) || []).length, 0);
});

test("a failed shopping call alone keeps the recipes and the onboarding state", async () => {
  const card = coreCard();
  card._ws = async (type) => {
    if (type === "recipes") return { total: 0, items: [] };
    if (type === "shopping") throw new TypeError("Failed to fetch");
    return [];
  };
  card._data = { recipes: null };
  await card._refresh();
  assert.equal(card._loadFailed, false);
  assert.equal(card._libraryEmpty(), true);
  assert.equal(card._failedParts.has("shopping"), true);
});

test("an import that fails without a code reports the error, not the URL", async () => {
  const card = coreCard();
  const out = [];
  card._flash = (text, kind) => out.push({ text, kind });
  card._ws = async () => {
    throw new Error("HTTP 500");
  };
  await card._mutate("recipe_import", { url: "https://example.com/x" }, "none");
  assert.match(out[0].text, /Import failed: HTTP 500/);
  assert.doesNotMatch(out[0].text, /publicly reachable/);
});

test("the print button only appears when there is something to print", () => {
  const card = coreCard();
  card._view = "shopping";
  card._data = { recipes: { total: 0, items: [] }, shopping: { lists: [], items: [] } };
  assert.equal(card._printable(), false);
  card._data.shopping.items = [{ id: "i", note: "milk", shoppingListId: "l1" }];
  card._activeList = "l1";
  assert.equal(card._printable(), true);
  card._view = "mealplan";
  card._data.mealplan = [];
  assert.equal(card._printable(), false);
});

test("an empty library drops the collection subtitle on the dashboard", () => {
  const card = coreCard();
  card._view = "dashboard";
  card._data = { recipes: { total: 0, items: [] }, mealplan: [], shopping: { items: [] } };
  assert.doesNotMatch(card._body(), /Every recipe from your Mealie/);
  card._data.recipes = { total: 1, items: [{ slug: "a", name: "Soup" }] };
  assert.match(card._body(), /Every recipe from your Mealie/);
});

test("each doc comment in the card template sits directly above the member it describes", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  assert.match(
    src,
    /\/\*\* True when the bridge or built-in Mealie integration is missing altogether\. \*\/\n\s*get _setupMissing\(\)/,
  );
  assert.match(
    src,
    /\/\*\* True when the current view has something worth printing[^\n]*\*\/\n\s*_printable\(\)/,
  );
});

test("shopping label groups sort by name and the done heading reads checked off", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  const items = [
    { id: "1", display: "Milk", label: { name: "Zeta" } },
    { id: "2", display: "Apples", label: { name: "Äpfel" } },
    { id: "3", display: "Bread", label: { name: "Bakery" } },
    { id: "4", display: "Salt", checked: true },
  ];
  const html = card._shoppingRows(items);
  const titles = [...html.matchAll(/shopping-group-title">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(titles, ["Äpfel", "Bakery", "Zeta", "Checked off"]);
});

test("German settings copy matches the English preset wording", () => {
  const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
  assert.equal(de.editorDeepGreenWarmLightEditorial, "Tiefgrün · warmes Licht · großzügig");
});

test("sidebar credit link keeps its padded hit area in flow so the version line cannot cover it", () => {
  const css = readFileSync(new URL("../src/design-system/layout.css", import.meta.url), "utf8");
  const rule = css.match(/\.atelier \.sidebar-footer \.atelier-credit a \{[^}]*\}/)?.[0];
  assert.ok(rule, "sidebar override rule exists");
  assert.match(rule, /margin-block: 0/);
});

test("editor accent dot and option name follow a theme change and ignore invalid accents", () => {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language: "en", themes: { darkMode: false } };
  editor._wizardMode = false;
  editor.setConfig({ type: "custom:mealie-atelier-card", theme: "dark" });
  const change = (theme) => {
    editor._handleChange({
      target: { dataset: { key: "theme" }, type: "select-one", value: theme },
    });
    editor.setConfig({ ...editor._raw });
    return editor.shadowRoot.innerHTML;
  };
  let markup = change("light");
  assert.ok(markup.includes("background:#75465d"));
  assert.ok(markup.includes("Plum (default in the light theme)"));
  markup = change("dark");
  assert.ok(!markup.includes("#75465d"));
  assert.ok(markup.includes("Sage green"));
  editor.setConfig({ type: "custom:mealie-atelier-card", theme: "light", accent: "nonsense" });
  assert.ok(editor.shadowRoot.innerHTML.includes("background:#75465d"));
  assert.ok(!editor.shadowRoot.innerHTML.includes("background:nonsense"));
});

test("the card re-renders when the system colour scheme changes under theme auto", () => {
  let light = false;
  const listeners = new Set();
  const query = {
    get matches() {
      return light;
    },
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  };
  const cards = loadCards({ window: { matchMedia: () => query } });
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  card.connectedCallback();
  try {
    assert.equal(card._lastRenderedTheme, "dark");
    light = true;
    for (const fn of listeners) fn();
    assert.equal(card._lastRenderedTheme, "light");
  } finally {
    card.disconnectedCallback();
  }
  assert.equal(listeners.size, 0);
});
