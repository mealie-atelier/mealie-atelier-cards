import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";
import { readFileSync } from "node:fs";

const RULE = {
  id: "r1",
  revision: 2,
  name: "Weekly groceries → Bring",
  source_list_id: "l1",
  source_list_name: "Weekly groceries",
  destination_entity_id: "todo.bring",
  mode: "copy",
  triggers: { after_atelier_add: true, watch: false },
  debounce_seconds: 30,
  poll_interval_seconds: 120,
  duplicate_policy: "skip_exact",
  activated: true,
  paused: false,
  last_run: {
    at: new Date(Date.now() - 120000).toISOString(),
    trigger: "manual",
    outcome: "sent",
    count: 4,
  },
  counts: {
    pending: 0,
    sending: 0,
    sent: 4,
    source_completed: 0,
    failed: 0,
    needs_reconciliation: 0,
    changed_after_send: 0,
    removed_after_send: 0,
  },
  running: false,
  next_run_at: null,
  destination: {
    entity_id: "todo.bring",
    name: "Bring",
    platform: "bring",
    available: true,
    supports: { create: true, description: true, update: true },
  },
};
const withRule = (patch = {}) => ({
  ...RULE,
  ...patch,
  counts: { ...RULE.counts, ...(patch.counts || {}) },
});
const DESTINATIONS = {
  entities: [
    {
      entity_id: "todo.bring",
      name: "Bring",
      platform: "bring",
      available: true,
      supports: { create: true, description: true, update: true },
    },
    {
      entity_id: "todo.plain",
      name: "Plain",
      platform: "local_todo",
      available: true,
      supports: { create: true, description: false, update: false },
    },
  ],
};
const PREVIEW = {
  capabilities: { create: true, description: true, update: true },
  sample: { title: "300 g Potatoes", description: "waxy" },
  lines: [
    { source_item_id: "a", title: "300 g Potatoes", description: "waxy", action: "send" },
    { source_item_id: "b", title: "Milk", description: "", action: "skip_duplicate" },
  ],
  total_candidates: 2,
};

/** Card wired to a fake Bridge; every call is recorded with its payload. */
function syncCard({
  features = { shopping_sync: true },
  permissions = {},
  state,
  handlers = {},
} = {}) {
  const calls = [];
  let current = state;
  const cards = loadCards();
  const callWS = async (message) => {
    const name = message.type.replace("mealie_atelier/", "");
    calls.push({ name, message });
    if (handlers[name]) return handlers[name](message);
    if (name === "sync_state") return current ?? { supported: true, rules: [], audit: [] };
    if (name === "sync_destinations") return DESTINATIONS;
    if (name === "sync_preview") return PREVIEW;
    if (name === "sync_rule_save") return { rule: withRule({ activated: false }) };
    if (name === "sync_run")
      return {
        rule_id: "r1",
        outcome: "sent",
        sent: 1,
        skipped_duplicates: 0,
        merged: 0,
        failed: 0,
        needs_reconciliation: 0,
        completed_in_source: 0,
        pending_left: 0,
      };
    if (name === "sync_records") return { records: [] };
    return {};
  };
  const card = makeCard(cards, { hass: { language: "en", callWS } });
  card._status = {
    entries: [{ entry_id: "e1", can_write: true, can_manage: true, features, ...permissions }],
  };
  card._data.shopping = {
    lists: [
      { id: "l1", name: "Weekly groceries" },
      { id: "l2", name: "Party" },
    ],
    items: [],
  };
  card._activeList = "l1";
  return {
    cards,
    card,
    calls,
    names: () => calls.map((c) => c.name),
    setState: (next) => (current = next),
  };
}
const click = (card, dataset) => {
  const el = { dataset, closest: () => el };
  return card._handleClick({ target: el });
};
const input = (card, dataset, extra = {}) =>
  card._handleInput({ target: { dataset, hasAttribute: () => false, ...extra } });
const markup = (cards) => cards.document.markup;

async function openStatus(env, rules) {
  env.setState({ supported: true, rules, audit: [] });
  env.card._modal = null;
  env.card._view = "shopping";
  await click(env.card, { action: "sync-open" });
}

test("status panel renders every outcome as text with an icon and never says Done for non-success", async () => {
  const cases = [
    [withRule(), /Sent/, false],
    [withRule({ last_run: { ...RULE.last_run, outcome: "partial" } }), /Partly sent/, true],
    [withRule({ last_run: { ...RULE.last_run, outcome: "failed" } }), /Not sent/, true],
    [
      withRule({
        last_run: { ...RULE.last_run, outcome: "destination_unavailable" },
        destination: { ...RULE.destination, available: false },
        counts: { pending: 3 },
      }),
      /Bring is unavailable\. 3 items remain open in Mealie\./,
      true,
    ],
    [
      withRule({ last_run: { ...RULE.last_run, outcome: "source_unavailable" } }),
      /Mealie could not be reached/,
      true,
    ],
    [withRule({ counts: { needs_reconciliation: 2 } }), /Partly sent/, true],
    [
      withRule({ last_run: { ...RULE.last_run, outcome: "nothing_to_send", count: 0 } }),
      /Nothing to send/,
      false,
    ],
    [
      withRule({ last_run: { ...RULE.last_run, outcome: "reconciled" } }),
      /Checked against the destination/,
      false,
    ],
  ];
  for (const [rule, pattern, problem] of cases) {
    const env = syncCard();
    await openStatus(env, [rule]);
    const html = markup(env.cards);
    assert.match(html, pattern);
    assert.doesNotMatch(html, /\bDone\b/, "no success wording");
    assert.match(html, /<svg/, "state is never color alone");
    if (problem) assert.match(html, /role="alert"|Partly sent|Not sent/);
  }
});

test("status panel shows route, mode text, state line and pending count", async () => {
  const env = syncCard();
  await openStatus(env, [
    withRule({ name: "Weekly shop", mode: "move", paused: true, counts: { pending: 2 } }),
  ]);
  const html = markup(env.cards);
  assert.match(html, /Weekly groceries → Bring<\/p>/);
  assert.match(
    html,
    /Move <small[^>]*>Items are checked off in Mealie after the destination has confirmed them/,
  );
  assert.match(html, /Paused/);
  assert.match(html, /2 waiting/);
  assert.match(html, /data-action="sync-resume"/);
  assert.match(html, /2 minutes ago|minutes ago/);
});

test("a rule that is not activated offers the first batch review instead of Run now", async () => {
  const env = syncCard();
  await openStatus(env, [withRule({ activated: false })]);
  const html = markup(env.cards);
  assert.match(html, /Not activated yet/);
  assert.match(html, /Review and send first batch/);
  assert.doesNotMatch(html, /data-action="sync-run"/);
});

test("dialog markup carries role, aria-modal, label and live regions", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  const html = markup(env.cards);
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="sync-title"/);
  assert.match(html, /<h2 id="sync-title">Shopping sync<\/h2>/);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("setup flow saves the rule first, then sends the first batch with confirm_first_batch", async () => {
  const env = syncCard();
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  assert.equal(env.card._modal, "sync-setup");
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  await click(env.card, { action: "sync-preview" });
  const html = markup(env.cards);
  assert.match(html, /Save and send 1 item from Weekly groceries to Bring/);
  assert.match(html, /Skip, already there/);
  await click(env.card, { action: "sync-save", value: "send" });
  const order = env.names().filter((n) => ["sync_rule_save", "sync_run"].includes(n));
  assert.deepEqual(order, ["sync_rule_save", "sync_run"]);
  const save = env.calls.find((c) => c.name === "sync_rule_save").message;
  assert.equal(save.rule.source_list_id, "l1");
  assert.equal(save.rule.destination_entity_id, "todo.bring");
  assert.equal(save.rule.poll_interval_seconds, 120);
  assert.equal(JSON.stringify(save.rule.triggers), '{"after_atelier_add":true,"watch":false}');
  assert.equal(save.rule.duplicate_policy, "skip_exact");
  assert.equal(save.rule_id, undefined);
  const run = env.calls.find((c) => c.name === "sync_run").message;
  assert.equal(run.confirm_first_batch, true);
  assert.equal(run.rule_id, "r1");
  assert.equal(env.card._modal, "sync");
});

