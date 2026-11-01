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
const AUTH = { Authorization: "Basic " + Buffer.from("atelier:" + PASSWORD).toString("base64") };

/** A fake Bring! that counts sign-ins and either refuses them or never answers. */
async function countingBring(mode) {
  const stub = { logins: 0, sockets: new Set() };
  stub.server = createServer((req, res) => {
    req.resume();
    if (req.url.includes("bringauth")) {
      stub.logins += 1;
      if (mode === "hang") return;
      return res.writeHead(401, { "Content-Type": "application/json" }).end("{}");
    }
    res.writeHead(404).end("{}");
  });
  stub.server.on("connection", (s) => stub.sockets.add(s));
  stub.server.listen(0, "127.0.0.1");
  await once(stub.server, "listening");
  stub.base = `http://127.0.0.1:${stub.server.address().port}`;
  stub.close = () => {
    for (const s of stub.sockets) s.destroy();
    stub.server.close();
  };
  return stub;
}

async function startApp(bringBase) {
  const mealie = createServer((req, res) => {
    req.resume();
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ username: "u", items: [], page: 1, total_pages: 1 }));
  });
  mealie.listen(0, "127.0.0.1");
  await once(mealie, "listening");
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      PATH: process.env.PATH,
      MEALIE_URL: `http://127.0.0.1:${mealie.address().port}`,
      MEALIE_API_TOKEN: "t",
      ATELIER_PASSWORD: PASSWORD,
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-envlogin-")),
      PORT: "0",
      HOST: "127.0.0.1",
      BRING_API_BASE: bringBase,
      BRING_API_KEY: "key",
      BRING_EMAIL: "cook@example.test",
      BRING_PASSWORD: "wrong-password",
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

const status = (app) =>
  fetch(`http://127.0.0.1:${app.port}/api/bridge`, {
    method: "POST",
    headers: { ...AUTH, "X-Atelier-Request": "1", "Content-Type": "application/json" },
    body: JSON.stringify({ type: "mealie_atelier/status" }),
  });

test("a refused env login is not repeated by status calls and status replies at once", async () => {
  const bring = await countingBring("refuse");
  const app = await startApp(bring.base);
  try {
    while (!/refused the sign-in/.test(app.err)) await new Promise((r) => setTimeout(r, 20));
    assert.equal(bring.logins, 1);
    const started = Date.now();
    for (let i = 0; i < 5; i += 1) assert.equal((await status(app)).status, 200);
    assert.ok(Date.now() - started < 1500);
    assert.equal(bring.logins, 1);
  } finally {
    app.stop();
    bring.close();
  }
});

test("the server accepts connections while the startup login is pending", async () => {
  const bring = await countingBring("hang");
  const app = await startApp(bring.base);
  try {
    assert.ok(app.port > 0);
    assert.equal(bring.logins <= 1, true);
    const res = await status(app);
    assert.equal(res.status, 200);
    assert.equal(bring.logins, 1);
  } finally {
    app.stop();
    bring.close();
  }
});
