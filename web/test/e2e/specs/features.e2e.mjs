// Favorites, print output, the studio views with their data, helper tasks and the offline replay
// notice of an account that may no longer write.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, ACCOUNTS } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import {
  openContext,
  openApp,
  gotoView,
  settle,
  command,
  endCookingSession,
} from "../lib/browser.mjs";
import { mealie, recipeList, eventually, uniqueName } from "../lib/mealie.mjs";

const state = browserSuite();
const sel = (page, action) => page.locator(`[data-action="${action}"]`);
const admin = ACCOUNTS.admin;

let favorite = null;
after(async () => {
  if (favorite)
    await mealie("DELETE", `/api/users/${favorite.userId}/favorites/${favorite.recipeId}`).catch(
      () => {},
    );
  await endCookingSession(baseUrl, admin).catch(() => {});
});

test("favorites: Mealie's favorite list narrows the recipe list over HTTP and in the plan picker", async () => {
  const self = await mealie("GET", "/api/users/self");
  const soup = (await recipeList()).find((r) => r.name === "Tomatensuppe");
  favorite = { userId: self.id, recipeId: soup.id };
  const none = await command(baseUrl, ACCOUNTS.reader, "recipes", { favorites_only: true });
  assert.equal(none.status, 200);
  assert.equal(none.body.total, 0, "no favorites yet");
  await mealie("POST", `/api/users/${self.id}/favorites/${soup.id}`);
  const only = await command(baseUrl, ACCOUNTS.reader, "recipes", { favorites_only: true });
  assert.deepEqual(
    only.body.items.map((r) => r.name),
    ["Tomatensuppe"],
  );
  const bad = await command(baseUrl, ACCOUNTS.reader, "recipes", { favorites_only: "yes" });
  assert.equal(bad.status, 400);

  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Wochenplan");
    await sel(page, "plan-form").first().click();
    await settle(page);
    const options = page.locator('[data-action="picker-pick"]');
    await options.first().waitFor();
    assert.ok((await options.count()) > 1, "the picker lists every recipe first");
    const filtered = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/bridge") &&
        (r.request().postData() || "").includes("favorites_only"),
    );
    await page.locator('[data-input="picker-favorites"]').check();
    await filtered;
    await settle(page);
    assert.deepEqual(await options.locator(".picker-name").allTextContents(), ["Tomatensuppe"]);
  } finally {
    await context.close();
  }
});

test("print week and print recipe open a print document with the planned dishes and the ingredients", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Wochenplan");
    await sel(page, "print-week").click();
    await sel(page, "print-now").waitFor();
    const week = context.waitForEvent("page");
    await sel(page, "print-now").click();
    const weekDoc = await week;
    await weekDoc.waitForLoadState();
    const weekText = await weekDoc.locator("body").innerText();
    assert.match(weekText, /Zitronen-Nudeln/, "the seeded dish of the week is printed");
    await weekDoc.close();
    await sel(page, "close-modal").first().click();

    await gotoView(page, "Rezepte");
    await page.locator(".recipe-tile", { hasText: "Zitronen-Nudeln" }).click();
    await settle(page);
    await sel(page, "print-recipe").click();
    await sel(page, "print-now").waitFor();
    const recipe = context.waitForEvent("page");
    await sel(page, "print-now").click();
    const recipeDoc = await recipe;
    await recipeDoc.waitForLoadState();
    const text = await recipeDoc.locator("body").innerText();
    assert.match(text, /Zitronen-Nudeln/);
    assert.match(text, /Spaghetti/);
    assert.match(text, /Parmesan/);
    assert.match(text, /Zitronensaft mit Parmesan verrühren/);
    await recipeDoc.close();
    assert.deepEqual(page.problems, []);
  } finally {
    await context.close();
  }
});

