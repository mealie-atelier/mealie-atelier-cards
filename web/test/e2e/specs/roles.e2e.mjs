// Roles: what admin, writer and reader can and cannot do, in the UI and over HTTP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, ACCOUNTS } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, command, mutate } from "../lib/browser.mjs";
import { mealie, shoppingItems, uniqueName, recipeList } from "../lib/mealie.mjs";

const state = browserSuite();
const sel = (page, action) => page.locator(`[data-action="${action}"]`);

async function listId() {
  const shopping = await command(baseUrl, ACCOUNTS.admin, "shopping");
  return shopping.body.lists[0].id;
}

test("status reports the permissions of each account", async () => {
  const expected = {
    admin: [true, true, true],
    writer: [true, true, false],
    reader: [true, false, false],
  };
  for (const [key, [read, write, admin]] of Object.entries(expected)) {
    const { body } = await command(baseUrl, ACCOUNTS[key], "status");
    const entry = body.entries[0];
    assert.deepEqual(
      [entry.permissions.can_read, entry.permissions.can_write, entry.permissions.can_admin],
      [read, write, admin],
      key,
    );
    assert.equal(entry.can_write, write, key);
    assert.equal(entry.can_manage, admin, key);
  }
});

test("admin sees and can use every control in the browser", async () => {
  const context = await openContext(state.browser, { who: "admin" });
  try {
    const page = await openApp(context, baseUrl);
    await page.locator('[data-action="nav"][data-value="manage"]').first().waitFor();
    await page.locator('[data-action="nav"][data-value="recipes"]').first().click();
    await sel(page, "create-form").first().waitFor();
    await page.locator(".recipe-tile").first().click();
    await sel(page, "edit-form").waitFor();
    await sel(page, "plan-form").first().waitFor();
    await sel(page, "recipe-to-list-form").waitFor();
    await sel(page, "close-modal").first().click();
    await page.locator('[data-action="nav"][data-value="shopping"]').first().click();
    await page.locator('input[name="note"]').waitFor();
    assert.equal(await page.locator('[data-action="shopping-toggle"][disabled]').count(), 0);
  } finally {
    await context.close();
  }
});

test("writer can change lists and plans but has no recipe administration", async () => {
  const context = await openContext(state.browser, { who: "writer" });
  try {
    const page = await openApp(context, baseUrl);
    assert.equal(await page.locator('[data-action="nav"][data-value="manage"]').count(), 0);
    await page.locator('[data-action="nav"][data-value="recipes"]').first().click();
    await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
    assert.equal(await sel(page, "create-form").count(), 0);
    await page.locator(".recipe-tile").first().click();
    await sel(page, "plan-form").first().waitFor();
    assert.equal(await sel(page, "edit-form").count(), 0);
    await sel(page, "close-modal").first().click();
    await page.locator('[data-action="nav"][data-value="shopping"]').first().click();
    await page.locator('input[name="note"]').waitFor();
    assert.ok(await sel(page, "shopping-delete").count());
  } finally {
    await context.close();
  }
});

test("reader can look and cook but sees every write control disabled or missing", async () => {
  const context = await openContext(state.browser, { who: "reader" });
  try {
    const page = await openApp(context, baseUrl);
    assert.equal(await page.locator('[data-action="nav"][data-value="manage"]').count(), 0);
    await page.locator('[data-action="nav"][data-value="shopping"]').first().click();
    await page.locator('[data-action="shopping-toggle"]').first().waitFor();
    assert.equal(await page.locator('input[name="note"]').count(), 0);
    assert.equal(await sel(page, "shopping-delete").count(), 0);
    assert.equal(await sel(page, "shopping-clear-form").count(), 0);
    assert.equal(await page.locator('[data-action="shopping-toggle"]:not([disabled])').count(), 0);
    await page.locator('[data-action="nav"][data-value="mealplan"]').first().click();
    await page.locator(".day-meal").first().waitFor();
    assert.equal(await sel(page, "plan-form").count(), 0);
    await page.locator('[data-action="nav"][data-value="recipes"]').first().click();
    await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
    assert.equal(await sel(page, "create-form").count(), 0);
    await page.locator(".recipe-tile").first().click();
    await sel(page, "cook-start").waitFor();
    assert.equal(await sel(page, "edit-form").count(), 0);
    assert.equal(await sel(page, "recipe-to-list-form").count(), 0);
  } finally {
    await context.close();
  }
});

test("HTTP: shopping writes are allowed for admin and writer, 403 write_not_permitted for reader", async () => {
  const list = await listId();
  const created = [];
  try {
    for (const key of ["admin", "writer"]) {
      const note = uniqueName(`role ${key}`);
      const result = await mutate(baseUrl, ACCOUNTS[key], "shopping_add", { list_id: list, note });
      assert.equal(result.status, 200, key);
      created.push(note);
    }
    const note = uniqueName("role reader");
    const denied = await mutate(baseUrl, ACCOUNTS.reader, "shopping_add", { list_id: list, note });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.code, "write_not_permitted");
    assert.ok(!(await shoppingItems()).some((item) => item.note === note));
  } finally {
    for (const item of await shoppingItems())
      if (created.includes(item.note))
        await mealie("DELETE", `/api/households/shopping/items/${item.id}`);
  }
});

