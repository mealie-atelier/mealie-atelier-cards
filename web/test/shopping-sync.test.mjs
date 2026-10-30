import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BringClient } from "../bring-client.mjs";
import {
  BringDestination,
  SyncError,
  SyncManager,
  SyncStore,
  handleSyncMessage,
  prune,
} from "../shopping-sync.mjs";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

const GRAM = { id: "u-g", name: "gram", abbreviation: "g", useAbbreviation: true };
const POTATOES = { id: "f-p", name: "Kartoffeln" };

/** A Mealie stand-in that records every write. */
function fakeMealie(items = []) {
  const state = {
    items,
    writes: [],
    failRead: false,
    failWrite: false,
    lists: [{ id: "list-a", name: "Einkauf" }],
    async listsOf() {
      return state.lists;
    },
  };
  return {
    state,
    source: {
      lists: () => state.listsOf(),
      items: async (listId) => {
        if (state.failRead) throw Error("mealie down");
        return state.items.filter((item) => item.shoppingListId === listId).map((x) => ({ ...x }));
      },
      item: async (id) => {
        const found = state.items.find((item) => item.id === id);
        if (!found) throw Object.assign(Error("gone"), { status: 404 });
        return { ...found };
      },
      setChecked: async (id, checked, current) => {
        if (state.failWrite) throw Error("write failed");
        state.writes.push({ id, checked });
        Object.assign(
          state.items.find((item) => item.id === id),
          { ...current, checked },
        );
      },
    },
  };
}
const item = (id, fields = {}) => ({
  id,
  shoppingListId: "list-a",
  checked: false,
  quantity: 0,
  ...fields,
});

/** Manual timers so a test fires scheduled work itself. */
function fakeTimers() {
  const pending = [];
  return {
    pending,
    set(callback, ms) {
      const entry = { callback, ms, live: true };
      pending.push(entry);
      return () => (entry.live = false);
    },
    live: () => pending.filter((entry) => entry.live),
    async fire(entry) {
      entry.live = false;
      entry.callback();
      // Wait until every background pass of the owner has finished.
      do await Promise.allSettled([...this.owner.tasks]);
      while (this.owner.tasks.size);
    },
  };
}

async function setup({ items = [], bringOptions, managerOptions, dir } = {}) {
  const bring = await startFakeBring(bringOptions);
  const mealie = fakeMealie(items);
  const state = { dir: dir ?? (await mkdtemp(join(tmpdir(), "atelier-sync-"))), managers: [] };
  const boot = async (overrides = {}) => {
    const client = new BringClient({
      email: FAKE_EMAIL,
      password: FAKE_PASSWORD,
      base: bring.base,
      apiKey: FAKE_API_KEY,
      retryDelayMs: 0,
    });
    const timers = fakeTimers();
    const manager = new SyncManager({
      store: new SyncStore({ dir: state.dir }),
      source: mealie.source,
      destination: new BringDestination(client, { cacheMs: 0 }),
      language: () => "de",
      timers,
      ...managerOptions,
      ...overrides,
    });
    await manager.start();
    state.managers.push(manager);
    timers.owner = manager;
    return Object.assign(manager, { fakeTimers: timers });
  };
  const manager = await boot();
  const list = bring.state.lists[0];
  const draft = (extra = {}) => ({
    source_list_id: "list-a",
    destination_entity_id: `bring:${list.listUuid}`,
    ...extra,
  });
  const save = async (extra = {}) => (await manager.saveRule(draft(extra))).id;
  return {
    bring,
    mealie,
    manager,
    boot,
    draft,
    save,
    list,
    dir: state.dir,
    open: () => bring.state.open(list.listUuid),
    close: async () => {
      for (const each of state.managers) await each.stop().catch(() => {});
      bring.close();
    },
  };
}

const confirm = (env, ruleId) => env.manager.run(ruleId, "manual", { confirmFirstBatch: true });

