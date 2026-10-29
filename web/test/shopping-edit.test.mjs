import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, commandLevel } from "../security.mjs";
import { OfflineLedger, validateOperation } from "../offline-ledger.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

/** A small Mealie stand-in that keeps shopping items and records every request. */
async function mealie() {
  const items = [
    { id: "a", shoppingListId: "l1", note: "Milk", display: "Milk", quantity: 1, checked: false },
    {
      id: "b",
      shoppingListId: "l1",
      note: "",
      display: "2 Flour",
      food: { name: "Flour" },
      quantity: 2,
      checked: true,
    },
    { id: "c", shoppingListId: "l1", note: "Eggs", display: "Eggs", quantity: 1, checked: true },
    { id: "d", shoppingListId: "l2", note: "Nails", display: "Nails", quantity: 1, checked: true },
  ];
  const log = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    log.push({ method: req.method, path: url.pathname, body });
    if (req.headers.authorization !== "Bearer DEMO_MOCK_TOKEN") return json(res, 401, {});
    if (url.pathname === "/api/households/shopping/items" && req.method === "GET")
      return json(res, 200, { items });
    const one = url.pathname.match(/^\/api\/households\/shopping\/items\/([^/]+)$/);
    if (one) {
      const index = items.findIndex((x) => x.id === one[1]);
      if (index < 0) return json(res, 404, {});
      if (req.method === "GET") return json(res, 200, items[index]);
      if (req.method === "PUT") {
        // Like Mealie: `display` is built from quantity, name and note only when it arrives empty.
        const stored = { ...body };
        if (!stored.display)
          stored.display = [
            stored.quantity > 0 ? stored.quantity : "",
            stored.food?.name || stored.note,
          ]
            .filter(Boolean)
            .join(" ");
        items[index] = stored;
        return json(res, 200, stored);
      }
      if (req.method === "DELETE") {
        items.splice(index, 1);
        return json(res, 200, {});
      }
    }
    return json(res, 404, {});
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, port: server.address().port, items, log };
}

async function launch(remote, extra = {}) {
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-shop-edit-")),
      PORT: "0",
      HOST: "127.0.0.1",
      ...extra,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((resolve, reject) => {
    let out = "";
    const timeout = setTimeout(() => reject(Error("App did not start")), 5000);
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) {
        clearTimeout(timeout);
        resolve(Number(m[1]));
      }
    });
    child.once("exit", (code) => reject(Error("App exited " + code)));
  });
  return {
    port,
    stop: async () => {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 2000))]);
    },
  };
}
const as = (name, pass) => ({
  Authorization: "Basic " + Buffer.from(`${name}:${pass}`).toString("base64"),
  "Content-Type": "application/json",
  "X-Atelier-Request": "1",
});
const mutate = (app, name, pass, action, payload) =>
  fetch(`http://127.0.0.1:${app.port}/api/bridge`, {
    method: "POST",
    headers: as(name, pass),
    body: JSON.stringify({ type: "mealie_atelier/mutate", action, payload }),
  });

test("the web server mirrors delete, update and clear against the Mealie API", async () => {
  const remote = await mealie();
  const app = await launch(remote, {
    ATELIER_PASSWORD: "long-enough-password",
    ATELIER_USERNAME: "atelier",
  });
  const call = (action, payload) => mutate(app, "atelier", "long-enough-password", action, payload);
  try {
    // A food item keeps its note; a free-text item takes the new name as its note.
    let r = await call("shopping_update", {
      item_id: "b",
      quantity: 3,
      note: "organic",
    });
    assert.equal(r.status, 200);
    assert.deepEqual(
      remote.items.find((x) => x.id === "b"),
      {
        id: "b",
        shoppingListId: "l1",
        note: "organic",
        display: "3 Flour",
        food: { name: "Flour" },
        quantity: 3,
        checked: true,
      },
    );
    r = await call("shopping_update", { item_id: "a", name: "Oat milk" });
    assert.equal(r.status, 200);
    const milk = remote.items.find((x) => x.id === "a");
    assert.equal(milk.display, "1 Oat milk");
    assert.equal(milk.note, "Oat milk");
    // A quantity-only edit must not send the old display back, or the list never shows it.
    r = await call("shopping_update", { item_id: "c", quantity: 3 });
    assert.equal(r.status, 200);
    assert.equal(remote.items.find((x) => x.id === "c").display, "3 Eggs");
    // A free-text rename keeps the quantity in the label.
    r = await call("shopping_update", { item_id: "c", name: "Toast" });
    assert.equal(remote.items.find((x) => x.id === "c").display, "3 Toast");
    r = await call("shopping_update", { item_id: "c", name: "Eggs", quantity: 1 });
    assert.equal(milk.checked, false, "untouched fields survive the update");

    r = await call("shopping_delete", { item_id: "a" });
    assert.equal(r.status, 200);
    assert.ok(!remote.items.some((x) => x.id === "a"));
    r = await call("shopping_delete", { item_id: "a" });
    assert.equal(r.status, 200, "deleting a gone item is harmless");

    // Clear removes only ticked items of the named list.
    r = await call("shopping_clear_checked", { list_id: "l1" });
    assert.equal(r.status, 200);
    assert.deepEqual((await r.json()).deleted, 2);
    assert.deepEqual(
      remote.items.map((x) => x.id),
      ["d"],
    );
  } finally {
    await app.stop();
    remote.server.close();
  }
});

