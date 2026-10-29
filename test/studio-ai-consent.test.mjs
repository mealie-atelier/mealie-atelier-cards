import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const plain = (v) => JSON.parse(JSON.stringify(v));
const click = (card, action, dataset = {}) => {
  const el = { dataset: { action, ...dataset }, disabled: false, closest: () => el };
  return card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
};

function setup(language, entry = {}) {
  const card = makeCard(loadCards(), { hass: { language, callWS: async () => ({}) } });
  card._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true, ...entry }] };
  card._detail = { slug: "soup", name: "Suppe" };
  card._render = () => {};
  const calls = { ws: [], dialogs: [], flashed: [] };
  card._ws = async (type, payload) => {
    calls.ws.push([type, payload]);
    return { issues: [], disclaimer: "" };
  };
  card._atelierDialog = async (opts) => {
    calls.dialogs.push(opts);
    return opts.kind === "prompt" ? "Drachenfrucht" : true;
  };
  card._flash = (text) => calls.flashed.push(text);
  return { card, calls };
}

test("the AI info reads the flag and provider from the status entry", () => {
  const info = (entry) => plain(setup("en", entry).card._aiInfo());
  assert.deepEqual(info({ ai_enabled: true, ai_provider: "openai" }), {
    enabled: true,
    provider: "OpenAI",
  });
  assert.deepEqual(info({ ai_enabled: true, ai_provider: "anthropic" }), {
    enabled: true,
    provider: "Anthropic",
  });
  assert.deepEqual(info({ ai_enabled: false, ai_provider: "none" }), {
    enabled: false,
    provider: "",
  });
  assert.equal(info({ ai_provider: "none" }).enabled, false);
  assert.equal(info({ features: { ai: false } }).enabled, false);
  // An older Bridge reports nothing: the helpers stay available.
  assert.deepEqual(info({}), { enabled: true, provider: "" });
});

test("the consent dialog names the real provider and the request carries the card language", async () => {
  for (const [language, provider, wording] of [
    ["de", "anthropic", /werden an Anthropic übertragen/],
    ["en", "openai", /will be sent to OpenAI\./],
  ]) {
    const { card, calls } = setup(language, { ai_enabled: true, ai_provider: provider });
    await click(card, "studio-ai-audit");
    assert.match(calls.dialogs[0].body, wording);
    assert.doesNotMatch(calls.dialogs[0].body, /konfigurierten|configured AI/);
    assert.deepEqual(plain(calls.ws), [["studio_ai_audit", { slug: "soup", language }]]);
  }
});

test("the consent dialog falls back to generic wording when the provider is unknown", async () => {
  const { card, calls } = setup("en", {});
  await click(card, "studio-ai-audit");
  assert.match(calls.dialogs[0].body, /your configured AI provider/);
});

test("without an AI key the review explains it and sends nothing", async () => {
  const { card, calls } = setup("de", { ai_enabled: false, ai_provider: "none" });
  await click(card, "studio-ai-audit");
  assert.equal(calls.dialogs.length, 0);
  assert.equal(calls.ws.length, 0);
  assert.match(calls.flashed.join(), /KI-API-Key/);
});

test("the review button follows the ai_enabled flag", () => {
  for (const [entry, shown] of [
    [{ ai_enabled: true, ai_provider: "openai" }, true],
    [{ ai_enabled: false, ai_provider: "none" }, false],
  ]) {
    const { card } = setup("en", entry);
    card._modal = "recipe";
    card._detail = {
      slug: "s",
      name: "Soup",
      recipeIngredient: [{ note: "1 onion" }],
      recipeInstructions: [{ text: "Cook." }],
    };
    const html = card._modalHtml();
    assert.equal(html.includes('data-action="studio-ai-audit"'), shown);
  }
});

test("the substitute helper sends the card language and skips the server without a key", async () => {
  let t = setup("de", { ai_enabled: true, ai_provider: "openai" });
  t.card._ws = async (type, payload) => {
    t.calls.ws.push([type, payload]);
    return { alternatives: [{ name: "Mango", adjustment: "gleich viel" }], warning: "prüfen" };
  };
  await click(t.card, "studio-replacement");
  assert.deepEqual(plain(t.calls.ws), [
    ["studio_substitute", { ingredient: "Drachenfrucht", recipe: "Suppe", language: "de" }],
  ]);
  t = setup("de", { ai_enabled: false, ai_provider: "none" });
  await click(t.card, "studio-replacement");
  assert.equal(t.calls.ws.length, 0);
  assert.match(t.card._aiSwap, /Keine geprüfte lokale Alternative gefunden\. KI ist optional/);
  assert.equal((t.card._aiSwap.match(/API-Key/g) || []).length, 1);
});

