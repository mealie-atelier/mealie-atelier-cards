import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENTRY = {
  id: 7,
  groupId: "g1",
  userId: "u1",
  date: "2026-05-01",
  entryType: "dinner",
  title: "",
  text: "note",
  recipeId: "r1",
  recipeScale: null,
  recipe: { name: "unknown nested" },
  extra: "x",
};

async function withApp({ role, getStatus = 200 }, run) {
  const seen = [];
  const mealie = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://localhost");
      seen.push({ method: req.method, path: url.pathname, body: raw ? JSON.parse(raw) : null });
      res.setHeader("Content-Type", "application/json");
      if (url.pathname === "/api/households/mealplans/7" && req.method === "GET") {
        res.statusCode = getStatus;
        return res.end(JSON.stringify(getStatus === 200 ? ENTRY : { detail: "nope" }));
      }
      res.end(JSON.stringify({}));
    });
  });
  mealie.listen(0, "127.0.0.1");
  await once(mealie, "listening");
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${mealie.address().port}`,
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: "lengthy-test-password",
      ATELIER_USERNAME: "atelier",
      ATELIER_READ_ONLY: role === "readonly" ? "true" : "false",
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
      child.stderr.on("data", (chunk) => reject(Error(chunk.toString())));
      child.once("exit", (code) => reject(Error("App exited " + code)));
    });
    const mutate = (action, payload) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from("atelier:lengthy-test-password").toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type: "mealie_atelier/mutate", action, payload }),
      });
    const move = (payload) => mutate("mealplan_move", payload);
    const status = () =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from("atelier:lengthy-test-password").toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type: "mealie_atelier/status" }),
      });
    await run({ move, mutate, seen, status });
  } finally {
    child.kill();
    mealie.close();
  }
}

await test("mealplan_move puts the known fields with the new date", async () => {
  await withApp({}, async ({ move, seen }) => {
    assert.equal((await move({ entry_id: "7", date: "2026-05-03" })).status, 200);
    const calls = seen.filter((x) => x.path === "/api/households/mealplans/7");
    assert.deepEqual(
      calls.map((x) => x.method),
      ["GET", "PUT"],
    );
    assert.deepEqual(calls[1].body, {
      id: 7,
      groupId: "g1",
      userId: "u1",
      date: "2026-05-03",
      entryType: "dinner",
      title: "",
      text: "note",
      recipeId: "r1",
    });
  });
});

await test("mealplan_move is refused in read-only mode", async () => {
  await withApp({ role: "readonly" }, async ({ move, seen }) => {
    assert.equal((await move({ entry_id: "7", date: "2026-05-03" })).status, 403);
    assert.equal(seen.filter((x) => x.path.startsWith("/api/households/mealplans")).length, 0);
  });
});

await test("mealplan_move rejects bad input without calling Mealie", async () => {
  await withApp({}, async ({ move, seen }) => {
    for (const payload of [
      { entry_id: "7", date: "2026-02-31" },
      { entry_id: "7", date: "05/03/2026" },
      { entry_id: "7" },
      { entry_id: "bad id!", date: "2026-05-03" },
      { date: "2026-05-03" },
    ])
      assert.equal((await move(payload)).status, 400, JSON.stringify(payload));
    assert.equal(seen.filter((x) => x.path.startsWith("/api/households/mealplans")).length, 0);
  });
});

await test("mealplan_move does not put when the read fails", async () => {
  await withApp({ getStatus: 404 }, async ({ move, seen }) => {
    assert.ok((await move({ entry_id: "7", date: "2026-05-03" })).status >= 400);
    assert.equal(seen.filter((x) => x.method === "PUT").length, 0);
  });
});

await test("status announces mealplan_move", async () => {
  await withApp({}, async ({ status }) => {
    assert.equal((await (await status()).json()).entries[0].features.mealplan_move, true);
  });
});

await test("mealplan_add restores a note without a recipe", async () => {
  await withApp({}, async ({ mutate, seen }) => {
    const res = await mutate("mealplan_add", {
      date: "2026-05-03",
      meal_type: "lunch",
      title: "Reste",
      text: "vom Vortag",
    });
    assert.equal(res.status, 200);
    assert.deepEqual(seen.at(-1).body, {
      date: "2026-05-03",
      entryType: "lunch",
      title: "Reste",
      text: "vom Vortag",
    });
    const before = seen.length;
    const empty = await mutate("mealplan_add", { date: "2026-05-03", meal_type: "lunch" });
    assert.equal(empty.status, 400);
    assert.equal(seen.length, before);
  });
});
