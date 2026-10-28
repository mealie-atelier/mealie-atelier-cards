import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const COMMANDS = [
  "sync_state",
  "sync_destinations",
  "sync_preview",
  "sync_rule_save",
  "sync_rule_delete",
  "sync_run",
  "sync_pause",
  "sync_resume",
  "sync_retry",
  "sync_resolve",
  "sync_records",
];

test("standalone app answers every sync command with 501 sync_not_supported and no Mealie call", async () => {
  let mealieCalls = 0;
  const remote = createServer((req, res) => {
    mealieCalls++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("{}");
  });
  await new Promise((resolve) => remote.listen(0, "127.0.0.1", resolve));
  const password = "sync-test-password";
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.address().port}`,
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: password,
      ATELIER_USERNAME: "atelier",
      PORT: "0",
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
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
    const call = (type, other = {}) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from("atelier:" + password).toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type, ...other }),
      });
    const status = await (await call("mealie_atelier/status")).json();
    assert.equal(status.entries[0].features.shopping_sync, false);
    const before = mealieCalls;
    for (const name of COMMANDS) {
      const response = await call(`mealie_atelier/${name}`, { rule_id: "r1" });
      assert.equal(response.status, 501, name);
      const body = await response.json();
      assert.equal(body.code, "sync_not_supported", name);
      assert.match(body.error, /Home Assistant/, name);
    }
    assert.equal(mealieCalls, before, "sync commands must never reach Mealie");
  } finally {
    child.kill("SIGTERM");
    remote.close();
  }
});
