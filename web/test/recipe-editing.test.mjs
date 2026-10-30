/** Structured editing, backups, restore and photo upload over real HTTP against a Mealie-shaped fixture. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOKEN = "LOCAL_TEST_TOKEN_NOT_A_REAL_SECRET";
const REF = randomUUID();
const initial = () => ({
  id: "recipe-42",
  slug: "gnocchi",
  name: "Gnocchi",
  description: "Soft potato dumplings",
  image: "old-token",
  recipeServings: 2,
  assets: [],
  recipeIngredient: [
    {
      referenceId: REF,
      quantity: 300,
      food: { id: "food-1", name: "Gnocchi" },
      unit: { id: "unit-1", name: "Gram", abbreviation: "g" },
      note: "",
      originalText: "300 g Gnocchi",
      display: "300 g Gnocchi",
    },
  ],
  recipeInstructions: [
    { id: "step-a", text: "Boil the water" },
    { id: "step-b", text: "Add the gnocchi" },
  ],
});
const png = (size = 300) =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(size),
  ]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (res, status, value) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
};

async function startMealie() {
  const state = {
    recipe: initial(),
    calls: [],
    queries: [],
    patches: [],
    dropWrites: false,
    // Like real Mealie: a rename moves the recipe to a new slug and the old one answers 404.
    slugFollowsName: false,
    recipeStatus: 0,
    foods: [
      { id: "food-1", name: "Gnocchi", pluralName: "" },
      { id: "food-2", name: "Salt", pluralName: "" },
    ],
    units: [{ id: "unit-1", name: "Gram", abbreviation: "g", useAbbreviation: true }],
    onPatch: null,
  };
  const http = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let path = url.pathname;
    if (state.slugFollowsName && path.startsWith("/api/recipes/")) {
      const current = `/api/recipes/${state.recipe.slug}`;
      if (path === current) path = "/api/recipes/gnocchi";
      else if (path === "/api/recipes/gnocchi" && current !== path) return json(res, 404, {});
    }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, {});
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    state.calls.push(`${req.method} ${path}`);
    if (path === "/api/users/self") return json(res, 200, { id: "u1", username: "kitchen" });
    if (path === "/api/foods" || path === "/api/units") {
      state.queries.push(Object.fromEntries(url.searchParams));
      const key = path === "/api/foods" ? "foods" : "units";
      if (req.method === "POST") {
        const created = { id: `${key}-new`, ...JSON.parse(body) };
        state[key].push(created);
        return json(res, 201, created);
      }
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const items = state[key].filter((x) => x.name.toLowerCase().includes(search));
      return json(res, 200, { items, total: items.length, page: 1 });
    }
    const single = path.match(/^\/api\/(foods|units)\/([\w-]+)$/);
    if (single) {
      const hit = state[single[1]].find((x) => x.id === single[2]);
      return hit ? json(res, 200, hit) : json(res, 404, {});
    }
    if (path === "/api/recipes/gnocchi" && req.method === "GET" && state.recipeStatus)
      return json(res, state.recipeStatus, {});
    if (path === "/api/recipes/gnocchi" && req.method === "GET")
      return json(res, 200, state.recipe);
    if (path === "/api/recipes/gnocchi" && req.method === "PATCH") {
      const patch = JSON.parse(body);
      await state.onPatch?.(patch);
      state.patches.push(patch);
      if (!state.dropWrites) state.recipe = { ...state.recipe, ...patch };
      if (state.slugFollowsName && patch.name)
        state.recipe.slug = patch.name.toLowerCase().replaceAll(" ", "-");
      return json(res, 200, state.recipe);
    }
    if (path === "/api/media/recipes/recipe-42/images/original.webp") {
      res.writeHead(200, { "content-type": "image/webp" });
      return res.end(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]));
    }
    if (path === "/api/recipes/gnocchi/image" && req.method === "PUT") {
      assert.match(req.headers["content-type"], /multipart\/form-data/);
      state.recipe.image = "new-token";
      return json(res, 200, {});
    }
    if (path === "/api/recipes/gnocchi/image" && req.method === "DELETE") {
      state.recipe.image = null;
      return json(res, 200, {});
    }
    if (path === "/api/recipes/gnocchi/assets" && req.method === "POST") {
      const form = body.toString("latin1");
      const name = form.match(/name="name"\r\n\r\n([^\r]+)/)[1];
      assert.match(form, /name="file"/);
      return json(res, 201, { name, icon: "mdi-image", fileName: `${name}.png` });
    }
    json(res, 404, { missing: path });
  });
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  return { http, port: http.address().port, state };
}

async function startAtelier(remote, dir, { structured = true, readOnly = false } = {}) {
  const password = "integration-password-123";
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: TOKEN,
      ATELIER_PASSWORD: password,
      ATELIER_USERNAME: "atelier",
      ATELIER_READ_ONLY: String(readOnly),
      ATELIER_STRUCTURED_EDITS: String(structured),
      ATELIER_DATA_DIR: dir,
      PORT: "0",
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Atelier failed to start")), 8000);
    child.stdout.on("data", (data) => {
      out += data.toString();
      const match = out.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.once("exit", (code) => reject(Error("Atelier exit " + code)));
  });
  const headers = {
    Authorization: "Basic " + Buffer.from("atelier:" + password).toString("base64"),
    "X-Atelier-Request": "1",
    "Content-Type": "application/json",
  };
  const api = async (name, extra = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/bridge`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: `mealie_atelier/${name}`, ...extra }),
    });
    return { status: response.status, body: await response.json() };
  };
  /** Run begin and all chunks for `bytes`; returns the upload id. */
  const upload = async (bytes, purpose, { mime = "image/png", chunk = 262144 } = {}) => {
    const begun = await api("upload_begin", {
      slug: "gnocchi",
      purpose,
      size: bytes.length,
      mime,
      sha256: sha(bytes),
    });
    assert.equal(begun.status, 200, JSON.stringify(begun.body));
    for (let i = 0; i * chunk < bytes.length; i++) {
      const sent = await api("upload_chunk", {
        upload_id: begun.body.upload_id,
        index: i,
        data: bytes.subarray(i * chunk, (i + 1) * chunk).toString("base64"),
      });
      assert.equal(sent.status, 200, JSON.stringify(sent.body));
    }
    return begun.body.upload_id;
  };
  return {
    api,
    upload,
    port,
    headers,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 1500))]);
      }
    },
  };
}