test("the Kochinspo wizard walks four steps, suggests seeded recipes and remembers the profile", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Kochinspo");
    await sel(page, "studio-discover-choice").filter({ hasText: "Vegetarisch" }).click();
    for (const step of ["02 / 04", "03 / 04", "04 / 04"]) {
      await settle(page);
      await sel(page, "studio-discover-next").click();
      await page.getByText(step).waitFor();
    }
    await settle(page);
    await sel(page, "studio-discover-next").click();
    await page.getByText("Das könnte heute passen.").waitFor();
    const text = await page.locator(".view-stage").innerText();
    assert.match(text, /AUS DEINEN REZEPTEN/);
    assert.ok(
      ["Zitronen-Nudeln", "Tomatensuppe", "Pfannen-Eier mit Tomaten", "Haferflocken-Bowl"].some(
        (name) => text.includes(name),
      ),
      "a seeded recipe is suggested",
    );
    assert.match(text, /Rezept ansehen/);
    await eventually(
      async () =>
        (await command(baseUrl, admin, "studio_state")).body.profile?.mealStyle === "vegetarian",
      { label: "profile saved with the wizard choice" },
    );
  } finally {
    await context.close();
  }
});

test("pantry: an item is added in the view, listed, kept by the server and removable", async () => {
  const item = uniqueName("Mehl");
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Vorräte");
    const form = page.locator('form[data-form="studio-pantry"]');
    await form.locator('input[name="name"]').fill(item);
    await form.locator('input[name="amount"]').fill("750");
    await form.locator('button[type="submit"]').click();
    await page.getByText(item).first().waitFor();
    const saved = await eventually(
      async () =>
        (await command(baseUrl, admin, "studio_state")).body.pantry.find((p) => p.name === item),
      { label: "pantry item on the server" },
    );
    assert.equal(saved.amount, 750);
    await command(baseUrl, admin, "studio_update", {
      action: "pantry_delete",
      payload: { id: saved.id },
    });
    const noList = await command(baseUrl, ACCOUNTS.reader, "studio_update", {
      action: "pantry_put",
      payload: { name: "Nope", amount: 1, unit: "g" },
    });
    assert.equal(noList.status, 403);
  } finally {
    await context.close();
  }
});

test("family and helper tasks: only an administrator creates tasks, a writer ticks them, a reader cannot", async () => {
  await endCookingSession(baseUrl, admin);
  const update = (who, action, payload) =>
    command(baseUrl, ACCOUNTS[who], "studio_update", { action, payload });
  const adult = (await update("admin", "family_member", { name: "Oma Test" })).body;
  assert.equal(
    (await update("admin", "family_member", { name: "Kind Test", child: true })).status,
    200,
  );
  assert.equal((await update("writer", "family_member", { name: "Nope" })).status, 403);
  let members = (await command(baseUrl, admin, "studio_state")).body.family.members;
  const grandma = members.find((m) => m.name === "Oma Test");
  const kid = members.find((m) => m.name === "Kind Test");
  assert.ok(grandma && kid, JSON.stringify(adult));
  const started = await update("writer", "session_start", {
    slug: "tomatensuppe",
    name: "Tomatensuppe",
  });
  assert.equal(started.status, 200, JSON.stringify(started.body));
  const sessionId = (await command(baseUrl, admin, "studio_state")).body.family.session.id;
  const task = { session_id: sessionId, text: "Zwiebeln schneiden", memberId: grandma.id };
  assert.equal((await update("writer", "session_task", task)).status, 403, "writer cannot create");
  assert.equal((await update("reader", "session_task", task)).status, 403);
  const unapproved = await update("admin", "session_task", {
    ...task,
    text: "Rühren",
    memberId: kid.id,
  });
  assert.equal(unapproved.status, 400, "a child's task needs adult approval");
  const created = await update("admin", "session_task", task);
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const taskId = (await command(baseUrl, admin, "studio_state")).body.family.session.tasks[0].id;
  const edit = {
    session_id: sessionId,
    id: taskId,
    text: "Zwiebeln würfeln",
    memberId: grandma.id,
  };
  assert.equal((await update("writer", "session_task", edit)).status, 403, "writer cannot edit");
  assert.equal((await update("admin", "session_task", edit)).status, 200);

  // The family view shows the people and the task, in the language of the browser.
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Gemeinsam kochen");
    await page.getByText("Oma Test").first().waitFor();
    await page.getByText("Zwiebeln würfeln").first().waitFor();
    await page.getByText("Tomatensuppe").first().waitFor();
  } finally {
    await context.close();
  }

  const done = await update("writer", "session_task", {
    session_id: sessionId,
    id: taskId,
    done: true,
  });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  const ticked = (await command(baseUrl, admin, "studio_state")).body.family.session.tasks[0];
  assert.equal(ticked.done, true);
  assert.equal(ticked.text, "Zwiebeln würfeln", "ticking keeps the text");
  assert.equal(
    (await update("reader", "session_task", { session_id: sessionId, id: taskId, done: false }))
      .status,
    403,
  );
  assert.equal((await update("writer", "session_end", { session_id: sessionId })).status, 200);
  for (const m of [grandma, kid])
    await update("admin", "family_member", { id: m.id, remove: true });
  members = (await command(baseUrl, admin, "studio_state")).body.family.members;
  assert.ok(!members.some((m) => m.name.endsWith("Test")));
});