test("a dialog dismissed while the save runs is not reopened", async () => {
  let release;
  const env = syncCard({
    handlers: {
      sync_rule_save: () => new Promise((resolve) => (release = () => resolve({ rule: RULE }))),
    },
  });
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-setup-open", value: "r1" });
  const saving = click(env.card, { action: "sync-save", value: "changes" });
  env.card._modal = null;
  release();
  await saving;
  assert.equal(env.card._modal, null);
});

test("save without sending never calls sync_run", async () => {
  const env = syncCard();
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.plain" });
  await click(env.card, { action: "sync-save", value: "only" });
  assert.ok(env.names().includes("sync_rule_save"));
  assert.ok(!env.names().includes("sync_run"));
});

test("the first batch cannot be sent before the preview was seen", async () => {
  const env = syncCard();
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  assert.match(markup(env.cards), /data-action="sync-save" data-value="send" disabled/);
  await click(env.card, { action: "sync-save", value: "send" });
  assert.ok(!env.names().includes("sync_rule_save"));
});

test("setup shows the capability line and uses labelled fieldsets with real radio inputs", async () => {
  const env = syncCard();
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.plain" });
  const html = markup(env.cards);
  assert.match(html, /Supports notes: no/);
  assert.match(html, /<fieldset class="sync-fieldset"><legend class="sync-sr">Mode<\/legend>/);
  assert.equal((html.match(/<input type="radio"/g) || []).length, 5);
  assert.match(html, /<option value="todo\.bring"[^>]*>Bring<\/option>/);
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  assert.match(markup(env.cards), /Supports notes: yes/);
});

test("editing the source of an existing rule needs the reset confirmation and sends reset_records", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-setup-open", value: "r1" });
  input(env.card, { input: "sync-source" }, { value: "l2" });
  await click(env.card, { action: "sync-save", value: "changes" });
  assert.ok(!env.names().includes("sync_rule_save"), "blocked until confirmed");
  input(env.card, { input: "sync-reset" }, { checked: true });
  await click(env.card, { action: "sync-save", value: "changes" });
  const save = env.calls.find((c) => c.name === "sync_rule_save").message;
  assert.equal(save.reset_records, true);
  assert.equal(save.rule_id, "r1");
  assert.equal(save.expected_revision, 2);
});

test("save errors are shown through _errorText and keep the form open", async () => {
  const env = syncCard({
    handlers: {
      sync_rule_save: async () => {
        throw Object.assign(new Error("raw"), { code: "sync_source_taken" });
      },
    },
  });
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  await click(env.card, { action: "sync-save", value: "only" });
  assert.equal(env.card._modal, "sync-setup");
  assert.match(
    markup(env.cards),
    /role="alert"[^>]*>.*Another rule already uses this source list/s,
  );
});

test("_errorText maps known codes and falls back to the message or the generic text", () => {
  const { card } = syncCard();
  assert.match(card._errorText({ code: "sync_too_many_rules", message: "x" }), /at most 5/);
  assert.equal(
    card._errorText({ code: "unknown_code", message: "Plain message" }),
    "Plain message",
  );
  assert.equal(card._errorText({}), "Something went wrong.");
  assert.equal(card._errorText(undefined), "Something went wrong.");
});

test("invalid numbers show inline while typing, disable preview and save, and never reach the Bridge", async () => {
  const env = syncCard();
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  input(env.card, { input: "sync-debounce" }, { value: "2" });
  let html = markup(env.cards);
  assert.match(html, /Enter a whole number between 5 and 600\./);
  assert.match(html, /data-action="sync-preview" disabled/);
  assert.match(html, /data-value="only" disabled/);
  input(env.card, { input: "sync-poll" }, { value: "abc" });
  assert.match(markup(env.cards), /Enter a whole number between 1 and 60\./);
  await click(env.card, { action: "sync-preview" });
  await click(env.card, { action: "sync-save", value: "only" });
  assert.ok(!env.names().includes("sync_preview"));
  assert.ok(!env.names().includes("sync_rule_save"));
  assert.match(markup(env.cards), /role="alert"[^>]*>.*Fix the highlighted numbers/s);
  input(env.card, { input: "sync-debounce" }, { value: "30" });
  input(env.card, { input: "sync-poll" }, { value: "2" });
  html = markup(env.cards);
  assert.doesNotMatch(html, /Enter a whole number/);
  assert.doesNotMatch(html, /data-value="only" disabled/);
});

test("closing the setup while destinations load does not throw", async () => {
  let release;
  const env = syncCard({
    handlers: {
      sync_destinations: () => new Promise((resolve) => (release = () => resolve(DESTINATIONS))),
    },
  });
  await openStatus(env, []);
  const opening = click(env.card, { action: "sync-setup-open", value: "" });
  await click(env.card, { action: "sync-setup-cancel" });
  release();
  await opening;
  assert.equal(env.card._modal, "sync");
});

test("counts use singular and plural wording", async () => {
  const env = syncCard();
  await openStatus(env, [
    withRule({
      counts: { needs_reconciliation: 1 },
      destination: { ...RULE.destination, available: false },
    }),
  ]);
  const html = markup(env.cards);
  assert.match(html, /1 item remains open in Mealie\./);
  assert.match(html, /1 item may or may not have arrived\./);
  assert.doesNotMatch(html, /1 items/);
});

test("pending, preview total and poll hint use singular wording for one", async () => {
  const env = syncCard();
  await openStatus(env, [withRule({ counts: { pending: 1 } })]);
  assert.match(markup(env.cards), /1 waiting/);
  assert.doesNotMatch(markup(env.cards), /1 waiting items|1 items/);
  env.setState({ supported: true, rules: [], audit: [] });
  env.card._modal = null;
  await click(env.card, { action: "sync-open" });
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  input(env.card, { input: "sync-poll" }, { value: "1" });
  assert.match(markup(env.cards), /appear after up to 1 minute\./);
  env.calls.length = 0;
  const oneCandidate = { ...PREVIEW, lines: [PREVIEW.lines[0]], total_candidates: 1 };
  env.card._syncData().setup.preview = oneCandidate;
  env.card._render();
  assert.match(markup(env.cards), /1 open item in the source list/);
  for (const [key, count, pattern] of [
    ["syncPending", 1, /^1 waiting$/],
    ["syncPreviewTotal", 1, /^1 open item in/],
    ["syncTriggerWatchHint", 1, /up to 1 minute\.$/],
    ["syncTriggerWatchHint", 5, /up to 5 minutes\.$/],
  ])
    assert.match(env.card.tp(key, count, { total: count, interval: count, shown: 1 }), pattern);
  env.card._local = { language: "de" };
  assert.equal(env.card.tp("syncPending", 1), "1 wartet");
  assert.equal(env.card.tp("syncPending", 3), "3 warten");
  assert.match(env.card.tp("syncPreviewTotal", 1, { total: 1, shown: 1 }), /^1 offener Artikel/);
  assert.match(env.card.tp("syncTriggerWatchHint", 1, { interval: 1 }), /1 Minute\.$/);
});

