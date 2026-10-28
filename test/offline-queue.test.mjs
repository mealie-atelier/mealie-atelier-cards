import test from "node:test";
import { webcrypto as crypto } from "node:crypto";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const plain = (value) => JSON.parse(JSON.stringify(value));
const lostError = () => Object.assign(new Error("Connection lost"), { code: 3 });
const ITEMS = [
  { id: "i1", note: "Milk", checked: false, shoppingListId: "l1" },
  { id: "i2", note: "Bread", checked: true, shoppingListId: "l1" },
];

/** A card whose `mutate` and `offline_replay` calls are scripted by the test. */
function setup({ features = { offline_queue: true }, hass = {}, nav } = {}) {
  const cards = loadCards({ navigator: nav || { language: "en-US" }, globals: { crypto } });
  const calls = [];
  const script = { mutate: async () => ({}), replay: async () => ({ ok: true }) };
  const card = makeCard(cards, {
    permissions: { can_write: true, can_manage: false, features },
  });
  card._hass = {
    language: "en",
    user: { id: "u1" },
    callWS: async (msg) => {
      calls.push(plain(msg));
      if (msg.type === "mealie_atelier/mutate") return script.mutate(msg);
      if (msg.type === "mealie_atelier/offline_replay") return script.replay(msg);
      if (msg.type === "mealie_atelier/shopping")
        return { lists: [{ id: "l1", name: "Groceries" }], items: structuredClone(ITEMS) };
      return {};
    },
    ...hass,
  };
  card._data.shopping = { lists: [{ id: "l1", name: "Groceries" }], items: structuredClone(ITEMS) };
  card._activeList = "l1";
  card._providerActive = "atelier";
  card._render = () => {};
  card._flash = (text, kind) => {
    card.flashed = { text, kind };
  };
  return { card, calls, script, cards };
}
const queue = (card) => plain(card._offlineLoad());
const toggle = (card, id = "i1", checked = true) =>
  card._mutate("shopping_toggle", { item_id: id, checked }, "shopping");

test("connectivity errors queue a toggle with the state the user saw", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  assert.equal(await toggle(card), true);
  const [op] = queue(card);
  assert.equal(op.action, "shopping_toggle");
  assert.deepEqual(op.payload, { item_id: "i1", checked: true, expected_checked: false });
  assert.match(op.id, /^[0-9a-f-]{36}$/);
});

test("other errors are shown as before and never queued", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw Object.assign(new Error("boom"), { code: "mealie_error" });
  };
  assert.equal(await toggle(card), false);
  assert.deepEqual(queue(card), []);
  assert.equal(card.flashed.kind, "error");
});

test("the message pattern, connection_lost code, onLine and hass.connected count as offline", async () => {
  const errors = [
    new Error("Not connected"),
    Object.assign(new Error("x"), { code: "connection_lost" }),
  ];
  for (const error of errors) {
    const { card, script } = setup();
    script.mutate = async () => {
      throw error;
    };
    assert.equal(await toggle(card), true);
  }
  const offline = setup({ nav: { language: "en-US", onLine: false } });
  offline.script.mutate = async () => {
    throw new Error("plain");
  };
  assert.equal(await toggle(offline.card), true);
  const down = setup({ hass: { connected: false } });
  down.script.mutate = async () => {
    throw new Error("plain");
  };
  assert.equal(await toggle(down.card), true);
});

test("an add is queued with its list and note", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  assert.equal(
    await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping"),
    true,
  );
  assert.deepEqual(queue(card)[0].payload, { list_id: "l1", note: "Eggs" });
});

test("only shopping toggles and adds are queued", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  assert.equal(await card._mutate("mealplan_delete", { entry_id: "m1" }, "mealplan"), false);
  assert.deepEqual(queue(card), []);
});

test("a host-owned queue, a missing feature or a missing grant disables the queue", async () => {
  const cases = [
    setup({ hass: { atelierOfflineHost: true } }),
    setup({ features: {} }),
    setup({ features: { offline_queue: false } }),
  ];
  const reader = setup();
  reader.card._status = {
    entries: [{ entry_id: "e1", can_write: false, features: { offline_queue: true } }],
  };
  cases.push(reader);
  const native = setup();
  native.card._providerActive = "home_assistant";
  cases.push(native);
  for (const { card, script } of cases) {
    script.mutate = async () => {
      throw lostError();
    };
    assert.equal(card._offlineActive(), false);
    await toggle(card);
    assert.deepEqual(queue(card), []);
  }
});

