import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BringClient } from "../bring-client.mjs";
import { BringDestination, SyncManager, SyncStore } from "../shopping-sync.mjs";
import { mapItem } from "../shopping-sync-mapping.mjs";
import { initPwaInstall } from "../public/pwa-install.js";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASSWORD = "lengthy-test-password";
const AUTH = { Authorization: "Basic " + Buffer.from("atelier:" + PASSWORD).toString("base64") };

async function mealieStub() {
  const server = createServer((req, res) => {
    req.resume();
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ username: "u", items: [], page: 1, total_pages: 1 }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

/** Starts the web server on a free port; resolves with the child, port and collected stderr. */
async function startApp(extraEnv = {}) {
  const mealie = await mealieStub();
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      PATH: process.env.PATH,
      MEALIE_URL: `http://127.0.0.1:${mealie.address().port}`,
      MEALIE_API_TOKEN: "t",
      ATELIER_PASSWORD: PASSWORD,
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-runtime-")),
      PORT: "0",
      HOST: "127.0.0.1",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const app = { child, err: "" };
  child.stderr.on("data", (c) => (app.err += c));
  app.port = await new Promise((resolve, reject) => {
    let out = "";
    child.stdout.on("data", (c) => {
      out += c;
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) resolve(Number(m[1]));
    });
    child.once("exit", () => reject(new Error("server exited: " + app.err)));
  });
  app.stop = () => {
    child.kill("SIGTERM");
    mealie.close();
  };
  return app;
}
const fetchApp = (app, path, init = {}) =>
  fetch(`http://127.0.0.1:${app.port}${path}`, {
    ...init,
    headers: { ...AUTH, ...init.headers },
  });

test("the manifest follows the language cookie or Accept-Language and varies on both", async () => {
  const app = await startApp();
  try {
    const german = await (
      await fetchApp(app, "/manifest.webmanifest", { headers: { "Accept-Language": "de-DE" } })
    ).json();
    assert.equal(german.lang, "de");
    assert.match(german.name, /Küchenstudio/);
    const english = await fetchApp(app, "/manifest.webmanifest", {
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    assert.equal(english.headers.get("vary"), "Accept-Language, Cookie");
    const body = await english.json();
    assert.equal(body.lang, "en");
    assert.match(body.name, /kitchen studio/i);
    assert.match(body.description, /^Your private kitchen studio/);
    assert.equal(body.icons.length, 3);
    const cookie = await (
      await fetchApp(app, "/manifest.webmanifest", {
        headers: { "Accept-Language": "de", Cookie: "atelier_lang=en" },
      })
    ).json();
    assert.equal(cookie.lang, "en");
  } finally {
    app.stop();
  }
});

test("HEAD is served like GET without a body, for files and for the HTML 404", async () => {
  const app = await startApp();
  try {
    for (const path of ["/", "/sw.js", "/manifest.webmanifest"]) {
      const get = await fetchApp(app, path);
      const head = await fetchApp(app, path, { method: "HEAD" });
      assert.equal(head.status, 200, path);
      assert.equal(head.headers.get("content-type"), get.headers.get("content-type"));
      assert.equal((await head.text()).length, 0);
    }
    const missing = await fetchApp(app, "/nope", {
      method: "HEAD",
      headers: { Accept: "text/html" },
    });
    assert.equal(missing.status, 404);
    assert.equal((await missing.text()).length, 0);
  } finally {
    app.stop();
  }
});

test("the lockout page counts seconds first and minutes only from 60 seconds", async () => {
  const app = await startApp();
  try {
    const wrong = { Authorization: "Basic " + Buffer.from("atelier:wrong").toString("base64") };
    for (let i = 0; i < 8; i++) await fetch(`http://127.0.0.1:${app.port}/`, { headers: wrong });
    const page = await fetch(`http://127.0.0.1:${app.port}/`, {
      headers: { Accept: "text/html", "Accept-Language": "de" },
    });
    assert.equal(page.status, 429);
    const wait = Number(page.headers.get("retry-after"));
    assert.ok(wait >= 1 && wait < 60);
    assert.match(
      await page.text(),
      new RegExp(`in ${wait} ${wait === 1 ? "Sekunde" : "Sekunden"} erneut`),
    );
  } finally {
    app.stop();
  }
});

test("wrong BRING_PASSWORD is logged at startup and the account needs a sign-in", async () => {
  const bring = await startFakeBring();
  bring.state.rejectLogin = true;
  const app = await startApp({
    BRING_API_BASE: bring.base,
    BRING_API_KEY: FAKE_API_KEY,
    BRING_EMAIL: FAKE_EMAIL,
    BRING_PASSWORD: "wrong-password",
  });
  try {
    // The check runs after the server listens, so wait for its log line.
    for (let i = 0; i < 100 && !/refused the sign-in/.test(app.err); i += 1)
      await new Promise((resolve) => setTimeout(resolve, 50));
    assert.match(app.err, /Bring! refused the sign-in from BRING_EMAIL and BRING_PASSWORD/);
    const res = await fetchApp(app, "/api/bridge", {
      method: "POST",
      headers: { "X-Atelier-Request": "1", "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mealie_atelier/status" }),
    });
    const { entries } = await res.json();
    assert.equal(entries[0].bring.state, "reauth");
    assert.equal(entries[0].bring.from_env, true);
  } finally {
    app.stop();
    bring.close();
  }
});

test("status signs in lazily with environment credentials so the usual list is known", async () => {
  const bring = await startFakeBring();
  const app = await startApp({
    BRING_API_BASE: bring.base,
    BRING_API_KEY: FAKE_API_KEY,
    BRING_EMAIL: FAKE_EMAIL,
    BRING_PASSWORD: FAKE_PASSWORD,
  });
  try {
    const res = await fetchApp(app, "/api/bridge", {
      method: "POST",
      headers: { "X-Atelier-Request": "1", "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mealie_atelier/status" }),
    });
    const { entries } = await res.json();
    assert.equal(entries[0].bring.state, "connected");
    assert.match(entries[0].bring.default_list, /^bring:/);
  } finally {
    app.stop();
    bring.close();
  }
});

test("without ATELIER_SYNC_LANGUAGE the sync preview follows the request language and remembers it", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "atelier-runtime-"));
  const bring = await startFakeBring();
  const app = await startApp({
    BRING_API_BASE: bring.base,
    BRING_API_KEY: FAKE_API_KEY,
    BRING_EMAIL: FAKE_EMAIL,
    BRING_PASSWORD: FAKE_PASSWORD,
    ATELIER_DATA_DIR: dataDir,
  });
  try {
    const preview = async (language) => {
      const res = await fetchApp(app, "/api/bridge", {
        method: "POST",
        headers: {
          "X-Atelier-Request": "1",
          "Content-Type": "application/json",
          "Accept-Language": language,
        },
        body: JSON.stringify({
          type: "mealie_atelier/sync_preview",
          rule: {
            source_list_id: "list-x",
            destination_entity_id: `bring:${bring.state.lists[0].listUuid}`,
          },
        }),
      });
      return (await res.json()).sample?.title;
    };
    assert.match(await preview("en"), /potatoes/i);
    assert.match(await preview("de"), /Kartoffeln/);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal((await readFile(join(dataDir, "sync-language.txt"), "utf8")).trim(), "de");
  } finally {
    app.stop();
    bring.close();
  }
});