test("the new actions reject malformed payloads before touching Mealie", async () => {
  const remote = await mealie();
  const app = await launch(remote, {
    ATELIER_PASSWORD: "long-enough-password",
    ATELIER_USERNAME: "atelier",
  });
  const call = (action, payload) => mutate(app, "atelier", "long-enough-password", action, payload);
  try {
    const bad = [
      ["shopping_delete", {}],
      ["shopping_delete", { item_id: "../x" }],
      ["shopping_update", { item_id: "a" }],
      ["shopping_update", { item_id: "a", quantity: -1 }],
      ["shopping_update", { item_id: "a", quantity: "3" }],
      ["shopping_update", { item_id: "a", quantity: Infinity }],
      ["shopping_update", { item_id: "a", name: "  " }],
      ["shopping_update", { item_id: "a", name: "x", note: "y" }],
      ["shopping_clear_checked", { list_id: "l1", expected_ids: [] }],
      ["shopping_clear_checked", { list_id: "l1", expected_ids: ["a/b"] }],
      ["shopping_update", { item_id: "a", note: "x".repeat(251) }],
      ["shopping_clear_checked", {}],
      ["shopping_clear_checked", { list_id: "a/b" }],
    ];
    for (const [action, payload] of bad)
      assert.equal(
        (await call(action, payload)).status,
        400,
        `${action} ${JSON.stringify(payload)}`,
      );
    assert.deepEqual(
      remote.log.filter((x) => x.method !== "GET"),
      [],
    );
    assert.equal(remote.items.length, 4);
  } finally {
    await app.stop();
    remote.server.close();
  }
});

test("readers cannot edit, delete or clear; writers can", async () => {
  const remote = await mealie();
  const users = [
    `wim:writer:${await hashPassword("writer-account-passphrase")}`,
    `rea:reader:${await hashPassword("reader-account-passphrase")}`,
  ];
  const app = await launch(remote, { ATELIER_USERS: users.join(";") });
  try {
    for (const [action, payload] of [
      ["shopping_delete", { item_id: "a" }],
      ["shopping_update", { item_id: "a", quantity: 2 }],
      ["shopping_clear_checked", { list_id: "l1" }],
    ]) {
      const denied = await mutate(app, "rea", "reader-account-passphrase", action, payload);
      assert.equal(denied.status, 403, action);
      assert.equal((await denied.json()).code, "write_not_permitted");
    }
    assert.deepEqual(
      remote.log.filter((x) => x.method !== "GET"),
      [],
    );
    const ok = await mutate(app, "wim", "writer-account-passphrase", "shopping_delete", {
      item_id: "a",
    });
    assert.equal(ok.status, 200);
  } finally {
    await app.stop();
    remote.server.close();
  }
});

test("read-only mode blocks the new actions", async () => {
  const remote = await mealie();
  const app = await launch(remote, {
    ATELIER_PASSWORD: "long-enough-password",
    ATELIER_USERNAME: "atelier",
    ATELIER_READ_ONLY: "true",
  });
  try {
    const r = await mutate(app, "atelier", "long-enough-password", "shopping_delete", {
      item_id: "a",
    });
    assert.equal(r.status, 403);
    assert.equal(remote.items.length, 4);
  } finally {
    await app.stop();
    remote.server.close();
  }
});