test("a rule starts inactive and preview lists the first batch without writing anything", async () => {
  const env = await setup({
    items: [
      item("a", { quantity: 300, unit: GRAM, food: POTATOES, note: "festkochend" }),
      item("b", { note: "Backpapier" }),
      item("c", { note: "Milch", checked: true }),
    ],
  });
  try {
    const preview = await env.manager.preview({ draft: env.draft() });
    assert.equal(preview.total_candidates, 2);
    assert.deepEqual(
      preview.lines.map((x) => [x.source_item_id, x.title, x.action]),
      [
        ["a", "Kartoffeln (300 g, festkochend)", "send"],
        ["b", "Backpapier", "send"],
      ],
    );
    assert.deepEqual(preview.capabilities, { create: true, description: true, update: false });
    assert.equal(preview.sample.title, "Kartoffeln (300 g, festkochend)");
    assert.equal(env.bring.state.puts().length, 0);
    assert.equal(env.manager.counts().rules, 0);
    assert.deepEqual(env.mealie.state.writes, []);
  } finally {
    await env.close();
  }
});

test("the first batch needs confirmation, then copy mode sends once and never writes to Mealie", async () => {
  const env = await setup({
    items: [
      item("a", { quantity: 300, unit: GRAM, food: POTATOES, note: "festkochend" }),
      item("b", { note: "Backpapier" }),
    ],
  });
  try {
    const ruleId = await env.save();
    await assert.rejects(
      handleSyncMessage(env.manager, { type: "mealie_atelier/sync_run", rule_id: ruleId }),
      (error) => error.code === "sync_not_activated",
    );
    assert.equal(env.bring.state.puts().length, 0);
    const result = await confirm(env, ruleId);
    assert.equal(result.outcome, "sent");
    assert.equal(result.sent, 2);
    assert.equal(result.pending_left, 0);
    assert.deepEqual(
      env.open().map((x) => [x.itemId, x.spec]),
      [
        ["Kartoffeln", "300 g, festkochend"],
        ["Backpapier", ""],
      ],
    );
    assert.equal(env.manager.rules[ruleId].activated, true);
    assert.deepEqual(env.mealie.state.writes, []);
    // A second pass sends nothing again.
    const again = await env.manager.run(ruleId, "manual");
    assert.equal(again.outcome, "nothing_to_send");
    assert.equal(env.bring.state.puts().length, 2);
  } finally {
    await env.close();
  }
});

test("a failed first batch does not activate automatic syncing", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.bring.state.failures.add.push("reject");
    const result = await confirm(env, ruleId);
    assert.equal(result.outcome, "failed");
    assert.equal(env.manager.rules[ruleId].activated, false);
    assert.equal(env.manager.records[`${ruleId}:a`].state, "failed");
  } finally {
    await env.close();
  }
});

test("duplicates already open in Bring are skipped and counted as delivered", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" }), item("b", { note: "Brot" })] });
  try {
    env.open().push({ uuid: "existing-uuid-0001", itemId: "Milch", spec: "" });
    const ruleId = await env.save();
    const result = await confirm(env, ruleId);
    assert.equal(result.skipped_duplicates, 1);
    assert.equal(result.sent, 1);
    assert.equal(env.bring.state.puts().length, 1);
    const record = env.manager.records[`${ruleId}:a`];
    assert.equal(record.state, "sent");
    assert.equal(record.duplicate_of, "existing-uuid-0001");
  } finally {
    await env.close();
  }
});

test("an open Bring item of the same name keeps its detail text", async () => {
  const env = await setup({ items: [item("a", { quantity: 2, unit: GRAM, food: POTATOES })] });
  try {
    env.open().push({ uuid: "existing-uuid-0002", itemId: "Kartoffeln", spec: "1 Sack" });
    const ruleId = await env.save();
    await confirm(env, ruleId);
    assert.deepEqual(
      env.open().map((x) => [x.itemId, x.spec]),
      [["Kartoffeln", "1 Sack, 2 g"]],
    );
  } finally {
    await env.close();
  }
});

test("move mode checks off only what Bring accepted", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" }), item("b", { note: "Brot" })] });
  try {
    const ruleId = await env.save({ mode: "move" });
    env.bring.state.failures.add.push("reject");
    const first = await confirm(env, ruleId);
    assert.equal(first.outcome, "partial");
    assert.deepEqual(env.mealie.state.writes, [{ id: "b", checked: true }]);
    assert.equal(env.manager.records[`${ruleId}:a`].state, "failed");
    assert.equal(env.manager.records[`${ruleId}:b`].state, "source_completed");
    assert.equal(first.completed_in_source, 1);
  } finally {
    await env.close();
  }
});