test("a bare amount of 1 gives no detail on the Bring! layout, other amounts keep it", () => {
  const one = mapItem({ id: "a", note: "Milch", quantity: 1 }, { layout: "bring" });
  assert.equal(one.spec, "");
  assert.equal(one.title, "Milch");
  assert.equal(mapItem({ id: "a", note: "Milch", quantity: 2 }, { layout: "bring" }).spec, "2");
  const withUnit = mapItem(
    { id: "a", note: "Mehl", quantity: 1, unit: { name: "Packung" } },
    { layout: "bring" },
  );
  assert.equal(withUnit.spec, "1 Packung");
});

test("the install dialog gives the initial focus to the title, never the close button", () => {
  const node = (extra = {}) => ({
    textContent: "",
    hidden: false,
    attrs: {},
    focused: false,
    setAttribute(key, value) {
      this.attrs[key] = value;
    },
    hasAttribute: () => false,
    addEventListener() {},
    replaceChildren() {},
    focus() {
      this.focused = true;
    },
    ...extra,
  });
  const title = node();
  const close = node();
  const action = node({ hidden: true });
  const trigger = { ...node(), querySelector: () => node() };
  const dialog = {
    ...node(),
    showModal() {},
    querySelector(selector) {
      if (selector === "[data-install-title]") return title;
      if (selector === "[data-install-action]") return action;
      if (selector === "[data-install-action]:not([hidden])") return action.hidden ? null : action;
      return node();
    },
    querySelectorAll: () => [close],
  };
  const clicks = [];
  trigger.addEventListener = (name, fn) => clicks.push(fn);
  const handle = initPwaInstall({
    documentRef: {
      querySelector: (s) => (s === "#pwa-install-trigger" ? trigger : dialog),
      createElement: node,
      documentElement: { lang: "en" },
    },
    navigatorRef: { language: "en", userAgent: "" },
    windowRef: { addEventListener() {}, removeEventListener() {} },
  });
  assert.ok(handle);
  clicks[0]();
  assert.equal(title.focused, true);
  assert.equal(title.attrs.tabindex, "-1");
  assert.equal(close.focused, false);
});