test("run, pause, retry and review call the Bridge with the rule id", async () => {
  const env = syncCard({
    state: { supported: true, rules: [withRule({ counts: { failed: 1 } })], audit: [] },
  });
  await openStatus(env, [withRule({ counts: { failed: 1 } })]);
  await click(env.card, { action: "sync-run", value: "r1" });
  await click(env.card, { action: "sync-pause", value: "r1" });
  await click(env.card, { action: "sync-retry", value: "r1" });
  for (const name of ["sync_run", "sync_pause", "sync_retry"])
    assert.equal(env.calls.find((c) => c.name === name).message.rule_id, "r1", name);
  assert.equal(env.calls.find((c) => c.name === "sync_run").message.confirm_first_batch, undefined);
  await click(env.card, { action: "sync-review", value: "r1" });
  assert.equal(env.card._syncData().view, "review");
});

test("a partial run result is announced as partial, a queued run as queued", async () => {
  const env = syncCard({
    handlers: {
      sync_run: async () => ({
        outcome: "partial",
        sent: 3,
        skipped_duplicates: 1,
        merged: 0,
        failed: 1,
        needs_reconciliation: 0,
        pending_left: 2,
      }),
    },
  });
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-run", value: "r1" });
  assert.match(
    markup(env.cards),
    /Partly sent, some items need attention\. 3 sent, 1 skipped, 1 failed, 2 still waiting\./,
  );
  assert.doesNotMatch(markup(env.cards), /\bDone\b/);
  env.card._ws = async () => ({ queued: true });
  await click(env.card, { action: "sync-run", value: "r1" });
  assert.match(markup(env.cards), /already in progress/);
});

test("review lists problem and waiting records and resolves them", async () => {
  const records = [
    {
      key: "r1:a",
      rule_id: "r1",
      state: "changed_after_send",
      title: "Milk",
      description: "",
      last_error: null,
    },
    {
      key: "r1:b",
      rule_id: "r1",
      state: "failed",
      title: "Eggs",
      description: "",
      last_error: "destination_rejected",
    },
    {
      key: "r1:c",
      rule_id: "r1",
      state: "pending",
      title: "Rice",
      description: "",
      last_error: null,
    },
  ];
  const env = syncCard({ handlers: { sync_records: async () => ({ records }) } });
  await openStatus(env, [withRule({ counts: { failed: 1, changed_after_send: 1, pending: 1 } })]);
  await click(env.card, { action: "sync-review", value: "r1" });
  const html = markup(env.cards);
  assert.match(html, /Items to review/);
  assert.match(html, /Waiting to be sent/);
  assert.match(html, /Changed after sending/);
  assert.match(html, /The destination refused the item\./);
  assert.equal(
    (html.match(/data-action="sync-dismiss"/g) || []).length,
    1,
    "only conflicts are resolvable",
  );
  await click(env.card, { action: "sync-dismiss", value: "r1:a", rule: "r1" });
  const resolve = env.calls.find((c) => c.name === "sync_resolve").message;
  assert.deepEqual(
    [resolve.rule_id, resolve.record_key, resolve.action],
    ["r1", "r1:a", "dismiss"],
  );
  await click(env.card, { action: "sync-resend", value: "r1:a", rule: "r1" });
  assert.equal(env.calls.filter((c) => c.name === "sync_resolve").at(-1).message.action, "resend");
});

test("a user without write grants sees aria-disabled actions with the reason and cannot trigger them", async () => {
  const env = syncCard({ permissions: { can_write: false, can_manage: false } });
  await openStatus(env, [withRule({ counts: { failed: 1 } })]);
  const html = markup(env.cards);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /may view the sync but not change it/);
  assert.doesNotMatch(html, /data-action="sync-delete"|data-action="sync-setup-open"/);
  await click(env.card, { action: "sync-run", value: "r1" });
  await click(env.card, { action: "sync-pause", value: "r1" });
  await click(env.card, { action: "sync-dismiss", value: "r1:a", rule: "r1" });
  await click(env.card, { action: "sync-resend", value: "r1:a", rule: "r1" });
  assert.ok(
    !env.names().some((n) => ["sync_run", "sync_pause", "sync_resolve"].includes(n)),
    "write actions are inert without a write grant",
  );
});

test("deleting a rule asks for confirmation first", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-delete", value: "r1" });
  assert.match(markup(env.cards), /Delete this rule\?/);
  assert.ok(!env.names().includes("sync_rule_delete"));
  await click(env.card, { action: "sync-delete-confirm", value: "r1" });
  assert.ok(env.names().includes("sync_rule_delete"));
});

test("the shopping view shows the entry button with a text badge for problems", async () => {
  const env = syncCard({
    state: {
      supported: true,
      rules: [withRule({ counts: { failed: 1, needs_reconciliation: 1, changed_after_send: 1 } })],
      audit: [],
    },
  });
  env.card._view = "shopping";
  await env.card._syncLoad();
  const html = markup(env.cards);
  assert.match(html, /data-action="sync-open"/);
  assert.match(html, /3 to review/);
});

test("standalone app shows the HA-only explanation and makes no sync call", async () => {
  const env = syncCard({ features: { shopping_sync: false } });
  env.card._view = "shopping";
  env.card._render();
  assert.match(markup(env.cards), /data-action="sync-open"/);
  await click(env.card, { action: "sync-open" });
  assert.equal(env.card._modal, "sync-info");
  assert.match(markup(env.cards), /needs a connected Bring! account \(web app\) or Home Assistant/);
  assert.match(markup(env.cards), /Without a connection the app does not send shopping data/);
  assert.doesNotMatch(
    markup(env.cards),
    /sync-bring/,
    "the Home Assistant card has no Bring setup",
  );
  await click(env.card, { action: "sync-setup-open", value: "" });
  assert.equal(env.card._modal, "sync-info");
  assert.deepEqual(
    env.names().filter((n) => n.startsWith("sync_")),
    [],
  );
});

/** Web app companion entry: sync off until an administrator connects a Bring! account. */
function bringCard({ state = "disconnected", admin = true, readOnly = false, handlers = {} } = {}) {
  const env = syncCard({
    features: { shopping_sync: state !== "disconnected", bring_setup: true },
    permissions: { bring: { state }, can_manage: admin, read_only: readOnly },
    handlers,
  });
  env.card._view = "shopping";
  return env;
}
const typeInto = (card, key, value) => input(card, { input: `sync-bring-${key}` }, { value });

const CONNECTED_STATUS = (bring = { state: "connected", account: "c•••@example.test" }) => ({
  entries: [
    {
      entry_id: "e1",
      can_write: true,
      can_manage: true,
      features: { shopping_sync: true, bring_setup: true },
      bring,
    },
  ],
});
const submit = (card, form = "bring-login") => {
  const el = { dataset: { form }, closest: () => el };
  return card._handleSubmit({ target: el, preventDefault() {} });
};

test("web app: the shopping view offers 'Connect to Bring!' and opens the wizard at the sign-in", async () => {
  const env = bringCard();
  env.card._render();
  assert.match(markup(env.cards), /data-action="sync-bw-open"[^>]*>[^]*Connect to Bring!/);
  await click(env.card, { action: "sync-bw-open" });
  const html = markup(env.cards);
  assert.equal(env.card._modal, "sync-wizard");
  assert.match(html, /Step 1 of 5: Sign in/);
  assert.match(html, /<form[^>]*data-form="bring-login"/);
  assert.match(html, /type="email"[^>]*autocomplete="username"/);
  assert.match(html, /type="password"[^>]*autocomplete="current-password"/);
  assert.match(html, /data-action="sync-bw-reveal"[^>]*aria-pressed="false"/);
  assert.match(html, /never your password/);
  assert.equal(env.names().length, 0, "no call before the user signs in");
});