test("a duplicate confirmed in Bring completes the source in move mode", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    env.open().push({ uuid: "existing-uuid-0003", itemId: "Milch", spec: "" });
    const ruleId = await env.save({ mode: "move" });
    await confirm(env, ruleId);
    assert.deepEqual(env.mealie.state.writes, [{ id: "a", checked: true }]);
    assert.equal(env.bring.state.puts().length, 0);
  } finally {
    await env.close();
  }
});

test("an item edited between send and completion is not completed", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save({ mode: "move" });
    const original = env.mealie.source.item;
    env.mealie.source.item = async (id) => {
      env.mealie.state.items[0].note = "Milch 3,5%";
      return original(id);
    };
    const result = await confirm(env, ruleId);
    assert.deepEqual(env.mealie.state.writes, []);
    assert.equal(env.manager.records[`${ruleId}:a`].state, "changed_after_send");
    assert.equal(result.completed_in_source, 0);
  } finally {
    await env.close();
  }
});

test("a failed completion stays pending and is retried without sending again", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save({ mode: "move" });
    env.mealie.state.failWrite = true;
    const first = await confirm(env, ruleId);
    assert.equal(first.outcome, "partial");
    const record = env.manager.records[`${ruleId}:a`];
    assert.equal(record.state, "sent");
    assert.equal(record.completion_pending, true);
    env.mealie.state.failWrite = false;
    await env.manager.run(ruleId, "manual");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "source_completed");
    assert.equal(env.bring.state.puts().length, 1);
  } finally {
    await env.close();
  }
});

test("a lost response after Bring stored the item is reconciled without a duplicate", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save({ mode: "move" });
    env.bring.state.failures.add.push("drop-after-store");
    const first = await confirm(env, ruleId);
    assert.equal(first.needs_reconciliation, 1);
    assert.equal(env.manager.records[`${ruleId}:a`].state, "needs_reconciliation");
    assert.deepEqual(env.mealie.state.writes, [], "never completed on an uncertain write");
    const second = await env.manager.run(ruleId, "manual");
    assert.equal(second.sent, 1);
    assert.equal(env.open().length, 1);
    assert.equal(env.bring.state.puts().length, 1);
    assert.equal(env.manager.records[`${ruleId}:a`].state, "source_completed");
  } finally {
    await env.close();
  }
});

test("a lost request that never reached Bring is sent again exactly once", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.bring.state.failures.add.push("drop-before-store");
    await confirm(env, ruleId);
    assert.equal(env.open().length, 0);
    const second = await env.manager.run(ruleId, "manual");
    assert.equal(second.outcome, "sent");
    assert.equal(env.open().length, 1);
    await env.manager.run(ruleId, "manual");
    assert.equal(env.open().length, 1);
  } finally {
    await env.close();
  }
});

test("exactly once across a crash: a record left in sending is reconciled after restart", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    // Simulate a crash between "about to send" and "result recorded": Bring has the item.
    const file = join(env.dir, "shopping-sync.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    const record = data.records[`${ruleId}:a`];
    Object.assign(record, { state: "sending", sent_at: null, sent_fingerprint: null });
    await writeFile(file, JSON.stringify(data));
    const restarted = await env.boot();
    assert.equal(restarted.records[`${ruleId}:a`].state, "needs_reconciliation");
    // The startup run is scheduled for an activated rule with uncertain records.
    assert.equal(restarted.fakeTimers.live().length, 1);
    await restarted.fakeTimers.fire(restarted.fakeTimers.live()[0]);
    assert.equal(restarted.records[`${ruleId}:a`].state, "sent");
    assert.equal(env.bring.state.puts().length, 1);
    assert.equal(env.open().length, 1);
  } finally {
    await env.close();
  }
});

test("a record left in sending that Bring never stored is sent after restart", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    const file = join(env.dir, "shopping-sync.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    Object.assign(data.records[`${ruleId}:a`], { state: "sending", sent_at: null });
    await writeFile(file, JSON.stringify(data));
    env.open().length = 0;
    const restarted = await env.boot();
    await restarted.run(ruleId, "manual");
    assert.equal(restarted.records[`${ruleId}:a`].state, "sent");
    assert.equal(env.open().length, 1);
  } finally {
    await env.close();
  }
});