// Sync engine

async function engine({ items, bring, delivery } = {}) {
  const fake = bring || (await startFakeBring());
  const state = { items: items || [] };
  const client = new BringClient({
    email: FAKE_EMAIL,
    password: FAKE_PASSWORD,
    base: fake.base,
    apiKey: FAKE_API_KEY,
    retryDelayMs: 0,
  });
  const scheduled = [];
  const timers = {
    set(callback, ms) {
      const entry = { callback, ms, live: true };
      scheduled.push(entry);
      return () => (entry.live = false);
    },
  };
  const manager = new SyncManager({
    store: new SyncStore({ dir: await mkdtemp(join(tmpdir(), "atelier-runtime-sync-")) }),
    source: {
      lists: async () => [{ id: "list-a", name: "Einkauf" }],
      items: async () => state.items.map((x) => ({ ...x })),
      item: async (id) => ({ ...state.items.find((x) => x.id === id) }),
      setChecked: async () => {},
    },
    destination: new BringDestination(client, { cacheMs: 0 }),
    language: () => "en",
    timers,
  });
  await manager.start();
  const list = fake.state.lists[0];
  const ruleId = (
    await manager.saveRule({
      source_list_id: "list-a",
      destination_entity_id: `bring:${list.listUuid}`,
    })
  ).id;
  return {
    fake,
    state,
    manager,
    ruleId,
    live: () => scheduled.filter((e) => e.live),
    close: async () => {
      await manager.stop();
      fake.close();
    },
  };
}
const row = (id, note) => ({ id, shoppingListId: "list-a", checked: false, quantity: 0, note });

test("a confirmed empty first batch activates the rule", async () => {
  const env = await engine({ items: [] });
  try {
    const result = await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    assert.equal(result.outcome, "nothing_to_send");
    assert.equal(env.manager.rules[env.ruleId].activated, true);
    // An unconfirmed empty pass does not activate a second rule by itself.
  } finally {
    await env.close();
  }
});

test("items added during an outage are queued as waiting and retried with backoff", async () => {
  const env = await engine({ items: [row("a", "Milch")] });
  try {
    await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    env.state.items.push(row("b", "Zucker"));
    env.fake.state.blocked = true;
    env.manager.destination.cache = null;
    const result = await env.manager.run(env.ruleId, "after_atelier_add");
    assert.equal(result.outcome, "destination_unavailable");
    assert.equal(env.manager.records[`${env.ruleId}:b`].state, "pending");
    assert.equal(result.pending_left, 1);
    const first = env.live();
    assert.equal(first.length, 1);
    assert.equal(first[0].ms, 30000);
    // The retry fails again: the delay doubles.
    first[0].live = false;
    first[0].callback();
    await Promise.allSettled([...env.manager.tasks]);
    assert.equal(env.live().at(-1).ms, 60000);
    // Bring! answers again: the next retry delivers the waiting item.
    env.fake.state.blocked = false;
    const next = env.live().at(-1);
    next.live = false;
    next.callback();
    await Promise.allSettled([...env.manager.tasks]);
    assert.equal(env.manager.records[`${env.ruleId}:b`].state, "sent");
    assert.equal(env.fake.state.open(env.fake.state.lists[0].listUuid).length, 2);
  } finally {
    await env.close();
  }
});

test("a run that only skipped duplicates reports nothing_to_send", async () => {
  const env = await engine({ items: [row("a", "Milch")] });
  try {
    await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    env.state.items.push(row("b", "Milch"));
    const result = await env.manager.run(env.ruleId, "manual");
    assert.equal(result.sent, 0);
    assert.equal(result.skipped_duplicates, 1);
    assert.equal(result.outcome, "nothing_to_send");
  } finally {
    await env.close();
  }
});

test("lines beyond one batch continue without a new trigger", async () => {
  const items = Array.from({ length: 55 }, (_, i) => row(`i${i}`, `Artikel ${i}`));
  const env = await engine({ items });
  try {
    const result = await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    assert.equal(result.pending_left, 5);
    assert.equal(env.live().length, 1);
  } finally {
    await env.close();
  }
});

test("resending a conflict line schedules a run", async () => {
  const env = await engine({ items: [row("a", "Milch")] });
  try {
    await env.manager.run(env.ruleId, "manual", { confirmFirstBatch: true });
    env.state.items[0].note = "Milch 3,5%";
    await env.manager.run(env.ruleId, "manual");
    const key = `${env.ruleId}:a`;
    assert.equal(env.manager.records[key].state, "changed_after_send");
    const before = env.live().length;
    await env.manager.resolve(env.ruleId, key, "resend");
    assert.equal(env.manager.records[key].state, "pending");
    assert.equal(env.live().length, before + 1);
  } finally {
    await env.close();
  }
});