test("web app: other users and read-only mode get no wizard and no form", async () => {
  for (const options of [{ admin: false }, { readOnly: true }]) {
    const env = bringCard(options);
    env.card._render();
    await click(env.card, { action: "sync-bw-open" });
    assert.equal(env.card._modal, "sync-info");
    assert.doesNotMatch(markup(env.cards), /type="password"/);
    await submit(env.card);
    assert.doesNotMatch(env.names().join(), /bring_connect/);
  }
});

test("web app: an empty sign-in shows the way out and makes no call", async () => {
  const env = bringCard();
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  await submit(env.card);
  assert.match(markup(env.cards), /role="alert"[^]*Enter the e-mail address and the password/);
  assert.doesNotMatch(env.names().join(), /bring_connect/);
});

test("web app: the wizard walks sign-in, lists, preview and the confirmed first delivery", async () => {
  const lists = {
    entities: [
      { entity_id: "bring:a", name: "Party", platform: "bring", available: true },
      { entity_id: "bring:b", name: "Einkauf", platform: "bring", available: true },
    ],
  };
  const env = bringCard({
    handlers: {
      bring_connect: () => ({ state: "connected" }),
      status: () =>
        CONNECTED_STATUS({
          state: "connected",
          account: "c•••@example.test",
          default_list: "bring:b",
        }),
      sync_destinations: () => lists,
    },
  });
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  typeInto(env.card, "email", " cook@example.test ");
  typeInto(env.card, "password", "fixture-password");
  await submit(env.card);
  const call = env.calls.find((c) => c.name === "bring_connect");
  assert.equal(call.message.email, "cook@example.test");
  assert.equal(call.message.password, "fixture-password");
  assert.equal(env.card._syncData().bring.password, "");
  assert.equal(env.card._modal, "sync-wizard");
  const w = env.card._bwData();
  assert.equal(w.step, 2);
  assert.equal(w.bringList, "bring:b", "the usual list is preselected");
  assert.match(markup(env.cards), /Your usual list/);
  assert.equal(w.mealieList, "l1", "the open Mealie list is preselected");
  assert.equal(w.skipDuplicates, true);
  assert.equal(w.afterAdd, true);
  assert.doesNotMatch(markup(env.cards), /fixture-password/);
  await click(env.card, { action: "sync-bw-next" });
  assert.equal(w.step, 3);
  assert.doesNotMatch(markup(env.cards), /id="bw-more-panel"/);
  await click(env.card, { action: "sync-bw-more" });
  assert.match(markup(env.cards), /id="bw-more-panel"/);
  await click(env.card, { action: "sync-bw-next" });
  assert.equal(w.step, 4);
  const preview = env.calls.find((c) => c.name === "sync_preview");
  assert.equal(preview.message.rule.destination_entity_id, "bring:b");
  assert.equal(preview.message.rule.duplicate_policy, "skip_exact");
  assert.match(markup(env.cards), /This item goes to your Bring! list &quot;Einkauf&quot;\./);
  assert.match(markup(env.cards), /1 item is skipped\./);
  assert.doesNotMatch(markup(env.cards), /0 skipped|0 failed|Sent: 0/);
  await click(env.card, { action: "sync-bw-next" });
  assert.equal(w.step, 5);
  assert.doesNotMatch(env.names().join(), /sync_rule_save/, "nothing is saved before the release");
  await click(env.card, { action: "sync-bw-send" });
  const run = env.calls.find((c) => c.name === "sync_run");
  assert.equal(run.message.confirm_first_batch, true);
  assert.match(markup(env.cards), /All set/);
  assert.match(markup(env.cards), /1 item is now on &quot;Einkauf&quot;\./);
  assert.doesNotMatch(markup(env.cards), /bw-stepline/, "the heading is the only All set");
  assert.doesNotMatch(
    markup(env.cards),
    /class="sync-result"/,
    "a clean delivery shows no counters",
  );
});

test("web app: a wrong password and a Bring! outage show their way out in the dialog", async () => {
  for (const [code, text, credentials] of [
    ["bring_auth", /reset the password in the Bring! app/, true],
    ["bring_rate_limit", /Wait a few minutes/, false],
    ["bring_network", /check the internet connection of your server/, false],
  ]) {
    const env = bringCard({
      handlers: { bring_connect: () => Promise.reject(Object.assign(new Error("x"), { code })) },
    });
    env.card._render();
    await click(env.card, { action: "sync-bw-open" });
    typeInto(env.card, "email", "cook@example.test");
    typeInto(env.card, "password", "wrong-password");
    await submit(env.card);
    assert.equal(env.card._bwData().step, 1);
    const html = markup(env.cards);
    assert.match(html, text);
    // The kept password stays in its masked field and never shows up in any text.
    assert.equal(html.includes("wrong-password"), !credentials, code);
    assert.doesNotMatch(html.replace(/<input[^>]*type="password"[^>]*>/g, ""), /wrong-password/);
    // Only a refused e-mail or password marks the fields; an outage is just the banner.
    assert.equal(/aria-invalid="true"/.test(html), credentials, code);
    assert.match(html, /id="bw-login-error"/);
    assert.equal((html.match(/aria-describedby="bw-login-error"/g) || []).length, 2);
    assert.equal(env.card._syncData().bring.password, credentials ? "" : "wrong-password");
    assert.equal(/data-action="sync-bw-login-retry"/.test(html), !credentials, code);
  }
});

test("web app: a Bring! outage keeps the password in memory so one click retries", async () => {
  const handlers = {
    bring_connect: () => Promise.reject(Object.assign(new Error("x"), { code: "bring_network" })),
    status: () => CONNECTED_STATUS(),
  };
  const env = bringCard({ handlers });
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  typeInto(env.card, "email", "cook@example.test");
  typeInto(env.card, "password", "fixture-password");
  await submit(env.card);
  handlers.bring_connect = () => ({ state: "connected" });
  await click(env.card, { action: "sync-bw-login-retry" });
  const calls = env.calls.filter((c) => c.name === "bring_connect");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].message.password, "fixture-password", "no typing for the retry");
  assert.equal(env.card._bwData().step, 2);
  assert.equal(env.card._syncData().bring.password, "", "dropped after the sign-in");
});

test("web app: closing the dialog drops a password kept for a retry", async () => {
  const env = bringCard({
    handlers: {
      bring_connect: () => Promise.reject(Object.assign(new Error("x"), { code: "bring_network" })),
    },
  });
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  typeInto(env.card, "email", "cook@example.test");
  typeInto(env.card, "password", "fixture-password");
  await submit(env.card);
  assert.equal(env.card._syncData().bring.password, "fixture-password");
  await click(env.card, { action: "close-modal" });
  assert.equal(env.card._syncData().bring.password, "");
});

test("web app: a double submit sends the sign-in only once", async () => {
  let release;
  const env = bringCard({
    handlers: {
      bring_connect: () =>
        new Promise((resolve) => (release = () => resolve({ state: "connected" }))),
      status: () => CONNECTED_STATUS(),
    },
  });
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  typeInto(env.card, "email", "cook@example.test");
  typeInto(env.card, "password", "fixture-password");
  const first = submit(env.card);
  await submit(env.card);
  assert.match(markup(env.cards), /type="submit"[^>]*disabled[^>]*aria-busy="true"/);
  release();
  await first;
  assert.equal(env.calls.filter((c) => c.name === "bring_connect").length, 1);
});

test("web app: a dead stored session offers a one-step sign-in that keeps the rules", async () => {
  const env = bringCard({ state: "reauth" });
  await openStatus(env, [withRule()]);
  const html = markup(env.cards);
  assert.match(html, /Sign-in needed/);
  assert.match(html, /Your rules and waiting items stay as they are/);
  assert.match(html, /data-form="bring-login"/);
  assert.match(html, /Sign in again/);
  assert.match(html, /data-action="sync-run"/, "the rule is still listed");
});