test("storage failures mean no queue and the write fails as today", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  card._offlineSave = () => false;
  assert.equal(await toggle(card), false);
  card._offlineKey = () => {
    throw new Error("denied");
  };
  assert.deepEqual(plain(card._offlineLoad()), []);
});

test("the queue key is per user and entry", () => {
  const a = setup({ hass: { user: { id: "alice" } } }).card;
  const b = setup({ hass: { user: { id: "bob" } } }).card;
  assert.notEqual(a._offlineKey(), b._offlineKey());
  assert.match(a._offlineKey(), /^mealie-atelier-offline-v1:alice:e1$/);
});

test("pending ticks and adds show optimistically and locked", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card);
  await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping");
  const view = plain(card._offlineItems(card._data.shopping.items));
  assert.equal(view.find((x) => x.id === "i1").checked, true);
  const local = view.find((x) => x.id.startsWith("local-"));
  assert.equal(local.note, "Eggs");
  const html = card._shopping();
  assert.match(html, /Waiting for connection/);
  assert.match(html, /2 changes waiting/);
  assert.match(html, /data-action="offline-send"/);
  assert.match(html, /disabled aria-disabled="true"[^>]*aria-label="Waiting for connection"/);
});

test("a second tick on a waiting item takes it back without a network call", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card);
  const before = calls.length;
  assert.equal(await toggle(card, "i1", false), true);
  assert.equal(calls.length, before);
  assert.deepEqual(queue(card), []);
});

test("replay sends in order and stops at the first connectivity failure", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card, "i1", true);
  await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping");
  await toggle(card, "i2", false);
  let n = 0;
  script.replay = async () => {
    if (++n === 2) throw lostError();
    return { ok: true };
  };
  await card._offlineReplay();
  const sent = calls.filter((c) => c.type === "mealie_atelier/offline_replay");
  assert.equal(sent.length, 2);
  assert.deepEqual(
    sent.map((c) => c.operation.action),
    ["shopping_toggle", "shopping_add"],
  );
  assert.deepEqual(
    queue(card).map((o) => o.action),
    ["shopping_add", "shopping_toggle"],
  );
  script.replay = async () => ({ ok: true });
  await card._offlineReplay();
  assert.deepEqual(queue(card), []);
  assert.ok(
    calls.some((c) => c.type === "mealie_atelier/shopping"),
    "list re-read after success",
  );
});

test("write_not_permitted drops every queued operation with a notice", async () => {
  const { card, script, cards } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card);
  await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping");
  // Read storage under the original key: losing the grant reloads the status.
  const key = card._offlineKey();
  assert.equal(JSON.parse(cards.storage.get(key)).length, 2);
  script.replay = async () => {
    throw Object.assign(new Error("no"), { code: "write_not_permitted" });
  };
  await card._offlineReplay();
  assert.deepEqual(JSON.parse(cards.storage.get(key)), []);
  assert.match(card.flashed.text, /no longer change this kitchen/);
});

test("conflict codes keep the operation with translated text and Discard", async () => {
  for (const [code, text] of [
    ["offline_conflict", /changed elsewhere/],
    ["offline_add_uncertain", /may already be on the list/],
    ["offline_op_reused", /clashes with an earlier one/],
  ]) {
    const { card, script } = setup();
    script.mutate = async () => {
      throw lostError();
    };
    await toggle(card);
    script.replay = async () => {
      throw Object.assign(new Error("x"), { code });
    };
    await card._offlineReplay();
    const [op] = queue(card);
    assert.equal(op.state, "conflict");
    assert.equal(op.reason, code);
    const bar = card._offlineBar();
    assert.match(bar, text);
    assert.match(bar, /data-action="offline-discard"/);
    assert.equal(card._offlineItems(card._data.shopping.items)[0].checked, false);
    await card._offlineClick("offline-discard", op.id);
    assert.deepEqual(queue(card), []);
  }
});