async function withApp(options, run) {
  const remote = await startMealie();
  const dir = await mkdtemp(join(tmpdir(), "atelier-editing-"));
  let app;
  try {
    app = await startAtelier(remote, dir, options);
    await run({ app, remote, dir, state: remote.state });
  } finally {
    await app?.stop();
    remote.http.close();
    await rm(dir, { recursive: true, force: true });
  }
}
const backupFiles = async (dir) => {
  try {
    return await readdir(join(dir, "recipe-backups", "recipe-42"));
  } catch {
    return [];
  }
};

test("status reports permissions, features and upload limits with legacy mirrors", async () => {
  await withApp({}, async ({ app }) => {
    const { body } = await app.api("status");
    const entry = body.entries[0];
    assert.deepEqual(entry.permissions, { can_read: true, can_write: true, can_admin: true });
    assert.equal(entry.features.structured_ingredients, true);
    assert.equal(entry.features.shopping_sync, false);
    assert.equal(entry.limits.upload_max_bytes, 10 * 1024 * 1024);
    assert.equal(entry.limits.upload_chunk_bytes, 262144);
    assert.equal(entry.can_edit_ingredients, true);
    assert.equal(entry.can_manage, entry.permissions.can_admin);
  });
  await withApp({ structured: false }, async ({ app }) => {
    const entry = (await app.api("status")).body.entries[0];
    assert.equal(entry.features.structured_ingredients, false);
    assert.equal(entry.can_edit_ingredients, false);
  });
});