test("web app: a Bring! list that is gone tells how to choose another", async () => {
  const env = bringCard({ state: "connected" });
  const rule = withRule({
    destination: { ...RULE.destination, available: false, reason: "missing" },
  });
  await openStatus(env, [rule]);
  const html = markup(env.cards);
  assert.match(html, /The Bring! list &quot;Bring&quot; no longer exists\./);
  assert.doesNotMatch(html, /unreachable|cannot be reached/);
  assert.match(html, /data-action="sync-bw-pick-list" data-value="r1"/);
});

test("web app: an unreachable Bring! asks to wait instead of choosing another list", async () => {
  const env = bringCard({ state: "connected" });
  const rule = withRule({
    destination: { ...RULE.destination, available: false, reason: "unreachable" },
  });
  await openStatus(env, [rule]);
  const html = markup(env.cards);
  assert.match(html, /Bring! cannot be reached right now/);
  assert.match(html, /sent as soon as Bring! answers again/);
  assert.doesNotMatch(html, /no longer exists/);
});

test("web app: a failed last run names the unreachable Bring! even when the lists load", async () => {
  const env = bringCard({ state: "connected" });
  const rule = withRule({
    last_run: { at: new Date().toISOString(), outcome: "destination_unavailable" },
  });
  await openStatus(env, [rule]);
  assert.match(markup(env.cards), /Bring! cannot be reached right now/);
});

test("web app: the connected state shows the masked account and disconnecting asks first", async () => {
  const env = bringCard({
    state: "connected",
    handlers: {
      bring_disconnect: () => ({ state: "disconnected" }),
      status: () => ({
        entries: [
          {
            entry_id: "e1",
            can_write: true,
            can_manage: true,
            features: { shopping_sync: false, bring_setup: true },
            bring: { state: "disconnected" },
          },
        ],
      }),
    },
  });
  env.card._status.entries[0].bring.account = "c•••@example.test";
  await openStatus(env, [withRule()]);
  assert.match(markup(env.cards), /c•••@example\.test/);
  assert.match(markup(env.cards), /Last delivery/);
  await click(env.card, { action: "sync-bring-disconnect-ask" });
  assert.match(markup(env.cards), /Really disconnect\?/);
  assert.doesNotMatch(env.names().join(), /bring_disconnect/);
  await click(env.card, { action: "sync-bring-disconnect-cancel" });
  assert.doesNotMatch(markup(env.cards), /Really disconnect\?/);
  await click(env.card, { action: "sync-bring-disconnect-ask" });
  await click(env.card, { action: "sync-bring-disconnect" });
  assert.ok(env.names().includes("bring_disconnect"));
  assert.equal(env.card._modal, null);
});

test("web app: the disconnect question is neutral and only its action is dangerous", async () => {
  const env = bringCard({ state: "connected" });
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-bring-disconnect-ask" });
  const html = markup(env.cards);
  const confirm = html.match(
    /<div class="notice bw-confirm"[^]*?data-action="sync-bring-disconnect"[^>]*>/,
  )?.[0];
  assert.ok(confirm, "the question is a plain notice, not an error notice");
  assert.doesNotMatch(confirm, /notice error/);
  assert.ok(
    confirm.indexOf("sync-bring-disconnect-cancel") <
      confirm.indexOf('data-action="sync-bring-disconnect"'),
    "Cancel on the left, the destructive action on the right",
  );
  assert.match(html, /<button class="btn danger" data-action="sync-bring-disconnect"/);
});

test("web app: the account card does not say Connected after a failed run", async () => {
  const pill = (html) => html.match(/<span class="bw-pill">.*?<\/span>/s)?.[0] || "";
  const gone = bringCard({ state: "connected" });
  await openStatus(gone, [
    withRule({
      destination: { ...RULE.destination, available: false, reason: "missing" },
      last_run: { at: new Date().toISOString(), outcome: "destination_missing" },
    }),
  ]);
  let html = markup(gone.cards);
  assert.match(pill(html), /Bring! list missing/);
  assert.doesNotMatch(pill(html), /Connected/);
  assert.match(html, /bw-account is-warn/);
  assert.match(html, /<dt>Last delivery<\/dt><dd>[^]*?Bring! list no longer exists, just now/);
  assert.match(html, /<dt>Last delivery<\/dt><dd>None yet<\/dd>/, "a failed run is no delivery");
  const failed = bringCard({ state: "connected" });
  await openStatus(failed, [
    withRule({ last_run: { at: new Date().toISOString(), outcome: "failed" } }),
  ]);
  assert.match(pill(markup(failed.cards)), /Needs a look/);
  const fine = bringCard({ state: "connected" });
  await openStatus(fine, [withRule()]);
  html = markup(fine.cards);
  assert.match(pill(html), /Connected/);
  assert.match(html, /<dt>Last delivery<\/dt><dd>2 minutes ago<\/dd>/);
});

test("web app: signing in again needs only the password, the address is prefilled", async () => {
  const handlers = {
    bring_connect: () => ({ state: "connected" }),
    status: () => CONNECTED_STATUS(),
  };
  const env = bringCard({
    state: "reauth",
    handlers,
    admin: true,
  });
  env.card._status.entries[0].bring.email = "cook@example.test";
  await openStatus(env, [withRule()]);
  const html = markup(env.cards);
  assert.match(html, /name="username"[^>]*value="cook@example\.test"/);
  assert.doesNotMatch(html, /name="username"[^>]*data-autofocus/);
  assert.match(html, /name="password"[^>]*data-autofocus/, "the password gets the focus");
  typeInto(env.card, "password", "fixture-password");
  await submit(env.card);
  const call = env.calls.find((c) => c.name === "bring_connect");
  assert.equal(call.message.email, "cook@example.test");
  assert.equal(call.message.password, "fixture-password");
});

test("web app: a first sign-in has no prefilled address and focuses the e-mail field", async () => {
  const env = bringCard();
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  const html = markup(env.cards);
  assert.match(html, /name="username"[^>]*value=""[^>]*data-autofocus/);
  assert.doesNotMatch(html, /name="password"[^>]*data-autofocus/);
});

test("web app: the rule card is a key/value block with a primary Send now and a danger delete", async () => {
  const env = bringCard({ state: "connected" });
  const rule = withRule({ destination: { ...RULE.destination, name: "Einkauf" } });
  await openStatus(env, [rule]);
  const html = markup(env.cards);
  const card = html.match(/<section class="editor-card sync-rule".*?<\/section>/s)?.[0] || "";
  assert.match(card, /<dl class="bw-facts sync-facts">/);
  assert.doesNotMatch(card, /<p class="sync-route">Bring!<\/p>/, "no lone platform line");
  assert.doesNotMatch(card, /sync-state|sync-mode|sync-count/);
  assert.match(card, /<button class="btn tiny primary" data-action="sync-run"/);
  assert.match(card, /<button class="btn tiny danger" data-action="sync-delete"/);
  assert.doesNotMatch(card, /<button class="btn tiny " data-action="sync-run"/);
});

