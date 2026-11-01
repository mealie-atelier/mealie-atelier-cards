import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const json = (lang) => JSON.parse(read(`../src/i18n/${lang}.json`));

const syncCard = (language = "en") => {
  const c = makeCard(loadCards(), { hass: { language, callWS: async () => ({}) } });
  c._status = {
    entries: [{ entry_id: "e1", features: { shopping_sync: true }, permissions: {} }],
  };
  c._config = { ...c._config, entry_id: "e1" };
  c._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  c._syncData().state = { rules: [], audit: [] };
  c._render = () => {};
  return c;
};

test("English uses done for ticked shopping items everywhere", () => {
  const en = json("en");
  assert.equal(en.shoppingTicked, "Done");
  assert.equal(en.shoppingClearTicked, "Clear done");
  assert.equal(en.shoppingClearTitle, "Clear done items?");
  assert.match(en["shoppingClearConfirm.one"], /^1 done item /);
  assert.match(en["shoppingClearConfirm.other"], /^\{count\} done items /);
  for (const key of ["shoppingTicked", "shoppingClearTicked", "shoppingClearTitle"])
    assert.doesNotMatch(en[key], /ticked|checked off/i, key);
});

test("the visual editor reuses the dialog labels for photo crop and corners", () => {
  const editor = read("../src/components/editor.js");
  for (const key of ["uiTall", "uiSquare", "uiWide", "uiRound", "uiSoft", "uiSquareEckig"])
    assert.ok(editor.includes(`tr("${key}")`), `${key} used by the editor`);
  for (const lang of ["de", "en"]) {
    const dict = json(lang);
    for (const key of Object.keys(dict)) assert.doesNotMatch(key, /^editor(Rounded|Portrait|Wide)/);
  }
});

test("the plan dialog eyebrow shows the view name", () => {
  const dialogs = read("../src/components/dialogs.js");
  assert.match(dialogs, /MEALIE ATELIER \/ \$\{this\.t\("mealplan"\)\.toUpperCase\(\)\}/);
  assert.doesNotMatch(dialogs, /dialogWeeklyMenu/);
  assert.equal(json("en").mealplan, "Meal plan");
  assert.equal(json("de").mealplan, "Wochenplan");
});

test("the empty preview notice wraps its text in a span", async () => {
  const c = syncCard();
  await c._syncSetupOpen("");
  const d = c._syncData().setup;
  d.destination_entity_id = "todo.x";
  d.destinations = [{ entity_id: "todo.x", name: "X", platform: "todo" }];
  d.preview = { lines: [], total_candidates: 0 };
  assert.match(
    c._syncSetupHtml(),
    /<div class="notice"><svg[^>]*>.*?<\/svg> <span>[^<]+<\/span><\/div>/s,
  );
});

test("a missing destination has its own error text in both languages and web", () => {
  for (const language of ["de", "en"]) {
    const c = syncCard(language);
    const text = c._errorText({ code: "sync_destination_missing", message: "raw" });
    assert.equal(text, c.t("errSyncDestinationMissing"));
    assert.notEqual(text, "errSyncDestinationMissing");
    assert.notEqual(text, c.t("errSyncDestinationUnsupported"));
    const web = makeCard(loadCards(), {
      hass: { language, atelierOfflineHost: true, callWS: async () => ({}) },
    });
    const webText = web._errorText({ code: "sync_destination_missing", message: "raw" });
    assert.equal(webText, web.t("errSyncDestinationMissingWeb"));
    assert.doesNotMatch(webText, /Home Assistant/);
  }
  assert.equal(
    json("en").errSyncDestinationMissing,
    "This list is no longer available in Home Assistant. Choose another destination list.",
  );
  assert.equal(
    json("de").errSyncDestinationMissing,
    "Diese Liste ist in Home Assistant nicht mehr verfügbar. Wähle eine andere Zielliste.",
  );
});

test("a preview error renders in the preview section, not at the top of the dialog", async () => {
  const c = syncCard();
  await c._syncSetupOpen("");
  const d = c._syncData().setup;
  d.destination_entity_id = "todo.x";
  d.destinations = [{ entity_id: "todo.x", name: "X", platform: "todo" }];
  c._ws = async () => {
    throw { code: "sync_destination_missing", message: "raw" };
  };
  await c._syncPreview();
  const html = c._syncSetupHtml();
  const text = c.t("errSyncDestinationMissing");
  assert.equal(d.error, "");
  assert.equal(html.split(text).length - 1, 1);
  const previewAt = html.indexOf('class="sync-preview"');
  assert.ok(previewAt > 0 && html.indexOf(text) > previewAt, "error sits inside the preview");
  // Editing a field makes the old preview error stale.
  d.previewError = "stale";
  d.preview = null;
});

test("a stale next_run_at is ignored when nothing is pending and a run finished", () => {
  const c = syncCard();
  const soon = new Date(Date.now() + 25000).toISOString();
  const run = { at: new Date().toISOString(), outcome: "sent", count: 1 };
  assert.equal(
    c._syncNextRunAhead({ next_run_at: soon, counts: { pending: 0 }, last_run: run }),
    false,
  );
  assert.equal(
    c._syncNextRunAhead({ next_run_at: soon, counts: { pending: 2 }, last_run: run }),
    true,
  );
  assert.equal(c._syncNextRunAhead({ next_run_at: soon, counts: { pending: 0 } }), true);
  assert.equal(c._syncNextRunAhead({ counts: { pending: 2 }, last_run: run }), false);
});

test("a next_run_at scheduled after the last run still shows as ahead", () => {
  const c = syncCard();
  const run = { at: new Date(Date.now() - 120000).toISOString(), outcome: "sent", count: 2 };
  const soon = new Date(Date.now() + 25000).toISOString();
  assert.equal(
    c._syncNextRunAhead({ next_run_at: soon, counts: { pending: 0 }, last_run: run }),
    true,
  );
});
