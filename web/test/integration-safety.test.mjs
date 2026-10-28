/** Integration test: actual localhost TCP clients, running Atelier proxy, Mealie 3.x-shaped fixture. No credentials outside test. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOKEN = "LOCAL_TEST_TOKEN_NOT_A_REAL_SECRET";
const UUID = randomUUID();
const initial = {
  id: "recipe-42",
  slug: "gnocchi",
  name: "Gnocchi",
  image: "old.webp",
  recipeIngredient: [
    {
      referenceId: UUID,
      quantity: 300,
      food: { id: "food-1", name: "Gnocchi" },
      unit: { id: "unit-1", name: "Gramm" },
      note: "",
      originalText: "300 g Gnocchi",
      display: "",
      customField: "preserve",
    },
  ],
  recipeInstructions: [{ text: "Boil" }],
};
const samplePng = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.alloc(192, 2),
]);
const sampleWebp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBP"),
  Buffer.alloc(192, 3),
]);
function send(res, status, value, type = "application/json") {
  res.writeHead(status, { "content-type": type });
  res.end(Buffer.isBuffer(value) ? value : JSON.stringify(value));
}
async function startMealie() {
  let recipe = structuredClone(initial),
    writes = 0,
    uploads = 0,
    backupReads = 0,
    readErrors = false,
    lastPatch = null,
    uploadData = "";
  const http = createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      send(res, 401, { error: "Unauthorized" });
      return;
    }
    if (path === "/api/users/self") return send(res, 200, { id: "u1", username: "kitchen" });
    if (path === "/api/recipes/gnocchi" && req.method === "GET") return send(res, 200, recipe);
    if (path === "/api/recipes/gnocchi" && req.method === "PATCH") {
      let bytes = "";
      for await (const c of req) bytes += c.toString();
      const body = JSON.parse(bytes);
      writes++;
      lastPatch = body;
      recipe = { ...recipe, ...body };
      return send(res, 200, recipe);
    }
    if (path === "/api/media/recipes/recipe-42/images/original.webp") {
      backupReads++;
      return readErrors
        ? send(res, 404, { error: "not found" })
        : send(res, 200, sampleWebp, "image/webp");
    }
    if (path === "/api/recipes/gnocchi/image" && req.method === "PUT") {
      let buffers = [];
      for await (const c of req) buffers.push(c);
      uploadData = Buffer.concat(buffers).toString("latin1");
      assert.match(req.headers["content-type"], /multipart\/form-data; boundary=/);
      assert.match(uploadData, /name="image"/);
      assert.match(uploadData, /name="extension"/);
      assert.match(uploadData, /image\/png/);
      uploads++;
      recipe.image = "new.webp";
      return send(res, 200, { ok: true });
    }
    if (path === "/api/recipes")
      return send(res, 200, { items: [recipe], total: 1, page: 1, per_page: 24 });
    if (path === "/api/households/mealplans") return send(res, 200, []);
    if (path === "/api/households/shopping/lists") return send(res, 200, { items: [] });
    if (path === "/api/households/shopping/items") return send(res, 200, { items: [] });
    if (path === "/api/organizers/categories" || path === "/api/organizers/tags")
      return send(res, 200, { items: [] });
    send(res, 404, { error: `Fixture missing: ${path}` });
  });
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  return {
    http,
    port: http.address().port,
    recipe: () => recipe,
    setRecipe: (v) => {
      recipe = v;
    },
    writes: () => writes,
    uploads: () => uploads,
    backupReads: () => backupReads,
    setReadErrors: (v) => {
      readErrors = v;
    },
    lastPatch: () => lastPatch,
  };
}
async function startAtelier(remote, { readOnly = false, structured = false, dir } = {}) {
  const pass = "integration-password-123";
  const process = spawn(globalThis.process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...globalThis.process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: TOKEN,
      ATELIER_PASSWORD: pass,
      ATELIER_USERNAME: "atelier",
      ATELIER_READ_ONLY: String(readOnly),
      ATELIER_STRUCTURED_EDITS: String(structured),
      ATELIER_DATA_DIR: dir,
      PORT: "0",
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let buffer = "";
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Atelier failed to start")), 8000);
    process.stdout.on("data", (data) => {
      buffer += data.toString();
      const m = buffer.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    process.once("exit", (code) => {
      clearTimeout(timer);
      reject(Error("Atelier exit " + code));
    });
  });
  const headers = {
    Authorization: "Basic " + Buffer.from("atelier:" + pass).toString("base64"),
    "X-Atelier-Request": "1",
  };
  const api = async (type, extra = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/bridge`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...extra }),
    });
    return { status: response.status, body: await response.json() };
  };
  const upload = async (image, revision, overrides = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/recipe-image/gnocchi`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "image/png",
        "X-Atelier-Image-Revision": revision,
        ...overrides,
      },
      body: image,
    });
    return { status: response.status, body: await response.json() };
  };
  return {
    process,
    port,
    headers,
    api,
    upload,
    stop: async () => {
      if (process.exitCode === null) {
        process.kill("SIGTERM");
        await Promise.race([
          once(process, "exit"),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    },
  };
}

test("structured recipe editing: real HTTP, optimistic locking, linked data preserved, backed up before patch", async () => {
  const remote = await startMealie(),
    dir = await mkdtemp(join(tmpdir(), "atelier-contract-"));
  let app;
  try {
    app = await startAtelier(remote, { structured: true, dir });
    const preview = await app.api("mealie_atelier/ingredient_preview", { slug: "gnocchi" });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.rows[0].referenceId, UUID);
    const original = structuredClone(remote.recipe());
    remote.setRecipe({
      ...original,
      recipeIngredient: [{ ...original.recipeIngredient[0], quantity: 301 }],
    });
    const conflict = await app.api("mealie_atelier/ingredient_save", {
      slug: "gnocchi",
      expected_hash: preview.body.expected_hash,
      rows: [{ referenceId: UUID, quantity: 200 }],
      confirm: true,
    });
    assert.equal(conflict.status, 409);
    assert.equal(remote.writes(), 0);
    remote.setRecipe(original);
    const unconfirmed = await app.api("mealie_atelier/ingredient_save", {
      slug: "gnocchi",
      expected_hash: preview.body.expected_hash,
      rows: [{ referenceId: UUID, quantity: 200 }],
      confirm: false,
    });
    assert.equal(unconfirmed.status, 400);
    assert.equal(remote.writes(), 0);
    const saved = await app.api("mealie_atelier/ingredient_save", {
      slug: "gnocchi",
      expected_hash: preview.body.expected_hash,
      rows: [{ referenceId: UUID, quantity: 200 }],
      confirm: true,
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(remote.writes(), 1);
    assert.equal(remote.recipe().recipeIngredient[0].quantity, 200);
    assert.equal(remote.recipe().recipeIngredient[0].food.id, "food-1");
    assert.equal(remote.recipe().recipeIngredient[0].unit.id, "unit-1");
    assert.equal(remote.recipe().recipeIngredient[0].customField, "preserve");
    const backups = await readdir(join(dir, "ingredient-backups"));
    assert.equal(backups.length, 1);
    const archived = JSON.parse(
      await readFile(join(dir, "ingredient-backups", backups[0]), "utf8"),
    );
    assert.equal(archived.recipe.recipeIngredient[0].quantity, 300);
    const replay = await app.api("mealie_atelier/ingredient_save", {
      slug: "gnocchi",
      expected_hash: preview.body.expected_hash,
      rows: [{ referenceId: UUID, quantity: 250 }],
      confirm: true,
    });
    assert.equal(replay.status, 409);
    assert.equal(remote.writes(), 1);
  } finally {
    await app?.stop();
    remote.http.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("photo replacement: actual multipart upload, revision lock, type check, full original backup, read-only mode", async () => {
  const remote = await startMealie(),
    dir = await mkdtemp(join(tmpdir(), "atelier-photo-"));
  let app;
  try {
    app = await startAtelier(remote, { dir });
    let result = await app.upload(samplePng, "stale.webp");
    assert.equal(result.status, 409);
    assert.equal(remote.uploads(), 0);
    result = await app.upload(Buffer.alloc(200), "old.webp");
    assert.equal(result.status, 415);
    assert.equal(remote.uploads(), 0);
    remote.setReadErrors(true);
    result = await app.upload(samplePng, "old.webp");
    assert.equal(result.status, 409);
    assert.equal(remote.uploads(), 0);
    remote.setReadErrors(false);
    result = await app.upload(samplePng, "old.webp");
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(remote.uploads(), 1);
    assert.equal(result.body.image, "new.webp");
    const archived = await readdir(join(dir, "photo-backups"));
    assert.ok(archived.some((n) => n.endsWith(".webp")));
    assert.ok(archived.some((n) => n.endsWith(".json")));
    const file = await readFile(
      join(
        dir,
        "photo-backups",
        archived.find((n) => n.endsWith(".webp")),
      ),
    );
    assert.deepEqual(file, sampleWebp);
    const again = await app.upload(samplePng, "old.webp");
    assert.equal(again.status, 409);
    await app.stop();
    app = await startAtelier(remote, { readOnly: true, dir });
    const denied = await app.upload(samplePng, "new.webp");
    assert.equal(denied.status, 403);
    assert.equal(remote.uploads(), 1);
  } finally {
    await app?.stop();
    remote.http.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("write permission and malformed path checks stop before contacting Mealie", async () => {
  const remote = await startMealie(),
    dir = await mkdtemp(join(tmpdir(), "atelier-denied-"));
  let app;
  try {
    app = await startAtelier(remote, { dir, readOnly: true });
    const preview = await app.api("mealie_atelier/ingredient_preview", { slug: "gnocchi" });
    assert.equal(preview.status, 200);
    const denied = await app.api("mealie_atelier/ingredient_save", {
      slug: "gnocchi",
      expected_hash: preview.body.expected_hash,
      rows: [{ referenceId: UUID, quantity: 20 }],
      confirm: true,
    });
    assert.equal(denied.status, 403);
    assert.equal(remote.writes(), 0);
    const traversal = await app.api("mealie_atelier/recipe", { slug: "../../etc/passwd" });
    assert.equal(traversal.status, 400);
    const invalid = await app.api("mealie_atelier/ingredient_catalog", {
      kind: "danger",
      search: "all",
    });
    assert.equal(invalid.status, 400);
  } finally {
    await app?.stop();
    remote.http.close();
    await rm(dir, { recursive: true, force: true });
  }
});