test("web app: a deleted Bring! list offers to pick another one and keeps the rule", async () => {
  const lists = {
    entities: [
      { entity_id: "bring:a", name: "Party", platform: "bring", available: true },
      { entity_id: "bring:b", name: "Wochenmarkt", platform: "bring", available: true },
    ],
  };
  const env = bringCard({
    state: "connected",
    handlers: { sync_destinations: () => lists },
  });
  env.card._status.entries[0].bring.default_list = "bring:b";
  const rule = withRule({
    destination: { ...RULE.destination, available: false, reason: "missing" },
  });
  await openStatus(env, [rule]);
  env.setState({ supported: true, rules: [rule], audit: [] });
  await click(env.card, { action: "sync-bw-pick-list", value: "r1" });
  assert.equal(env.card._modal, "sync-wizard");
  const w = env.card._bwData();
  assert.equal(w.step, 2, "the wizard opens at the list step");
  assert.equal(w.fixRule.id, "r1");
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(w.bringList, "bring:b");
  let html = markup(env.cards);
  assert.match(html, /Choose another Bring! list/);
  assert.match(html, /data-action="sync-bw-save-list"/);
  assert.doesNotMatch(html, /bw-stepline/, "a one step change has no step list");
  await click(env.card, { action: "sync-bw-save-list" });
  const save = env.calls.find((c) => c.name === "sync_rule_save");
  assert.equal(save.message.rule_id, "r1", "the existing rule is changed, not a new one made");
  assert.equal(save.message.expected_revision, 2);
  assert.equal(save.message.rule.destination_entity_id, "bring:b");
  assert.equal(save.message.rule.source_list_id, "l1");
  assert.equal(save.message.rule.mode, "copy");
  assert.equal(save.message.reset_records, true);
  assert.equal(env.card._modal, "sync");
});

test("web app: a deleted list can only be replaced by an administrator who may write", async () => {
  const env = bringCard({ state: "connected", readOnly: true });
  const rule = withRule({
    destination: { ...RULE.destination, available: false, reason: "missing" },
  });
  await openStatus(env, [rule]);
  assert.doesNotMatch(markup(env.cards), /sync-bw-pick-list/);
  await click(env.card, { action: "sync-bw-pick-list", value: "r1" });
  assert.notEqual(env.card._modal, "sync-wizard");
});

test("web app: wizard copy quotes list names, hides zero counters and hints at tidy duplicates", async () => {
  const env = bringCard({
    handlers: {
      bring_connect: () => ({ state: "connected" }),
      status: () => CONNECTED_STATUS(),
      sync_destinations: () => ({
        entities: [{ entity_id: "bring:b", name: "Einkauf", platform: "bring", available: true }],
      }),
    },
  });
  env.card._render();
  await click(env.card, { action: "sync-bw-open" });
  typeInto(env.card, "email", "cook@example.test");
  typeInto(env.card, "password", "fixture-password");
  await submit(env.card);
  await click(env.card, { action: "sync-bw-next" });
  let html = markup(env.cards);
  assert.match(html, /If something is already on the Bring! list, it is not added twice\./);
  assert.match(
    html,
    /<button type="button" class="bw-more-toggle"/,
    "a disclosure, not a pill button",
  );
  await click(env.card, { action: "sync-bw-more" });
  html = markup(env.cards);
  assert.match(html, /id="bw-more-panel"/);
  await click(env.card, { action: "sync-bw-next" });
  html = markup(env.cards);
  assert.match(
    html,
    /This item goes to your Bring! list &quot;Einkauf&quot;\. Nothing is sent yet\./,
  );
  assert.doesNotMatch(html, /\b0 (skipped|failed|to send)/);
  env.card._hass.language = "de";
  env.card._render();
  html = markup(env.cards);
  assert.match(html, /Dieser Eintrag geht an deine Bring!-Liste „Einkauf“\./);
});

test("Home Assistant never shows the Bring! connection", async () => {
  const env = syncCard({ features: { shopping_sync: false } });
  env.card._view = "shopping";
  env.card._render();
  assert.doesNotMatch(markup(env.cards), /sync-bw-open|Connect to Bring/);
  await click(env.card, { action: "sync-bw-open" });
  assert.notEqual(env.card._modal, "sync-wizard");
});

test("an older Bridge without features hides the sync entry point", () => {
  const env = syncCard({ features: null });
  env.card._view = "shopping";
  env.card._render();
  assert.doesNotMatch(markup(env.cards), /sync-open/);
});

test("polling runs every 10 s in the modal, every 60 s on the shopping view, and stops on close", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  assert.equal(env.card._syncPollMs, 10000);
  await click(env.card, { action: "close-modal" });
  assert.equal(env.card._modal, null);
  assert.equal(env.card._syncPollMs, 60000, "shopping view with a rule keeps the slow poll");
  env.card._view = "recipes";
  env.card._render();
  assert.equal(env.card._syncPollMs, 0, "hidden shopping view stops polling");
  env.card._view = "shopping";
  env.card._render();
  assert.equal(env.card._syncPollMs, 60000);
  env.card.disconnectedCallback();
  assert.equal(env.card._syncPollMs, 0);
});

test("a poll tick skips hidden pages and reloads the state when visible", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  const before = env.names().filter((n) => n === "sync_state").length;
  env.cards.document.visibilityState = "hidden";
  await env.card._syncPollTick();
  assert.equal(env.names().filter((n) => n === "sync_state").length, before);
  env.cards.document.visibilityState = "visible";
  await env.card._syncPollTick();
  assert.equal(env.names().filter((n) => n === "sync_state").length, before + 1);
});

test("the permission error re-fetches status once", async () => {
  let statusCalls = 0;
  const env = syncCard({
    handlers: {
      sync_pause: async () => {
        throw Object.assign(new Error("denied"), { code: "write_not_permitted" });
      },
      status: async () => {
        statusCalls++;
        return {
          entries: [
            {
              entry_id: "e1",
              can_write: false,
              can_manage: false,
              features: { shopping_sync: true },
            },
          ],
        };
      },
    },
  });
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-pause", value: "r1" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(statusCalls, 1);
  assert.equal(env.card._permissions.can_write, false);
});

test("setup shows neutral text until a destination is chosen and never a dangling arrow", async () => {
  const env = syncCard();
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  const html = markup(env.cards);
  assert.match(html, /Save and send</);
  assert.doesNotMatch(html, /Save and send \d+ items?/);
  assert.doesNotMatch(html, /placeholder="[^"]*→/);
  assert.equal(env.card._syncDraftRequest(env.card._syncData().setup).name, "Weekly groceries");
});

test("destination labels use friendly platform names and drop a repeated platform", async () => {
  const env = syncCard({
    handlers: {
      sync_destinations: async () => ({
        entities: [
          { entity_id: "todo.sl", name: "Shopping list", platform: "shopping_list", supports: {} },
          { entity_id: "todo.x", name: "Home", platform: "local_todo", supports: {} },
        ],
      }),
    },
  });
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  const html = markup(env.cards);
  assert.match(html, />Shopping list<\/option>/);
  assert.match(html, />Home · Local todo<\/option>/);
  assert.doesNotMatch(html, /shopping_list|local_todo/);
});

test("run result has no repeated word, shows a success icon and says just now", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-run", value: "r1" });
  const html = markup(env.cards);
  // A calm success is read out to screen readers only; the rule card shows the last run.
  assert.match(html, /<p class="sync-sr">1 sent\.<\/p>/);
  assert.doesNotMatch(html, /class="sync-result"/);
  assert.equal(env.card._syncRelative(new Date().toISOString()), "just now");
  assert.match(html, /Nothing waiting/);
});

test("a run that failed or leaves items waiting keeps a visible result line with an icon", async () => {
  const env = syncCard({
    handlers: {
      sync_run: async () => ({ rule_id: "r1", outcome: "sent", sent: 1, pending_left: 2 }),
    },
  });
  await openStatus(env, [withRule()]);
  await click(env.card, { action: "sync-run", value: "r1" });
  const html = markup(env.cards);
  assert.match(html, /<p class="sync-result"><svg[^>]*><path d="m5 12 5 5L20 7"/);
  assert.match(html, /<\/svg> 1 sent, 2 still waiting\.<\/p>/);
});