test("the permission matrix lists the new actions at the write level", () => {
  for (const action of ["shopping_delete", "shopping_update", "shopping_clear_checked"])
    assert.equal(commandLevel({ type: "mealie_atelier/mutate", action }), "write", action);
});

// Offline ledger

const op = (action, payload) => ({ id: randomUUID(), action, payload });

test("the ledger validates the new offline operations", () => {
  assert.doesNotThrow(() => validateOperation(op("shopping_delete", { item_id: "a" })));
  assert.doesNotThrow(() =>
    validateOperation(op("shopping_update", { item_id: "a", quantity: 0 })),
  );
  assert.doesNotThrow(() => validateOperation(op("shopping_update", { item_id: "a", note: "" })));
  assert.doesNotThrow(() => validateOperation(op("shopping_clear_checked", { list_id: "l1" })));
  for (const bad of [
    op("shopping_delete", { item_id: "a b" }),
    op("shopping_update", { item_id: "a" }),
    op("shopping_update", { item_id: "a", quantity: -2 }),
    op("shopping_update", { item_id: "a", name: "" }),
    op("shopping_update", { item_id: "a", name: "x", note: "y" }),
    op("shopping_clear_checked", { list_id: "l1", expected_ids: [] }),
    op("shopping_clear_checked", {}),
  ])
    assert.throws(() => validateOperation(bad), { status: 400 }, JSON.stringify(bad));
});