test("HTTP: admin-only actions answer 403 unauthorized for a writer and write_not_permitted for a reader", async () => {
  const slug = (await recipeList())[0].slug;
  const attempts = [
    () => ["recipe_create", (a) => mutate(baseUrl, a, "recipe_create", { name: "Never created" })],
    () => [
      "recipe_update",
      (a) => mutate(baseUrl, a, "recipe_update", { slug, name: "Renamed by test" }),
    ],
    () => [
      "recipe_import",
      (a) => mutate(baseUrl, a, "recipe_import", { url: "https://example.invalid/r" }),
    ],
    () => ["nutrition_save", (a) => command(baseUrl, a, "nutrition_save", { slug })],
    () => [
      "recipe_restore",
      (a) => command(baseUrl, a, "recipe_restore", { slug, backup_id: "x" }),
    ],
    () => [
      "upload_begin",
      (a) => command(baseUrl, a, "upload_begin", { slug, size: 10, content_type: "image/png" }),
    ],
    () => ["recipe_image_delete", (a) => command(baseUrl, a, "recipe_image_delete", { slug })],
    () => [
      "family_member",
      (a) =>
        command(baseUrl, a, "studio_update", {
          action: "family_member",
          payload: { name: "Nobody" },
        }),
    ],
  ];
  for (const make of attempts) {
    const [name, run] = make();
    const writer = await run(ACCOUNTS.writer);
    assert.equal(writer.status, 403, `${name} writer`);
    assert.equal(writer.body.code, "unauthorized", `${name} writer`);
    const reader = await run(ACCOUNTS.reader);
    assert.equal(reader.status, 403, `${name} reader`);
    assert.equal(reader.body.code, "write_not_permitted", `${name} reader`);
  }
  assert.ok(
    (await recipeList()).every((r) => r.name !== "Never created" && r.name !== "Renamed by test"),
  );
  const family = await command(baseUrl, ACCOUNTS.admin, "studio_state");
  assert.ok(!family.body.family.members.some((m) => m.name === "Nobody"));
});

test("HTTP: admin can create and update a recipe that a writer cannot", async () => {
  const name = uniqueName("Rollen-Test");
  const created = await mutate(baseUrl, ACCOUNTS.admin, "recipe_create", { name });
  assert.equal(created.status, 200);
  const slug = created.body;
  try {
    const updated = await mutate(baseUrl, ACCOUNTS.admin, "recipe_update", { slug, servings: 7 });
    assert.equal(updated.status, 200);
    assert.equal((await mealie("GET", `/api/recipes/${slug}`)).recipeServings, 7);
  } finally {
    await mealie("DELETE", `/api/recipes/${slug}`);
  }
});

test("HTTP: shared state is writable by a writer, readable but not writable by a reader", async () => {
  const entry = { name: uniqueName("pantry"), amount: 1, unit: "g" };
  const writer = await command(baseUrl, ACCOUNTS.writer, "studio_update", {
    action: "pantry_put",
    payload: entry,
  });
  assert.equal(writer.status, 200);
  const id = writer.body.pantry.find((p) => p.name === entry.name).id;
  const reader = await command(baseUrl, ACCOUNTS.reader, "studio_update", {
    action: "pantry_put",
    payload: { ...entry, name: "reader pantry" },
  });
  assert.equal(reader.status, 403);
  assert.equal(reader.body.code, "write_not_permitted");
  assert.equal((await command(baseUrl, ACCOUNTS.reader, "studio_state")).status, 200);
  const cleanup = await command(baseUrl, ACCOUNTS.writer, "studio_update", {
    action: "pantry_delete",
    payload: { id },
  });
  assert.equal(cleanup.status, 200);
});

test("HTTP: a reader can read everything and the offline replay and sync commands follow the matrix", async () => {
  for (const name of [
    "recipes",
    "mealplan",
    "shopping",
    "metadata",
    "studio_state",
    "alarms",
    "alarm_capabilities",
  ]) {
    const response = await command(baseUrl, ACCOUNTS.reader, name, {
      start: "2026-01-01",
      end: "2026-01-07",
    });
    assert.equal(response.status, 200, name);
  }
  const replay = await command(baseUrl, ACCOUNTS.reader, "offline_replay", { operation: {} });
  assert.equal(replay.body.code, "write_not_permitted");
  // Shopping sync does not exist in the standalone app: allowed roles get 501, a reader still gets 403.
  const writerSync = await command(baseUrl, ACCOUNTS.writer, "sync_run");
  assert.equal(writerSync.status, 501);
  assert.equal(writerSync.body.code, "sync_not_supported");
  assert.equal((await command(baseUrl, ACCOUNTS.reader, "sync_run")).status, 403);
  assert.equal((await command(baseUrl, ACCOUNTS.admin, "sync_state")).status, 501);
});

test("HTTP: personal commands (timers, push registration) are open to a reader", async () => {
  const alarm = await command(baseUrl, ACCOUNTS.reader, "alarm_create", {
    timer: {
      id: "6f1c2f4e-8f55-4a53-9a0c-1d2f3a4b5c6d",
      label: "Pasta",
      deadline: Date.now() + 60000,
    },
  });
  // Not a 403: the reader passes the role check. Without a notification destination the app says so.
  assert.equal(alarm.status, 409);
  assert.equal(alarm.body.code, "no_notification_destination");
  const push = await command(baseUrl, ACCOUNTS.reader, "push_register", { subscription: {} });
  assert.equal(push.status, 503);
});
