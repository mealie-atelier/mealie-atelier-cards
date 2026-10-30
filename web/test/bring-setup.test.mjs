import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../security.mjs";
import { FAKE_API_KEY, FAKE_EMAIL, FAKE_PASSWORD, startFakeBring } from "./fake-bring.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOKEN = "DEMO_MOCK_TOKEN";

/** A Mealie stand-in that answers the health call and an empty shopping list. */
async function mealie() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.writeHead(200, { "Content-Type": "application/json" });
    if (url.pathname === "/api/users/self") return res.end(JSON.stringify({ username: "fixture" }));
    res.end(JSON.stringify({ items: [] }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, port: server.address().port };
}

const USERS = [
  ["ada", "admin", "admin-account-passphrase"],
  ["wim", "writer", "writer-account-passphrase"],
  ["rea", "reader", "reader-account-passphrase"],
];
const AS = Object.fromEntries(USERS.map(([name, , pass]) => [name, { name, pass }]));

async function launch(remote, bring, { dir, env = {}, withEnvAccount = false } = {}) {
  const users = (
    await Promise.all(
      USERS.map(async ([name, role, pass]) => `${name}:${role}:${await hashPassword(pass)}`),
    )
  ).join(";");
  const dataDir = dir || (await mkdtemp(join(tmpdir(), "atelier-bring-setup-")));
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: TOKEN,
      ATELIER_PASSWORD: "",
      ATELIER_USERS: users,
      ATELIER_DATA_DIR: dataDir,
      BRING_EMAIL: "",
      BRING_PASSWORD: "",
      ...(withEnvAccount ? { BRING_EMAIL: FAKE_EMAIL, BRING_PASSWORD: FAKE_PASSWORD } : {}),
      BRING_API_BASE: bring.base,
      BRING_API_KEY: FAKE_API_KEY,
      PORT: "0",
      HOST: "127.0.0.1",
      ...env,
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
    dataDir,
    stop: async () => {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 3000))]);
    },
    call: async (type, other = {}, as = AS.ada) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${as.name}:${as.pass}`).toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type, ...other }),
      });
      return { status: response.status, ...(await response.json()) };
    },
  };
}

const connect = (app, as, password = FAKE_PASSWORD) =>
  app.call("mealie_atelier/bring_connect", { email: FAKE_EMAIL, password }, as);
const entry = async (app) => (await app.call("mealie_atelier/status")).entries[0];

/** Everything the app wrote into its data directory, as text. */
async function dataFiles(dir) {
  const names = await readdir(dir);
  return Promise.all(
    names.map(async (name) => ({
      name,
      mode: (await stat(join(dir, name))).mode & 0o777,
      text: await readFile(join(dir, name), "utf8"),
    })),
  );
}

test("an administrator connects Bring!, only tokens are stored with mode 600", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    const before = await entry(app);
    assert.equal(before.features.shopping_sync, false);
    assert.equal(before.features.bring_setup, true);
    assert.equal(before.bring.state, "disconnected");
    const connected = await connect(app);
    assert.equal(connected.status, 200);
    assert.equal(connected.state, "connected");
    assert.equal(JSON.stringify(connected).includes(FAKE_PASSWORD), false);
    const after = await entry(app);
    assert.equal(after.features.shopping_sync, true);
    assert.equal(after.bring.state, "connected");
    assert.equal(after.bring.account, "c•••@example.test", "only the masked address is shown");
    assert.match(after.bring.default_list, /^bring:[0-9a-f-]{36}$/);
    const lists = await app.call("mealie_atelier/sync_destinations");
    assert.deepEqual(lists.entities.map((x) => x.name).sort(), ["Einkauf", "Party"]);
    const file = (await dataFiles(app.dataDir)).find((x) => x.name === "bring-account.json");
    assert.equal(file.mode, 0o600);
    const saved = JSON.parse(file.text).session;
    assert.equal(typeof saved.accessToken, "string");
    assert.equal(typeof saved.refreshToken, "string");
    for (const secret of [FAKE_PASSWORD, FAKE_EMAIL])
      for (const each of await dataFiles(app.dataDir))
        assert.equal(each.text.includes(secret), false, `${each.name} must not hold ${secret}`);
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("after a restart the stored tokens connect again without any password", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const first = await launch(remote, bring);
  let second;
  try {
    await connect(first);
    await first.stop();
    const logins = bring.state.logins;
    second = await launch(remote, bring, { dir: first.dataDir });
    assert.equal((await entry(second)).bring.state, "connected");
    const lists = await second.call("mealie_atelier/sync_destinations");
    assert.equal(lists.entities.length, 2);
    assert.equal(bring.state.logins, logins, "the stored session was reused");
  } finally {
    await first.stop();
    await second?.stop();
    remote.server.close();
    bring.close();
  }
});

test("wrong credentials leave the app disconnected and store nothing", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    const refused = await connect(app, AS.ada, "not-the-password");
    assert.equal(refused.status, 422);
    assert.equal(refused.code, "bring_auth");
    assert.equal((await entry(app)).bring.state, "disconnected");
    assert.deepEqual(
      (await readdir(app.dataDir)).filter((name) => name.startsWith("bring-account")),
      [],
    );
    for (const body of [{}, { email: "nobody", password: "x" }, { email: FAKE_EMAIL }]) {
      const invalid = await app.call("mealie_atelier/bring_connect", body);
      assert.equal(invalid.status, 400);
      assert.equal(invalid.code, "bring_credentials");
    }
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("an unreachable Bring! answers 502 with its own code", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    bring.state.blocked = true;
    const failed = await connect(app);
    assert.equal(failed.status, 502);
    assert.equal(failed.code, "bring_network");
    assert.equal((await entry(app)).bring.state, "disconnected");
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("only an administrator may connect or disconnect", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    for (const as of [AS.wim, AS.rea]) {
      const refused = await connect(app, as);
      assert.equal(refused.status, 403, as.name);
      assert.match(refused.code, /unauthorized|write_not_permitted/);
      const disconnect = await app.call("mealie_atelier/bring_disconnect", {}, as);
      assert.equal(disconnect.status, 403, as.name);
    }
    assert.equal(bring.state.logins, 0, "no login was attempted");
    await connect(app);
    const refused = await app.call("mealie_atelier/bring_disconnect", {}, AS.wim);
    assert.equal(refused.status, 403);
    assert.equal((await entry(app)).bring.state, "connected");
    assert.equal(
      (await app.call("mealie_atelier/status", {}, AS.rea)).entries[0].bring.state,
      "connected",
    );
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("read-only mode refuses to connect and to disconnect", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring, { env: { ATELIER_READ_ONLY: "true" } });
  try {
    const refused = await connect(app);
    assert.equal(refused.status, 403);
    assert.equal(refused.code, "read_only");
    const disconnect = await app.call("mealie_atelier/bring_disconnect");
    assert.equal(disconnect.code, "read_only");
    assert.equal(bring.state.logins, 0);
    assert.equal((await entry(app)).bring.state, "disconnected");
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("disconnecting removes the tokens and turns the sync off", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    await connect(app);
    assert.equal((await app.call("mealie_atelier/sync_state")).status, 200);
    const gone = await app.call("mealie_atelier/bring_disconnect");
    assert.equal(gone.status, 200);
    assert.equal(gone.state, "disconnected");
    const after = await entry(app);
    assert.equal(after.features.shopping_sync, false);
    assert.equal(after.bring.state, "disconnected");
    assert.equal((await app.call("mealie_atelier/sync_state")).code, "sync_not_supported");
    assert.equal((await readdir(app.dataDir)).includes("bring-account.json"), false);
    assert.equal((await connect(app)).status, 200, "connecting again works");
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("a session Bring! no longer accepts shows reauth until the account is connected again", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring);
  try {
    await connect(app);
    bring.state.access.clear();
    bring.state.refresh.clear();
    const failed = await app.call("mealie_atelier/sync_destinations");
    assert.equal(failed.code, "destination_auth");
    assert.equal((await entry(app)).bring.state, "reauth");
    assert.equal((await connect(app)).status, 200);
    assert.equal((await entry(app)).bring.state, "connected");
    assert.equal((await app.call("mealie_atelier/sync_destinations")).status, 200);
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});

test("credentials from the environment are used for the login and never written down", async () => {
  const remote = await mealie();
  const bring = await startFakeBring();
  const app = await launch(remote, bring, { withEnvAccount: true });
  try {
    assert.equal((await entry(app)).bring.state, "connected");
    assert.equal((await app.call("mealie_atelier/sync_destinations")).status, 200);
    const files = await dataFiles(app.dataDir);
    assert.ok(files.some((x) => x.name === "bring-account.json" && x.mode === 0o600));
    for (const each of files)
      for (const secret of [FAKE_PASSWORD, FAKE_EMAIL])
        assert.equal(each.text.includes(secret), false, `${each.name} must not hold ${secret}`);
  } finally {
    await app.stop();
    remote.server.close();
    bring.close();
  }
});
