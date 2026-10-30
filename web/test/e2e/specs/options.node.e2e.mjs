// Every environment option, switched on in its own copy of the app (plain Node route), with the
// effect an operator or user can observe. Provider calls go to a local mock, never to a real service.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { startApp, usersEnv, newDataDir } from "../lib/app.mjs";
import { startMocks } from "../lib/mocks.mjs";
import { ACCOUNTS, basicHeader } from "../lib/config.mjs";
import {
  command,
  mutate,
  openContext,
  openApp,
  gotoView,
  launch,
  openRecipeEditor,
  settle,
} from "../lib/browser.mjs";
import {
  eventually,
  shoppingItems,
  recipeList,
  recipeBySlug,
  makeRecipe,
  removeRecipes,
} from "../lib/mealie.mjs";

let mocks;
const running = [];
before(async () => {
  mocks = await startMocks();
});
const madeRecipes = [];
after(async () => {
  await removeRecipes(madeRecipes);
  for (const app of running) await app.stop();
  await mocks.stop();
});
async function app(env = {}, options = {}) {
  const started = await startApp(env, { mock: mocks.origin, ...options });
  running.push(started);
  return started;
}
const admin = ACCOUNTS.admin;
const shared = ACCOUNTS.shared;
const status = async (a, who = shared) => (await command(a.url, who, "status")).body.entries[0];
const mockedSince = (mark) => mocks.since(mark);
const subscription = () => {
  const key = createECDH("prime256v1");
  key.generateKeys();
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
    keys: {
      p256dh: key.getPublicKey().toString("base64url"),
      auth: randomBytes(16).toString("base64url"),
    },
  };
};
const timer = (seconds = 2, label = "Pasta") => ({
  id: randomUUID(),
  label,
  deadline: Date.now() + seconds * 1000,
});

for (const value of ["true", "1", "yes", "TRUE"]) {
  test(`ATELIER_READ_ONLY=${value} refuses every mutation with 403 read_only for all roles`, async () => {
    const a = await app({ ATELIER_READ_ONLY: value, ATELIER_USERS: await usersEnv() });
    const lists = await command(a.url, ACCOUNTS.admin, "shopping");
    const listId = lists.body.lists[0].id;
    for (const key of ["admin", "writer", "reader"]) {
      const entry = await status(a, ACCOUNTS[key]);
      assert.equal(entry.read_only, true);
      assert.equal(entry.can_write, false, key);
      assert.equal(entry.can_manage, false, key);
      const add = await mutate(a.url, ACCOUNTS[key], "shopping_add", {
        list_id: listId,
        note: "never",
      });
      assert.equal(add.status, 403, key);
      assert.equal(add.body.code, "read_only", key);
      const alarm = await command(a.url, ACCOUNTS[key], "alarm_create", { timer: timer() });
      assert.equal(alarm.status, 403, key);
      assert.equal(alarm.body.code, "read_only", key);
      const push = await command(a.url, ACCOUNTS[key], "push_register", {
        subscription: subscription(),
      });
      assert.equal(push.status, 403, key);
      assert.equal(push.body.code, "read_only", key);
    }
    assert.ok(!(await shoppingItems()).some((item) => item.note === "never"));
    // Reading keeps working.
    assert.equal((await command(a.url, ACCOUNTS.reader, "shopping")).status, 200);
  });
}

test("without ATELIER_READ_ONLY writing is allowed and the status says so", async () => {
  const a = await app({ ATELIER_READ_ONLY: "false" });
  const entry = await status(a);
  assert.equal(entry.read_only, false);
  assert.equal(entry.can_write, true);
});

test("ATELIER_USERNAME renames the shared sign-in and the default name stops working", async () => {
  const a = await app({ ATELIER_USERNAME: "kitchen" });
  const ok = await fetch(`${a.url}/api/bridge`, {
    method: "POST",
    headers: {
      authorization: basicHeader({ name: "kitchen", password: shared.password }),
      "content-type": "application/json",
      "x-atelier-request": "1",
    },
    body: JSON.stringify({ type: "mealie_atelier/status" }),
  });
  assert.equal(ok.status, 200);
  const old = await command(a.url, shared, "status");
  assert.equal(old.status, 401);
});

