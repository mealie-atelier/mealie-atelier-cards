// Bring! shopping sync through the UI, from the first sign-in to the disconnect. The Bring! side is the
// local fake (test/fake-bring.mjs), so no real account or network service is involved; Mealie is the
// disposable one, and every claim about its items is checked through its own API.
// Each route runs its own app: the plain Node route starts server.mjs, the Docker route a container of
// the image, so the same scenario covers both and a restart keeps the data directory (volume).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { route, ACCOUNTS } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, gotoView, settle, command } from "../lib/browser.mjs";
import { mealie, shoppingItems, uniqueName, eventually } from "../lib/mealie.mjs";
import { startApp, freePort, newDataDir } from "../lib/app.mjs";
import { startContainer, newVolume, removeContainers } from "../lib/container.mjs";
import { startFakeBring, FAKE_PASSWORD } from "../../fake-bring.mjs";

const EMAIL = "familie.beispiel@example.com";
const state = browserSuite();
const shared = ACCOUNTS.shared;
const sel = (page, action) => page.locator(`[data-action="${action}"]`);

let fake;
let app;
let dataDir = null;
const created = [];
const lists = {};

/** The fake answers on all interfaces on the Docker route, so a container reaches it by host name. */
async function startFake() {
  const port = await freePort();
  fake = await startFakeBring({
    port,
    email: EMAIL,
    host: route === "docker" ? "0.0.0.0" : "127.0.0.1",
  });
  return route === "docker" ? `http://host.docker.internal:${port}` : fake.base;
}

/** One app per route; `restart` keeps the data directory, like restarting the service does. */
async function startRoute(bringBase) {
  const env = { BRING_API_BASE: bringBase, BRING_API_KEY: "fixture-api-key" };
  if (route === "docker") {
    const volume = newVolume();
    const hostPort = await freePort();
    const container = await startContainer(env, { volume, hostPort });
    return {
      get url() {
        return container.url;
      },
      restart: async () => {
        container.stop();
        await container.start();
      },
      stop: () => container.stop(),
      logs: container.logs,
    };
  }
  const dir = newDataDir();
  dataDir = dir;
  let current = await startApp(env, { dataDir: dir });
  return {
    get url() {
      return current.url;
    },
    restart: async () => {
      await current.stop();
      current = await startApp(env, { dataDir: dir });
    },
    stop: () => current.stop(),
    logs: () => current.logs(),
  };
}

before(async () => {
  const base = await startFake();
  app = await startRoute(base);
  lists.main = await newMealieList("Bring-Sync");
  lists.move = await newMealieList("Bring-Umzug");
  await addMealieItem(lists.main, "Mehl", 2);
  await addMealieItem(lists.main, "Milch");
  await addMealieItem(lists.main, "Butter");
  await addMealieItem(lists.move, "Hefe");
  await addMealieItem(lists.move, "Salz");
});
after(async () => {
  for (const id of created)
    await mealie("DELETE", `/api/households/shopping/lists/${id}`).catch(() => {});
  await app?.stop();
  fake?.close();
  if (route === "docker") removeContainers();
});

async function newMealieList(prefix) {
  const name = uniqueName(prefix);
  const list = await mealie("POST", "/api/households/shopping/lists", { name });
  created.push(list.id);
  return { id: list.id, name };
}
const addMealieItem = (list, note, quantity = 0) =>
  mealie("POST", "/api/households/shopping/items", {
    shoppingListId: list.id,
    note,
    quantity,
  });
const itemsOf = async (list) =>
  (await shoppingItems()).filter((item) => item.shoppingListId === list.id);

const bringList = (name) => fake.state.lists.find((row) => row.name === name);
/** The names currently open on a Bring! list. */
const open = (name) => fake.state.open(bringList(name).listUuid).map((row) => row.itemId);
/** How often an item was ever sent to a Bring! list (the fake keeps every call). */
const sends = (name, item) =>
  fake.state
    .puts()
    .filter((call) => call.path.endsWith(`/${bringList(name).listUuid}/items`))
    .map((call) => JSON.parse(call.raw).changes[0])
    .filter((change) => change.operation === "TO_PURCHASE" && change.itemId === item).length;
const control = (patch) =>
  fetch(`${fake.base}/__fake/control`, { method: "POST", body: JSON.stringify(patch) });

