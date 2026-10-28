import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../security.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
async function fixture({ legacyRecipeEndpoint = false } = {}) {
  const items = [
    { id: "item-1", shoppingListId: "list-1", note: "Milk", quantity: 1, checked: false },
  ];
  const meals = [
    {
      id: "meal-1",
      date: "2026-10-27",
      entryType: "dinner",
      recipeId: "recipe-1",
      recipe: { id: "recipe-1", slug: "lasagna", name: "Lasagna", image: "abc" },
    },
  ];
  const lists = [{ id: "list-1", name: "Groceries" }];
  let reads = 0;
  let lastRecipePatch = null;
  let lastMealplanQuery = null;
  const recipeTransferRequests = [];
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (req.headers.authorization !== "Bearer DEMO_MOCK_TOKEN") {
      send(res, 401, { error: "No auth" });
      return;
    }
    reads++;
    const buf = [];
    for await (const b of req) buf.push(b);
    const body = buf.length ? JSON.parse(Buffer.concat(buf).toString()) : {};
    if (pathname === "/api/users/self") return send(res, 200, { id: "user-1", username: "test" });
    if (pathname === "/api/recipes" && req.method === "GET")
      return send(res, 200, {
        items: [{ id: "recipe-1", slug: "lasagna", name: "Lasagna", image: "abc" }],
        total: 1,
        page: 1,
        per_page: 24,
      });
    if (pathname === "/api/recipes" && req.method === "POST") return send(res, 201, '"new-recipe"');
    if (pathname === "/api/recipes/lasagna" && req.method === "GET")
      return send(res, 200, {
        id: "recipe-1",
        slug: "lasagna",
        name: "Lasagna",
        image: "abc",
        recipeInstructions: [
          {
            id: "step-1",
            title: "Sauce",
            text: 'Saute\n\n<img src="/api/media/recipes/recipe-1/assets/step-1.jpg" width="100%">\n<img src="https://attacker.example/image.jpg">',
            ingredientReferences: [],
          },
        ],
      });
    if (pathname === "/api/recipes/lasagna" && req.method === "PATCH") {
      lastRecipePatch = body;
      return send(res, 200, { id: "recipe-1", slug: "lasagna", ...body });
    }
    if (pathname === "/api/households/mealplans" && req.method === "GET") {
      lastMealplanQuery = new URL(req.url, "http://localhost").searchParams;
      const start = lastMealplanQuery.get("start_date");
      const end = lastMealplanQuery.get("end_date");
      if (!start || !end) return send(res, 400, { error: "Missing start_date/end_date" });
      return send(
        res,
        200,
        meals.filter((item) => item.date >= start && item.date <= end),
      );
    }
    if (pathname === "/api/households/cookbooks" && req.method === "GET")
      return send(res, 200, {
        items: [{ name: "Schnell", slug: "schnell", queryFilter: { parts: [] } }],
      });
    if (
      (pathname === "/api/organizers/categories" || pathname === "/api/organizers/tags") &&
      req.method === "GET"
    )
      return send(res, 200, { items: [] });
    if (pathname === "/api/households/mealplans" && req.method === "POST") {
      meals.push({ ...body, id: "meal-2" });
      return send(res, 201, { id: "meal-2", ...body });
    }
    if (pathname === "/api/households/mealplans/meal-1" && req.method === "DELETE")
      return send(res, 204, "");
    if (pathname === "/api/households/shopping/lists" && req.method === "GET")
      return send(res, 200, { items: lists });
    if (pathname === "/api/households/shopping/lists" && req.method === "POST") {
      const item = { id: "list-2", name: body.name };
      lists.push(item);
      return send(res, 201, item);
    }
    if (pathname === "/api/households/shopping/lists/list-1/recipe" && req.method === "POST") {
      recipeTransferRequests.push({ pathname, body });
      if (legacyRecipeEndpoint) return send(res, 404, { error: "Batch route unavailable" });
      if (!Array.isArray(body) || body.length !== 1 || body[0].recipeId !== "recipe-1")
        return send(res, 400, { error: "Invalid batch payload" });
      items.push({
        id: "item-3",
        shoppingListId: "list-1",
        display: "200 g Pasta",
        checked: false,
      });
      return send(res, 200, { added: 1 });
    }
    if (
      pathname === "/api/households/shopping/lists/list-1/recipe/recipe-1" &&
      req.method === "POST"
    ) {
      recipeTransferRequests.push({ pathname, body });
      items.push({
        id: "item-3",
        shoppingListId: "list-1",
        display: "200 g Pasta",
        checked: false,
      });
      return send(res, 200, { added: 1 });
    }
    if (pathname === "/api/households/shopping/items" && req.method === "GET")
      return send(res, 200, { items });
    if (pathname === "/api/households/shopping/items" && req.method === "POST") {
      items.push({ ...body, id: "item-2" });
      return send(res, 201, { ...body, id: "item-2" });
    }
    if (pathname === "/api/households/shopping/items/item-1" && req.method === "GET")
      return send(res, 200, items[0]);
    if (pathname === "/api/households/shopping/items/item-1" && req.method === "PUT") {
      Object.assign(items[0], body);
      return send(res, 200, items[0]);
    }
    if (pathname === "/api/media/recipes/recipe-1/images/min-original.webp")
      return send(res, 200, Buffer.from("RIFFaaaaWEBP"), "image/webp");
    if (pathname === "/api/media/recipes/recipe-1/assets/step-1.jpg") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(Buffer.from([255, 216, 255, 0]));
      return;
    }
    return send(res, 404, { error: "Missing route" });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    server,
    port: server.address().port,
    reads: () => reads,
    patch: () => lastRecipePatch,
    mealplanQuery: () => lastMealplanQuery,
    recipeTransferRequests: () => recipeTransferRequests,
  };
}