test("foods and units pass the search, clamp per_page and shape the result", async () => {
  await withApp({}, async ({ app, state }) => {
    const foods = await app.api("foods", { search: "sal", per_page: 500 });
    assert.deepEqual(foods.body.items, [{ id: "food-2", name: "Salt", pluralName: "" }]);
    assert.equal(foods.body.page, 1);
    assert.equal(state.queries.at(-1).perPage, "50");
    assert.equal(state.queries.at(-1).search, "sal");
    const units = await app.api("units", { search: "", per_page: 0 });
    assert.equal(units.body.items[0].abbreviation, "g");
    assert.equal(units.body.items[0].fraction, true);
    assert.equal(state.queries.at(-1).perPage, "1");
    const tooLong = await app.api("foods", { search: "x".repeat(81) });
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.body.code, "invalid_request");
  });
});

test("food_create and unit_create return an existing match instead of creating a duplicate", async () => {
  await withApp({}, async ({ app, state }) => {
    const existing = await app.api("food_create", { name: "gnocchi" });
    assert.equal(existing.body.existing, true);
    assert.equal(existing.body.id, "food-1");
    assert.ok(!state.calls.includes("POST /api/foods"));
    const created = await app.api("food_create", { name: "Basil", plural_name: "Basils" });
    assert.equal(created.body.existing, false);
    assert.ok(state.calls.includes("POST /api/foods"));
    const unit = await app.api("unit_create", { name: "Pinch", abbreviation: "pn" });
    assert.equal(unit.body.existing, false);
    assert.equal(state.units.at(-1).useAbbreviation, true);
    assert.equal((await app.api("unit_create", { name: "GRAM" })).body.existing, true);
  });
});

test("ingredients_get returns the contract preview", async () => {
  await withApp({}, async ({ app }) => {
    const { body } = await app.api("ingredients_get", { slug: "gnocchi" });
    assert.equal(body.recipe_id, "recipe-42");
    assert.equal(body.servings, 2);
    assert.match(body.expected_hash, /^[0-9a-f]{64}$/);
    assert.deepEqual(body.rows[0].unit, { id: "unit-1", name: "Gram", abbreviation: "g" });
    assert.deepEqual(body.rows[0].food, { id: "food-1", name: "Gnocchi" });
    assert.equal(body.rows[0].reference_id, REF);
    assert.equal(body.rows[0].original_text, "300 g Gnocchi");
  });
});

test("ingredients_save snapshots before the PATCH, then verifies and returns the signed recipe", async () => {
  await withApp({}, async ({ app, state, dir }) => {
    const preview = (await app.api("ingredients_get", { slug: "gnocchi" })).body;
    let filesAtPatch = -1;
    state.onPatch = async () => {
      filesAtPatch = (await backupFiles(dir)).length;
    };
    const rows = [
      { reference_id: REF, quantity: 250, unit_id: "unit-1", food_id: "food-1", note: "soft" },
      { reference_id: null, quantity: 1.5, unit_id: null, food_id: "food-2", note: "" },
    ];
    const saved = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows,
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(filesAtPatch, 1, "snapshot exists before the PATCH");
    assert.equal(saved.body.saved, true);
    assert.equal(saved.body.recipe.imageUrl, "/api/image/recipe-42");
    assert.equal(state.recipe.recipeIngredient.length, 2);
    assert.equal(state.recipe.recipeIngredient[0].quantity, 250);
    const [file] = await backupFiles(dir);
    const snapshot = JSON.parse(
      await readFile(join(dir, "recipe-backups/recipe-42", file), "utf8"),
    );
    assert.equal(snapshot.kind, "ingredients");
    assert.equal(snapshot.fields.recipeIngredient[0].quantity, 300);
    assert.equal(snapshot.backup_id, saved.body.backup_id);
    const listed = await app.api("recipe_backups", { slug: "gnocchi" });
    assert.deepEqual(Object.keys(listed.body.backups[0]).sort(), [
      "backup_id",
      "created_at",
      "has_image",
      "kind",
      "summary",
      "user_name",
    ]);
  });
});

