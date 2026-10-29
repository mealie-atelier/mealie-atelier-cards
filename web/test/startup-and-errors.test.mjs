import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASSWORD = "lengthy-test-password";

async function mealieStub({
  tokenOk = true,
  forbidden = false,
  html = false,
  plain = false,
  jsonMissing = false,
  hang = false,
} = {}) {
  const posts = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (hang) return;
      if (plain)
        return res.writeHead(404, { "Content-Type": "text/plain" }).end("404 page not found");
      if (jsonMissing)
        return res
          .writeHead(404, { "Content-Type": "application/json" })
          .end('{"detail":"Not Found"}');
      if (html) return res.writeHead(404, { "Content-Type": "text/html" }).end("<html></html>");
      res.setHeader("Content-Type", "application/json");
      if (forbidden) return res.writeHead(403).end("{}");
      if (!tokenOk) return res.writeHead(401).end("{}");
      if (req.method === "POST") posts.push(JSON.parse(raw));
      res
        .writeHead(200)
        .end(JSON.stringify(req.url.includes("users/self") ? { username: "u" } : {}));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, port: server.address().port, posts };
}

/** Starts the server; resolves with the exit result or the running child. */
async function start(env) {
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      PATH: process.env.PATH,
      MEALIE_API_TOKEN: "t",
      ATELIER_PASSWORD: PASSWORD,
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-start-")),
      PORT: "0",
      HOST: "127.0.0.1",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "",
    err = "";
  child.stderr.on("data", (c) => (err += c));
  return new Promise((resolve) => {
    child.stdout.on("data", (c) => {
      out += c;
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) resolve({ child, port: Number(m[1]) });
    });
    child.once("exit", (code) => resolve({ code, err }));
  });
}
const head = { Authorization: "Basic " + Buffer.from("atelier:" + PASSWORD).toString("base64") };
const call = (port, msg, extra = {}) =>
  fetch(`http://127.0.0.1:${port}/api/bridge`, {
    method: "POST",
    headers: { ...head, "Content-Type": "application/json", "X-Atelier-Request": "1", ...extra },
    body: JSON.stringify(msg),
  });

for (const [name, env, message] of [
  [
    "scheme-less MEALIE_URL",
    { MEALIE_URL: "192.168.1.20:9925" },
    /MEALIE_URL must be an http\(s\)/,
  ],
  ["negative PORT", { MEALIE_URL: "http://127.0.0.1:1", PORT: "-5" }, /PORT must be/],
  [
    "VAPID subject without mailto or https",
    {
      MEALIE_URL: "http://127.0.0.1:1",
      ATELIER_VAPID_PUBLIC_KEY: "x",
      ATELIER_VAPID_PRIVATE_KEY: "y",
      ATELIER_VAPID_SUBJECT: "someone@example.com",
    },
    /ATELIER_VAPID_SUBJECT must start with/,
  ],
  ["bad PORT", { MEALIE_URL: "http://127.0.0.1:1", PORT: "abc" }, /PORT must be/],
  [
    "bad trusted proxies",
    { MEALIE_URL: "http://127.0.0.1:1", ATELIER_TRUSTED_PROXIES: "nonsense" },
    /ATELIER_TRUSTED_PROXIES/,
  ],
  [
    "partial VAPID",
    { MEALIE_URL: "http://127.0.0.1:1", ATELIER_VAPID_PUBLIC_KEY: "x" },
    /ATELIER_VAPID_PRIVATE_KEY/,
  ],
  [
    "partial HA",
    { MEALIE_URL: "http://127.0.0.1:1", ATELIER_HA_URL: "http://ha.local" },
    /ATELIER_HA_TOKEN/,
  ],
  [
    "bad alarm channel",
    { MEALIE_URL: "http://127.0.0.1:1", ATELIER_ALARM_CHANNEL: "pigeon" },
    /ATELIER_ALARM_CHANNEL/,
  ],
  [
    "bad HA URL",
    {
      MEALIE_URL: "http://127.0.0.1:1",
      ATELIER_HA_URL: "notaurl",
      ATELIER_HA_TOKEN: "x",
      ATELIER_HA_NOTIFY_SERVICE: "notify.phone",
    },
    /ATELIER_HA_URL must be/,
  ],
]) {
  test(`startup rejects ${name} with a one-line message`, async () => {
    const r = await start(env);
    if (r.child) r.child.kill("SIGTERM");
    assert.equal(r.code, 1);
    assert.match(r.err, message);
    assert.ok(!r.err.includes("    at "), "no stack trace");
  });
}

test("wrong Mealie token is a translated-code 502 and status is not connected", async () => {
  const stub = await mealieStub({ tokenOk: false });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await call(r.port, { type: "mealie_atelier/shopping" });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).code, "mealie_auth");
    const status = await (await call(r.port, { type: "mealie_atelier/status" })).json();
    assert.equal(status.entries[0].connected, false);
    assert.equal(status.entries[0].features.ai, false);
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("status answers promptly while Mealie hangs", async () => {
  const stub = await mealieStub({ hang: true });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const started = Date.now();
    const status = await (await call(r.port, { type: "mealie_atelier/status" })).json();
    assert.equal(status.entries[0].connected, false);
    assert.ok(Date.now() - started < 8000, "status must not wait for the 25 s Mealie timeout");
  } finally {
    r.child.kill("SIGTERM");
    stub.server.closeAllConnections();
    stub.server.close();
  }
});

