import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PASSWORD = "mealie-link-test-password";

async function statusEntry(extraEnv) {
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: "http://127.0.0.1:9",
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: PASSWORD,
      ATELIER_MEALIE_PUBLIC_URL: "",
      ATELIER_MEALIE_GROUP: "",
      PORT: "0",
      HOST: "127.0.0.1",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "ignore"],
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
    const response = await fetch(`http://127.0.0.1:${port}/api/bridge`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from("atelier:" + PASSWORD).toString("base64"),
        "Content-Type": "application/json",
        "X-Atelier-Request": "1",
      },
      body: JSON.stringify({ type: "mealie_atelier/status" }),
    });
    return (await response.json()).entries[0];
  } finally {
    child.kill("SIGTERM");
  }
}

test("status exposes the public Mealie URL without trailing slash and the group", async () => {
  const entry = await statusEntry({
    ATELIER_MEALIE_PUBLIC_URL: "https://mealie.example.test/",
    ATELIER_MEALIE_GROUP: "family",
  });
  assert.equal(entry.mealie_url, "https://mealie.example.test");
  assert.equal(entry.mealie_group, "family");
});

test("status defaults to no URL and the home group", async () => {
  const entry = await statusEntry({});
  assert.equal(entry.mealie_url, "");
  assert.equal(entry.mealie_group, "home");
});

test("an invalid public URL means none", async () => {
  for (const bad of [
    "javascript:alert(1)",
    "ftp://mealie.example.test",
    "https://u:p@mealie.example.test",
    "nope",
  ]) {
    assert.equal((await statusEntry({ ATELIER_MEALIE_PUBLIC_URL: bad })).mealie_url, "", bad);
  }
});
