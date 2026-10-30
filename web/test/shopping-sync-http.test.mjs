import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../security.mjs";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOKEN = "DEMO_MOCK_TOKEN";
const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

/** A Mealie stand-in with one shopping list and a few items; it records every write. */
async function mealie() {
  const items = [
    {
      id: "a",
      shoppingListId: "list-a",
      note: "Milch",
      display: "Milch",
      quantity: 0,
      checked: false,
    },
    {
      id: "b",
      shoppingListId: "list-a",
      note: "Brot",
      display: "Brot",
      quantity: 0,
      checked: false,
    },
  ];
  const writes = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, {});
    if (url.pathname === "/api/users/self") return json(res, 200, { username: "fixture" });
    if (url.pathname === "/api/households/shopping/lists")
      return json(res, 200, { items: [{ id: "list-a", name: "Einkauf" }] });
    if (url.pathname === "/api/households/shopping/items" && req.method === "GET")
      return json(res, 200, { items });
    if (url.pathname === "/api/households/shopping/items" && req.method === "POST") {
      writes.push({ method: "POST", path: url.pathname, body });
      items.push({ ...body, id: `n${items.length}`, display: body.note });
      return json(res, 200, items.at(-1));
    }
    const one = url.pathname.match(/^\/api\/households\/shopping\/items\/([^/]+)$/);
    const found = one && items.find((x) => x.id === one[1]);
    if (found && req.method === "GET") return json(res, 200, found);
    if (found && req.method === "PUT") {
      writes.push({ method: "PUT", path: url.pathname, body });
      Object.assign(found, body);
      return json(res, 200, found);
    }
    return json(res, 404, {});
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, port: server.address().port, items, writes };
}

