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
const PREVIEW = {
  sample: null,
  lines: [{ source_item_id: "a", title: "Milk", description: "", action: "send" }],
  total_candidates: 1,
};

function env({ rules = [], audit = [] } = {}) {
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
  card._data.shopping = { lists: [{ id: "l1", name: "Wochenmarkt" }], items: [] };
  card._activeList = "l1";
  card._view = "shopping";
  return { cards, card, calls, html: () => cards.document.markup };
}
const click = (card, dataset) => {
  const el = { dataset, closest: () => el };
  return card._handleClick({ target: el });
};

test("the send button of the sync form is a full-width row with a bounded radius, not a pill", () => {
  const block = css.match(
    /\.sync-panel \.form-actions \.btn\.primary\[data-action="sync-save"\]\s*\{[^}]*\}/,
  );
  assert.ok(block, "rule for the primary save button exists");
  assert.match(block[0], /flex:\s*1 1 100%/);
  assert.match(block[0], /border-radius:\s*var\(--ds-radius-md\)/);
});

test("a long default rule name ends with an ellipsis in the name field", () => {
  assert.match(css, /input\[data-input="sync-name"\]\s*\{[^}]*text-overflow:\s*ellipsis/);
});

test("the confirm label stays neutral until a preview has produced a count", async () => {
  const e = env({ rules: [] });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-setup-open", value: "" });
  e.card._syncData().setup.destination_entity_id = "todo.bring";
  e.card._render();
  assert.match(e.html(), /Save and send<\/button>/);
  assert.doesNotMatch(e.html(), /Save and send 0/);
  await e.card._syncPreview();
  assert.match(e.html(), /Save and send 1 item from Wochenmarkt to Mealie Atelier/);
});

test("recent runs list the newest run first", async () => {
  const at = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
  const audit = [20, 10, 1].map((m, i) => ({
    rule_id: "r1",
    at: at(m),
    outcome: "sent",
    count: i + 2,
  }));
  const e = env({ rules: [rule()], audit });
  await click(e.card, { action: "sync-open" });
  const items = [...e.html().matchAll(/<li>[\s\S]*?<\/li>/g)].map((m) => m[0]);
  assert.equal(items.length, 3);
  assert.match(items[0], /1 minute ago/);
  assert.match(items[2], /20 minutes ago/);
});

test("review of the first batch opens titled as such and runs the preview by itself", async () => {
  const e = env({ rules: [rule({ activated: false })] });
  await click(e.card, { action: "sync-open" });
  assert.match(e.html(), /data-action="sync-first-batch"/);
  await click(e.card, { action: "sync-first-batch", value: "r1" });
  assert.deepEqual(
    e.calls.filter((c) => c === "sync_preview"),
    ["sync_preview"],
  );
  assert.match(e.html(), /<h2 id="sync-title">Review and send first batch<\/h2>/);
  assert.match(e.html(), /Save and send 1 item from Wochenmarkt/);
});

test("a plain edit keeps its title and does not run a preview", async () => {
  const e = env({ rules: [rule({ activated: false })] });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-setup-open", value: "r1" });
  assert.match(e.html(), /<h2 id="sync-title">Edit sync rule<\/h2>/);
  assert.equal(e.calls.includes("sync_preview"), false);
});

test("the rule card names the destination like the picker does", async () => {
  const e = env({ rules: [rule()] });
  await click(e.card, { action: "sync-open" });
  assert.match(e.html(), /Wochenmarkt → Mealie Atelier · Bring!<\/p>/);
  assert.doesNotMatch(e.html(), /Mealie Atelier \(Bring!\)/);
});

test("German pending wording matches the other waiting strings", () => {
  assert.equal(de.syncRunLeft, "{count} ausstehend");
  assert.equal(de.syncPendingNone, "Nichts ausstehend");
});
