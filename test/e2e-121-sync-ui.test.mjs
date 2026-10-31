import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const css = readFileSync(
  new URL("../src/design-system/shopping-sync.css", import.meta.url),
  "utf8",
);
const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));

const rule = (patch = {}) => ({
  id: "r1",
  revision: 1,
  name: "Samstagseinkauf",
  source_list_id: "l1",
  source_list_name: "Wochenmarkt",
  destination_entity_id: "todo.bring",
  mode: "copy",
  triggers: { after_atelier_add: true, watch: false },
  debounce_seconds: 30,
  poll_interval_seconds: 120,
  duplicate_policy: "skip_exact",
  activated: true,
  paused: false,
  last_run: null,
  counts: { pending: 0, failed: 0, needs_reconciliation: 0 },
  destination: {
    entity_id: "todo.bring",
    name: "Mealie Atelier",
    platform: "bring",
    available: true,
    supports: { create: true, description: true, update: true },
  },
  ...patch,
});
const DESTINATIONS = { entities: [rule().destination] };
let PREVIEW = {
  sample: null,
  lines: [{ source_item_id: "a", title: "Milk", description: "", action: "send" }],
  total_candidates: 1,
};

function env({ rules = [], audit = [], lists } = {}) {
  const calls = [];
  const cards = loadCards();
  const callWS = async (message) => {
    const name = message.type.replace("mealie_atelier/", "");
    calls.push(name);
    if (name === "sync_state") return { supported: true, rules, audit };
    if (name === "sync_destinations") return DESTINATIONS;
    if (name === "sync_preview") return PREVIEW;
    return {};
  };
  const card = makeCard(cards, { hass: { language: "en", callWS } });
  card._status = {
    entries: [
      { entry_id: "e1", can_write: true, can_manage: true, features: { shopping_sync: true } },
    ],
  };
  card._data.shopping = { lists: lists || [{ id: "l1", name: "Wochenmarkt" }], items: [] };
  card._activeList = "l1";
  card._view = "shopping";
  return { cards, card, calls, html: () => cards.document.markup };
}
const click = (card, dataset) => {
  const el = { dataset, closest: () => el };
  return card._handleClick({ target: el });
};

const gone = (patch = {}) =>
  rule({
    name: "Wochenmarkt → e2e-gone",
    destination_entity_id: "todo.e2e_gone",
    destination: { entity_id: "todo.e2e_gone", name: "", platform: "local_todo", available: false },
    ...patch,
  });

test("an unavailable destination never shows the raw entity id", async () => {
  const e = env({ rules: [gone()] });
  await click(e.card, { action: "sync-open" });
  assert.doesNotMatch(e.html(), /todo\.e2e_gone/);
  assert.match(e.html(), /<h3 id="sync-rule-r1">Wochenmarkt → e2e-gone<\/h3>/);
  assert.doesNotMatch(e.html(), /class="sync-route"/);
});

test("a removed destination list gets its own notice and no run or pause button", async () => {
  const last = { at: new Date().toISOString(), outcome: "destination_missing" };
  const e = env({ rules: [gone({ last_run: last })] });
  await click(e.card, { action: "sync-open" });
  const html = e.html();
  assert.doesNotMatch(html, /todo\.e2e_gone/);
  assert.doesNotMatch(html, / is unavailable\./);
  assert.match(
    html,
    /role="alert"><svg[\s\S]*?<span>Destination list missing\. Edit the rule[^<]*<\/span>/,
  );
  assert.doesNotMatch(html, /data-action="sync-run"/);
  assert.doesNotMatch(html, /data-action="sync-pause"/);
  assert.match(html, /class="btn tiny primary" data-action="sync-setup-open"/);
  assert.doesNotMatch(html, /<dt>Status<\/dt>/);
});

test("a rule without a source list offers Edit first and says it once", async () => {
  const e = env({ rules: [rule({ source_missing: true })] });
  await click(e.card, { action: "sync-open" });
  const html = e.html();
  assert.doesNotMatch(html, /data-action="sync-run"/);
  assert.doesNotMatch(html, /data-action="sync-pause"/);
  assert.match(html, /class="btn tiny primary" data-action="sync-setup-open"/);
  assert.equal(html.split("no longer exists").length - 1, 1);
});

test("a healthy rule keeps run and pause with Edit secondary", async () => {
  const e = env({ rules: [rule()] });
  await click(e.card, { action: "sync-open" });
  assert.match(e.html(), /data-action="sync-run"/);
  assert.match(e.html(), /data-action="sync-pause"/);
  assert.doesNotMatch(e.html(), /btn tiny primary" data-action="sync-setup-open"/);
});

test("editing a rule whose source list is gone shows a placeholder and blocks saving", async () => {
  const e = env({
    rules: [rule({ source_list_id: "deleted" })],
    lists: [{ id: "other", name: "Other list" }],
  });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-setup-open", value: "r1" });
  assert.match(e.html(), /<option value="" disabled selected>Choose list<\/option>/);
  assert.match(e.html(), /data-action="sync-preview" disabled/);
  assert.ok(e.card._syncDraftErrors(e.card._syncData().setup).source);
  await click(e.card, { action: "sync-save", value: "changes" });
  assert.equal(e.calls.includes("sync_save"), false);
});

test("an empty preview invents no sample line and offers a neutral confirm", async () => {
  PREVIEW = { sample: { title: "300 g Kartoffeln" }, lines: [], total_candidates: 0 };
  try {
    const e = env({ rules: [] });
    await click(e.card, { action: "sync-open" });
    await click(e.card, { action: "sync-setup-open", value: "" });
    e.card._syncData().setup.destination_entity_id = "todo.bring";
    await e.card._syncPreview();
    assert.doesNotMatch(e.html(), /Kartoffeln/);
    assert.doesNotMatch(e.html(), /Save and send 0/);
    assert.doesNotMatch(e.html(), /Save without sending/);
    assert.match(e.html(), /data-value="send"[^>]*>[\s\S]*?Save<\/button>/);
  } finally {
    PREVIEW = {
      sample: null,
      lines: [{ source_item_id: "a", title: "Milk", description: "", action: "send" }],
      total_candidates: 1,
    };
  }
});

test("the delay field has a gap above it in the sync editor", () => {
  assert.match(
    css,
    /\.sync-panel \.sync-fieldset \+ \.editor-columns\s*\{[^}]*margin-block-start:/,
  );
});