test("delivered items are not sent again after a restart", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    await env.manager.stop();
    const restarted = await env.boot();
    assert.equal(restarted.rules[ruleId].activated, true);
    const result = await restarted.run(ruleId, "manual");
    assert.equal(result.outcome, "nothing_to_send");
    assert.equal(env.bring.state.puts().length, 1);
  } finally {
    await env.close();
  }
});

test("several equal lines and no stored uid wait for the user", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    const record = env.manager.records[`${ruleId}:a`];
    Object.assign(record, { state: "needs_reconciliation", destination_uid: null });
    env.open().length = 0;
    env.open().push({ uuid: "u-1", itemId: "Milch", spec: "" });
    env.bring.state
      .bucket(env.list.listUuid)
      .recently.push({ uuid: "u-2", itemId: "Milch", spec: "" });
    const result = await env.manager.run(ruleId, "manual");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "needs_reconciliation");
    assert.equal(env.manager.records[`${ruleId}:a`].last_error, "ambiguous");
    assert.equal(result.sent, 0);
    const resolved = await env.manager.resolve(ruleId, `${ruleId}:a`, "dismiss");
    assert.equal(resolved.record.state, "sent");
    assert.equal(resolved.record.fingerprint, undefined);
  } finally {
    await env.close();
  }
});

test("rate limiting and refused logins keep items pending and report the destination unavailable", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.bring.state.failures.add.push("ratelimit");
    const limited = await confirm(env, ruleId);
    assert.equal(limited.outcome, "destination_unavailable");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "pending");
    assert.equal(env.manager.records[`${ruleId}:a`].attempts, 0);
    env.bring.state.failures.add.push("auth");
    env.bring.state.rejectLogin = true;
    const refused = await env.manager.run(ruleId, "manual");
    assert.equal(refused.outcome, "destination_auth");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "pending");
    // Bring accepts the account again: the item goes out once.
    env.bring.state.rejectLogin = false;
    const after = await env.manager.run(ruleId, "manual");
    assert.equal(after.outcome, "sent");
    assert.equal(env.open().length, 1);
  } finally {
    await env.close();
  }
});

test("an unreachable Bring reports destination_unavailable and nothing is lost", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.bring.state.blocked = true;
    env.manager.destination.cache = null;
    const result = await confirm(env, ruleId);
    assert.equal(result.outcome, "destination_unavailable");
    const status = await env.manager.state();
    assert.equal(status.rules[0].destination.available, false);
    assert.equal(status.rules[0].destination.name, "Einkauf");
    // Bring! not answering is not a deleted list: the card must not tell the user to pick another one.
    assert.equal(status.rules[0].destination.reason, "unreachable");
    env.bring.state.blocked = false;
    assert.equal((await env.manager.run(ruleId, "manual")).outcome, "sent");
  } finally {
    await env.close();
  }
});

test("a list deleted in Bring! is reported as missing, not as unreachable", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    await env.save();
    env.bring.state.lists = env.bring.state.lists.filter((row) => row.name !== "Einkauf");
    env.manager.destination.cache = null;
    const status = await env.manager.state();
    assert.equal(status.rules[0].destination.available, false);
    assert.equal(status.rules[0].destination.reason, "missing");
  } finally {
    await env.close();
  }
});

test("a run against a deleted list is recorded as destination_missing", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.bring.state.lists = env.bring.state.lists.filter((row) => row.name !== "Einkauf");
    env.manager.destination.cache = null;
    const result = await env.manager.run(ruleId, "manual");
    assert.equal(result.outcome, "destination_missing");
    assert.equal(env.manager.rules[ruleId].last_run.outcome, "destination_missing");
  } finally {
    await env.close();
  }
});

test("an expired Bring session is its own outcome and a new sign-in clears it", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.manager.destination.cache = null;
    env.bring.state.rejectLogin = true;
    env.bring.state.expireAccessTokens();
    env.bring.state.refresh.clear();
    const result = await env.manager.run(ruleId, "manual");
    assert.equal(result.outcome, "destination_auth");
    assert.equal((await env.manager.state()).rules[0].destination.reason, "auth");
    assert.equal(env.manager.rules[ruleId].last_run.outcome, "destination_auth");
    env.manager.bringReconnected();
    assert.equal(env.manager.rules[ruleId].last_run, null);
  } finally {
    await env.close();
  }
});

