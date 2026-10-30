// Docker route: the configured paths, env toggles, startup refusals and data directory persistence of
// the image built from web/Dockerfile. Each case runs its own hardened container of that image on the
// compose network; providers are a local mock reached through host.docker.internal (no real keys).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { ACCOUNTS, basicHeader } from "../lib/config.mjs";
import { startMocks } from "../lib/mocks.mjs";
import { command, mutate } from "../lib/browser.mjs";
import { eventually, shoppingItems } from "../lib/mealie.mjs";
import { usersEnv } from "../lib/app.mjs";
import { startContainer, runRefused, newVolume, removeContainers } from "../lib/container.mjs";

let mocks;
before(async () => {
  mocks = await startMocks({ host: "0.0.0.0" });
});
after(async () => {
  removeContainers();
  await mocks.stop();
});
const shared = ACCOUNTS.shared;
const up = (env = {}, options = {}) =>
  startContainer(env, { mock: mocks.containerOrigin, ...options });
const status = async (a, who = shared) => (await command(a.url, who, "status")).body.entries[0];
const since = (mark) => mocks.requests.slice(mark);
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
const timer = (seconds, label) => ({
  id: randomUUID(),
  label,
  deadline: Date.now() + seconds * 1000,
});

test("AI is off without a key and answers through the provider once a key is configured", async () => {
  const off = await up();
  const entry = await status(off);
  assert.equal(entry.ai_enabled, false);
  assert.equal(
    (await command(off.url, shared, "studio_substitute", { ingredient: "Butter", recipe: "Pasta" }))
      .status >= 400,
    true,
  );
  const mark = mocks.requests.length;
  const on = await up({ OPENAI_API_KEY: "sk-mock-openai-docker" });
  assert.equal((await status(on)).ai_provider, "openai");
  const result = await command(on.url, shared, "studio_substitute", {
    ingredient: "Butter",
    recipe: "Pasta",
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.match(JSON.stringify(result.body), /Mock substitute/);
  const sent = since(mark).filter((r) => r.path.startsWith("/openai/"));
  assert.equal(sent.length, 1);
  assert.match(sent[0].headers.authorization, /sk-mock-openai-docker/);
});

test("USDA_FDC_API_KEY enables the nutrition search in the container", async () => {
  const mark = mocks.requests.length;
  const on = await up({ USDA_FDC_API_KEY: "usda-mock-key-docker" });
  const found = await command(on.url, shared, "nutrition_search", { query: "apple" });
  assert.equal(found.status, 200, JSON.stringify(found.body));
  assert.match(JSON.stringify(found.body), /Mock food for apple/);
  assert.ok(since(mark).some((r) => r.path.startsWith("/usda/")));
});

test("Home Assistant notify and Web Push both deliver an expiring timer from the container", async () => {
  const key = createECDH("prime256v1");
  key.generateKeys();
  const a = await up({
    ATELIER_HA_URL: mocks.containerOrigin,
    ATELIER_HA_TOKEN: "ha-mock-token-docker",
    ATELIER_HA_NOTIFY_SERVICE: "notify.mobile_app_phone",
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
    (await command(a.url, shared, "alarm_create", { timer: timer(2, "Docker Both") })).status,
    200,
  );
  await eventually(
    () =>
      since(mark).some((r) => r.path === "/api/services/notify/mobile_app_phone") &&
      since(mark).some((r) => r.path.startsWith("/push/")),
    { timeout: 25000, label: "delivery on both channels" },
  );
  const ha = since(mark).find((r) => r.path === "/api/services/notify/mobile_app_phone");
  assert.equal(ha.headers.authorization, "Bearer ha-mock-token-docker");
});

test("ATELIER_READ_ONLY=true refuses writes with 403 read_only and ATELIER_USERNAME renames the sign-in", async () => {
  const a = await up({ ATELIER_READ_ONLY: "true", ATELIER_USERNAME: "kitchen" });
  const kitchen = { name: "kitchen", password: shared.password };
  const entry = await status(a, kitchen);
  assert.deepEqual([entry.read_only, entry.can_write], [true, false]);
  const lists = (await command(a.url, kitchen, "shopping")).body.lists;
  const add = await mutate(a.url, kitchen, "shopping_add", {
    list_id: lists[0].id,
    note: "never-docker",
  });
  assert.equal(add.status, 403);
  assert.equal(add.body.code, "read_only");
  assert.ok(!(await shoppingItems()).some((item) => item.note === "never-docker"));
  assert.equal(
    (await command(a.url, shared, "status")).status,
    401,
    "the default name stopped working",
  );
});

test("ATELIER_USERS roles and ATELIER_STRUCTURED_EDITS apply in the container", async () => {
  const a = await up({ ATELIER_USERS: await usersEnv(), ATELIER_STRUCTURED_EDITS: "true" });
  assert.equal((await status(a, ACCOUNTS.admin)).can_edit_ingredients, true);
  assert.equal((await status(a, ACCOUNTS.writer)).can_edit_ingredients, false);
  assert.equal((await status(a, ACCOUNTS.reader)).can_write, false);
  const denied = await mutate(a.url, ACCOUNTS.reader, "shopping_add", { list_id: "x", note: "n" });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, "write_not_permitted");
});

test("ATELIER_ALARM_CHANNEL=push ignores a configured Home Assistant in the container", async () => {
  const a = await up({
    ATELIER_HA_URL: mocks.containerOrigin,
    ATELIER_HA_TOKEN: "ha-mock-token-docker",
    ATELIER_HA_NOTIFY_SERVICE: "notify.mobile_app_phone",
    ATELIER_ALARM_CHANNEL: "push",
  });
  const created = await command(a.url, shared, "alarm_create", { timer: timer(2, "Nope") });
  assert.equal(created.status, 409);
});

test("the sign-in throttle locks a client out in the container and a correct password is refused meanwhile", async () => {
  const a = await up();
  const wrong = { name: shared.name, password: "wrong-password-value" };
  for (let i = 0; i < 11; i += 1) await command(a.url, wrong, "status");
  const locked = await command(a.url, shared, "status");
  assert.equal(locked.status, 429);
  assert.ok(Number(locked.headers.get("retry-after")) >= 1);
  const health = await fetch(`${a.url}/healthz`);
  assert.equal(health.status, 200, "the health check is outside the throttle");
  const page = await fetch(a.url + "/", { headers: { authorization: basicHeader(wrong) } });
  assert.equal(page.status, 429);
});

for (const [label, env, pattern] of [
  [
    "a password shorter than 12 characters",
    { ATELIER_PASSWORD: "short" },
    /at least 12 characters/,
  ],
  ["a PORT outside 0 to 65535", { PORT: "70000" }, /./],
  [
    "half-set Home Assistant settings",
    { ATELIER_HA_URL: "http://127.0.0.1:1" },
    /Home Assistant notifications need all of/,
  ],
  [
    "both AI keys without a provider",
    { OPENAI_API_KEY: "sk-mock-1", ANTHROPIC_API_KEY: "ak-mock-1" },
    /ATELIER_AI_PROVIDER/,
  ],
  [
    "a Mealie URL with credentials",
    { MEALIE_URL: "http://user:pw@mealie:9000" },
    /without credentials or query/,
  ],
])
  test(`the container refuses to start with ${label}`, () => {
    const { code, output } = runRefused(env);
    assert.notEqual(code, 0, output);
    assert.match(output, pattern);
  });

test("ATELIER_DATA_DIR on a volume keeps kitchen state across a restart and a new container", async () => {
  const volume = newVolume();
  const first = await up({}, { volume });
  const before = (await command(first.url, shared, "studio_state")).body;
  const saved = await command(first.url, shared, "studio_update", {
    action: "profile_set",
    payload: { people: 6, maxMinutes: 40 },
    expected_revision: before.revision,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  first.stop();
  await first.start();
  const restarted = (await command(first.url, shared, "studio_state")).body;
  assert.equal(restarted.revision, before.revision + 1);
  assert.equal(restarted.profile.people, 6);
  first.stop();
  const second = await up({}, { volume });
  assert.equal((await command(second.url, shared, "studio_state")).body.profile.people, 6);
  const fresh = await up();
  assert.equal(
    (await command(fresh.url, shared, "studio_state")).body.revision,
    before.revision,
    "a container without the volume starts empty",
  );
});