async function openShopping(context) {
  const page = await openApp(context, app.url);
  await gotoView(page, "Einkaufsliste");
  await page.locator("h1", { hasText: "Alles für den Einkauf" }).waitFor();
  return page;
}
/** Opens the Bring! dialog: the connect wizard, or the sync dialog once an account is connected. */
async function openSync(page) {
  await page.locator("button.sync-open").waitFor();
  await page.locator("button.sync-open").click();
  await page.locator(".sync-modal").waitFor();
  await settle(page);
}
async function signIn(page, password) {
  await page.locator('[data-input="sync-bring-email"]').fill(EMAIL);
  await page.locator('[data-input="sync-bring-password"]').fill(password);
  await page.locator('.bw-form button[type="submit"]').click();
  await settle(page);
}
/** Walks the wizard from the Bring! list step on: picks both lists, a 5 second delay, then previews. */
async function pickLists(page, { bring, mealieList, move = false }) {
  await page.locator('[data-input="sync-bw-bring"]').first().waitFor();
  await page.locator(".bw-choice", { hasText: bring }).click();
  await sel(page, "sync-bw-next").click();
  await settle(page);
  const radio = page.locator(`[data-input="sync-bw-mealie"][value="${mealieList.id}"]`);
  if (await radio.count()) await radio.check();
  else
    await page
      .locator('[data-input="sync-bw-mealie-select"]')
      .selectOption({ value: mealieList.id });
  await page.locator(".bw-more-toggle").click();
  await page.locator('[data-input="sync-bw-debounce"]').fill("5");
  if (move) await page.locator('[data-input="sync-bw-mode"][value="move"]').check();
  await sel(page, "sync-bw-next").click();
  await page.locator(".bw-lines").waitFor();
  await settle(page);
}
async function release(page) {
  await sel(page, "sync-bw-next").click();
  await settle(page);
  await sel(page, "sync-bw-send").click();
  await page.locator(".bw-done").waitFor({ timeout: 30000 });
  await settle(page);
}
const rule = (page, list) => page.locator(".sync-rule", { hasText: list.name });
async function runNow(page, list) {
  await openSync(page);
  await rule(page, list).locator('[data-action="sync-run"]').click();
  await settle(page);
  return rule(page, list);
}
async function addInUi(page, list, note) {
  await page.locator("select").first().selectOption({ label: list.name });
  await settle(page);
  await page.locator('input[name="note"]').fill(note);
  await page.locator('form[data-form="shopping-add"] button[type="submit"]').click();
  await eventually(async () => (await itemsOf(list)).some((item) => item.note === note), {
    label: `${note} in Mealie`,
  });
  await settle(page);
}
const sorted = (rows) => [...rows].sort();

test("a wrong password is explained, the right one connects and the Bring! list step follows", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    await page.locator("button.bw-entry", { hasText: "Mit Bring! verbinden" }).click();
    await page.locator(".bw-form").waitFor();
    await settle(page);
    await signIn(page, "falsches-passwort");
    await page.locator(".bw-error").waitFor();
    assert.match(
      await page.locator(".bw-error").innerText(),
      /Bring! lehnt die E-Mail-Adresse oder das Passwort ab/,
    );
    assert.equal(fake.state.logins, 0);
    await signIn(page, FAKE_PASSWORD);
    await page.locator('[data-input="sync-bw-bring"]').first().waitFor();
    assert.match(await page.locator(".bw-account-line").innerText(), /f•••@example\.com/);
    // The usual list of the account is preselected and marked.
    const preselected = page.locator(".bw-choice:has(input:checked)");
    assert.match(await preselected.innerText(), /Einkauf/);
    assert.match(await preselected.innerText(), /Deine übliche Liste/);
    assert.equal(fake.state.logins, 1);
    assert.deepEqual(
      page.problems.filter((p) => !/status of (401|422|429|50\d)/.test(p)),
      [],
    );
  } finally {
    await context.close();
  }
});