test("a new sign-in restores the last healthy run instead of wiping the history", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    const at = new Date(Date.now() - 60000).toISOString();
    env.manager.store.data.audit.push({
      at,
      rule_id: ruleId,
      trigger: "manual",
      count: 3,
      outcome: "sent",
    });
    env.manager.rules[ruleId].last_run = {
      at: new Date().toISOString(),
      outcome: "destination_auth",
    };
    env.manager.bringReconnected();
    const last = env.manager.rules[ruleId].last_run;
    assert.equal(last.outcome, "sent");
    assert.equal(last.at, at);
    assert.equal(last.count, 3);
  } finally {
    await env.close();
  }
});

test("a session lost while the list names are cached is still an expired sign-in", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.manager.destination.cacheMs = 60000;
    await env.manager.destination.lists();
    env.bring.state.rejectLogin = true;
    env.bring.state.expireAccessTokens();
    env.bring.state.refresh.clear();
    const result = await env.manager.run(ruleId, "manual");
    assert.equal(result.outcome, "destination_auth");
  } finally {
    await env.close();
  }
});

test("replacing the Bring list keeps a released rule released and drops the old last run", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    assert.equal((await confirm(env, ruleId)).outcome, "sent");
    const other = {
      ...env.draft(),
      name: "Einkauf → Party",
      destination_entity_id: `bring:${env.bring.state.lists[1].listUuid}`,
    };
    const moved = await env.manager.saveRule(other, {
      ruleId,
      resetRecords: true,
      keepActivated: true,
    });
    assert.equal(moved.activated, true);
    assert.equal(moved.last_run, null);
    assert.equal(moved.name, "Einkauf → Party");
  } finally {
    await env.close();
  }
});

test("a Mealie read failure is reported as source_unavailable", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.mealie.state.failRead = true;
    const result = await confirm(env, ruleId);
    assert.equal(result.outcome, "source_unavailable");
    assert.equal(env.bring.state.puts().length, 0);
  } finally {
    await env.close();
  }
});

test("changes after sending are flagged and Bring stays untouched", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" }), item("b", { note: "Brot" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    env.mealie.state.items[0].note = "Milch 3,5%";
    env.mealie.state.items.splice(1, 1);
    const result = await env.manager.run(ruleId, "manual");
    assert.equal(result.outcome, "nothing_to_send");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "changed_after_send");
    assert.equal(env.manager.records[`${ruleId}:b`].state, "removed_after_send");
    assert.equal(env.bring.state.puts().length, 2);
    const resent = await env.manager.resolve(ruleId, `${ruleId}:a`, "resend");
    assert.equal(resent.record.state, "pending");
    const removed = await env.manager.resolve(ruleId, `${ruleId}:b`, "dismiss");
    assert.equal(removed.deleted, true);
    assert.equal(env.manager.records[`${ruleId}:b`], undefined);
    await env.manager.run(ruleId, "manual");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "sent");
  } finally {
    await env.close();
  }
});

test("a dismissed change on a completed item stays completed", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save({ mode: "move" });
    await confirm(env, ruleId);
    env.mealie.state.items[0].note = "Milch 3,5%";
    await env.manager.run(ruleId, "manual");
    assert.equal(env.manager.records[`${ruleId}:a`].state, "changed_after_send");
    const resolved = await env.manager.resolve(ruleId, `${ruleId}:a`, "dismiss");
    assert.equal(resolved.record.state, "source_completed");
    assert.equal(env.mealie.state.writes.length, 1);
  } finally {
    await env.close();
  }
});

test("the merge policy sends one line and completes every member", async () => {
  const env = await setup({
    items: [
      item("a", { quantity: 200, unit: GRAM, food: POTATOES }),
      item("b", { quantity: 300, unit: GRAM, food: POTATOES }),
    ],
  });
  try {
    const ruleId = await env.save({ mode: "move", duplicate_policy: "skip_exact_merge_same_unit" });
    const result = await confirm(env, ruleId);
    assert.equal(result.sent, 1);
    assert.equal(result.merged, 1);
    assert.deepEqual(
      env.open().map((x) => [x.itemId, x.spec]),
      [["Kartoffeln", "500 g"]],
    );
    assert.equal(env.mealie.state.writes.length, 2);
    assert.equal(env.manager.records[`${ruleId}:b`].state, "source_completed");
  } finally {
    await env.close();
  }
});