test("ingredients_save rejects stale hashes, unknown links, bad rows and a disabled option without writing", async () => {
  await withApp({}, async ({ app, state, dir }) => {
    const preview = (await app.api("ingredients_get", { slug: "gnocchi" })).body;
    const row = { reference_id: REF, quantity: 1, unit_id: null, food_id: "food-1", note: "" };
    const stale = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: "0".repeat(64),
      rows: [row],
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "recipe_changed");
    const unknown = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows: [{ ...row, food_id: "food-missing" }],
    });
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.code, "invalid_request");
    const huge = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows: [{ ...row, quantity: 2_000_000 }],
    });
    assert.equal(huge.body.code, "invalid_request");
    const empty = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows: [],
    });
    assert.equal(empty.body.code, "invalid_request");
    assert.equal(state.patches.length, 0);
    assert.deepEqual(await backupFiles(dir), []);
  });
  await withApp({ structured: false }, async ({ app, state }) => {
    const preview = (await app.api("ingredients_get", { slug: "gnocchi" })).body;
    const off = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows: [{ reference_id: REF, quantity: 1, unit_id: null, food_id: null, note: "x" }],
    });
    assert.equal(off.status, 403);
    assert.equal(off.body.code, "disabled");
    assert.equal(state.patches.length, 0);
  });
  await withApp({ readOnly: true }, async ({ app, state }) => {
    const denied = await app.api("food_create", { name: "Basil" });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.code, "read_only");
    assert.ok(!state.calls.includes("POST /api/foods"));
  });
});

test("a write that Mealie accepts but does not apply is reported as write_unverified", async () => {
  await withApp({}, async ({ app, state }) => {
    const preview = (await app.api("ingredients_get", { slug: "gnocchi" })).body;
    state.dropWrites = true;
    const result = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows: [{ reference_id: REF, quantity: 99, unit_id: "unit-1", food_id: "food-1", note: "" }],
    });
    assert.equal(result.status, 502);
    assert.equal(result.body.code, "write_unverified");
    assert.match(result.body.error, /Backup [0-9a-f-]{36}/);
  });
});

test("restore writes the snapshot fields after taking a restore snapshot", async () => {
  await withApp({}, async ({ app, state, dir }) => {
    const preview = (await app.api("ingredients_get", { slug: "gnocchi" })).body;
    const saved = await app.api("ingredients_save", {
      slug: "gnocchi",
      expected_hash: preview.expected_hash,
      rows: [{ reference_id: REF, quantity: 10, unit_id: "unit-1", food_id: "food-1", note: "" }],
    });
    assert.equal(state.recipe.recipeIngredient[0].quantity, 10);
    const restored = await app.api("recipe_restore", {
      slug: "gnocchi",
      backup_id: saved.body.backup_id,
    });
    assert.equal(restored.status, 200, JSON.stringify(restored.body));
    assert.equal(state.recipe.recipeIngredient[0].quantity, 300);
    assert.notEqual(restored.body.backup_id, saved.body.backup_id);
    const kinds = (await app.api("recipe_backups", { slug: "gnocchi" })).body.backups.map(
      (b) => b.kind,
    );
    assert.deepEqual(kinds, ["restore", "ingredients"]);
    assert.equal((await backupFiles(dir)).length, 2);
    const missing = await app.api("recipe_restore", { slug: "gnocchi", backup_id: randomUUID() });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.code, "backup_not_found");
  });
});

