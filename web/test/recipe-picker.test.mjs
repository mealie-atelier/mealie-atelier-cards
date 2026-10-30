import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

async function withApp(favorites, run) {
  const seen = [];
  const mealie = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    seen.push({ path: url.pathname, query: url.searchParams });
    res.writeHead(200, { "Content-Type": "application/json" });
    if (url.pathname === "/api/users/self/favorites")
      return res.end(JSON.stringify({ ratings: favorites }));
    res.end(JSON.stringify({ items: [], total: 0, page: 1, per_page: 20, total_pages: 0 }));
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
    const call = (extras) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from("atelier:lengthy-test-password").toString("base64"),
          "Content-Type": "application/json",
          "X-Atelier-Request": "1",
        },
        body: JSON.stringify({ type: "mealie_atelier/recipes", ...extras }),
      });
    await run({ call, seen: () => seen.filter((x) => x.path === "/api/recipes"), all: () => seen });
  } finally {
    child.kill();
    mealie.close();
  }
}

await test("recipes forwards picker filters as repeated Mealie params", async () => {
  await withApp([], async ({ call, seen }) => {
    const res = await call({
      search: "soup",
      categories: ["dinner", "quick"],
      tags: ["vegan"],
      order: "recent",
      per_page: 20,
    });
    assert.equal(res.status, 200);
    const q = seen()[0].query;
    assert.deepEqual(q.getAll("categories"), ["dinner", "quick"]);
    assert.equal(q.get("requireAllCategories"), "false");
    assert.deepEqual(q.getAll("tags"), ["vegan"]);
    assert.equal(q.get("requireAllTags"), "false");
    assert.equal(q.get("orderBy"), "updatedAt");
    assert.equal(q.get("orderDirection"), "desc");
    assert.equal(q.get("search"), "soup");
    assert.equal(q.get("perPage"), "20");
  });
});

await test("recipes defaults to name order and rejects invalid filters", async () => {
  await withApp([], async ({ call, seen }) => {
    await call({});
    assert.equal(seen()[0].query.get("orderBy"), "name");
    assert.equal(seen()[0].query.get("orderDirection"), "asc");
    assert.equal(seen()[0].query.has("categories"), false);
    for (const extras of [
      { categories: ["bad slug!"] },
      { categories: Array.from({ length: 11 }, (_, i) => `c${i}`) },
      { tags: "vegan" },
      { order: "random" },
      { favorites_only: "yes" },
    ])
      assert.equal((await call(extras)).status, 400, JSON.stringify(extras));
    assert.equal(seen().length, 1, "invalid requests never reach Mealie");
  });
});

await test("favorites_only without favorites answers an empty page after one Mealie call", async () => {
  await withApp([{ recipeId: "r1", isFavorite: false }], async ({ call, seen, all }) => {
    const body = await (await call({ favorites_only: true })).json();
    assert.deepEqual(body.items, []);
    assert.equal(body.total, 0);
    assert.equal(all().length, 1);
    assert.equal(seen().length, 0);
  });
});

await test("favorites_only builds an id filter from favorite recipes", async () => {
  await withApp(
    [
      { recipeId: "r1", isFavorite: true },
      { recipeId: "r2", isFavorite: false },
      { recipeId: "r3", isFavorite: true },
    ],
    async ({ call, seen }) => {
      await call({ favorites_only: true });
      assert.equal(seen()[0].query.get("queryFilter"), 'id IN ["r1","r3"]');
    },
  );
});