test("replay does not run while offline or while the host owns the queue", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card);
  card._hass.connected = false;
  await card._offlineReplay();
  assert.equal(calls.filter((c) => c.type.endsWith("offline_replay")).length, 0);
});

test("a reconnect (connected false to true) triggers the replay", async () => {
  const { card, script, calls } = setup({ hass: { connected: true } });
  script.mutate = async () => {
    throw lostError();
  };
  card._hass.connected = false;
  await toggle(card);
  card.hass = { ...card._hass, connected: true };
  await flush();
  await flush();
  assert.equal(calls.filter((c) => c.type.endsWith("offline_replay")).length, 1);
  assert.deepEqual(queue(card), []);
});

test("any other failure marks that operation and the rest are still sent", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card, "i1", true);
  await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping");
  script.replay = async (msg) => {
    if (msg.operation.action === "shopping_toggle")
      throw Object.assign(new Error("Item not found"), { code: "mealie_error" });
    return { ok: true };
  };
  await card._offlineReplay();
  const sent = calls.filter((c) => c.type === "mealie_atelier/offline_replay");
  assert.deepEqual(
    sent.map((c) => c.operation.action),
    ["shopping_toggle", "shopping_add"],
  );
  const [op] = queue(card);
  assert.equal(op.state, "failed");
  assert.equal(op.reason, "mealie_error");
  assert.match(card._offlineBar(), /data-action="offline-discard"/);
  // The next replay retries the failed operation; success clears it.
  script.replay = async () => ({ ok: true });
  await card._offlineReplay();
  assert.deepEqual(queue(card), []);
});

test("taking back a tick that may have been sent queues the reverse behind it", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card, "i1", true);
  script.replay = async () => {
    throw lostError();
  };
  await card._offlineReplay();
  assert.equal(queue(card)[0].attempted, true);
  const before = calls.filter((c) => c.type === "mealie_atelier/mutate").length;
  assert.equal(await toggle(card, "i1", false), true);
  assert.equal(calls.filter((c) => c.type === "mealie_atelier/mutate").length, before);
  assert.deepEqual(
    queue(card).map((op) => op.payload),
    [
      { item_id: "i1", checked: true, expected_checked: false },
      { item_id: "i1", checked: false, expected_checked: true },
    ],
  );
  assert.equal(card._offlineItems(card._data.shopping.items)[0].checked, false);
});

test("an entry taken back while an earlier one is in flight is never sent", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping");
  await toggle(card, "i1", true);
  script.replay = async (msg) => {
    if (msg.operation.action === "shopping_add") await toggle(card, "i1", false);
    return { ok: true };
  };
  await card._offlineReplay();
  const sent = calls.filter((c) => c.type === "mealie_atelier/offline_replay");
  assert.deepEqual(
    sent.map((c) => c.operation.action),
    ["shopping_add"],
  );
  assert.deepEqual(queue(card), []);
});

test("a failed tick holds back later ticks on the same item in that run", async () => {
  const { card, script, calls } = setup();
  script.mutate = async () => {
    throw lostError();
  };
  await toggle(card, "i1", true);
  script.replay = async () => {
    throw lostError();
  };
  await card._offlineReplay();
  await toggle(card, "i1", false);
  await card._mutate("shopping_add", { list_id: "l1", note: "Eggs" }, "shopping");
  script.replay = async (msg) => {
    if (msg.operation.action === "shopping_toggle")
      throw Object.assign(new Error("busy"), { code: "mealie_error" });
    return { ok: true };
  };
  const before = calls.length;
  await card._offlineReplay();
  const sent = calls.slice(before).filter((c) => c.type === "mealie_atelier/offline_replay");
  assert.deepEqual(
    sent.map((c) => [c.operation.action, c.operation.payload.checked]),
    [
      ["shopping_toggle", true],
      ["shopping_add", undefined],
    ],
  );
  assert.deepEqual(
    queue(card).map((op) => [op.payload.checked, op.state]),
    [
      [true, "failed"],
      [false, "pending"],
    ],
  );
  assert.match(card._offlineBar(), /1 change waiting/);
});