test("the preview shows the real Mealie items and the first batch arrives once", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    // The account survived leaving the dialog: the same wizard now starts at the Bring! list.
    await page.locator("button.sync-open").click();
    await page.locator(".sync-modal").waitFor();
    await settle(page);
    await sel(page, "sync-bw-open").click();
    await settle(page);
    await pickLists(page, { bring: "Einkauf", mealieList: lists.main });
    const lines = await page.locator(".bw-line").allInnerTexts();
    assert.equal(lines.length, 3, lines.join(" | "));
    for (const wanted of ["Mehl", "Milch", "Butter"])
      assert.ok(
        lines.some((line) => line.includes(wanted)),
        `${wanted} in the preview`,
      );
    assert.ok(lines.some((line) => line.includes("Mehl (2)")));
    // Nothing leaves Mealie before the confirmation.
    assert.deepEqual(open("Einkauf"), []);
    await release(page);
    await eventually(() => open("Einkauf").length === 3, { label: "first batch in Bring!" });
    assert.deepEqual(sorted(open("Einkauf")), ["Butter", "Mehl", "Milch"]);
    for (const name of ["Mehl", "Milch", "Butter"]) assert.equal(sends("Einkauf", name), 1);
    const spec = fake.state.open(bringList("Einkauf").listUuid).find((r) => r.itemId === "Mehl");
    assert.equal(spec.spec, "2");
    // Copy mode leaves Mealie as it was.
    assert.ok((await itemsOf(lists.main)).every((item) => item.checked === false));
  } finally {
    await context.close();
  }
});

test("items added in the app are sent after adding, and a duplicate is skipped", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    // Someone already put Kaffee on the Bring! list in the Bring! app.
    fake.state
      .bucket(bringList("Einkauf").listUuid)
      .purchase.push({ uuid: crypto.randomUUID(), itemId: "Kaffee", spec: "" });
    await addInUi(page, lists.main, "Kaffee");
    await addInUi(page, lists.main, "Eier");
    await eventually(() => open("Einkauf").includes("Eier"), {
      timeout: 40000,
      label: "Eier in Bring!",
    });
    // The run that delivered Eier also saw Kaffee, which Bring! already had, and left it alone.
    assert.equal(sends("Einkauf", "Eier"), 1);
    assert.equal(sends("Einkauf", "Kaffee"), 0);
    assert.deepEqual(sorted(open("Einkauf")), ["Butter", "Eier", "Kaffee", "Mehl", "Milch"]);
  } finally {
    await context.close();
  }
});

test("a second rule in move mode delivers the items and ticks them off in Mealie", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    await openSync(page);
    await sel(page, "sync-bw-open").click();
    await settle(page);
    await pickLists(page, { bring: "Party", mealieList: lists.move, move: true });
    await release(page);
    await eventually(() => open("Party").length === 2, { label: "move batch in Bring!" });
    assert.deepEqual(sorted(open("Party")), ["Hefe", "Salz"]);
    await eventually(async () => (await itemsOf(lists.move)).every((item) => item.checked), {
      label: "moved items ticked off in Mealie",
    });
    assert.equal(sends("Party", "Hefe"), 1);
    assert.equal(sends("Party", "Salz"), 1);
    // The copy rule did not touch its list.
    assert.ok((await itemsOf(lists.main)).every((item) => item.checked === false));
  } finally {
    await context.close();
  }
});

test("a restart of the app does not send anything twice and pending items still arrive", async () => {
  // Added in Mealie while the app is down: no trigger fires, only the next run can pick it up.
  await app.restart();
  await addMealieItem(lists.main, "Honig");
  const before = fake.state.puts().length;
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    const card = await runNow(page, lists.main);
    await eventually(() => open("Einkauf").includes("Honig"), { label: "Honig in Bring!" });
    await settle(page);
    assert.equal(sends("Einkauf", "Honig"), 1);
    for (const name of ["Mehl", "Milch", "Butter", "Eier"]) assert.equal(sends("Einkauf", name), 1);
    assert.equal(fake.state.puts().length, before + 1);
    // A second run changes nothing.
    await card.locator('[data-action="sync-run"]').click();
    await settle(page);
    assert.equal(fake.state.puts().length, before + 1);
    assert.equal(sends("Party", "Hefe"), 1);
    assert.equal(await page.locator(".sync-rule").count(), 2);
  } finally {
    await context.close();
  }
});