test("the sign-in throttle answers 429 with Retry-After after repeated failures and a success clears it", async () => {
  const a = await app();
  const wrong = { name: shared.name, password: "wrong-password-value" };
  for (let i = 0; i < 5; i += 1) assert.equal((await command(a.url, wrong, "status")).status, 401);
  assert.equal(
    (await command(a.url, shared, "status")).status,
    200,
    "still free after five failures",
  );
  for (let i = 0; i < 6; i += 1) await command(a.url, wrong, "status");
  const locked = await command(a.url, shared, "status");
  assert.equal(locked.status, 429);
  assert.ok(Number(locked.headers.get("retry-after")) >= 1);
});

test("ATELIER_TRUSTED_PROXIES makes the throttle count per forwarded client, otherwise the header is ignored", async () => {
  const wrong = { name: shared.name, password: "wrong-password-value" };
  const trusted = await app({ ATELIER_TRUSTED_PROXIES: "127.0.0.1" });
  for (let i = 0; i < 12; i += 1)
    await command(trusted.url, wrong, "status", {}, { "x-forwarded-for": "203.0.113.7" });
  assert.equal(
    (await command(trusted.url, shared, "status", {}, { "x-forwarded-for": "203.0.113.7" })).status,
    429,
  );
  assert.equal(
    (await command(trusted.url, shared, "status", {}, { "x-forwarded-for": "203.0.113.8" })).status,
    200,
    "another forwarded client is unaffected",
  );
  const plain = await app();
  for (let i = 0; i < 12; i += 1)
    await command(plain.url, wrong, "status", {}, { "x-forwarded-for": "203.0.113.7" });
  assert.equal(
    (await command(plain.url, shared, "status", {}, { "x-forwarded-for": "203.0.113.9" })).status,
    429,
    "an untrusted forwarded header does not split the counter",
  );
});

