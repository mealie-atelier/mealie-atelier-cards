import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));
const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));

const rule = (patch = {}) => ({
  id: "r1",
  revision: 1,
  name: "Weekly groceries",
  source_list_id: "l1",
  source_list_name: "Weekly",
  destination_entity_id: "todo.bring",
  mode: "copy",
  triggers: { after_atelier_add: true, watch: false },
  debounce_seconds: 30,
  poll_interval_seconds: 120,
  duplicate_policy: "skip_exact",
  activated: true,
  paused: false,
  last_run: { at: new Date(Date.now() - 120000).toISOString(), outcome: "sent", count: 2 },
  counts: { pending: 0, sending: 0 },
  next_run_at: null,
  destination: { entity_id: "todo.bring", name: "Bring", platform: "bring", available: true },
  ...patch,
});

function make({
  rules = [],
  lists = [{ id: "l1", name: "Weekly" }],
  bringEnv = false,
  state = "connected",
  admin = true,
  failed = [],
  handlers = {},
} = {}) {
  const calls = [];
  const callWS = async (message) => {
    const name = message.type.replace("mealie_atelier/", "");
    calls.push(name);
    if (handlers[name]) return handlers[name](message);
    if (name === "sync_state") return { rules, audit: [] };
    if (name === "sync_destinations")
      return {
        entities: [
          {
            entity_id: "todo.bring",
            name: "Bring",
            platform: "bring",
            available: true,
            supports: {},
          },
        ],
      };
    if (name === "sync_preview")
      return { lines: [{ title: "Milk", action: "send" }], total_candidates: 1, sample: null };
    if (name === "sync_rule_save") return { rule: rule({ activated: false }) };
    return {};
  };
  const card = makeCard(loadCards(), { hass: { language: "en", callWS } });
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: bringEnv },
        permissions: { can_admin: admin, can_write: true },
        bring: { state, account: "cook@example.test", from_env: bringEnv },
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = { shopping: { lists } };
  card._failedParts = new Set(failed);
  card._syncData().state = { rules, audit: [] };
  card._modal = "sync";
  return { card, calls };
}
const plain = (text) => text.replace(/&/g, "&amp;");

test("save and send shows the status view with a sending rule and no Cancel until sync_run returns", async () => {
  let release;
  const { card, calls } = make({
    handlers: {
      sync_state: () => ({ rules: [rule()], audit: [] }),
      sync_run: () =>
        new Promise((resolve) => (release = () => resolve({ outcome: "sent", sent: 1 }))),
    },
  });
  await card._syncSetupOpen("");
  card._syncData().setup.destination_entity_id = "todo.bring";
  await card._syncPreview();
  const saving = card._syncSave("send");
  for (let i = 0; i < 20 && !release; i++) await new Promise((r) => setImmediate(r));
  assert.ok(
    release,
    JSON.stringify(
      card._syncData().setup && [card._syncData().setup.error, card._syncData().setup.preview],
    ) + calls,
  );
  assert.equal(card._modal, "sync");
  const html = card._syncSyncHtml();
  assert.ok(html.includes(en.syncSending));
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /data-action="(sync-run|sync-setup-cancel|sync-delete)"/);
  release();
  await saving;
  const done = card._syncSyncHtml();
  assert.ok(!done.includes(en.syncSending));
  assert.match(done, /data-action="sync-run"/);
  assert.ok(calls.includes("sync_run"));
});

test("Cancel is disabled while the setup dialog saves", async () => {
  const { card } = make();
  await card._syncSetupOpen("");
  card._modal = "sync-setup";
  card._syncData().setup.saving = true;
  assert.match(card._syncSetupHtml(), /data-action="sync-setup-cancel" disabled/);
});