test("restoring a backup that changes the name succeeds although the recipe moves to a new slug", async () => {
  await withApp({}, async ({ app, state }) => {
    state.slugFollowsName = true;
    const renamed = await app.api("mutate", {
      action: "recipe_update",
      payload: { slug: "gnocchi", name: "Potato Gnocchi" },
    });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
    assert.equal(state.recipe.slug, "potato-gnocchi");
    const { backups } = (await app.api("recipe_backups", { slug: "potato-gnocchi" })).body;
    const restored = await app.api("recipe_restore", {
      slug: "potato-gnocchi",
      backup_id: backups[0].backup_id,
    });
    assert.equal(restored.status, 200, JSON.stringify(restored.body));
    assert.equal(state.recipe.name, "Gnocchi");
    assert.equal(restored.body.restored, true);
    assert.equal(restored.body.recipe.name, "Gnocchi");
  });
});

test("mutate recipe_update snapshots a basics or instructions backup before the PATCH", async () => {
  await withApp({}, async ({ app, state, dir }) => {
    const order = [];
    state.onPatch = async () =>
      order.push(`patch after ${(await backupFiles(dir)).length} backups`);
    const renamed = await app.api("mutate", {
      action: "recipe_update",
      payload: { slug: "gnocchi", name: "Potato Gnocchi", description: "Pillowy" },
    });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
    const steps = await app.api("mutate", {
      action: "recipe_update",
      payload: { slug: "gnocchi", instructions: [{ id: "step-a", text: "Boil gently" }] },
    });
    assert.equal(steps.status, 200, JSON.stringify(steps.body));
    assert.deepEqual(order, ["patch after 1 backups", "patch after 2 backups"]);
    assert.equal(state.patches[0].name, "Potato Gnocchi");
    const kinds = (await app.api("recipe_backups", { slug: "gnocchi" })).body.backups.map(
      (b) => b.kind,
    );
    assert.deepEqual(kinds, ["instructions", "basics"]);
  });
});

test("Mealie failures in the editing commands carry a code and HTTP 502", async () => {
  await withApp({}, async ({ app, state }) => {
    for (const [mealieStatus, code] of [
      [500, "mealie_error"],
      [422, "mealie_error"],
      [401, "mealie_auth"],
      [403, "mealie_auth"],
    ]) {
      state.recipeStatus = mealieStatus;
      for (const name of ["ingredients_get", "recipe_backups"]) {
        const result = await app.api(name, { slug: "gnocchi" });
        assert.equal(result.status, 502, `${name} ${mealieStatus}`);
        assert.equal(result.body.code, code, `${name} ${mealieStatus}`);
      }
    }
  });
});

test("uploads enforce checksum, magic bytes, order, ownership of purpose and session limits", async () => {
  await withApp({}, async ({ app }) => {
    const bytes = png(300);
    const begin = (extra = {}) =>
      app.api("upload_begin", {
        slug: "gnocchi",
        purpose: "cover",
        size: bytes.length,
        mime: "image/png",
        sha256: sha(bytes),
        ...extra,
      });
    for (const bad of [
      { mime: "application/pdf" },
      { size: 50 },
      { size: 10 * 1024 * 1024 + 1 },
      { purpose: "banner" },
      { sha256: "abc" },
    ]) {
      const refused = await begin(bad);
      assert.equal(refused.body.code, "upload_invalid", JSON.stringify(bad));
    }
    const wrongSum = (await begin({ sha256: "0".repeat(64) })).body.upload_id;
    const mismatch = await app.api("upload_chunk", {
      upload_id: wrongSum,
      index: 0,
      data: bytes.toString("base64"),
    });
    assert.equal(mismatch.body.code, "upload_invalid");
    const jpegClaim = await begin({ mime: "image/jpeg" });
    const magic = await app.api("upload_chunk", {
      upload_id: jpegClaim.body.upload_id,
      index: 0,
      data: bytes.toString("base64"),
    });
    assert.equal(magic.body.code, "upload_invalid");
    const ordered = (await begin()).body.upload_id;
    const skipped = await app.api("upload_chunk", { upload_id: ordered, index: 1, data: "AAAA" });
    assert.equal(skipped.body.code, "upload_invalid");
    const gone = await app.api("upload_chunk", { upload_id: ordered, index: 0, data: "AAAA" });
    assert.equal(gone.status, 410);
    assert.equal(gone.body.code, "upload_expired");
    const garbage = (await begin()).body.upload_id;
    const notBase64 = await app.api("upload_chunk", { upload_id: garbage, index: 0, data: "%%%%" });
    assert.equal(notBase64.body.code, "upload_invalid");
    await begin();
    await begin();
    const busy = await begin();
    assert.equal(busy.status, 429);
    assert.equal(busy.body.code, "upload_busy");
  });
});