test("review has one title, a distinct group heading and a back arrow that points back", async () => {
  const env = syncCard({
    handlers: {
      sync_records: async () => ({
        records: [{ key: "r1:a", rule_id: "r1", state: "failed", title: "Milk", description: "" }],
      }),
    },
  });
  await openStatus(env, [withRule({ counts: { failed: 1 } })]);
  await click(env.card, { action: "sync-review", value: "r1" });
  const html = markup(env.cards);
  // The aria-hidden header bar repeats the title for sighted users only, so it is not a second title.
  const exposed = html.replace(/<div class="modal-bar-title" aria-hidden="true">.*?<\/div>/, "");
  assert.equal((exposed.match(/Items to review/g) || []).length, 1);
  assert.match(html, /<div class="modal-bar-title" aria-hidden="true">Items to review<\/div>/);
  assert.match(html, /<h3>Needs attention<\/h3>/);
  assert.match(html, /class="btn sync-back"/);
});

test("first-batch send shows a failure icon, not a success check, and no doubled word", async () => {
  const env = syncCard({
    handlers: {
      sync_run: async () => ({ rule_id: "r1", outcome: "failed", sent: 0, failed: 1 }),
    },
  });
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.bring" });
  await click(env.card, { action: "sync-preview" });
  await click(env.card, { action: "sync-save", value: "send" });
  const html = markup(env.cards);
  const result = html.match(/<p class="sync-result">.*?<\/p>/s)?.[0] || "";
  assert.ok(result, "result line renders");
  assert.doesNotMatch(result, /m5 12 5 5L20 7/);
});

test("rule card keeps the state line in plain flow (no stranded separator) and no repeated route", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  const html = markup(env.cards);
  const facts = html.match(/<dl class="bw-facts sync-facts">.*?<\/dl>/s)?.[0] || "";
  assert.ok(facts, "the rule is a key/value block like the account card");
  const rows = [...facts.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/gs)].map((m) => m[1]);
  assert.deepEqual(rows, ["Mode", "Status", "Waiting", "Last run"]);
  assert.doesNotMatch(facts, /·/);
  assert.match(facts, /<dt>Waiting<\/dt><dd>Nothing waiting<\/dd>/);
  assert.equal((html.match(/Weekly groceries → Bring/g) || []).length, 1);
});

test("run result labels every number, in both languages", async () => {
  const env = syncCard({
    handlers: {
      sync_run: async () => ({ rule_id: "r1", outcome: "failed", sent: 0, failed: 1 }),
    },
  });
  await openStatus(env, [withRule()]);
  assert.match(
    env.card._syncResultText({ outcome: "failed", sent: 0, failed: 1 }),
    /^Not sent\. 1 failed\.$/,
  );
  env.card._hass.language = "de";
  const de = env.card._syncResultText({ outcome: "failed", sent: 0, failed: 1 });
  assert.equal(de, "Nicht gesendet. 1 fehlgeschlagen.");
});

test("the built-in Shopping list is shown by its localised name without a repeated pair", async () => {
  const env = syncCard();
  env.card._hass.language = "de";
  const rule = withRule({
    name: "Weekly groceries → Einkaufsliste",
    destination: {
      entity_id: "todo.sl",
      name: "Shopping list",
      platform: "shopping_list",
      available: true,
      supports: {},
    },
  });
  await openStatus(env, [rule]);
  const html = markup(env.cards);
  assert.doesNotMatch(html, /Shopping list/);
  assert.doesNotMatch(html, /Einkaufsliste · Einkaufsliste/);
  assert.equal(env.card._syncDestinationLabel("Shopping list", "shopping_list"), "Einkaufsliste");
});

test("a rule named after its route still shows the platform that the title does not", () => {
  const card = syncCard().card;
  const named = (name) => withRule({ name });
  assert.match(
    card._syncRouteHtml(named("Weekly groceries → Home"), { platform: "local_todo" }, "Home"),
    /<p class="sync-route">Local todo<\/p>/,
  );
  assert.equal(card._syncRouteHtml(named("Weekly groceries → Home"), {}, "Home"), "");
  assert.match(
    card._syncRouteHtml(named("Groceries"), { platform: "bring" }, "Bring"),
    /<p class="sync-route">Weekly groceries → Bring<\/p>/,
  );
  assert.match(
    card._syncRouteHtml(named("Groceries"), { platform: "local_todo" }, "Home"),
    /Weekly groceries → Home · Local todo/,
  );
});

const BUILT_IN = {
  entities: [
    {
      entity_id: "todo.sl",
      name: "Shopping list",
      platform: "shopping_list",
      available: true,
      supports: { create: true, description: false, update: false },
    },
  ],
};

test("setup in German names the built-in list in the default rule name and the send button", async () => {
  const env = syncCard({ handlers: { sync_destinations: async () => BUILT_IN } });
  env.card._hass.language = "de";
  await openStatus(env, []);
  await click(env.card, { action: "sync-setup-open", value: "" });
  input(env.card, { input: "sync-destination" }, { value: "todo.sl" });
  const draft = env.card._syncData().setup;
  assert.equal(env.card._syncDraftRequest(draft).name, "Weekly groceries → Einkaufsliste");
  await click(env.card, { action: "sync-preview" });
  const html = markup(env.cards);
  assert.match(html, /an Einkaufsliste senden/);
  assert.doesNotMatch(html, /Shopping list/);
});

test("a rule card never shows the built-in list under two names", async () => {
  const env = syncCard();
  env.card._hass.language = "de";
  const destination = {
    entity_id: "todo.sl",
    name: "Shopping list",
    platform: "shopping_list",
    available: true,
    supports: {},
  };
  for (const name of ["Weekly groceries → Shopping list", "Weekly groceries → Einkaufsliste"]) {
    await openStatus(env, [withRule({ name, destination })]);
    const html = markup(env.cards);
    assert.match(html, /<h3 id="sync-rule-r1">Weekly groceries → Einkaufsliste<\/h3>/);
    assert.doesNotMatch(html, /Shopping list/);
    assert.equal((html.match(/Weekly groceries → Einkaufsliste/g) || []).length, 1);
  }
});

test("a built-in list named in the server language is shown by the UI language, both ways", () => {
  const env = syncCard();
  for (const [language, label] of [
    ["en", "Shopping list"],
    ["de", "Einkaufsliste"],
  ]) {
    env.card._hass.language = language;
    for (const name of ["Shopping list", "Einkaufsliste"]) {
      assert.equal(
        env.card._syncDestinationName(name, "shopping_list"),
        label,
        `${language} ${name}`,
      );
      assert.equal(
        env.card._syncDestinationLabel(name, "shopping_list"),
        label,
        `${language} ${name}`,
      );
    }
    assert.equal(env.card._syncDestinationName("Einkaufsliste", "bring"), "Einkaufsliste");
  }
});

test("a plain success does not repeat the word Sent", () => {
  const card = syncCard().card;
  assert.equal(card._syncResultText({ outcome: "sent", sent: 3 }), "3 sent.");
  card._hass.language = "de";
  assert.equal(card._syncResultText({ outcome: "sent", sent: 3 }), "3 gesendet.");
  assert.equal(
    card._syncResultText({ outcome: "nothing_to_send" }),
    "Nichts zu senden.",
    "no zero counters",
  );
});