await test("private web companion responds to real-shaped Mealie calls", async () => {
  const remote = await fixture();
  const password = "lengthy-test-password";
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: password,
      ATELIER_USERNAME: "atelier",
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-server-")),
      PORT: "0",
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let port;
  try {
    port = await new Promise((resolve, reject) => {
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
    const url = `http://127.0.0.1:${port}`;
    const head = {
      Authorization: "Basic " + Buffer.from("atelier:" + password).toString("base64"),
    };
    const bridge = async (type, extras = {}) =>
      fetch(url + "/api/bridge", {
        method: "POST",
        headers: { ...head, "Content-Type": "application/json", "X-Atelier-Request": "1" },
        body: JSON.stringify({ type, ...extras }),
      });
    const denied = await fetch(url + "/");
    assert.equal(denied.status, 401);
    assert.ok(!(await denied.text().then((x) => x.includes("DEMO_MOCK_TOKEN"))));
    const page = await fetch(url + "/", { headers: head });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /mealie-atelier-card/);
    const csrfDenied = await fetch(url + "/api/bridge", {
      method: "POST",
      headers: { ...head, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mealie_atelier/recipes" }),
    });
    assert.equal(csrfDenied.status, 403);
    const recipes = await bridge("mealie_atelier/recipes");
    assert.equal(recipes.status, 200);
    const found = await recipes.json();
    assert.equal(found.items[0].imageUrl, "/api/image/recipe-1");
    const metadata = await (await bridge("mealie_atelier/metadata")).json();
    assert.equal(metadata.cookbooks[0].slug, "schnell");
    const detail = await (await bridge("mealie_atelier/recipe", { slug: "lasagna" })).json();
    assert.equal(detail.recipeInstructions[0].text, "Saute");
    assert.deepEqual(detail.recipeInstructions[0].imageUrls, [
      "/api/recipe-asset/recipe-1/step-1.jpg",
    ]);
    const stepImage = await fetch(url + detail.recipeInstructions[0].imageUrls[0], {
      headers: head,
    });
    assert.equal(stepImage.status, 200);
    assert.equal(stepImage.headers.get("content-type"), "image/jpeg");
    const invalidAsset = await fetch(url + "/api/recipe-asset/recipe-1/%2e%2e%2Fsecret", {
      headers: head,
    });
    assert.equal(invalidAsset.status, 400);
    const image = await fetch(url + "/api/image/recipe-1", { headers: head });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");
    const plan = await (
      await bridge("mealie_atelier/mealplan", { start: "2026-10-27", end: "2026-11-02" })
    ).json();
    assert.equal(plan.length, 1);
    assert.equal(plan[0].recipe.imageUrl, "/api/image/recipe-1");
    assert.equal(remote.mealplanQuery().get("start_date"), "2026-10-27");
    assert.equal(remote.mealplanQuery().get("startDate"), null);
    let shopping = await (await bridge("mealie_atelier/shopping")).json();
    assert.equal(shopping.items.length, 1);
    let toggle = await bridge("mealie_atelier/mutate", {
      action: "shopping_toggle",
      payload: { item_id: "item-1", checked: true },
    });
    assert.equal(toggle.status, 200);
    shopping = await (await bridge("mealie_atelier/shopping")).json();
    assert.equal(shopping.items[0].checked, true);
    const added = await bridge("mealie_atelier/mutate", {
      action: "shopping_add",
      payload: { list_id: "list-1", note: "Bread" },
    });
    assert.equal(added.status, 200);
    assert.equal((await added.json()).note, "Bread");
    const createdList = await bridge("mealie_atelier/mutate", {
      action: "shopping_list_create",
      payload: { name: "Weekend market" },
    });
    assert.equal(createdList.status, 200);
    assert.equal((await createdList.json()).name, "Weekend market");
    const recipeAdd = await bridge("mealie_atelier/mutate", {
      action: "shopping_from_recipe",
      payload: { list_id: "list-1", recipe_id: "recipe-1" },
    });
    assert.equal(recipeAdd.status, 200);
    assert.deepEqual(remote.recipeTransferRequests(), [
      {
        pathname: "/api/households/shopping/lists/list-1/recipe",
        body: [{ recipeId: "recipe-1" }],
      },
    ]);
    shopping = await (await bridge("mealie_atelier/shopping")).json();
    assert.ok(shopping.items.find((i) => i.display === "200 g Pasta"));
    const recipeUpdated = await bridge("mealie_atelier/mutate", {
      action: "recipe_update",
      payload: {
        slug: "lasagna",
        name: "Sunday Lasagna",
        description: "Fresh",
        servings: 4,
        instructions: [{ id: "step-1", text: "Heat oven" }, "Bake"],
      },
    });
    assert.equal(recipeUpdated.status, 200);
    assert.deepEqual(remote.patch().recipeInstructions, [
      {
        id: "step-1",
        title: "Sauce",
        text: 'Heat oven\n\n<img src="/api/media/recipes/recipe-1/assets/step-1.jpg" width="100%">',
        ingredientReferences: [],
      },
      { text: "Bake" },
    ]);
    assert.equal(remote.patch().recipeServings, 4);
    assert.equal(remote.patch().recipeIngredient, undefined);
    const plainText = await bridge("mealie_atelier/mutate", {
      action: "recipe_update",
      payload: { slug: "lasagna", ingredients: ["200 g Pasta"] },
    });
    assert.equal(plainText.status, 400);
    assert.equal((await plainText.json()).code, "use_structured_editor");
    const invalid = await bridge("mealie_atelier/recipe", { slug: "../../notallowed" });
    assert.equal(invalid.status, 400);
    const invalidDate = await bridge("mealie_atelier/mealplan", {
      start: "2026-02-30",
      end: "2026-03-02",
    });
    assert.equal(invalidDate.status, 400);
    const invalidIdentifier = await bridge("mealie_atelier/mutate", {
      action: "shopping_from_recipe",
      payload: { list_id: "../", recipe_id: "recipe-1" },
    });
    assert.equal(invalidIdentifier.status, 400);
    assert.ok(remote.reads() > 0);
  } finally {
    child.kill("SIGTERM");
    remote.server.close();
  }
});

await test("recipe transfer uses the legacy route only when the batch route is unavailable", async () => {
  const remote = await fixture({ legacyRecipeEndpoint: true });
  const password = "legacy-route-test-password";
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
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
      child.stderr.on("data", (chunk) => reject(Error(chunk.toString())));
      child.once("exit", (code) => reject(Error("App exited " + code)));
    });
    const head = {
      Authorization: "Basic " + Buffer.from("atelier:" + password).toString("base64"),
      "Content-Type": "application/json",
      "X-Atelier-Request": "1",
    };
    const response = await fetch(`http://127.0.0.1:${port}/api/bridge`, {
      method: "POST",
      headers: head,
      body: JSON.stringify({
        type: "mealie_atelier/mutate",
        action: "shopping_from_recipe",
        payload: { list_id: "list-1", recipe_id: "recipe-1" },
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(remote.recipeTransferRequests(), [
      {
        pathname: "/api/households/shopping/lists/list-1/recipe",
        body: [{ recipeId: "recipe-1" }],
      },
      { pathname: "/api/households/shopping/lists/list-1/recipe/recipe-1", body: {} },
    ]);
  } finally {
    child.kill("SIGTERM");
    remote.server.close();
  }
});

test("read-only companion exposes permission and denies writes at the server boundary", async () => {
  const remote = await fixture();
  const password = "read-only-test-password";
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: password,
      ATELIER_USERNAME: "atelier",
      ATELIER_READ_ONLY: "true",
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
    const head = {
      Authorization: "Basic " + Buffer.from("atelier:" + password).toString("base64"),
      "Content-Type": "application/json",
      "X-Atelier-Request": "1",
    };
    const call = (type, other = {}) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: head,
        body: JSON.stringify({ type, ...other }),
      });
    const status = await (await call("mealie_atelier/status")).json();
    assert.equal(status.entries[0].read_only, true);
    assert.equal(status.entries[0].can_write, false);
    assert.equal(status.entries[0].can_manage, false);
    assert.equal((await call("mealie_atelier/recipes")).status, 200);
    const n = remote.reads();
    const denied = await call("mealie_atelier/mutate", {
      action: "shopping_add",
      payload: { list_id: "list-1", note: "Should not be added" },
    });
    assert.equal(denied.status, 403);
    assert.match((await denied.json()).error, /read-only/);
    assert.equal(remote.reads(), n, "Blocked writes must never hit Mealie");
  } finally {
    child.kill("SIGTERM");
    remote.server.close();
  }
});