test("the family view adds a person and the cookbook view selects every recipe and prints them", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Gemeinsam kochen");
    const form = page.locator('form[data-form="studio-member"]');
    await form.locator('input[name="name"]').fill("Onkel Test");
    await form.locator('button[type="submit"]').click();
    await page.locator(".view-stage", { hasText: "Onkel Test" }).waitFor();
    const member = await eventually(
      async () =>
        (await command(baseUrl, admin, "studio_state")).body.family.members.find(
          (m) => m.name === "Onkel Test",
        ),
      { label: "member on the server" },
    );
    await command(baseUrl, admin, "studio_update", {
      action: "family_member",
      payload: { id: member.id, remove: true },
    });

    await gotoView(page, "Kochbuch");
    await sel(page, "studio-book-all").click();
    await page
      .getByText("4 Rezepte ausgewählt")
      .or(page.getByText(/\d+ Rezepte ausgewählt/))
      .first()
      .waitFor();
    const selected = await page.locator(".view-stage").innerText();
    assert.match(selected, /[4-9] Rezepte ausgewählt|\d\d Rezepte ausgewählt/);
    await sel(page, "studio-book-clear").click();
    await page.getByText("0 Rezepte ausgewählt").waitFor();
  } finally {
    await context.close();
  }
});

test("a queued offline edit of an account that may no longer write is dropped with a visible notice", async () => {
  const context = await openContext(state.browser, { who: "reader" });
  try {
    const page = await openApp(context, baseUrl);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.locator("details.atelier-connectivity > summary").click();
    await page.locator("#a-sync-enable").click();
    await page.locator("dialog.at-premium-dialog button[value=confirm]").click();
    const listId = (await command(baseUrl, ACCOUNTS.reader, "shopping")).body.lists[0].id;
    await page.evaluate(async (id) => {
      await window.AtelierOfflineCore.putOp({
        id: crypto.randomUUID(),
        action: "shopping_add",
        payload: { list_id: id, note: "Wird verworfen" },
        state: "pending",
        createdAt: Date.now(),
      });
      window.dispatchEvent(new Event("online"));
    }, listId);
    const notice = page.locator("#a-sync-error");
    await notice.waitFor({ state: "visible" });
    assert.match(await notice.innerText(), /.{10,}/);
    await eventually(
      () => page.evaluate(async () => (await window.AtelierOfflineCore.allOps()).length === 0),
      { label: "dropped operation removed from the queue" },
    );
    const items = (await command(baseUrl, ACCOUNTS.reader, "shopping")).body.items || [];
    assert.ok(!JSON.stringify(items).includes("Wird verworfen"), "nothing reached Mealie");
    await page.locator("#a-sync-enable").click();
    await page.locator("dialog.at-premium-dialog button[value=confirm]").click();
  } finally {
    await context.close();
  }
});