test("a duplicate in the same batch follows a rejected lead", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" }), item("b", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    env.bring.state.failures.add.push("reject");
    const result = await confirm(env, ruleId);
    assert.equal(result.failed, 2);
    assert.equal(env.manager.records[`${ruleId}:a`].state, "failed");
    assert.equal(env.manager.records[`${ruleId}:b`].state, "failed");
    assert.equal(env.open().length, 0);
  } finally {
    await env.close();
  }
});

test("retry sends failed lines again and needs an activated rule", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await assert.rejects(env.manager.retry(ruleId), (error) => error.code === "sync_not_activated");
    env.bring.state.failures.add.push("reject");
    await confirm(env, ruleId);
    env.manager.rules[ruleId].activated = true;
    const result = await env.manager.retry(ruleId, [`${ruleId}:a`]);
    assert.equal(result.outcome, "sent");
    assert.equal(env.open().length, 1);
  } finally {
    await env.close();
  }
});

test("only three lines in a row may fail before the pass stops", async () => {
  const items = ["a", "b", "c", "d", "e"].map((id) => item(id, { note: `Artikel ${id}` }));
  const env = await setup({ items });
  try {
    const ruleId = await env.save();
    env.bring.state.failures.add.push("reject", "reject", "reject");
    const result = await confirm(env, ruleId);
    assert.equal(result.failed, 3);
    assert.equal(result.pending_left, 2);
    assert.equal(env.bring.state.puts().length, 3);
    assert.equal(env.open().length, 0);
  } finally {
    await env.close();
  }
});

test("a burst of adds collapses into one debounced run, and paused or unconfirmed rules ignore triggers", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save({ debounce_seconds: 5 });
    const timers = env.manager.fakeTimers;
    env.manager.notifySourceChanged("list-a", "after_atelier_add");
    assert.equal(timers.live().length, 0, "not confirmed yet");
    await confirm(env, ruleId);
    env.mealie.state.items.push(item("b", { note: "Brot" }));
    for (let i = 0; i < 3; i++) env.manager.notifySourceChanged("list-a", "after_atelier_add");
    assert.equal(timers.live().length, 1);
    assert.equal(timers.live()[0].ms, 5000);
    assert.ok((await env.manager.state()).rules[0].next_run_at);
    await timers.fire(timers.live()[0]);
    assert.equal(env.open().length, 2);
    await env.manager.setPaused(ruleId, true);
    env.manager.notifySourceChanged("list-a", "after_atelier_add");
    assert.equal(timers.live().length, 0);
    const direct = await env.manager.run(ruleId, "after_atelier_add");
    assert.equal(direct.outcome, "paused");
    env.manager.notifySourceChanged("other-list", "after_atelier_add");
    assert.equal(timers.live().length, 0);
  } finally {
    await env.close();
  }
});

test("the watcher polls only activated, unpaused watch rules and triggers a run on change", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save({ triggers: { watch: true } });
    const timers = env.manager.fakeTimers;
    assert.equal(timers.live().length, 0, "an unconfirmed rule is not watched");
    await confirm(env, ruleId);
    const poll = timers.live().find((entry) => entry.ms === 120000);
    assert.ok(poll);
    env.mealie.state.items.push(item("b", { note: "Brot" }));
    await timers.fire(poll);
    const run = timers.live().find((entry) => entry.ms === 30000);
    assert.ok(run, "the change schedules a debounced run");
    await timers.fire(run);
    assert.equal(env.open().length, 2);
    await env.manager.setPaused(ruleId, true);
    assert.equal(timers.live().length, 0);
  } finally {
    await env.close();
  }
});

test("runs of one rule are serialized and a trigger during a pass queues exactly one more", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const original = env.mealie.source.items;
    env.mealie.source.items = async (listId) => {
      await gate;
      return original(listId);
    };
    const first = env.manager.run(ruleId, "manual");
    while (!env.manager.locks.get(ruleId)?.locked)
      await new Promise((resolve) => setImmediate(resolve));
    const second = await env.manager.run(ruleId, "manual");
    const third = await env.manager.run(ruleId, "retry");
    assert.deepEqual(second, { queued: true });
    assert.deepEqual(third, { queued: true });
    assert.equal((await env.manager.state()).rules[0].running, true);
    release();
    await first;
    do await Promise.allSettled([...env.manager.tasks]);
    while (env.manager.tasks.size);
    const passes = env.manager.store.data.audit.filter((entry) => entry.rule_id === ruleId);
    assert.equal(passes.length, 3, "the first confirmed run, the manual run, one queued rerun");
  } finally {
    await env.close();
  }
});

