import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));

const rule = (patch = {}) => ({
  id: "r1",
  revision: 1,
  name: "Weekly → Einkauf",
  source_list_id: "l1",
  source_list_name: "Weekly",
  destination_entity_id: "todo.bring",
  mode: "copy",
  activated: true,
  paused: false,
  last_run: null,
  counts: { pending: 0, failed: 0, needs_reconciliation: 0 },
  destination: { entity_id: "todo.bring", name: "Einkauf", platform: "bring", available: true },
  ...patch,
});

function make({ language = "en", entry = {}, rules = [], ws } = {}) {
  const card = makeCard(loadCards(), { hass: { language } });
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: { can_admin: true, can_write: true },
        bring: { state: "connected", account: "cook@example.test" },
        ...entry,
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  card._syncData().state = { rules, audit: [] };
  card._ws = ws || (async () => ({}));
  return card;
}

test("a resend of a gone or ticked off item names the item, not the Mealie list", async () => {
  for (const [code, key] of [
    ["sync_source_gone", "errSyncItemGone"],
    ["sync_source_checked", "errSyncItemChecked"],
  ]) {
    const card = make({
      ws: async (type) => {
        if (type === "sync_resolve") throw Object.assign(new Error("x"), { code });
        return { rules: [], audit: [] };
      },
    });
    card._syncReviewOpen = async () => {};
    await card._syncResolve("r1", "k1", "resend");
    assert.equal(card._syncData().error, en[key]);
    assert.match(card._syncData().error, /item/);
    assert.doesNotMatch(card._syncData().error, /Mealie list/);
  }
  assert.match(de.errSyncItemChecked, /abgehakt/);
  assert.doesNotMatch(de.errSyncItemGone, /Liste/);
});

test("a rule-level source error keeps its Mealie list text", async () => {
  const card = make({
    ws: async () => {
      throw Object.assign(new Error("x"), { code: "sync_source_gone" });
    },
  });
  card._syncReviewOpen = async () => {};
  await card._syncResolve("r1", "k1", "dismiss");
  assert.equal(card._syncData().error, en.errSyncSourceGone);
});

test("a destination named by its entity id falls back to the stored rule name suffix", () => {
  const dest = {
    entity_id: "todo.e2e_lokal",
    name: "todo.e2e_lokal",
    platform: "local_todo",
    available: false,
  };
  const r = rule({
    name: "E2E Sync E → E2E Lokal",
    source_list_name: "E2E Sync E",
    destination: dest,
  });
  const card = make({ entry: { features: { shopping_sync: true } }, rules: [r] });
  assert.equal(card._syncRuleDestName(r), "E2E Lokal");
  const html = card._syncRuleHtml(r, card._syncCaps());
  assert.doesNotMatch(html, /todo\.e2e_lokal/);
  assert.equal(html.split("E2E Sync E → E2E Lokal").length - 1, 1);
  assert.match(html, /<p class="sync-route">Local To-do<\/p>/);
  assert.match(html, /E2E Lokal is unavailable\./);
});

test("an unavailable destination with nothing pending skips the open items sentence", () => {
  const dest = { entity_id: "todo.x", name: "todo.x", platform: "local_todo", available: false };
  const r = rule({ name: "Weekly → Lokal", destination: dest });
  const card = make({ language: "de", entry: { features: { shopping_sync: true } }, rules: [r] });
  const html = card._syncRuleHtml(r, card._syncCaps());
  assert.match(html, /Lokal ist nicht erreichbar\./);
  assert.doesNotMatch(html, /bleiben? in Mealie offen/);
  assert.doesNotMatch(html, /0 Artikel/);
});

test("a missing destination notice says how to continue", () => {
  const dest = { entity_id: "todo.x", name: "todo.x", platform: "local_todo", available: false };
  const r = rule({
    name: "Weekly → Lokal",
    destination: dest,
    last_run: { at: new Date().toISOString(), outcome: "destination_missing" },
  });
  const card = make({ entry: { features: { shopping_sync: true } }, rules: [r] });
  const html = card._syncRuleHtml(r, card._syncCaps());
  assert.match(
    html,
    /Lokal: Destination list missing\. Edit the rule and pick another destination list\./,
  );
});

test("the success screen of an added rule has the add title and no stepper", () => {
  const card = make();
  card._render = () => {};
  card._bwOpen();
  const w = card._bwData();
  assert.equal(w.addRule, true);
  w.step = 5;
  w.done = { ok: true, text: "", icon: "", savedOnly: true };
  const html = card._bwHtml();
  assert.match(html, /Add a sync rule/);
  assert.doesNotMatch(html, /Connect to Bring!/);
  assert.doesNotMatch(html, /bw-progress|bw-steps/);
});

test("the first connection keeps its stepper on the success screen", () => {
  const card = make({ entry: { bring: { state: "none" } } });
  card._render = () => {};
  card._bwOpen();
  const w = card._bwData();
  w.step = 5;
  w.done = { ok: true, text: "", icon: "", savedOnly: true };
  assert.match(card._bwHtml(), /Connect to Bring!/);
});