test("cover replace backs up the old photo first, checks expected_image and the purpose", async () => {
  await withApp({}, async ({ app, state, dir }) => {
    const bytes = png(600 * 1024);
    const id = await app.upload(bytes, "cover");
    const stepPurpose = await app.api("step_image_add", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-a",
      upload_id: id,
    });
    assert.equal(stepPurpose.body.code, "upload_invalid");
    const stale = await app.api("recipe_image_set", {
      slug: "gnocchi",
      upload_id: id,
      expected_image: "other-token",
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "recipe_changed");
    assert.ok(!state.calls.includes("PUT /api/recipes/gnocchi/image"));
    const set = await app.api("recipe_image_set", {
      slug: "gnocchi",
      upload_id: id,
      expected_image: "old-token",
    });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.ok(
      state.calls.indexOf("GET /api/media/recipes/recipe-42/images/original.webp") <
        state.calls.indexOf("PUT /api/recipes/gnocchi/image"),
    );
    const files = await backupFiles(dir);
    assert.ok(files.some((name) => name.endsWith(".webp")));
    const reuse = await app.api("recipe_image_set", {
      slug: "gnocchi",
      upload_id: id,
      expected_image: "new-token",
    });
    assert.equal(reuse.body.code, "upload_expired", "a consumed session is gone");
    const removed = await app.api("recipe_image_delete", {
      slug: "gnocchi",
      expected_image: "new-token",
    });
    assert.equal(removed.body.deleted, true);
    assert.equal(state.recipe.image, null);
    const listed = (await app.api("recipe_backups", { slug: "gnocchi" })).body.backups;
    assert.ok(listed.every((b) => b.kind === "image" && b.has_image));
    const imageBackup = listed.at(-1).backup_id;
    const restored = await app.api("recipe_restore", { slug: "gnocchi", backup_id: imageBackup });
    assert.equal(restored.status, 200, JSON.stringify(restored.body));
    assert.equal(state.recipe.image, "new-token", "the cover was uploaded again");
  });
});