test("a replayed delete, update or clear reaches Mealie once and a failure can be retried", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atelier-ledger-"));
  try {
    const sent = [];
    let fail = true;
    const ledger = new OfflineLedger({
      dir,
      readItem: async () => ({}),
      mutate: async (action, payload) => {
        sent.push(action);
        if (fail) throw new Error("network lost");
        return { action, payload };
      },
    });
    const del = op("shopping_delete", { item_id: "a" });
    await assert.rejects(ledger.process(del), /network lost/);
    // Unlike an add, a failed delete is safe to send again and is never marked uncertain.
    const { readFile } = await import("node:fs/promises");
    const stored = JSON.parse(await readFile(join(dir, "offline-ledger.json"), "utf8"));
    assert.equal(stored[del.id].state, "checking");
    fail = false;
    assert.equal((await ledger.process(del)).ok, true);
    assert.equal((await ledger.process(del)).replayed, true);
    const upd = op("shopping_update", { item_id: "a", quantity: 2 });
    const clr = op("shopping_clear_checked", { list_id: "l1" });
    await ledger.process(upd);
    await ledger.process(clr);
    await ledger.process(clr);
    assert.deepEqual(sent, [
      "shopping_delete",
      "shopping_delete",
      "shopping_update",
      "shopping_clear_checked",
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Standalone offline client

async function offlineClient() {
  globalThis.self ??= globalThis;
  const channel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  const { AtelierOfflineClient } = await import("../public/offline-client.js");
  globalThis.BroadcastChannel = channel;
  const store = globalThis.self.AtelierOfflineCore;
  store.putOp = async () => {};
  store.deleteOp = async () => {};
  const client = new AtelierOfflineClient();
  client.enabled = true;
  client.snapshot = {
    lists: [{ id: "l1", name: "Groceries" }],
    items: [
      { id: "a", shoppingListId: "l1", note: "Milk", display: "Milk", quantity: 1, checked: false },
      {
        id: "b",
        shoppingListId: "l1",
        note: "",
        display: "2 Flour",
        food: { name: "Flour" },
        quantity: 2,
        checked: true,
      },
      { id: "c", shoppingListId: "l1", note: "Eggs", checked: true },
    ],
  };
  return client;
}

test("the offline client queues edits, deletes and clears and shows them in the list", async () => {
  const client = await offlineClient();
  await client.enqueue("shopping_update", {
    item_id: "a",
    name: "Oat milk",
    junk: 1,
  });
  await client.enqueue("shopping_update", { item_id: "b", quantity: 3, note: "organic" });
  await client.enqueue("shopping_delete", { item_id: "c" });
  assert.deepEqual(
    client.operations.map((x) => [x.action, x.payload]),
    [
      ["shopping_update", { item_id: "a", name: "Oat milk" }],
      ["shopping_update", { item_id: "b", quantity: 3, note: "organic" }],
      ["shopping_delete", { item_id: "c" }],
    ],
  );
  let view = client.shopping.items;
  assert.deepEqual(
    view.map((x) => x.id),
    ["a", "b"],
  );
  assert.equal(view[0].display, "Oat milk");
  assert.equal(view[1].quantity, 3);
  await client.enqueue("shopping_clear_checked", {
    list_id: "l1",
    expected_ids: ["b", "c"],
    extra: true,
  });
  assert.deepEqual(client.operations.at(-1).payload, { list_id: "l1", expected_ids: ["b", "c"] });
  view = client.shopping.items;
  assert.deepEqual(
    view.map((x) => x.id),
    ["a"],
    "ticked rows leave the list",
  );
});

test("the offline client refuses edits of unknown items, empty updates and unknown lists", async () => {
  const client = await offlineClient();
  await assert.rejects(client.enqueue("shopping_delete", { item_id: "zzz" }), {
    code: "offlineItemNotEditable",
  });
  await assert.rejects(client.enqueue("shopping_update", { item_id: "zzz", quantity: 1 }), {
    code: "offlineItemNotEditable",
  });
  await assert.rejects(client.enqueue("shopping_update", { item_id: "a" }), {
    code: "offlineInvalidItem",
  });
  await assert.rejects(client.enqueue("shopping_clear_checked", { list_id: "nope" }), {
    code: "offlineInvalidItem",
  });
  assert.equal(client.operations.length, 0);
});

test("the app shell routes every offline action to the offline client", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(join(ROOT, "public/index.html"), "utf8");
  assert.match(html, /OFFLINE_ACTIONS\.includes\(message\.action\)/);
  globalThis.self ??= globalThis;
  const channel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  const { OFFLINE_ACTIONS } = await import("../public/offline-client.js");
  globalThis.BroadcastChannel = channel;
  const { OFFLINE_ACTIONS: ledgerActions } = await import("../offline-ledger.mjs");
  assert.deepEqual([...OFFLINE_ACTIONS].sort(), [...ledgerActions].sort());
});

test("a renamed food item keeps its new name through later edits and clear honours expected_ids", async () => {
  const remote = await mealie();
  const app = await launch(remote, {
    ATELIER_PASSWORD: "long-enough-password",
    ATELIER_USERNAME: "atelier",
  });
  const call = (action, payload) => mutate(app, "atelier", "long-enough-password", action, payload);
  try {
    let r = await call("shopping_update", { item_id: "b", name: "Spelt flour" });
    assert.equal(r.status, 200);
    let stored = remote.items.find((x) => x.id === "b");
    assert.equal(stored.food, null, "the rename turns the item into a free text item");
    assert.equal(stored.note, "Spelt flour");
    assert.equal(stored.display, "2 Spelt flour");
    r = await call("shopping_update", { item_id: "b", quantity: 4 });
    assert.equal(r.status, 200);
    stored = remote.items.find((x) => x.id === "b");
    assert.equal(
      stored.display,
      "4 Spelt flour",
      "a quantity edit must not bring the old name back",
    );

    // Only the ticked rows the user saw are removed.
    r = await call("shopping_clear_checked", { list_id: "l1", expected_ids: ["b"] });
    assert.equal((await r.json()).deleted, 1);
    assert.ok(
      remote.items.some((x) => x.id === "c"),
      "a row ticked meanwhile stays",
    );
  } finally {
    await app.stop();
    remote.server.close();
  }
});

test("the offline view rebuilds the label after quantity, note and rename edits", async () => {
  globalThis.self ??= globalThis;
  await import("../public/offline-core.js");
  const { withPending } = globalThis.self.AtelierOfflineCore;
  const base = {
    lists: [],
    items: [
      {
        id: "m",
        food: { name: "Milch" },
        unit: { name: "l" },
        quantity: 2,
        display: "2 l Milch",
      },
    ],
  };
  const view = (payload) =>
    withPending(base, [
      { id: "o", action: "shopping_update", payload: { item_id: "m", ...payload } },
    ]).items[0];
  assert.equal(view({ quantity: 3 }).display, "3 l Milch");
  assert.equal(view({ note: "bio" }).display, "2 l Milch bio");
  const renamed = view({ name: "Hafermilch" });
  assert.equal(renamed.display, "2 l Hafermilch");
  assert.equal(renamed.food, null);
  assert.equal(base.items[0].display, "2 l Milch", "the snapshot is not mutated");
});