async function launch(remote, bring, extra = {}) {
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: TOKEN,
      ATELIER_PASSWORD: "long-enough-password",
      ATELIER_USERNAME: "atelier",
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-sync-http-")),
      ...(bring
        ? {
            BRING_EMAIL: FAKE_EMAIL,
            BRING_PASSWORD: FAKE_PASSWORD,
            BRING_API_BASE: bring.base,
            BRING_API_KEY: FAKE_API_KEY,
          }
        : {}),
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
  const app = {
    port,
    stop: async () => {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 3000))]);
    },
    call: (type, other = {}, as = { name: "atelier", pass: "long-enough-password" }) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${as.name}:${as.pass}`).toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type, ...other }),
      }),
  };
  return app;
}
const body = async (response) => ({ status: response.status, ...(await response.json()) });

async function accounts() {
  const users = [
    ["ada", "admin", "admin-account-passphrase"],
    ["wim", "writer", "writer-account-passphrase"],
    ["rea", "reader", "reader-account-passphrase"],
  ];
  return {
    ATELIER_PASSWORD: "",
    ATELIER_USERS: (
      await Promise.all(
        users.map(async ([name, role, pass]) => `${name}:${role}:${await hashPassword(pass)}`),
      )
    ).join(";"),
    as: Object.fromEntries(users.map(([name, , pass]) => [name, { name, pass }])),
  };
}

test("without a Bring account the sync stays off and answers 501", async () => {
  const remote = await mealie();
  const app = await launch(remote, null);
  try {
    const status = await (await app.call("mealie_atelier/status")).json();
    assert.equal(status.entries[0].features.shopping_sync, false);
    const refused = await body(await app.call("mealie_atelier/sync_state"));
    assert.equal(refused.status, 501);
    assert.equal(refused.code, "sync_not_supported");
  } finally {
    await app.stop();
    remote.server.close();
  }
});

test("with a Bring account the app previews, gates the first batch and delivers once", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    const status = await (await app.call("mealie_atelier/status")).json();
    assert.equal(status.entries[0].features.shopping_sync, true);
    const destinations = await body(await app.call("mealie_atelier/sync_destinations"));
    const target = destinations.entities.find((x) => x.name === "Einkauf");
    assert.equal(target.platform, "bring");
    const rule = { source_list_id: "list-a", destination_entity_id: target.entity_id };
    const preview = await body(await app.call("mealie_atelier/sync_preview", { rule }));
    assert.deepEqual(
      preview.lines.map((x) => [x.title, x.action]),
      [
        ["Milch", "send"],
        ["Brot", "send"],
      ],
    );
    assert.equal(bring.state.puts().length, 0);
    const saved = await body(await app.call("mealie_atelier/sync_rule_save", { rule }));
    assert.equal(saved.status, 200);
    assert.equal(saved.rule.activated, false);
    const gated = await body(await app.call("mealie_atelier/sync_run", { rule_id: saved.rule.id }));
    assert.equal(gated.status, 409);
    assert.equal(gated.code, "sync_not_activated");
    assert.equal(bring.state.puts().length, 0);
    const sent = await body(
      await app.call("mealie_atelier/sync_run", {
        rule_id: saved.rule.id,
        confirm_first_batch: true,
      }),
    );
    assert.equal(sent.outcome, "sent");
    assert.equal(sent.sent, 2);
    assert.deepEqual(
      bring.state.open(bring.state.lists[0].listUuid).map((x) => x.itemId),
      ["Milch", "Brot"],
    );
    assert.deepEqual(remote.writes, [], "copy mode never writes to Mealie");
    const again = await body(await app.call("mealie_atelier/sync_run", { rule_id: saved.rule.id }));
    assert.equal(again.outcome, "nothing_to_send");
    assert.equal(bring.state.puts().length, 2);
    const state = await body(await app.call("mealie_atelier/sync_state"));
    assert.equal(state.rules[0].counts.sent, 2);
    assert.equal(state.rules[0].destination.available, true);
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("a restart of the app keeps the outbox and never delivers twice", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const dir = await mkdtemp(join(tmpdir(), "atelier-sync-restart-"));
  const first = await launch(remote, bring, { ATELIER_DATA_DIR: dir });
  let second;
  try {
    const list = bring.state.lists[0];
    const saved = await body(
      await first.call("mealie_atelier/sync_rule_save", {
        rule: { source_list_id: "list-a", destination_entity_id: `bring:${list.listUuid}` },
      }),
    );
    await first.call("mealie_atelier/sync_run", {
      rule_id: saved.rule.id,
      confirm_first_batch: true,
    });
    assert.equal(bring.state.puts().length, 2);
    await first.stop();
    second = await launch(remote, bring, { ATELIER_DATA_DIR: dir });
    const state = await body(await second.call("mealie_atelier/sync_state"));
    assert.equal(state.rules[0].activated, true);
    const result = await body(
      await second.call("mealie_atelier/sync_run", { rule_id: saved.rule.id }),
    );
    assert.equal(result.outcome, "nothing_to_send");
    assert.equal(bring.state.puts().length, 2);
  } finally {
    await first.stop();
    await second?.stop();
    remote.server.close();
    bring.close();
  }
});

test("a Mealie add triggers the debounced run of an activated rule", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    const list = bring.state.lists[0];
    const saved = await body(
      await app.call("mealie_atelier/sync_rule_save", {
        rule: {
          source_list_id: "list-a",
          destination_entity_id: `bring:${list.listUuid}`,
          debounce_seconds: 5,
        },
      }),
    );
    await app.call("mealie_atelier/sync_run", {
      rule_id: saved.rule.id,
      confirm_first_batch: true,
    });
    const added = await app.call("mealie_atelier/mutate", {
      action: "shopping_add",
      payload: { list_id: "list-a", note: "Eier" },
    });
    assert.equal(added.status, 200);
    assert.equal(bring.state.open(list.listUuid).length, 2);
    const deadline = Date.now() + 9000;
    while (bring.state.open(list.listUuid).length < 3 && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 250));
    assert.deepEqual(
      bring.state.open(list.listUuid).map((x) => x.itemId),
      ["Milch", "Brot", "Eier"],
    );
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("permissions: readers read, writers run, only admins configure or confirm", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const { as, ...users } = await accounts();
  const app = await launch(remote, bring, users);
  try {
    const list = bring.state.lists[0];
    const rule = { source_list_id: "list-a", destination_entity_id: `bring:${list.listUuid}` };
    const saved = await body(await app.call("mealie_atelier/sync_rule_save", { rule }, as.ada));
    assert.equal(saved.status, 200);
    const id = saved.rule.id;
    // Reading is open to every signed-in account.
    for (const who of [as.rea, as.wim])
      for (const type of ["sync_state", "sync_destinations", "sync_records"])
        assert.equal(
          (await app.call(`mealie_atelier/${type}`, { rule_id: id }, who)).status,
          200,
          `${who.name} ${type}`,
        );
    assert.equal(
      (await app.call("mealie_atelier/sync_preview", { rule_id: id }, as.rea)).status,
      200,
    );
    // Configuration and the first batch need an administrator, as in the Bridge.
    for (const [who, code] of [
      [as.rea, "write_not_permitted"],
      [as.wim, "unauthorized"],
    ])
      for (const [type, extra] of [
        ["sync_rule_save", { rule }],
        ["sync_rule_delete", { rule_id: id }],
        ["sync_run", { rule_id: id, confirm_first_batch: true }],
      ]) {
        const denied = await body(await app.call(`mealie_atelier/${type}`, extra, who));
        assert.equal(denied.status, 403, `${who.name} ${type}`);
        assert.equal(denied.code, code, `${who.name} ${type}`);
      }
    assert.equal(bring.state.puts().length, 0);
    // A reader may not run or pause, a writer may.
    for (const type of ["sync_pause", "sync_resume", "sync_retry", "sync_run"]) {
      const denied = await body(await app.call(`mealie_atelier/${type}`, { rule_id: id }, as.rea));
      assert.equal(denied.code, "write_not_permitted", type);
    }
    assert.equal(
      (
        await body(
          await app.call(
            "mealie_atelier/sync_run",
            { rule_id: id, confirm_first_batch: true },
            as.ada,
          ),
        )
      ).outcome,
      "sent",
    );
    const run = await body(await app.call("mealie_atelier/sync_run", { rule_id: id }, as.wim));
    assert.equal(run.status, 200);
    assert.equal(run.outcome, "nothing_to_send");
    assert.equal(
      (await app.call("mealie_atelier/sync_pause", { rule_id: id }, as.wim)).status,
      200,
    );
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("read-only mode keeps reading but blocks every changing sync command", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring, { ATELIER_READ_ONLY: "true" });
  try {
    const list = bring.state.lists[0];
    const rule = { source_list_id: "list-a", destination_entity_id: `bring:${list.listUuid}` };
    assert.equal((await app.call("mealie_atelier/sync_state")).status, 200);
    assert.equal((await app.call("mealie_atelier/sync_destinations")).status, 200);
    assert.equal((await app.call("mealie_atelier/sync_preview", { rule })).status, 200);
    for (const [type, extra] of [
      ["sync_rule_save", { rule }],
      ["sync_rule_delete", { rule_id: "x" }],
      ["sync_run", { rule_id: "x" }],
      ["sync_run", { rule_id: "x", confirm_first_batch: true }],
      ["sync_pause", { rule_id: "x" }],
      ["sync_resume", { rule_id: "x" }],
      ["sync_retry", { rule_id: "x" }],
      ["sync_resolve", { rule_id: "x", record_key: "y", action: "dismiss" }],
    ]) {
      const denied = await body(await app.call(`mealie_atelier/${type}`, extra));
      assert.equal(denied.status, 403, type);
      assert.equal(denied.code, "read_only", type);
    }
    assert.equal(bring.state.puts().length, 0);
    assert.deepEqual(remote.writes, []);
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("a Bring outage answers with a clear code and a wrong password never leaks", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring, { BRING_PASSWORD: "wrong-fixture-password" });
  try {
    const refused = await body(await app.call("mealie_atelier/sync_destinations"));
    assert.equal(refused.status, 502);
    assert.equal(refused.code, "destination_auth");
    assert.doesNotMatch(JSON.stringify(refused), /wrong-fixture-password|@example/);
    bring.close();
    const down = await body(await app.call("mealie_atelier/sync_destinations"));
    assert.equal(down.status, 502);
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});
