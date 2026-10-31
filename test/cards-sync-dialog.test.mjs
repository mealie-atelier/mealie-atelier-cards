import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const css = readFileSync(
  new URL("../src/design-system/shopping-sync.css", import.meta.url),
  "utf8",
);
const rule = (patch = {}) => ({
  id: "r1",
  revision: 1,
  name: "Weekly → Mealie Atelier",
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

function env({
  rules = [],
  audit = [],
  features = { shopping_sync: true },
  admin = true,
  bring,
  handlers = {},
  records = [],
} = {}) {
  const calls = [];
  const cards = loadCards();
  const callWS = async (message) => {
    const name = message.type.replace("mealie_atelier/", "");
    calls.push(name);
    if (handlers[name]) return handlers[name](message);
    if (name === "sync_state") return { supported: true, rules, audit };
    if (name === "sync_destinations")
      return {
        entities: [
          { ...rule().destination },
          { entity_id: "todo.x", name: "X", platform: "weird_thing" },
        ],
      };
    if (name === "sync_records") return { records };
    return {};
  };
  const card = makeCard(cards, { hass: { language: "en", callWS } });
  card._status = {
    entries: [{ entry_id: "e1", can_write: true, can_manage: admin, features, bring }],
  };
  card._data.shopping = { lists: [{ id: "l1", name: "Weekly" }], items: [] };
  card._activeList = "l1";
  card._view = "shopping";
  return { cards, card, calls, html: () => cards.document.markup };
}
const click = (card, dataset) => {
  const el = { dataset, closest: () => el };
  return card._handleClick({ target: el });
};
const web = { shopping_sync: true, bring_setup: true };

test("a rule whose Mealie list is gone is not shown as healthy and says what to do", async () => {
  const e = env({
    rules: [
      rule({
        source_missing: true,
        last_run: { at: new Date().toISOString(), outcome: "source_missing" },
      }),
    ],
    audit: [{ rule_id: "r1", at: new Date().toISOString(), outcome: "source_missing", count: 0 }],
  });
  await click(e.card, { action: "sync-open" });
  const html = e.html();
  assert.doesNotMatch(html, /Unknown result/);
  assert.match(html, /Mealie list no longer exists/);
  assert.match(html, /Choose another source list or delete the rule/);
  assert.doesNotMatch(html, />\s*(<svg[^>]*>.*?<\/svg>)?\s*Active\s*</s);
});

test("resending an item that left Mealie keeps the translated error visible", async () => {
  const gone = Object.assign(new Error("english bridge text"), { code: "sync_source_gone" });
  const e = env({
    rules: [rule({ counts: { changed_after_send: 1 } })],
    handlers: {
      sync_resolve: () => {
        throw gone;
      },
      sync_records: () => ({
        records: [{ key: "k1", title: "Potatoes", state: "changed_after_send" }],
      }),
    },
  });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-resend", value: "k1", rule: "r1" });
  assert.match(e.html(), /This item no longer exists in Mealie, so it cannot be sent again/);
  assert.doesNotMatch(e.html(), /english bridge text/);
});

test("history lines name their rule only when there are several rules", async () => {
  const at = new Date().toISOString();
  const second = rule({
    id: "r2",
    name: "Party → Bring",
    source_list_id: "l2",
    source_list_name: "Party",
  });
  const audit = [{ rule_id: "r2", at, outcome: "sent", count: 2 }];
  const many = env({ rules: [rule(), second], audit });
  await click(many.card, { action: "sync-open" });
  assert.match(many.html(), /<li>[^<]*(?:<svg[^]*?<\/svg>)? Party → Bring · /);
  const one = env({ rules: [rule()], audit: [{ rule_id: "r1", at, outcome: "sent", count: 2 }] });
  await click(one.card, { action: "sync-open" });
  assert.doesNotMatch(one.html(), / · just now/);
});

test("the review dialog names the rule it belongs to", async () => {
  const e = env({ rules: [rule({ counts: { failed: 1 } })] });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-review", value: "r1" });
  assert.match(e.html(), /id="sync-title">[^<]+<\/h2><p>Weekly → Mealie Atelier<\/p>/);
});

test("nothing to send carries no count and a partial run uses the short result", () => {
  const e = env();
  const at = new Date().toISOString();
  const nothing = e.card._syncAuditText({ at, outcome: "nothing_to_send", count: 0 });
  assert.doesNotMatch(nothing, /0|item/);
  const partial = e.card._syncAuditText({ at, outcome: "partial", count: 3 });
  assert.match(partial, /Partly sent, 3 items/);
  assert.doesNotMatch(partial, /need attention/);
});

test("the watch hint and the poll field only show while watching is on", async () => {
  const e = env();
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-setup-open", value: "" });
  assert.doesNotMatch(e.html(), /data-input="sync-poll"/);
  assert.doesNotMatch(e.html(), /checks the source list regularly/);
  e.card._handleInput({
    target: { dataset: { input: "sync-watch" }, checked: true, hasAttribute: () => false },
  });
  assert.match(e.html(), /data-input="sync-poll"/);
  assert.match(e.html(), /checks the source list regularly/);
});

test("a hidden poll field with a stale invalid value does not block saving", async () => {
  const e = env();
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-setup-open", value: "" });
  const d = e.card._syncData().setup;
  d.poll_minutes = "abc";
  assert.equal(Object.keys(e.card._syncDraftErrors(d)).length, 0);
  assert.equal(e.card._syncDraftRequest(d).poll_interval_seconds, 120);
});

test("a lapsed Bring! session in the rules refreshes the status so the account card offers sign-in", async () => {
  const lapsed = rule({ destination: { ...rule().destination, available: false, reason: "auth" } });
  let statusCalls = 0;
  const e = env({
    rules: [lapsed],
    features: web,
    bring: { state: "connected", account: "c@example.test" },
    handlers: {
      status: () => {
        statusCalls++;
        return {
          entries: [
            {
              entry_id: "e1",
              can_write: true,
              can_manage: true,
              features: web,
              bring: { state: "reauth", account: "c@example.test", email: "c@example.test" },
            },
          ],
        };
      },
    },
  });
  await click(e.card, { action: "sync-open" });
  await new Promise((r) => setImmediate(r));
  assert.equal(statusCalls, 1);
  assert.equal(e.card._syncCaps().bringState, "reauth");
});

test("at the rule limit an admin gets a note instead of a missing add button", async () => {
  const rules = [1, 2, 3, 4, 5].map((n) => rule({ id: `r${n}`, source_list_id: `l${n}` }));
  const e = env({ rules });
  await click(e.card, { action: "sync-open" });
  assert.doesNotMatch(e.html(), /data-action="sync-setup-open" data-value=""/);
  assert.match(e.html(), /You can have at most 5 sync rules/);
  const fewer = env({ rules: rules.slice(0, 4) });
  await click(fewer.card, { action: "sync-open" });
  assert.match(fewer.html(), /data-action="sync-setup-open" data-value=""/);
  assert.doesNotMatch(fewer.html(), /at most 5 sync rules/);
});

test("platform labels are localized for local_todo and empty for unknown integrations", () => {
  const e = env();
  assert.equal(e.card._syncPlatformLabel("local_todo"), "Local To-do");
  assert.equal(e.card._syncPlatformLabel("weird_thing"), "");
  assert.equal(e.card._syncDestinationLabel("X", "weird_thing"), "X");
});

test("preview rows name untitled items, use a skip icon and have no line break", async () => {
  const e = env({
    handlers: {
      sync_preview: () => ({
        total_candidates: 2,
        lines: [
          { source_item_id: "a", title: "  ", description: "", action: "skip_empty" },
          { source_item_id: "b", title: "Milk", description: "", action: "send" },
        ],
      }),
    },
  });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-setup-open", value: "" });
  e.card._syncData().setup.destination_entity_id = "todo.bring";
  await e.card._syncPreview();
  const list = /<ul class="sync-list">[^]*?<\/ul>/.exec(e.html())[0];
  assert.match(list, /<strong>Item without text<\/strong>/);
  assert.doesNotMatch(list, /<br>/);
  const [skip, send] = list.split("</li>");
  assert.match(skip, /M18 6 6 18M6 6l12 12/);
  assert.doesNotMatch(skip, /M12 7v5l3 2/);
  assert.match(send, /M5 12h14/);
});

test("review buttons carry their item in the accessible name", async () => {
  const e = env({
    rules: [rule({ counts: { changed_after_send: 1 } })],
    records: [{ key: "k1", title: "300 potatoes", state: "changed_after_send" }],
  });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-review", value: "r1" });
  assert.match(e.html(), /aria-label="Dismiss: 300 potatoes" title="Dismiss: 300 potatoes"/);
  assert.match(e.html(), /aria-label="Send again: 300 potatoes"/);
});

test("review row shows the change when the bridge reports the current Mealie title", async () => {
  const e = env({
    rules: [rule({ counts: { changed_after_send: 1 } })],
    records: [
      {
        key: "k1",
        title: "300 potatoes",
        current_title: "500 potatoes",
        state: "changed_after_send",
      },
    ],
  });
  await click(e.card, { action: "sync-open" });
  await click(e.card, { action: "sync-review", value: "r1" });
  assert.match(e.html(), /<strong>300 potatoes → 500 potatoes<\/strong>/);
});

test("web app: read-only notice and editor texts have no Home Assistant wording", async () => {
  const e = env({
    features: web,
    bring: { state: "connected", account: "c@example.test" },
  });
  e.card._status.entries[0].can_write = false;
  await click(e.card, { action: "sync-open" });
  assert.match(e.html(), /Your account may view the sync but not change it/);
  assert.doesNotMatch(e.html(), /Home Assistant user/);
  e.card._status.entries[0].can_write = true;
  await click(e.card, { action: "sync-setup-open", value: "" });
  const html = e.html();
  assert.doesNotMatch(html, /Home Assistant/);
  assert.match(html, /02 \/ CHOOSE YOUR BRING! LIST/);
  assert.match(html, /Send automatically after adding/);
  assert.doesNotMatch(html, /After Atelier adds items/);
});

test("web app: users who cannot connect get the dialog button, not 'Connect to Bring!'", () => {
  const connect = env({
    features: { shopping_sync: false, bring_setup: true },
    bring: { state: "disconnected" },
  });
  assert.match(connect.card._syncEntryButton(), /data-action="sync-bw-open"/);
  const other = env({
    features: { shopping_sync: false, bring_setup: true },
    admin: false,
    bring: { state: "disconnected" },
  });
  const button = other.card._syncEntryButton();
  assert.match(button, /data-action="sync-open"/);
  assert.doesNotMatch(button, /Connect to Bring!/);
});

test("the sync notice icon does not shrink", () => {
  assert.match(css, /\.atelier \.sync-explain svg\s*\{[^}]*flex:\s*0 0 auto/);
});

test("read-only notices for a missing source or destination never mention choosing or deleting", async () => {
  const at = new Date().toISOString();
  for (const [outcome, patch, keep, drop] of [
    [
      "source_missing",
      { source_missing: true },
      /administrator has to change the rule/,
      /Choose another|delete the rule/,
    ],
    [
      "destination_missing",
      {},
      /administrator has to change the rule/,
      /Edit the rule|pick another/,
    ],
  ]) {
    const e = env({ rules: [rule({ ...patch, last_run: { at, outcome } })] });
    e.card._status.entries[0].read_only = true;
    await click(e.card, { action: "sync-open" });
    assert.match(e.html(), keep, outcome);
    assert.doesNotMatch(e.html(), drop, outcome);
  }
  const writable = env({
    rules: [rule({ source_missing: true, last_run: { at, outcome: "source_missing" } })],
  });
  await click(writable.card, { action: "sync-open" });
  assert.match(writable.html(), /Choose another source list or delete the rule/);
});