test("rule validation, limits and conflicts", async () => {
  const env = await setup();
  try {
    const bad = [
      [{ ...env.draft(), mode: "swap" }, /mode/],
      [{ ...env.draft(), destination_entity_id: "todo.einkauf" }, /Bring/],
      [{ ...env.draft(), source_list_id: "a/b" }, /identifier/],
      [{ ...env.draft(), extra: 1 }, /Unknown rule fields/],
      [{ ...env.draft(), debounce_seconds: 1 }, /debounce_seconds/],
      [{ ...env.draft(), poll_interval_seconds: 10 }, /poll_interval_seconds/],
      [{ ...env.draft(), triggers: { watch: "yes" } }, /booleans/],
      [{ ...env.draft(), name: "x".repeat(61) }, /name/],
    ];
    for (const [draft, message] of bad)
      await assert.rejects(
        env.manager.saveRule(draft),
        (error) => error.code === "invalid_request" && message.test(error.message),
      );
    await assert.rejects(
      env.manager.saveRule({
        ...env.draft(),
        destination_entity_id: "bring:00000000-0000-4000-8000-000000000000",
      }),
      (error) => error.code === "sync_destination_unsupported",
    );
    await assert.rejects(
      env.manager.saveRule({ ...env.draft(), source_list_id: "missing" }),
      /Unknown source/,
    );
    const first = await env.manager.saveRule(env.draft({ name: "Meine Regel" }));
    assert.equal(first.name, "Meine Regel");
    assert.equal(first.destination.platform, "bring");
    assert.equal(first.destination.entity_id, `bring:${env.list.listUuid}`);
    assert.equal(first.revision, 1);
    await assert.rejects(
      env.manager.saveRule(env.draft()),
      (error) => error.code === "sync_source_taken",
    );
    await assert.rejects(
      env.manager.saveRule(env.draft(), { ruleId: first.id, expectedRevision: 9 }),
      (error) => error.code === "conflict",
    );
    const second = await env.manager.saveRule(env.draft({ name: "Neu" }), {
      ruleId: first.id,
      expectedRevision: 1,
    });
    assert.equal(second.revision, 2);
    const other = {
      ...env.draft(),
      destination_entity_id: `bring:${env.bring.state.lists[1].listUuid}`,
    };
    await assert.rejects(
      env.manager.saveRule(other, { ruleId: first.id }),
      /drops the sync history/,
    );
    const moved = await env.manager.saveRule(other, { ruleId: first.id, resetRecords: true });
    assert.equal(moved.activated, false);
    assert.equal(moved.destination.name, "Party");
    // Auto name: "<source> → <destination>".
    env.mealie.state.lists.push({ id: "list-b", name: "Fest" });
    const named = await env.manager.saveRule({ ...env.draft(), source_list_id: "list-b" });
    assert.equal(named.name, "Fest → Einkauf");
    for (let i = 0; i < 3; i++) {
      env.mealie.state.lists.push({ id: `list-x${i}`, name: `X${i}` });
      await env.manager.saveRule({ ...env.draft(), source_list_id: `list-x${i}` });
    }
    env.mealie.state.lists.push({ id: "list-y", name: "Y" });
    await assert.rejects(
      env.manager.saveRule({ ...env.draft(), source_list_id: "list-y" }),
      (error) => error.code === "sync_too_many_rules",
    );
  } finally {
    await env.close();
  }
});

test("concurrent saves for one source create one rule", async () => {
  const env = await setup();
  try {
    const results = await Promise.allSettled([env.save(), env.save()]);
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(Object.keys(env.manager.rules).length, 1);
  } finally {
    await env.close();
  }
});