test("step photos: one asset POST, one PATCH with assets and text, then replace and remove", async () => {
  await withApp({}, async ({ app, state }) => {
    const mismatch = await app.api("step_image_add", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-b",
      upload_id: await app.upload(png(), "step"),
    });
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.code, "step_not_found");
    const out = await app.api("step_image_add", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-a",
      upload_id: await app.upload(png(), "step"),
    });
    assert.equal(out.status, 200, JSON.stringify(out.body));
    assert.match(out.body.file_name, /^atelier-step-1-[0-9a-f]{8}\.png$/);
    assert.equal(state.patches.length, 1);
    assert.deepEqual(Object.keys(state.patches[0]).sort(), ["assets", "recipeInstructions"]);
    assert.equal(state.patches[0].assets[0].fileName, out.body.file_name);
    assert.ok(
      state.patches[0].recipeInstructions[0].text.endsWith(
        `<img src="/api/media/recipes/recipe-42/assets/${out.body.file_name}" alt="" />`,
      ),
    );
    assert.equal(state.patches[0].recipeInstructions[1].text, "Add the gnocchi");
    assert.equal(
      out.body.recipe.recipeInstructions[0].imageUrls[0],
      `/api/recipe-asset/recipe-42/${out.body.file_name}`,
    );
    const replaced = await app.api("step_image_add", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-a",
      upload_id: await app.upload(png(400), "step"),
      replace_file_name: out.body.file_name,
    });
    assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
    assert.equal(state.patches.length, 2, "replace is a single PATCH");
    const text = state.recipe.recipeInstructions[0].text;
    assert.ok(!text.includes(out.body.file_name));
    assert.ok(text.includes(replaced.body.file_name));
    assert.deepEqual(
      state.recipe.assets.map((a) => a.fileName),
      [replaced.body.file_name],
    );
    const foreign = await app.api("step_image_remove", {
      slug: "gnocchi",
      step_index: 1,
      step_id: "step-b",
      file_name: replaced.body.file_name,
    });
    assert.equal(foreign.body.code, "step_not_found");
    const foreignReplace = await app.api("step_image_add", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-a",
      upload_id: await app.upload(png(400), "step"),
      replace_file_name: "never-attached.png",
    });
    assert.equal(foreignReplace.body.code, "step_not_found");
    const badName = await app.api("step_image_remove", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-a",
      file_name: "../x",
    });
    assert.equal(badName.body.code, "invalid_request");
    const removed = await app.api("step_image_remove", {
      slug: "gnocchi",
      step_index: 0,
      step_id: "step-a",
      file_name: replaced.body.file_name,
    });
    assert.equal(removed.body.removed, true);
    assert.equal(state.recipe.recipeInstructions[0].text, "Boil the water");
    assert.deepEqual(state.recipe.assets, []);
  });
});

test("request size rule: only upload chunks may exceed 32,000 bytes, nothing exceeds 400,000", async () => {
  await withApp({}, async ({ app }) => {
    const big = await app.api("foods", { search: "x".repeat(40000) });
    assert.equal(big.status, 413);
    const huge = await fetch(`http://127.0.0.1:${app.port}/api/bridge`, {
      method: "POST",
      headers: app.headers,
      body: JSON.stringify({ type: "mealie_atelier/upload_chunk", data: "A".repeat(410000) }),
    });
    assert.equal(huge.status, 413);
    const chunkSized = await app.api("upload_chunk", {
      upload_id: "none",
      index: 0,
      data: "A".repeat(100000),
    });
    assert.equal(chunkSized.status, 410, "a large chunk reaches the command and fails on the id");
  });
});

test("legacy ingredient commands stay available as aliases", async () => {
  await withApp({}, async ({ app }) => {
    const preview = await app.api("ingredient_preview", { slug: "gnocchi" });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.rows[0].referenceId, REF);
    const catalog = await app.api("ingredient_catalog", { kind: "food", search: "sal" });
    assert.equal(catalog.body[0].id, "food-2");
  });
});

test("nutrition errors carry specific codes so the card can show its own message", async () => {
  await withApp({}, async ({ app, state }) => {
    state.recipe.nutrition = { calories: "100" };
    const protectedValues = await app.api("nutrition_save", {
      slug: "gnocchi",
      entries: [],
      expected_hash: "x",
    });
    assert.equal(protectedValues.status, 400);
    assert.equal(protectedValues.body.code, "existing_values_protected");
    const changed = await app.api("nutrition_calculate", {
      slug: "gnocchi",
      entries: [],
      expected_hash: "stale",
    });
    assert.equal(changed.status, 400);
    assert.equal(changed.body.code, "recipe_changed");
  });
});

test("nutrition calculate gives a missing serving count its own code", async () => {
  await withApp({}, async ({ app, state }) => {
    state.recipe.recipeServings = 0;
    const preview = await app.api("nutrition_prepare", { slug: "gnocchi" });
    const res = await app.api("nutrition_calculate", {
      slug: "gnocchi",
      entries: (state.recipe.recipeIngredient || []).map((_, index) => ({
        index,
        grams: 10,
        fdc_id: 1,
      })),
      expected_hash: preview.body.hash,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "recipe_servings_invalid");
  });
});