test("an older Bridge without AI state gets no language key", async () => {
  // Bridge 0.10.x validates the websocket payload strictly and rejects unknown keys.
  const t = setup("de", {});
  t.card._ws = async (type, payload) => {
    t.calls.ws.push([type, payload]);
    return { alternatives: [{ name: "Mango", adjustment: "gleich viel" }], warning: "prüfen" };
  };
  await click(t.card, "studio-replacement");
  await click(t.card, "studio-ai-audit");
  assert.deepEqual(plain(t.calls.ws), [
    ["studio_substitute", { ingredient: "Drachenfrucht", recipe: "Suppe" }],
    ["studio_ai_audit", { slug: "soup" }],
  ]);
});

test("the review toast shows the localized message for a coded server error", async () => {
  const { card, calls } = setup("de", { ai_enabled: true, ai_provider: "openai" });
  card._ws = async () => {
    throw Object.assign(new Error("AI provider HTTP 502 raw"), { code: "ai_error" });
  };
  await click(card, "studio-ai-audit");
  assert.match(
    calls.flashed.at(-1),
    /^KI-Prüfung nicht verfügbar: Der KI-Anbieter hat nicht geantwortet/,
  );
  assert.doesNotMatch(calls.flashed.at(-1), /raw/);
});

test("every destructive confirm focuses Cancel at its call site", async () => {
  const { card, calls } = setup("en", { ai_enabled: false });
  card._studio = {
    pantry: [{ id: "p1", name: "Rice" }],
    family: { session: { id: "s1", slug: "soup", name: "Soup", step: 0, timers: [] } },
  };
  card._studioWrite = async () => {};
  const labels = [];
  for (const [action, dataset] of [
    ["studio-pantry-delete", { id: "p1" }],
    ["studio-member-remove", { id: "m1" }],
    ["studio-session-end", {}],
  ]) {
    calls.dialogs.length = 0;
    await click(card, action, dataset);
    assert.equal(calls.dialogs.length, 1, action);
    assert.equal(calls.dialogs[0].focusCancel, true, action);
    labels.push(calls.dialogs[0].confirmLabel);
  }
  assert.equal(new Set(labels).size, 3);
});

test("replacing a shared session offers a local-only choice and focuses Cancel", async () => {
  const { card, calls } = setup("en", {});
  card._studio = { family: { session: { id: "s1", slug: "other", name: "Other", timers: [] } } };
  card._atelierDialog = async (opts) => {
    calls.dialogs.push(opts);
    return false;
  };
  await click(card, "cook-start");
  assert.equal(calls.dialogs.length, 1);
  assert.equal(calls.dialogs[0].focusCancel, true);
  assert.ok(calls.dialogs[0].secondaryLabel);
});

function nutritionHtml(language, { web = false, servings = 4, fdc = false } = {}) {
  const hass = { language, callWS: async () => ({}) };
  if (web) hass.atelierOfflineHost = true;
  const card = makeCard(loadCards(), { hass });
  card._nutrition = {
    busy: false,
    notice: "",
    rows: [],
    report: null,
    preview: { name: "Soup", servings, fdc_enabled: fdc, ai_enabled: false, slug: "s", hash: "h" },
  };
  return card._nutritionMarkup();
}

test("the nutrition header is titled and counts servings by plural in both languages", () => {
  assert.match(nutritionHtml("en", { servings: 1 }), /<h2>Nutrition<\/h2>[\s\S]*1 serving</);
  assert.match(nutritionHtml("en", { servings: 4 }), /4 servings</);
  assert.match(nutritionHtml("de", { servings: 1 }), /<h2>Nährwerte<\/h2>[\s\S]*1 Portion</);
  assert.match(nutritionHtml("de", { servings: 4 }), /4 Portionen</);
});

test("the missing USDA key hint matches where the key is set", () => {
  assert.match(nutritionHtml("en"), /integration options/);
  assert.match(nutritionHtml("de"), /Integrationsoptionen/);
  assert.match(nutritionHtml("de"), /USDA-API-Key fehlt/);
  const web = nutritionHtml("en", { web: true });
  assert.match(web, /USDA_FDC_API_KEY in the server’s \.env file/);
  assert.doesNotMatch(web, /settings/i);
  assert.match(
    nutritionHtml("de", { web: true }),
    /USDA_FDC_API_KEY in der \.env-Datei des Servers/,
  );
  assert.doesNotMatch(nutritionHtml("en", { fdc: true }), /USDA API key/);
});