test("a 403 from Mealie stays a permission error, not a token error", async () => {
  const stub = await mealieStub({ forbidden: true });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await call(r.port, { type: "mealie_atelier/shopping" });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, "mealie_forbidden");
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("a JSON 404 from MEALIE_URL reports mealie_not_found", async () => {
  const stub = await mealieStub({ jsonMissing: true });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await call(r.port, { type: "mealie_atelier/shopping" });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).code, "mealie_not_found");
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("an HTML answer from MEALIE_URL reports mealie_not_mealie", async () => {
  const stub = await mealieStub({ html: true });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await call(r.port, { type: "mealie_atelier/shopping" });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).code, "mealie_not_mealie");
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("a plain-text 404 from MEALIE_URL reports mealie_not_mealie", async () => {
  const stub = await mealieStub({ plain: true });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await call(r.port, { type: "mealie_atelier/shopping" });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).code, "mealie_not_mealie");
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("free-text shopping items are sent without a forced quantity of 1", async () => {
  const stub = await mealieStub();
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await call(r.port, {
      type: "mealie_atelier/mutate",
      action: "shopping_add",
      payload: { list_id: "list-1", note: "2 Zitronen" },
    });
    assert.equal(res.status, 200);
    assert.equal(stub.posts[0].quantity, 0);
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("missing AI key returns a specific code", async () => {
  const stub = await mealieStub();
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}`, USDA_FDC_API_KEY: "bad" });
  try {
    const ai = await call(r.port, {
      type: "mealie_atelier/studio_substitute",
      ingredient: "Butter",
      recipe: { name: "x" },
    });
    assert.equal(ai.status, 400);
    assert.equal((await ai.json()).code, "ai_not_configured");
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("sign-in refusal is a localized HTML page for browsers and JSON for API clients", async () => {
  const stub = await mealieStub();
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const url = `http://127.0.0.1:${r.port}/`;
    const page = await fetch(url, { headers: { Accept: "text/html", "Accept-Language": "de" } });
    assert.equal(page.status, 401);
    assert.match(page.headers.get("www-authenticate"), /Basic/);
    assert.match(page.headers.get("content-type"), /text\/html/);
    assert.match(await page.text(), /Anmeldung erforderlich/);
    const api = await fetch(url);
    assert.match(api.headers.get("content-type"), /json/);
    for (let i = 0; i < 8; i++)
      await fetch(url, {
        headers: { Authorization: "Basic " + Buffer.from("atelier:wrong").toString("base64") },
      });
    const locked = await fetch(url, { headers: { Accept: "text/html", "Accept-Language": "en" } });
    assert.equal(locked.status, 429);
    assert.match(await locked.text(), /Try again in \d+ minutes?/);
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("a rejected USDA key carries its own error code", async () => {
  const { search: searchNutrition } = await import("../nutrition.mjs");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 403 });
  try {
    await assert.rejects(searchNutrition("bad", "butter"), (error) => {
      assert.equal(error.atelierCode, "usda_key_rejected");
      assert.match(error.message, /USDA/);
      return true;
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("/healthz is unauthenticated, checks the token server side and caches the result", async () => {
  const stub = await mealieStub();
  let hits = 0;
  stub.server.on("request", () => hits++);
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const url = `http://127.0.0.1:${r.port}/healthz`;
    const first = await fetch(url);
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { ok: true });
    assert.equal((await fetch(url)).status, 200);
    assert.equal(hits, 1, "second probe is served from the 60 s cache");
    assert.equal((await fetch(`http://127.0.0.1:${r.port}/api/health`)).status, 401);
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("/healthz answers 503 without details when Mealie rejects the token", async () => {
  const stub = await mealieStub({ tokenOk: false });
  const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
  try {
    const res = await fetch(`http://127.0.0.1:${r.port}/healthz`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false });
  } finally {
    r.child.kill("SIGTERM");
    stub.server.close();
  }
});

test("healthcheck.mjs exits 0 when healthy and 1 when not, without credentials", async () => {
  for (const [tokenOk, code] of [
    [true, 0],
    [false, 1],
  ]) {
    const stub = await mealieStub({ tokenOk });
    const r = await start({ MEALIE_URL: `http://127.0.0.1:${stub.port}` });
    try {
      const probe = spawn(process.execPath, [join(ROOT, "healthcheck.mjs")], {
        env: { PATH: process.env.PATH, PORT: String(r.port) },
      });
      const [exit] = await once(probe, "exit");
      assert.equal(exit, code);
    } finally {
      r.child.kill("SIGTERM");
      stub.server.close();
    }
  }
});