test("studio state survives requests and server restart, rejects stale revisions and unauthorized API usage", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const dir = await mkdtemp(join(tmpdir(), "atelier-persistence-"));
  const remote = await fixture();
  const password = "independent-studio-test";
  const headers = {
    Authorization: "Basic " + Buffer.from("atelier:" + password).toString("base64"),
    "Content-Type": "application/json",
    "X-Atelier-Request": "1",
  };
  let child, port;
  const run = async (readOnly = false) => {
    child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
      env: {
        ...process.env,
        MEALIE_URL: `http://127.0.0.1:${remote.port}`,
        MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
        ATELIER_PASSWORD: password,
        ATELIER_USERNAME: "atelier",
        ATELIER_DATA_DIR: dir,
        ATELIER_READ_ONLY: String(readOnly),
        PORT: "0",
        HOST: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    port = await new Promise((resolve, reject) => {
      let text = "";
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          reject(Error("Studio server startup timed out"));
        }
      }, 6000);
      child.stdout.on("data", (bytes) => {
        text += bytes.toString();
        const m = text.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (m && !done) {
          done = true;
          clearTimeout(timer);
          resolve(Number(m[1]));
        }
      });
      child.once("exit", (code) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          reject(Error("Premature exit " + code));
        }
      });
    });
  };
  const call = (type, rest = {}, extraHeaders = headers) =>
    fetch(`http://127.0.0.1:${port}/api/bridge`, {
      method: "POST",
      headers: extraHeaders,
      body: JSON.stringify({ type, ...rest }),
    });
  const change = (action, payload, revision) =>
    call("mealie_atelier/studio_update", { action, payload, expected_revision: revision });
  const stop = async () => {
    if (child?.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 1000))]);
    }
  };
  try {
    await run();
    let got = await call("mealie_atelier/studio_state");
    assert.equal(got.status, 200);
    let state = await got.json();
    assert.equal(state.revision, 0);
    got = await change("pantry_put", { name: "Tomaten", amount: 300, unit: "g" }, 0);
    assert.equal(got.status, 200);
    state = await got.json();
    assert.equal(state.revision, 1);
    assert.equal(state.pantry.length, 1);
    const stale = await change("profile_set", { people: 4, maxMinutes: 35 }, 0);
    assert.equal(stale.status, 409, "stale writes must be rejected");
    assert.match((await stale.json()).error, /changed/i);
    got = await change("family_member", { name: "Helferkind", child: true }, 1);
    assert.equal(got.status, 200);
    state = await got.json();
    const member = state.family.members[0];
    assert.equal(member.child, true);
    got = await change("session_start", { slug: "lasagna", name: "Lasagna" }, 2);
    assert.equal(got.status, 200);
    state = await got.json();
    const session = state.family.session;
    const denied = await change(
      "session_task",
      { session_id: session.id, text: "Tisch decken", memberId: member.id },
      3,
    );
    assert.equal(denied.status, 400);
    got = await change(
      "session_task",
      { session_id: session.id, text: "Tisch decken", memberId: member.id, adultApproved: true },
      3,
    );
    assert.equal(got.status, 200);
    state = await got.json();
    const task = state.family.session.tasks[0];
    got = await change("session_task", { session_id: session.id, id: task.id, done: true }, 4);
    assert.equal(got.status, 200);
    state = await got.json();
    assert.equal(state.family.session.tasks[0].done, true);
    const noToken = await readFile(join(dir, "studio.json"), "utf8");
    assert.ok(!noToken.includes("DEMO_MOCK_TOKEN"));
    await stop();
    await run();
    got = await call("mealie_atelier/studio_state");
    state = await got.json();
    assert.equal(state.revision, 5);
    assert.equal(state.pantry[0].amount, 300);
    assert.equal(state.family.session.tasks[0].done, true);
    const noAI = await call("mealie_atelier/studio_ai_audit", { slug: "lasagna" });
    assert.equal(noAI.status, 400);
    await stop();
    await run(true);
    const protectedWrite = await change("pantry_delete", { id: state.pantry[0].id }, 5);
    assert.equal(protectedWrite.status, 403);
    got = await call("mealie_atelier/studio_state");
    assert.equal((await got.json()).pantry.length, 1);
    const csrf = await call(
      "mealie_atelier/studio_update",
      { action: "pantry_delete", payload: { id: "any" } },
      { Authorization: headers.Authorization, "Content-Type": "application/json" },
    );
    assert.equal(csrf.status, 403);
  } finally {
    await stop();
    remote.server.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("per-person accounts: roles gate bridge commands, uploads and the status payload", async () => {
  const remote = await fixture();
  const passwords = {
    ada: "admin-account-passphrase",
    wim: "writer-account-passphrase",
    rea: "reader-account-passphrase",
  };
  const roles = { ada: "admin", wim: "writer", rea: "reader" };
  const users = [];
  for (const [name, pass] of Object.entries(passwords))
    users.push(`${name}:${roles[name]}:${await hashPassword(pass)}`);
  const legacy = "shared-legacy-password";
  const dataDir = await mkdtemp(join(tmpdir(), "atelier-accounts-"));
  const timer = (id, owner, extra = {}) => ({
    id,
    label: "Timer " + id.slice(0, 4),
    locale: "en",
    deadline: Date.now() + 3600e3,
    status: "scheduled",
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nextAttemptAt: Date.now() + 3600e3,
    channels: [],
    message: "",
    ...(owner ? { owner } : {}),
    ...extra,
  });
  const timerIds = { ada: randomUUID(), wim: randomUUID(), legacy: randomUUID() };
  await writeFile(
    join(dataDir, "alarms.json"),
    JSON.stringify({
      alarms: [timer(timerIds.ada, "ada"), timer(timerIds.wim, "wim"), timer(timerIds.legacy, "")],
      subscriptions: [],
    }),
  );
  // A shared cooking session that carries Ada's timer: ending it must not cancel her alarm.
  await writeFile(
    join(dataDir, "studio.json"),
    JSON.stringify({
      revision: 0,
      family: {
        members: [],
        session: {
          id: "session-ada",
          slug: "lasagna",
          name: "Lasagna",
          step: 0,
          started: new Date().toISOString(),
          tasks: [],
          timers: [{ id: timerIds.ada, name: "Pasta", deadline: Date.now() + 3600e3 }],
        },
      },
    }),
  );
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: `http://127.0.0.1:${remote.port}`,
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: legacy,
      ATELIER_USERNAME: "atelier",
      ATELIER_USERS: users.join(";"),
      ATELIER_DATA_DIR: dataDir,
      ATELIER_STRUCTURED_EDITS: "true",
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
    const as = (name, pass) => ({
      Authorization: "Basic " + Buffer.from(`${name}:${pass}`).toString("base64"),
      "Content-Type": "application/json",
      "X-Atelier-Request": "1",
    });
    const call = (name, pass, type, other = {}) =>
      fetch(`http://127.0.0.1:${port}/api/bridge`, {
        method: "POST",
        headers: as(name, pass),
        body: JSON.stringify({ type, ...other }),
      });
    const statusOf = async (name, pass) =>
      (await (await call(name, pass, "mealie_atelier/status")).json()).entries[0];

    const reader = await statusOf("rea", passwords.rea);
    assert.deepEqual(reader.permissions, { can_read: true, can_write: false, can_admin: false });
    assert.equal(reader.can_write, false);
    assert.equal(reader.can_manage, false);
    assert.equal(reader.can_edit_ingredients, false);
    const writer = await statusOf("wim", passwords.wim);
    assert.deepEqual(writer.permissions, { can_read: true, can_write: true, can_admin: false });
    const admin = await statusOf("ada", passwords.ada);
    assert.deepEqual(admin.permissions, { can_read: true, can_write: true, can_admin: true });
    assert.equal(admin.can_manage, true);
    assert.equal(admin.features.structured_ingredients, true);
    assert.equal(admin.features.shopping_sync, false);
    assert.equal(admin.features.offline_queue, true);
    assert.equal(admin.can_edit_ingredients, true);
    const shared = await statusOf("atelier", legacy);
    assert.equal(shared.permissions.can_admin, true, "the shared password stays admin");

    const before = remote.reads();
    const blocked = await call("rea", passwords.rea, "mealie_atelier/mutate", {
      action: "shopping_add",
      payload: { list_id: "list-1", note: "Not allowed" },
    });
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json()).code, "write_not_permitted");
    for (const [type, extra] of [
      ["mealie_atelier/mutate", { action: "mealplan_delete", payload: { entry_id: "meal-1" } }],
      ["mealie_atelier/offline_replay", { operation: {} }],
      ["mealie_atelier/studio_update", { action: "pantry_put", payload: {} }],
    ]) {
      const res = await call("rea", passwords.rea, type, extra);
      assert.equal(res.status, 403, type);
      assert.equal((await res.json()).code, "write_not_permitted", type);
    }
    const journal = { action: "journal_set", payload: { slug: "lasagna", note: "x", rating: 5 } };
    const sessionTask = { action: "session_task", payload: { session_id: "s", text: "Chop" } };
    const member = { action: "family_member", payload: { name: "Kim" } };
    const readerJournal = await call("rea", passwords.rea, "mealie_atelier/studio_update", journal);
    assert.equal(readerJournal.status, 403, "the journal is shared, so a reader cannot change it");
    assert.equal((await readerJournal.json()).code, "write_not_permitted");
    const writerJournal = await call("wim", passwords.wim, "mealie_atelier/studio_update", journal);
    assert.equal(writerJournal.status, 200, "a writer can save a journal entry");
    for (const extra of [member, sessionTask]) {
      const res = await call("wim", passwords.wim, "mealie_atelier/studio_update", extra);
      assert.equal(res.status, 403, `a writer cannot ${extra.action}`);
      assert.equal((await res.json()).code, "unauthorized", extra.action);
    }
    const adminMember = await call("ada", passwords.ada, "mealie_atelier/studio_update", member);
    assert.equal(adminMember.status, 200, "an admin can add a family member");
    const upload = await fetch(`http://127.0.0.1:${port}/api/recipe-image/lasagna`, {
      method: "POST",
      headers: { ...as("rea", passwords.rea), "Content-Type": "image/png" },
      body: Buffer.from([137, 80, 78, 71]),
    });
    assert.equal(upload.status, 403);
    assert.equal((await upload.json()).code, "write_not_permitted");
    assert.equal(remote.reads(), before, "refused writes never reach Mealie");

    const idsFor = async (name) =>
      (await (await call(name, passwords[name], "mealie_atelier/alarms")).json()).alarms
        .map((a) => a.id)
        .sort();
    assert.deepEqual(await idsFor("rea"), [], "a reader sees no timers of others");
    assert.deepEqual(await idsFor("wim"), [timerIds.wim]);
    assert.deepEqual(await idsFor("ada"), Object.values(timerIds).sort(), "an admin sees all");
    for (const [name, id] of [
      ["rea", timerIds.ada],
      ["wim", timerIds.ada],
      ["wim", timerIds.legacy],
    ]) {
      const res = await call(name, passwords[name], "mealie_atelier/alarm_cancel", {
        timer_id: id,
      });
      assert.equal(res.status, 403, `${name} cannot cancel ${id}`);
      assert.equal((await res.json()).code, "unauthorized");
    }
    const own = await call("wim", passwords.wim, "mealie_atelier/alarm_cancel", {
      timer_id: timerIds.wim,
    });
    assert.equal(own.status, 200, "an owner can cancel their own timer");
    const legacyByAdmin = await call("ada", passwords.ada, "mealie_atelier/alarm_cancel", {
      timer_id: timerIds.legacy,
    });
    assert.equal(legacyByAdmin.status, 200, "an admin can cancel a timer without owner");
    const ended = await call("wim", passwords.wim, "mealie_atelier/studio_update", {
      action: "session_end",
      payload: { session_id: "session-ada" },
    });
    assert.equal(ended.status, 200, "a writer can end the shared session");
    const adaTimers = (await (await call("ada", passwords.ada, "mealie_atelier/alarms")).json())
      .alarms;
    assert.equal(
      adaTimers.find((a) => a.id === timerIds.ada)?.status,
      "scheduled",
      "ending a session never cancels another person's alarm",
    );

    const readerRead = await call("rea", passwords.rea, "mealie_atelier/recipes");
    assert.equal(readerRead.status, 200, "readers can still read");
    const written = await call("wim", passwords.wim, "mealie_atelier/mutate", {
      action: "shopping_add",
      payload: { list_id: "list-1", note: "Allowed" },
    });
    assert.equal(written.status, 200);
    const edit = await call("wim", passwords.wim, "mealie_atelier/mutate", {
      action: "recipe_update",
      payload: { slug: "lasagna", name: "Nope" },
    });
    assert.equal(edit.status, 403);
    assert.equal((await edit.json()).code, "unauthorized");
    const uploadAsWriter = await fetch(`http://127.0.0.1:${port}/api/recipe-image/lasagna`, {
      method: "POST",
      headers: { ...as("wim", passwords.wim), "Content-Type": "image/png" },
      body: Buffer.from([137, 80, 78, 71]),
    });
    assert.equal((await uploadAsWriter.json()).code, "unauthorized");
    const unknown = await call("rea", passwords.rea, "mealie_atelier/mutate", {
      action: "nothing_like_this",
      payload: {},
    });
    assert.equal(unknown.status, 400, "unknown actions never leak a permission decision");
    assert.equal((await unknown.json()).code, "invalid_request");
    const adminEdit = await call("ada", passwords.ada, "mealie_atelier/mutate", {
      action: "recipe_update",
      payload: { slug: "lasagna", name: "Lasagna" },
    });
    assert.equal(adminEdit.status, 200);
    const history = await call("ada", passwords.ada, "mealie_atelier/recipe_backups", {
      slug: "lasagna",
    });
    const [newest] = (await history.json()).backups;
    assert.equal(newest.user_name, "ada", "the backup names the signed-in person");
    const wrong = await call("ada", "wrong-account-passphrase", "mealie_atelier/status");
    assert.equal(wrong.status, 401);
  } finally {
    child.kill("SIGTERM");
    remote.server.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
