import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const basic = "Basic " + Buffer.from("atelier:test-pass-long-enough").toString("base64");
async function launch(file, env = {}) {
  const child = spawn(process.execPath, [join(ROOT, file)], {
    env: { ...process.env, ...env },
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((resolve, reject) => {
    let raw = "";
    const t = setTimeout(() => reject(Error("startup timeout")), 8000);
    child.stdout.on("data", (b) => {
      raw += b;
      const m = raw.match(/(?:127\.0\.0\.1:)?(\d{4,5})\b/);
      if (m) {
        clearTimeout(t);
        resolve(Number(m[1]));
      }
    });
    child.on("exit", (code) => {
      clearTimeout(t);
      reject(Error("process exited " + code));
    });
  });
  return {
    child,
    port,
    close: async () => {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 2000))]);
    },
  };
}
const bridge = async (port, type, more = {}) => {
  const r = await fetch(`http://127.0.0.1:${port}/api/bridge`, {
    method: "POST",
    headers: { Authorization: basic, "X-Atelier-Request": "1", "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...more }),
  });
  return { status: r.status, body: await r.json() };
};
test("HTTP two devices: sync, idempotency, conflicts, offline app assets and timer after clients gone", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atelier-http-v094-"));
  let mock, app;
  try {
    mock = await launch("test/mock-services.mjs");
    app = await launch("server.mjs", {
      PORT: "0",
      HOST: "127.0.0.1",
      MEALIE_URL: `http://127.0.0.1:${mock.port}`,
      MEALIE_API_TOKEN: "LOCAL_TEST_TOKEN",
      ATELIER_USERNAME: "atelier",
      ATELIER_PASSWORD: "test-pass-long-enough",
      ATELIER_DATA_DIR: dir,
      ATELIER_HA_URL: `http://127.0.0.1:${mock.port}`,
      ATELIER_HA_TOKEN: "test-token",
      ATELIER_HA_NOTIFY_SERVICE: "notify.mobile_app_test",
      ATELIER_ALARM_CHANNEL: "ha",
    });
    const api = app.port,
      deviceA = randomUUID(),
      deviceB = randomUUID();
    const shopping = await bridge(api, "mealie_atelier/shopping");
    assert.equal(shopping.status, 200);
    assert.equal(shopping.body.items[0].checked, false);
    const op = {
      id: deviceA,
      action: "shopping_toggle",
      payload: { item_id: "item-a", expected_checked: false, checked: true },
    };
    const result = await bridge(api, "mealie_atelier/offline_replay", { operation: op });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const replay = await bridge(api, "mealie_atelier/offline_replay", { operation: op });
    assert.equal(replay.body.replayed, true);
    const updated = await bridge(api, "mealie_atelier/shopping");
    assert.equal(updated.body.items[0].checked, true);
    const add = {
      id: deviceB,
      action: "shopping_add",
      payload: { list_id: "list-a", note: "Milch" },
    };
    assert.equal(
      (await bridge(api, "mealie_atelier/offline_replay", { operation: add })).status,
      200,
    );
    assert.equal(
      (await bridge(api, "mealie_atelier/offline_replay", { operation: add })).body.replayed,
      true,
    );
    const stats = await (await fetch(`http://127.0.0.1:${mock.port}/events`)).json();
    assert.equal(stats.writes, 1);
    assert.equal(stats.adds, 1);
    const bad = await bridge(api, "mealie_atelier/offline_replay", {
      operation: {
        id: randomUUID(),
        action: "shopping_toggle",
        payload: { item_id: "item-a", checked: false, expected_checked: false },
      },
    });
    assert.equal(bad.status, 409);
    assert.equal(bad.body.code, "offline_conflict");
    for (const asset of [
      "/",
      "/sw.js",
      "/offline-core.js",
      "/offline-client.js",
      "/shell.css",
      "/pwa-install.css",
      "/pwa-install.js",
      "/manifest.webmanifest",
      "/icon-192.png",
      "/icon-512.png",
      "/apple-touch-icon.png",
    ]) {
      const r = await fetch(`http://127.0.0.1:${api}${asset}`, {
        headers: { Authorization: basic },
      });
      assert.equal(r.status, 200, asset);
    }
    const noCsrf = await fetch(`http://127.0.0.1:${api}/api/bridge`, {
      method: "POST",
      headers: { Authorization: basic },
      body: "{}",
    });
    assert.equal(noCsrf.status, 403);
    const timer = { id: randomUUID(), label: "Closed browser alarm", deadline: Date.now() + 1600 };
    assert.equal((await bridge(api, "mealie_atelier/alarm_create", { timer })).status, 200);
    // No browser or client connection remains; the companion server must fire independently.
    await new Promise((resolve) => setTimeout(resolve, 3100));
    const after = await (await fetch(`http://127.0.0.1:${mock.port}/events`)).json();
    assert.equal(after.alerts.length, 1);
    assert.match(after.alerts[0].message, /Closed browser alarm/);
    const alarmStatus = await bridge(api, "mealie_atelier/alarms");
    assert.equal(alarmStatus.body.alarms[0].status, "sent");
  } finally {
    await app?.close();
    await mock?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