test("the sync dialog carries the class that scopes its round close button", async () => {
  const env = syncCard();
  await openStatus(env, [withRule()]);
  assert.match(env.card._syncModalHtml(), /class="modal sync-modal /);
  const css = readFileSync(
    new URL("../src/design-system/shopping-sync.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.modal\.sync-modal > \.modal-close \{[^}]*border-radius: 50%/);
  assert.doesNotMatch(css, /:not\(:has\(> \.modal-hero/);
});

const builtInRule = (name) =>
  withRule({
    name,
    destination_entity_id: "todo.sl",
    destination: {
      entity_id: "todo.sl",
      name: "Shopping list",
      platform: "shopping_list",
      available: true,
      supports: {},
    },
  });

test("the edit dialog prefills the localised rule name, not the raw English one", async () => {
  const env = syncCard();
  env.card._hass.language = "de";
  await openStatus(env, [builtInRule("Weekly groceries → Shopping list")]);
  await click(env.card, { action: "sync-setup-open", value: "r1" });
  assert.equal(env.card._syncData().setup.name, "Weekly groceries → Einkaufsliste");
  assert.match(markup(env.cards), /value="Weekly groceries → Einkaufsliste"/);
});

test("a rule saved with the German list name shows one title in an English UI", async () => {
  const env = syncCard();
  await openStatus(env, [builtInRule("Weekly groceries → Einkaufsliste")]);
  const html = markup(env.cards);
  assert.match(html, /<h3 id="sync-rule-r1">Weekly groceries → Shopping list<\/h3>/);
  assert.equal((html.match(/Weekly groceries → Shopping list/g) || []).length, 1);
});

test("web app: replacing a deleted list keeps the release, renames the route and really sends", async () => {
  const lists = {
    entities: [{ entity_id: "bring:b", name: "Party", platform: "bring", available: true }],
  };
  const env = bringCard({ state: "connected", handlers: { sync_destinations: () => lists } });
  const rule = withRule({
    name: "Weekly groceries → Einkauf",
    destination: { ...RULE.destination, available: false, reason: "missing" },
  });
  await openStatus(env, [rule]);
  await click(env.card, { action: "sync-bw-pick-list", value: "r1" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const html = markup(env.cards);
  assert.match(html, /stays released/);
  assert.match(html, /Use and send/);
  await click(env.card, { action: "sync-bw-save-list" });
  const save = env.calls.find((c) => c.name === "sync_rule_save");
  assert.equal(
    save.message.rule.name,
    "Weekly groceries → Party",
    "the old list is not in the name",
  );
  assert.equal(save.message.keep_activated, true);
  const order = env.calls.map((c) => c.name);
  assert.ok(order.indexOf("sync_run") > order.indexOf("sync_rule_save"), "it sends after saving");
});

test("web app: replacing the list of a rule that was never released does not send", async () => {
  const lists = {
    entities: [{ entity_id: "bring:b", name: "Party", platform: "bring", available: true }],
  };
  const env = bringCard({ state: "connected", handlers: { sync_destinations: () => lists } });
  const rule = withRule({
    activated: false,
    destination: { ...RULE.destination, available: false, reason: "missing" },
  });
  await openStatus(env, [rule]);
  await click(env.card, { action: "sync-bw-pick-list", value: "r1" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.match(markup(env.cards), /Nothing is sent until you release the first delivery/);
  await click(env.card, { action: "sync-bw-save-list" });
  assert.equal(env.calls.find((c) => c.name === "sync_rule_save").message.keep_activated, false);
  assert.doesNotMatch(env.calls.map((c) => c.name).join(), /sync_run/);
});

test("web app: a gone list is said once with its way out and nothing can be sent", async () => {
  const env = bringCard({ state: "connected" });
  const rule = withRule({
    destination: { ...RULE.destination, available: false, reason: "missing" },
  });
  await openStatus(env, [rule]);
  const html = markup(env.cards);
  assert.equal((html.match(/no longer exists/g) || []).length, 1);
  const banner = html.match(/<p class="notice error bw-error"[^]*?<\/p>/)?.[0] || "";
  assert.match(banner, /sync-bw-pick-list/, "the banner holds the way out");
  assert.doesNotMatch(html, /data-action="sync-run"/, "Send now is gone while the target is gone");
  assert.match(html, /<dt>Status<\/dt><dd>[^]*?Bring! list missing/);
  assert.doesNotMatch(html, /Destination|Zielliste/);
  assert.equal(
    (html.match(/data-action="sync-bw-pick-list"/g) || []).length,
    1,
    "one way out only",
  );
  assert.doesNotMatch(html, /List missing/, "one term for a gone list");
});

test("web app: the rule card shows the last healthy delivery from the audit when it has no current run", async () => {
  const env = bringCard({ state: "connected" });
  const rule = withRule({ last_run: null });
  await openStatus(env, [rule]);
  env.setState({
    supported: true,
    rules: [rule],
    audit: [
      { at: new Date(Date.now() - 45000).toISOString(), rule_id: "r1", outcome: "sent", count: 2 },
    ],
  });
  await click(env.card, { action: "sync-open" });
  const html = markup(env.cards);
  assert.doesNotMatch(html, /No delivery yet/);
  assert.match(html, /<dt>Last delivery<\/dt><dd>[^]*?Sent, 45 seconds ago/);
});

test("web app: Last delivery survives a later failed run and an expired session has its own words", async () => {
  const env = bringCard({ state: "connected" });
  const failed = withRule({
    last_run: { at: new Date().toISOString(), outcome: "destination_auth" },
  });
  await openStatus(env, [failed]);
  env.setState({
    supported: true,
    rules: [failed],
    audit: [
      { at: new Date(Date.now() - 3600000).toISOString(), outcome: "sent", count: 4 },
      { at: new Date().toISOString(), outcome: "destination_auth", count: 0 },
    ],
  });
  await click(env.card, { action: "sync-open" });
  const html = markup(env.cards);
  assert.match(html, /<dt>Last delivery<\/dt><dd>1 hour ago<\/dd>/);
  assert.match(html, /Sign-in expired, just now/);
  assert.match(html, /The Bring! sign-in has expired/);
  assert.match(html, /Sent, 4 items/);
  assert.doesNotMatch(html, /Sign-in expired, 0 items/, "a failed run shows no count");
  assert.doesNotMatch(html, /unreachable|cannot be reached/);
});

test("web app: preview rows show amounts like the list and badge only what differs", async () => {
  const lines = [
    { source_item_id: "a", title: "Milk (2)", description: null, action: "send" },
    { source_item_id: "b", title: "Cheese (1)", description: null, action: "send" },
    { source_item_id: "c", title: "Flour (500 g)", description: null, action: "send" },
    { source_item_id: "d", title: "Salt", description: null, action: "skip_duplicate" },
  ];
  const env = bringCard({
    state: "connected",
    handlers: { sync_preview: () => ({ ...PREVIEW, lines, total_candidates: 4 }) },
  });
  await openStatus(env, []);
  await click(env.card, { action: "sync-bw-open" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await click(env.card, { action: "sync-bw-next" });
  await click(env.card, { action: "sync-bw-next" });
  const html = markup(env.cards);
  assert.match(html, /<strong>2 × Milk<\/strong>/);
  assert.match(html, /<strong>Cheese<\/strong>/);
  assert.match(html, /<strong>Flour<\/strong> <span class="sync-muted">500 g<\/span>/);
  assert.equal((html.match(/bw-line-state/g) || []).length, 1, "only the skipped row has a badge");
});

test("web app: the list step offers Other account in the footer and goes back to the sign-in", async () => {
  const env = bringCard({ state: "connected" });
  await openStatus(env, []);
  await click(env.card, { action: "sync-bw-open" });
  assert.equal(env.card._bwData().step, 2);
  assert.match(markup(env.cards), /data-action="sync-bw-back"[^>]*>[^]*?Other account/);
  await click(env.card, { action: "sync-bw-back" });
  assert.equal(env.card._bwData().step, 1);
});

test("web app: signing in again shows the address read-only and not twice", async () => {
  const env = bringCard({ state: "reauth", handlers: { status: () => CONNECTED_STATUS() } });
  env.card._status.entries[0].bring.email = "cook@example.test";
  await openStatus(env, [withRule()]);
  const html = markup(env.cards);
  assert.match(html, /name="username"[^>]*readonly/);
  assert.doesNotMatch(html, /<dt>Account<\/dt>/);
});