test("an unreachable Bring! is explained in German and the item arrives once it is back", async () => {
  await addMealieItem(lists.main, "Senf");
  await control({ blocked: true });
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    const card = await runNow(page, lists.main);
    await card.locator(".notice.error").first().waitFor({ timeout: 30000 });
    const text = await card.innerText();
    assert.match(text, /nicht erreichbar/);
    assert.match(text, /Bring! ist gerade nicht erreichbar/);
    assert.match(text, /1 Eintrag bleibt in Mealie offen/);
    assert.doesNotMatch(text, /gibt es nicht mehr/);
    assert.ok(!open("Einkauf").includes("Senf"));
    await control({ blocked: false });
    await card.locator('[data-action="sync-run"]').click();
    await eventually(() => open("Einkauf").includes("Senf"), { label: "Senf in Bring!" });
    assert.equal(sends("Einkauf", "Senf"), 1);
  } finally {
    await control({ blocked: false });
    await context.close();
  }
});

test("an expired session asks for one new sign-in that keeps the rules and pending items", async () => {
  await addMealieItem(lists.main, "Pfeffer");
  await control({ expireAccess: true });
  const context = await openContext(state.browser);
  try {
    let page = await openShopping(context);
    await runNow(page, lists.main);
    await page.waitForTimeout(2000);
    page = await openShopping(context);
    await page.locator("button.sync-open .sync-badge", { hasText: "Anmeldung nötig" }).waitFor();
    assert.ok(!open("Einkauf").includes("Pfeffer"));
    await openSync(page);
    assert.match(await page.locator(".bw-account").innerText(), /Melde dich einmal neu an/);
    await signIn(page, "falsches-passwort");
    assert.match(
      await page.locator(".bw-account .bw-error").innerText(),
      /lehnt die E-Mail-Adresse oder das Passwort ab/,
    );
    await signIn(page, FAKE_PASSWORD);
    await page.locator(".bw-account .bw-form").waitFor({ state: "detached" });
    // The failed run before the new sign-in still counts, so the pill asks for a look, not for a sign-in.
    assert.doesNotMatch(await page.locator(".bw-account .bw-pill").innerText(), /Anmeldung nötig/);
    // Both rules are still there, and the item that waited goes out exactly once.
    assert.equal(await page.locator(".sync-rule").count(), 2);
    await rule(page, lists.main).locator('[data-action="sync-run"]').click();
    await eventually(() => open("Einkauf").includes("Pfeffer"), { label: "Pfeffer in Bring!" });
    await page.locator(".bw-account .bw-pill", { hasText: "Verbunden" }).waitFor();
    assert.equal(sends("Einkauf", "Pfeffer"), 1);
    for (const name of ["Mehl", "Milch", "Butter", "Eier", "Honig", "Senf"])
      assert.equal(sends("Einkauf", name), 1);
  } finally {
    await context.close();
  }
});

test("disconnecting stops the sync, keeps the rules and leaves no secret behind", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    await openSync(page);
    if (dataDir) {
      // While connected the session tokens and the account address are stored, never the password.
      const stored = readFileSync(join(dataDir, "bring-account.json"), "utf8");
      assert.ok(!stored.includes(FAKE_PASSWORD));
      assert.ok(
        stored.includes(EMAIL),
        "the address is kept so signing in again needs the password only",
      );
    }
    await sel(page, "sync-bring-disconnect-ask").click();
    assert.match(await page.locator(".bw-account").innerText(), /Verbindung wirklich trennen/);
    await sel(page, "sync-bring-disconnect-cancel").click();
    await sel(page, "sync-bring-disconnect-ask").click();
    await sel(page, "sync-bring-disconnect").click();
    await settle(page);
    await page.locator("button.bw-entry").waitFor();
    // Without an account the sync commands are refused and nothing reaches Bring!.
    const refused = await command(app.url, shared, "sync_state");
    assert.equal(refused.status, 501);
    if (dataDir) {
      assert.ok(!existsSync(join(dataDir, "bring-account.json")));
    }
    const sent = fake.state.puts().length;
    await addMealieItem(lists.main, "Zimt");
    await page.waitForTimeout(1500);
    assert.equal(fake.state.puts().length, sent);
    // Signing in again brings the saved rules back.
    await page.locator("button.bw-entry").click();
    await page.locator(".bw-form").waitFor();
    await settle(page);
    await signIn(page, FAKE_PASSWORD);
    await page.locator('[data-input="sync-bw-bring"]').first().waitFor();
    const again = await command(app.url, shared, "sync_state");
    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.equal(again.body.rules.length, 2);
  } finally {
    await context.close();
  }
});