test("the read-only dialog says so once and does not invite to create a rule", () => {
  const card = make({ language: "de", entry: { read_only: true } });
  const html = card._syncSyncHtml();
  assert.equal(html.split(de.syncReadOnly).length - 1, 1);
  assert.doesNotMatch(html, /Wähle eine Bring!-Liste/);
  assert.match(html, /Hier kannst du keine Regeln anlegen/);
});

test("a user without admin rights gets the read-only empty text", () => {
  const card = make({ entry: { permissions: { can_admin: false, can_write: true } } });
  assert.match(card._syncSyncHtml(), /You cannot create rules here/);
  const admin = make();
  assert.match(admin._syncSyncHtml(), /Pick a Bring! list/);
});

test("reconnecting with saved rules continues them instead of starting a second rule", async () => {
  const card = make({
    entry: { bring: { state: "none" } },
    ws: async (type) => (type === "sync_state" ? { rules: [rule()], audit: [] } : { entries: [] }),
  });
  card._render = () => {};
  card._bwOpen();
  assert.equal(card._modal, "sync-wizard");
  const sync = card._syncData();
  sync.bring.email = "cook@example.test";
  sync.bring.password = "pw";
  await card._syncBringConnect();
  assert.equal(card._modal, "sync");
  assert.equal(sync.wizard, null);
  assert.equal(sync.result, en.syncRulesContinue);
});

test("reconnecting without saved rules still starts the wizard on the list step", async () => {
  const card = make({
    entry: { bring: { state: "none" } },
    ws: async (type) => (type === "sync_state" ? { rules: [], audit: [] } : { entries: [] }),
  });
  card._render = () => {};
  card._bwOpen();
  const sync = card._syncData();
  sync.bring.email = "cook@example.test";
  sync.bring.password = "pw";
  await card._syncBringConnect();
  assert.equal(card._modal, "sync-wizard");
  assert.equal(card._bwData().step, 2);
});

test("English list names use curly quotes and German uses the one term Artikel", () => {
  for (const [key, value] of Object.entries(en)) {
    if (/^(bw|sync)/.test(key)) assert.doesNotMatch(value, /"/, key);
  }
  for (const [key, value] of Object.entries(de)) {
    if (/^(bw|sync|errSync)/.test(key)) assert.doesNotMatch(value, /Eintr(ag|äge)/, key);
  }
});

const goneDest = {
  entity_id: "todo.e2e_ziel",
  name: "todo.e2e_ziel",
  platform: "local_todo",
  available: false,
};

test("a removed destination uses the stored destination_name before the entity id", () => {
  const r = rule({
    name: "Weekly",
    destination_entity_id: "todo.e2e_ziel",
    destination: goneDest,
    destination_name: "E2E Ziel",
  });
  const card = make({ entry: { features: { shopping_sync: true } }, rules: [r] });
  assert.equal(card._syncRuleDestName(r), "E2E Ziel");
});

test("the picker reads a derived name, never the raw id, and prefers the stored name", async () => {
  for (const [stored, expected] of [
    [undefined, "E2e ziel"],
    ["E2E Ziel", "E2E Ziel"],
  ]) {
    const r = rule({
      name: "Weekly",
      destination_entity_id: "todo.e2e_ziel",
      destination: goneDest,
      destination_name: stored,
      activated: true,
      last_run: { at: new Date().toISOString(), outcome: "destination_missing" },
    });
    const callWS = async (m) => {
      const n = m.type.replace("mealie_atelier/", "");
      if (n === "sync_state") return { supported: true, rules: [r], audit: [] };
      if (n === "sync_destinations")
        return { entities: [{ entity_id: "todo.x", name: "X", platform: "bring" }] };
      return {};
    };
    const card = makeCard(loadCards(), { hass: { language: "en", callWS } });
    card._status = {
      entries: [
        { entry_id: "e1", can_write: true, can_manage: true, features: { shopping_sync: true } },
      ],
    };
    card._config = { ...card._config, entry_id: "e1" };
    card._data.shopping = { lists: [{ id: "l1", name: "Weekly" }], items: [] };
    card._activeList = "l1";
    card._view = "shopping";
    await card._syncLoad?.();
    await card._syncSetupOpen("r1");
    const html = card._syncSetupHtml();
    assert.match(html, new RegExp(`selected>${expected} \\(missing\\)</option>`));
    assert.doesNotMatch(html, /todo\.e2e_ziel \(missing\)/);
  }
});

test("the missing notice keeps the stored destination name", () => {
  const r = rule({
    name: "Weekly",
    destination_entity_id: "todo.e2e_ziel",
    destination: goneDest,
    destination_name: "E2E Ziel",
    last_run: { at: new Date().toISOString(), outcome: "destination_missing" },
  });
  const card = make({ entry: { features: { shopping_sync: true } }, rules: [r] });
  const html = card._syncRuleHtml(r, card._syncCaps());
  assert.match(html, /E2E Ziel: Destination list missing\./);
});