test("destinations are the lists of the account and a delete drops the rule's records", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const destinations = await handleSyncMessage(env.manager, {
      type: "mealie_atelier/sync_destinations",
    });
    assert.deepEqual(
      destinations.entities.map((x) => [x.entity_id, x.name, x.platform, x.available]),
      [
        [`bring:${env.bring.state.lists[0].listUuid}`, "Einkauf", "bring", true],
        [`bring:${env.bring.state.lists[1].listUuid}`, "Party", "bring", true],
      ],
    );
    const ruleId = await env.save();
    await confirm(env, ruleId);
    const records = await handleSyncMessage(env.manager, {
      type: "mealie_atelier/sync_records",
      rule_id: ruleId,
    });
    assert.equal(records.records.length, 1);
    assert.equal("fingerprint" in records.records[0], false);
    assert.deepEqual(
      await handleSyncMessage(env.manager, {
        type: "mealie_atelier/sync_rule_delete",
        rule_id: ruleId,
      }),
      { deleted: true },
    );
    assert.equal(Object.keys(env.manager.records).length, 0);
    assert.deepEqual((await env.manager.state()).audit, []);
    await assert.rejects(
      env.manager.run(ruleId, "manual"),
      (error) => error.code === "sync_rule_not_found",
    );
  } finally {
    await env.close();
  }
});

test("messages validate their payloads", async () => {
  const env = await setup();
  try {
    const call = (type, other = {}) =>
      handleSyncMessage(env.manager, { type: `mealie_atelier/${type}`, ...other });
    await assert.rejects(call("sync_preview"), /rule_id or rule/);
    await assert.rejects(call("sync_preview", { rule_id: "a", rule: {} }), /rule_id or rule/);
    await assert.rejects(
      call("sync_resolve", { rule_id: "a", record_key: "b", action: "burn" }),
      /action/,
    );
    await assert.rejects(call("sync_records", { rule_id: "a", limit: 500 }), /limit/);
    await assert.rejects(call("sync_records", { rule_id: "a", states: ["nope"] }), /state/);
    await assert.rejects(call("sync_retry", { rule_id: "a", record_keys: [1] }), /record_keys/);
    await assert.rejects(
      call("sync_run", { rule_id: "gone" }),
      (error) => error instanceof SyncError && error.status === 404,
    );
  } finally {
    await env.close();
  }
});

test("a read-only manager never runs or schedules", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    const ruleId = await env.save();
    await confirm(env, ruleId);
    const readOnly = await env.boot({ readOnly: true });
    await assert.rejects(readOnly.run(ruleId, "manual"), (error) => error.code === "read_only");
    readOnly.notifySourceChanged("list-a", "after_atelier_add");
    assert.equal(readOnly.fakeTimers.live().length, 0);
    assert.equal((await readOnly.state()).rules.length, 1);
  } finally {
    await env.close();
  }
});

test("a corrupt store is set aside and start succeeds with an empty state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atelier-sync-corrupt-"));
  await writeFile(join(dir, "shopping-sync.json"), "{not json");
  const env = await setup({ dir });
  try {
    assert.equal(env.manager.counts().rules, 0);
    assert.ok((await readdir(dir)).includes("shopping-sync.json.corrupt"));
  } finally {
    await env.close();
  }
});

test("the store writes atomically with private permissions and leaves no temp files", async () => {
  const env = await setup({ items: [item("a", { note: "Milch" })] });
  try {
    await env.save();
    const files = await readdir(env.dir);
    assert.deepEqual(files, ["shopping-sync.json"]);
    const { mode } = await (
      await import("node:fs/promises")
    ).stat(join(env.dir, "shopping-sync.json"));
    assert.equal(mode & 0o077, 0);
  } finally {
    await env.close();
  }
});

test("pruning drops only old finished records of rules that still exist", () => {
  const old = new Date(Date.now() - 40 * 86400000).toISOString();
  const recent = new Date().toISOString();
  const record = (key, state, updated, rule = "r1") => ({
    key,
    rule_id: rule,
    source_item_id: key,
    state,
    updated_at: updated,
  });
  const data = {
    rules: { r1: { id: "r1" } },
    audit: [],
    records: Object.fromEntries(
      [
        record("old-done", "source_completed", old),
        record("old-gone", "source_completed", old),
        record("new-done", "source_completed", recent),
        record("old-failed", "failed", old),
        record("orphan", "sent", old, "r2"),
      ].map((r) => [r.key, r]),
    ),
  };
  prune(data, { present: { r1: new Set(["old-done"]) } });
  assert.deepEqual(Object.keys(data.records).sort(), ["new-done", "old-done", "old-failed"]);
});
