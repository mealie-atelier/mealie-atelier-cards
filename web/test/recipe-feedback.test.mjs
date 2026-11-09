import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

async function withApp({ ratings = {}, role }, run) {
  const seen = [];
  const mealie = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen.push({ method: req.method, path: url.pathname, body: raw ? JSON.parse(raw) : null });
      res.setHeader("Content-Type", "application/json");
      if (url.pathname === "/api/users/self") return res.end(JSON.stringify({ id: "u1" }));
      const m = url.pathname.match(/^\/api\/users\/self\/ratings\/(.+)$/);
      if (m) {
        if (!ratings[m[1]]) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ detail: "not found" }));
        }
        return res.end(JSON.stringify(ratings[m[1]]));
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
    const call = (type, extras = {}) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from("atelier:lengthy-test-password").toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type: `mealie_atelier/${type}`, ...extras }),
      });
    await run({ call, seen });
  } finally {
    child.kill();
    mealie.close();
  }
}

await test("status announces recipe_feedback", async () => {
  await withApp({}, async ({ call }) => {
    const body = await (await call("status")).json();
    assert.equal(body.entries[0].features.recipe_feedback, true);
  });
});

await test("recipe_feedback reads rating and favorite, and a 404 means none", async () => {
  const ratings = { r1: { rating: 4, isFavorite: true } };
  await withApp({ ratings }, async ({ call }) => {
    assert.deepEqual(await (await call("recipe_feedback", { recipe_id: "r1" })).json(), {
      rating: 4,
      favorite: true,
    });
    const none = await call("recipe_feedback", { recipe_id: "r2" });
    assert.equal(none.status, 200);
    assert.deepEqual(await none.json(), { rating: null, favorite: false });
    assert.equal((await call("recipe_feedback", { recipe_id: "bad id!" })).status, 400);
  });
});

await test("recipe_rate posts the rating for the cached self id", async () => {
  await withApp({}, async ({ call, seen }) => {
    assert.equal((await call("recipe_rate", { slug: "soup", rating: 5 })).status, 200);
    assert.equal((await call("recipe_rate", { slug: "soup", rating: 3 })).status, 200);
    const posts = seen.filter((x) => x.method === "POST");
    assert.deepEqual(
      posts.map((x) => [x.path, x.body]),
      [
        ["/api/users/u1/ratings/soup", { rating: 5 }],
        ["/api/users/u1/ratings/soup", { rating: 3 }],
      ],
    );
    assert.equal(seen.filter((x) => x.path === "/api/users/self").length, 1, "self id is cached");
    for (const bad of [0, 6, 2.5, "4", undefined])
      assert.equal((await call("recipe_rate", { slug: "soup", rating: bad })).status, 400);
    assert.equal(seen.filter((x) => x.method === "POST").length, 2);
  });
});

await test("recipe_favorite posts or deletes the favorite", async () => {
  await withApp({}, async ({ call, seen }) => {
    assert.equal((await call("recipe_favorite", { slug: "soup", favorite: true })).status, 200);
    assert.equal((await call("recipe_favorite", { slug: "soup", favorite: false })).status, 200);
    const writes = seen.filter((x) => x.path.startsWith("/api/users/u1/"));
    assert.deepEqual(
      writes.map((x) => [x.method, x.path]),
      [
        ["POST", "/api/users/u1/favorites/soup"],
        ["DELETE", "/api/users/u1/favorites/soup"],
      ],
    );
    assert.equal((await call("recipe_favorite", { slug: "soup", favorite: "yes" })).status, 400);
  });
});

await test("writes are refused in read-only mode, reads are not", async () => {
  await withApp({ role: "readonly" }, async ({ call, seen }) => {
    assert.equal((await call("recipe_rate", { slug: "soup", rating: 5 })).status, 403);
    assert.equal((await call("recipe_favorite", { slug: "soup", favorite: true })).status, 403);
    assert.equal((await call("recipe_feedback", { recipe_id: "r1" })).status, 200);
    assert.equal(seen.filter((x) => x.method !== "GET").length, 0);
  });
});