test("ATELIER_DATA_DIR keeps kitchen state across a restart", async () => {
  const dataDir = newDataDir();
  const first = await app({}, { dataDir });
  const before = (await command(first.url, shared, "studio_state")).body;
  const saved = await command(first.url, shared, "studio_update", {
    action: "profile_set",
    payload: { people: 5, maxMinutes: 45 },
    expected_revision: before.revision,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  await first.stop();
  const second = await app({}, { dataDir });
  const after = (await command(second.url, shared, "studio_state")).body;
  assert.equal(after.revision, before.revision + 1);
  assert.equal(JSON.stringify(after).includes('"people":5'), true);
  const fresh = await app();
  assert.equal((await command(fresh.url, shared, "studio_state")).body.revision, before.revision);
});

test("PORT and HOST decide where the app listens", async () => {
  const a = await app({ HOST: "127.0.0.1" });
  assert.match(a.url, new RegExp(`:${a.port}$`));
  assert.equal((await fetch(`${a.url}/healthz`)).status, 200);
  assert.match(a.logs(), new RegExp(`available on http://127.0.0.1:${a.port}`));
});

test("ATELIER_STRUCTURED_EDITS switches ingredient editing on for admins only", async () => {
  const off = await app({ ATELIER_USERS: await usersEnv() });
  assert.equal((await status(off, ACCOUNTS.admin)).features.structured_ingredients, false);
  assert.equal((await status(off, ACCOUNTS.admin)).can_edit_ingredients, false);
  const on = await app({ ATELIER_USERS: await usersEnv(), ATELIER_STRUCTURED_EDITS: "true" });
  assert.equal((await status(on, ACCOUNTS.admin)).features.structured_ingredients, true);
  assert.equal((await status(on, ACCOUNTS.admin)).can_edit_ingredients, true);
  assert.equal((await status(on, ACCOUNTS.writer)).can_edit_ingredients, false);
  const ro = await app({
    ATELIER_USERS: await usersEnv(),
    ATELIER_STRUCTURED_EDITS: "true",
    ATELIER_READ_ONLY: "true",
  });
  assert.equal((await status(ro, ACCOUNTS.admin)).can_edit_ingredients, false);
});

test("USDA_FDC_API_KEY enables the nutrition search through the provider", async () => {
  const mark = mocks.requests.length;
  const off = await app();
  const refused = await command(off.url, shared, "nutrition_search", { query: "apple" });
  assert.ok(refused.status >= 400, "search needs a key");
  const on = await app({ USDA_FDC_API_KEY: "usda-mock-key-1" });
  const found = await command(on.url, shared, "nutrition_search", { query: "apple" });
  assert.equal(found.status, 200, JSON.stringify(found.body));
  assert.match(JSON.stringify(found.body), /Mock food for apple/);
  assert.ok(mockedSince(mark).some((r) => r.path.startsWith("/usda/")));
});

test("AI features are off without a key and report ai_enabled false", async () => {
  const a = await app();
  const entry = await status(a);
  assert.equal(entry.ai_enabled, false);
  assert.equal(entry.ai_provider, "none");
  assert.equal(entry.features.ai, false);
  const mark = mocks.requests.length;
  const result = await command(a.url, shared, "studio_substitute", {
    ingredient: "Butter",
    recipe: "Pasta",
  });
  assert.ok(result.status >= 400);
  assert.match(JSON.stringify(result.body), /ai_not_configured|not configured|AI/i);
  assert.equal(mockedSince(mark).length, 0, "nothing left the app");
});

for (const [provider, env, prefix] of [
  ["openai", { OPENAI_API_KEY: "sk-mock-openai-1" }, "/openai/"],
  ["anthropic", { ANTHROPIC_API_KEY: "ak-mock-anthropic-1" }, "/anthropic/"],
  [
    "openai",
    {
      OPENAI_API_KEY: "sk-mock-openai-2",
      ANTHROPIC_API_KEY: "ak-mock-anthropic-2",
      ATELIER_AI_PROVIDER: "openai",
    },
    "/openai/",
  ],
  [
    "anthropic",
    {
      OPENAI_API_KEY: "sk-mock-openai-3",
      ANTHROPIC_API_KEY: "ak-mock-anthropic-3",
      ATELIER_AI_PROVIDER: "anthropic",
    },
    "/anthropic/",
  ],
]) {
  test(`AI with ${provider} (${Object.keys(env).join("+")}) answers through the provider and sends the key`, async () => {
    const a = await app(env);
    const entry = await status(a);
    assert.equal(entry.ai_enabled, true);
    assert.equal(entry.ai_provider, provider);
    const mark = mocks.requests.length;
    const result = await command(a.url, shared, "studio_substitute", {
      ingredient: "Butter",
      recipe: "Pasta",
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.match(JSON.stringify(result.body), /Mock substitute/);
    const sent = mockedSince(mark).filter((r) => r.path.startsWith(prefix));
    assert.equal(sent.length, 1);
    const secret =
      provider === "openai" ? sent[0].headers.authorization : sent[0].headers["x-api-key"];
    assert.ok(
      secret && secret.includes(provider === "openai" ? "sk-mock-openai" : "ak-mock-anthropic"),
    );
    const audit = (await recipeList())[0];
    const checked = await command(a.url, shared, "studio_ai_audit", { slug: audit.slug });
    assert.equal(checked.status, 200, JSON.stringify(checked.body));
    assert.match(JSON.stringify(checked.body), /Mock summary/);
  });
}

test("a failing AI provider surfaces as an error, not a crash", async () => {
  const a = await app({ OPENAI_API_KEY: "sk-mock-openai-4" });
  mocks.behaviour.aiStatus = 500;
  try {
    const result = await command(a.url, shared, "studio_substitute", {
      ingredient: "Butter",
      recipe: "Pasta",
    });
    assert.ok(result.status >= 400, JSON.stringify(result.body));
    assert.equal((await command(a.url, shared, "status")).status, 200, "app still answers");
  } finally {
    mocks.behaviour.aiStatus = 200;
  }
});

test("alarm channel defaults: no destination means timers cannot be scheduled in the background", async () => {
  const a = await app();
  const caps = (await command(a.url, shared, "alarm_capabilities")).body;
  assert.deepEqual([caps.webPush, caps.homeAssistant, caps.mode], [false, false, "both"]);
  const created = await command(a.url, shared, "alarm_create", { timer: timer() });
  assert.equal(created.status, 409);
  assert.match(JSON.stringify(created.body), /no_notification_destination|destination/);
  const push = await command(a.url, shared, "push_register", { subscription: subscription() });
  assert.equal(push.status, 503);
});

const haEnv = {
  ATELIER_HA_TOKEN: "ha-mock-token-1",
  ATELIER_HA_NOTIFY_SERVICE: "notify.mobile_app_phone",
};
test("Home Assistant notify delivers an expiring timer to the notify service", async () => {
  const a = await app({ ...haEnv, ATELIER_HA_URL: mocks.origin, ATELIER_ALARM_CHANNEL: "ha" });
  const caps = (await command(a.url, shared, "alarm_capabilities")).body;
  assert.deepEqual([caps.homeAssistant, caps.webPush, caps.mode], [true, false, "ha"]);
  const mark = mocks.requests.length;
  const t = timer(2, "Pasta Mock");
  const created = await command(a.url, shared, "alarm_create", { timer: t });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal(
    ((await command(a.url, shared, "alarms")).body.alarms || []).some((x) => x.id === t.id),
    true,
  );
  await eventually(
    () => mockedSince(mark).some((r) => r.path === "/api/services/notify/mobile_app_phone"),
    {
      timeout: 15000,
      label: "notify call",
    },
  );
  const call = mockedSince(mark).find((r) => r.path === "/api/services/notify/mobile_app_phone");
  assert.equal(call.headers.authorization, "Bearer ha-mock-token-1");
  assert.match(JSON.stringify(call.body), /Pasta Mock/);
});

test("a cancelled timer is never delivered while a later timer is", async () => {
  const a = await app({ ...haEnv, ATELIER_HA_URL: mocks.origin, ATELIER_ALARM_CHANNEL: "ha" });
  const mark = mocks.requests.length;
  const cancelled = timer(2, "Cancelled Mock");
  assert.equal((await command(a.url, shared, "alarm_create", { timer: cancelled })).status, 200);
  assert.equal(
    (await command(a.url, shared, "alarm_cancel", { timer_id: cancelled.id })).status,
    200,
  );
  // A sentinel that expires after the cancelled one proves the scheduler ran past its deadline.
  const sentinel = timer(4, "Sentinel Mock");
  assert.equal((await command(a.url, shared, "alarm_create", { timer: sentinel })).status, 200);
  const delivered = () =>
    mockedSince(mark)
      .filter((r) => r.path === "/api/services/notify/mobile_app_phone")
      .map((r) => JSON.stringify(r.body));
  await eventually(() => delivered().some((body) => body.includes("Sentinel Mock")), {
    timeout: 20000,
    label: "sentinel notification",
  });
  assert.ok(!delivered().some((body) => body.includes("Cancelled Mock")));
});

test("ATELIER_ALARM_CHANNEL=both with Home Assistant and Web Push active delivers to both", async () => {
  const key = createECDH("prime256v1");
  key.generateKeys();
  const a = await app({
    ...haEnv,
    ATELIER_HA_URL: mocks.origin,
    ATELIER_ALARM_CHANNEL: "both",
    ATELIER_VAPID_PUBLIC_KEY: key.getPublicKey().toString("base64url"),
    ATELIER_VAPID_PRIVATE_KEY: key.getPrivateKey().toString("base64url"),
    ATELIER_VAPID_SUBJECT: "mailto:kitchen@example.com",
  });
  const caps = (await command(a.url, shared, "alarm_capabilities")).body;
  assert.deepEqual([caps.homeAssistant, caps.webPush, caps.mode], [true, true, "both"]);
  assert.equal(
    (await command(a.url, shared, "push_register", { subscription: subscription() })).status,
    200,
  );
  const mark = mocks.requests.length;
  assert.equal(
    (await command(a.url, shared, "alarm_create", { timer: timer(2, "Both Mock") })).status,
    200,
  );
  await eventually(
    () =>
      mockedSince(mark).some((r) => r.path === "/api/services/notify/mobile_app_phone") &&
      mockedSince(mark).some((r) => r.path.startsWith("/push/")),
    { timeout: 20000, label: "delivery on both channels" },
  );
  const ha = mockedSince(mark).find((r) => r.path === "/api/services/notify/mobile_app_phone");
  assert.match(JSON.stringify(ha.body), /Both Mock/);
});

test("ATELIER_ALARM_CHANNEL=push ignores Home Assistant even when it is configured", async () => {
  const a = await app({ ...haEnv, ATELIER_HA_URL: mocks.origin, ATELIER_ALARM_CHANNEL: "push" });
  const created = await command(a.url, shared, "alarm_create", { timer: timer() });
  assert.equal(created.status, 409);
});

test("VAPID keys enable Web Push: capabilities, subscription rules and delivery to the push service", async () => {
  const key = createECDH("prime256v1");
  key.generateKeys();
  const a = await app({
    ATELIER_VAPID_PUBLIC_KEY: key.getPublicKey().toString("base64url"),
    ATELIER_VAPID_PRIVATE_KEY: key.getPrivateKey().toString("base64url"),
    ATELIER_VAPID_SUBJECT: "mailto:kitchen@example.com",
    ATELIER_ALARM_CHANNEL: "push",
  });
  const caps = (await command(a.url, shared, "alarm_capabilities")).body;
  assert.equal(caps.webPush, true);
  assert.equal(caps.publicKey, key.getPublicKey().toString("base64url"));
  assert.equal(caps.homeAssistant, false);
  assert.equal(
    (await command(a.url, shared, "alarm_create", { timer: timer() })).status,
    409,
    "needs a subscriber first",
  );
  const bad = await command(a.url, shared, "push_register", {
    subscription: { ...subscription(), endpoint: "https://evil.example.com/push" },
  });
  assert.ok(bad.status >= 400 && bad.status < 500, `foreign push host refused: ${bad.status}`);
  const sub = subscription();
  assert.equal((await command(a.url, shared, "push_register", { subscription: sub })).status, 200);
  const mark = mocks.requests.length;
  assert.equal(
    (await command(a.url, shared, "alarm_create", { timer: timer(2, "Push Mock") })).status,
    200,
  );
  await eventually(() => mockedSince(mark).some((r) => r.path.startsWith("/push/")), {
    timeout: 15000,
    label: "push delivery",
  });
  const sent = mockedSince(mark).find((r) => r.path.startsWith("/push/"));
  assert.match(sent.headers.authorization || "", /^vapid /i);
  assert.equal(sent.headers["content-encoding"], "aes128gcm");
  assert.equal(
    (await command(a.url, shared, "push_unregister", { subscription: sub })).status,
    200,
  );
});

test("the health check turns 503 when the Mealie token is rejected", async () => {
  const a = await app({ MEALIE_API_TOKEN: "revoked-token-value" });
  const res = await fetch(`${a.url}/healthz`);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false });
});

test("the health check turns 503 when Mealie is unreachable", async () => {
  const a = await app({ MEALIE_URL: "http://127.0.0.1:9" });
  assert.equal((await fetch(`${a.url}/healthz`)).status, 503);
});

test("read-only mode hides the shopping and editing controls in the browser", async () => {
  const a = await app({ ATELIER_READ_ONLY: "true" });
  const browser = await launch();
  try {
    const context = await openContext(browser);
    const page = await openApp(context, a.url);
    await gotoView(page, "Einkaufsliste");
    await page.locator('[data-action="shopping-toggle"]').first().waitFor();
    assert.equal(await page.locator('input[name="note"]').count(), 0, "no add field");
    assert.equal(
      await page.locator('[data-action="shopping-delete"]').count(),
      0,
      "no delete button",
    );
    await context.close();
  } finally {
    await browser.close();
  }
});

test("ATELIER_STRUCTURED_EDITS=true: ingredients are edited in the editor, backed up and restorable", async () => {
  const a = await app({ ATELIER_USERS: await usersEnv(), ATELIER_STRUCTURED_EDITS: "true" });
  const { name, slug, id } = await makeRecipe("Struktur-Rezept", madeRecipes);
  const browser = await launch();
  try {
    const context = await openContext(browser);
    const page = await openRecipeEditor(context, a.url, name);
    const quantity = page.locator('[data-ed-input="quantity"][data-ed-row="0"]');
    await quantity.waitFor();
    await settle(page);
    await quantity.fill("3");
    await page.locator('[data-ed-input="note"][data-ed-row="0"]').fill("grob");
    await page.locator('[data-action="ed-review"]').click();
    await page.locator('[data-action="ed-save"]').click();
    const saved = await eventually(
      async () => {
        const recipe = await recipeBySlug(slug);
        return recipe.recipeIngredient[0].quantity === 3 ? recipe : null;
      },
      { label: "ingredient quantity in Mealie" },
    );
    assert.equal(saved.recipeIngredient[0].note, "grob");
    const listed = (await command(a.url, ACCOUNTS.admin, "recipe_backups", { slug })).body.backups;
    const backup = listed.find((b) => b.kind === "ingredients");
    assert.ok(backup, "the change was backed up first");
    assert.deepEqual(page.problems, []);
    await context.close();

    const preview = (await command(a.url, ACCOUNTS.admin, "ingredients_get", { slug })).body;
    const writer = await command(a.url, ACCOUNTS.writer, "ingredients_save", {
      slug,
      expected_hash: preview.expected_hash,
      rows: [{ reference_id: null, quantity: 1, unit_id: null, food_id: null, note: "x" }],
    });
    assert.equal(writer.status, 403, "only administrators edit ingredients");
    assert.equal(writer.body.code, "unauthorized");
    const stale = await command(a.url, ACCOUNTS.admin, "ingredients_save", {
      slug,
      expected_hash: "0".repeat(64),
      rows: preview.rows.map((r) => ({
        reference_id: r.reference_id,
        quantity: 9,
        unit_id: null,
        food_id: null,
        note: "x",
      })),
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "recipe_changed");
    const restored = await command(a.url, ACCOUNTS.admin, "recipe_restore", {
      slug,
      backup_id: backup.backup_id,
    });
    assert.equal(restored.status, 200, JSON.stringify(restored.body));
    const back = await recipeBySlug(slug);
    assert.notEqual(back.recipeIngredient[0].quantity, 3, "the old ingredient is back");
    assert.ok(id);
  } finally {
    await browser.close();
  }
});

test("Nutrition Lab: prepare, AI term suggestions, calculation and save with the replacement consent", async () => {
  const a = await app({
    ATELIER_USERS: await usersEnv(),
    USDA_FDC_API_KEY: "usda-mock-key-2",
    OPENAI_API_KEY: "sk-mock-openai-5",
  });
  const { slug } = await makeRecipe("Nährwert-Rezept", madeRecipes);
  const prepared = (await command(a.url, ACCOUNTS.reader, "nutrition_prepare", { slug })).body;
  assert.equal(prepared.fdc_enabled, true);
  assert.equal(prepared.ai_enabled, true);
  assert.equal(prepared.ingredients.length, 1);
  assert.match(prepared.hash, /^[0-9a-f]{64}$/);

  const mark = mocks.requests.length;
  const stale = await command(a.url, ACCOUNTS.reader, "nutrition_ai", {
    slug,
    expected_hash: "0".repeat(64),
  });
  assert.equal(stale.status, 400, "AI never runs on a changed recipe");
  assert.equal(mockedSince(mark).filter((r) => r.path.startsWith("/openai/")).length, 0);
  const suggested = await command(a.url, ACCOUNTS.reader, "nutrition_ai", {
    slug,
    expected_hash: prepared.hash,
  });
  assert.equal(suggested.status, 200, JSON.stringify(suggested.body));
  assert.match(JSON.stringify(suggested.body), /Mock note/);

  const found = (await command(a.url, ACCOUNTS.reader, "nutrition_search", { query: "salt" })).body;
  const fdcId = found[0].id;
  const entries = [{ index: 0, grams: 100, fdc_id: fdcId }];
  const report = await command(a.url, ACCOUNTS.reader, "nutrition_calculate", {
    slug,
    entries,
    expected_hash: prepared.hash,
  });
  assert.equal(report.status, 200, JSON.stringify(report.body));
  assert.equal(report.body.per_portion.calories, 60, "120 kcal per 100 g, 100 g, 2 servings");
  const changed = await command(a.url, ACCOUNTS.reader, "nutrition_calculate", {
    slug,
    entries,
    expected_hash: "0".repeat(64),
  });
  assert.equal(changed.body.code, "recipe_changed");

  const save = (who, extra = {}) =>
    command(a.url, ACCOUNTS[who], "nutrition_save", {
      slug,
      entries,
      expected_hash: prepared.hash,
      ...extra,
    });
  assert.equal((await save("writer")).status, 403);
  const first = await save("admin");
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const stored = await recipeBySlug(slug);
  assert.equal(stored.nutrition.calories, "60.0 kcal");
  assert.equal(stored.settings.showNutrition, true);
  const protectedValues = await save("admin");
  assert.equal(protectedValues.status, 400);
  assert.equal(protectedValues.body.code, "existing_values_protected");
  const replaced = await save("admin", { overwrite_existing: true });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
});