test("a scheduled debounced send is announced in the Waiting row and re-rendered after next_run_at", async () => {
  const at = new Date(Date.now() + 60).toISOString();
  const { card } = make({ rules: [rule({ next_run_at: at })] });
  card._syncData().state = { rules: [rule({ next_run_at: at })], audit: [] };
  const html = card._syncSyncHtml();
  assert.ok(html.includes(en.syncChecking));
  assert.ok(!html.includes("Sending shortly"));
  assert.ok(!html.includes(en.syncPendingNone));
  card._syncAfterRender();
  assert.ok(card._syncNextTimer, "timer armed");
  card._modal = null;
  card._syncAfterRender();
  assert.equal(card._syncNextTimer, null, "cleared on close");
  card._modal = "sync";
  card._syncAfterRender();
  card._syncPollStop();
  assert.equal(card._syncNextTimer, null, "cleared on disconnect");
  // A past or missing next_run_at and a real pending count keep the old rows.
  const past = make({ rules: [rule({ next_run_at: new Date(Date.now() - 5000).toISOString() })] });
  assert.ok(past.card._syncSyncHtml().includes(en.syncPendingNone));
  const waiting = make({ rules: [rule({ next_run_at: at, counts: { pending: 2 } })] });
  assert.ok(!waiting.card._syncSyncHtml().includes(en.syncChecking));
  assert.equal(de.syncChecking, "Wird geprüft");
  assert.equal(de["syncPending.other"], "{count} ausstehend");
  assert.equal(de["syncPending.one"], "1 ausstehend");
  assert.equal(de.syncSending, "Wird gesendet …");
});

test("a rule whose Mealie list is not among the loaded lists shows the missing-list state at once", () => {
  const { card } = make({ rules: [rule({ source_list_id: "gone" })] });
  const html = card._syncSyncHtml();
  assert.ok(html.includes(plain(en.errSyncSourceGone)));
  assert.doesNotMatch(html, /data-action="sync-run"/);
  assert.match(html, /class="btn tiny primary" data-action="sync-setup-open"/);
  const fine = make({ rules: [rule()] }).card._syncSyncHtml();
  assert.ok(!fine.includes(plain(en.errSyncSourceGone)));
  assert.match(fine, /data-action="sync-run"/);
});

test("no false missing-list warning when the lists failed to load", () => {
  for (const options of [{ failed: ["shopping"] }, { lists: undefined }]) {
    const env = make({ rules: [rule({ source_list_id: "gone" })], ...options });
    if (!options.lists && "lists" in options) env.card._data = { shopping: null };
    const html = env.card._syncSyncHtml();
    assert.ok(!html.includes(plain(en.errSyncSourceGone)));
    assert.match(html, /data-action="sync-run"/);
  }
});

test("env mode with a refused account keeps the dialog and disables Add with the env hint", async () => {
  for (const [admin, key] of [
    [true, "bwSessionExpiredEnv"],
    [false, "bwSessionExpiredEnvAskAdmin"],
  ]) {
    const { card } = make({ bringEnv: true, state: "reauth", admin, rules: [rule()] });
    const html = card._syncSyncHtml();
    if (admin) {
      assert.match(html, /data-action="sync-bw-open" data-value="" disabled/);
      // The account card is the single place for the .env instruction; Add points at it.
      assert.ok(!html.includes(plain(en[key])), "no repeated paragraph under Add");
      assert.match(html, /disabled aria-describedby="bw-account-text"/);
      assert.ok(html.includes(plain(en.bwReauthTextEnv)));
      assert.ok(html.includes(plain(en.bwStateReauth)));
    }
    card._bwOpen();
    assert.equal(card._modal, "sync", "dialog stays");
  }
  const { card } = make({ bringEnv: true, state: "reauth" });
  card._modal = "sync-info";
  assert.ok(!card._syncInfoHtml().includes(plain(en.syncBringPrivacy)));
  const normal = make({ bringEnv: false, state: "reauth" });
  assert.doesNotMatch(normal.card._syncSyncHtml(), /sync-bw-open" data-value="" disabled/);
});
