// Shopping list through the UI; every change is verified in Mealie through its own API.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { baseUrl } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, gotoView, settle } from "../lib/browser.mjs";
import { mealie, shoppingItems, uniqueName, eventually } from "../lib/mealie.mjs";

const state = browserSuite();
const sel = (page, action) => page.locator(`[data-action="${action}"]`);
const findItem = async (note) => (await shoppingItems()).find((item) => item.note === note);

// Items of these tests live on a list of their own, so the seeded list stays untouched.
const listName = uniqueName("Test-Einkauf");
let listId;
after(async () => {
  if (listId) await mealie("DELETE", `/api/households/shopping/lists/${listId}`).catch(() => {});
});

async function openShopping(context) {
  const page = await openApp(context, baseUrl);
  await gotoView(page, "Einkaufsliste");
  await page.locator("h1", { hasText: "Alles für den Einkauf" }).waitFor();
  return page;
}

test("a new list can be created in the UI and appears in Mealie", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    await sel(page, "create-list-form").click();
    await settle(page);
    await page.locator('input[name="name"]').fill(listName);
    await page.locator('input[name="name"]').press("Enter");
    const list = await eventually(
      async () =>
        (await mealie("GET", "/api/households/shopping/lists")).items.find(
          (l) => l.name === listName,
        ),
      { label: "new shopping list" },
    );
    listId = list.id;
    await page.locator("select").first().selectOption({ label: listName });
  } finally {
    await context.close();
  }
});

test("add, check, edit, uncheck and remove an item; Mealie follows each step", async () => {
  assert.ok(listId, "the list test must run first");
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    await page.locator("select").first().selectOption({ label: listName });
    await settle(page);
    const note = uniqueName("Rosinen");
    await page.locator('input[name="note"]').fill(note);
    await page.locator('form[data-form="shopping-add"] button[type="submit"]').click();
    const added = await eventually(() => findItem(note), { label: "added item" });
    assert.equal(added.checked, false);
    assert.equal(added.shoppingListId, listId);

    await settle(page);
    await sel(page, "shopping-toggle")
      .and(page.locator(`[aria-label$="${note}"]`))
      .click();
    await eventually(async () => (await findItem(note))?.checked === true, {
      label: "checked item",
    });

    await settle(page);
    await page.locator(`[data-action="shopping-edit-form"][aria-label$="${note}"]`).click();
    const renamed = `${note} Bio`;
    await settle(page);
    await page.locator('.modal input[name="name"]').fill(renamed);
    await page.locator('.modal input[name="quantity"]').fill("3");
    assert.equal(await page.locator('.modal input[name="name"]').inputValue(), renamed);
    await page.locator('.modal input[name="quantity"]').press("Enter");
    const edited = await eventually(() => findItem(renamed), { label: "renamed item" });
    assert.equal(edited.quantity, 3);
    assert.equal(await findItem(note), undefined);

    await settle(page);
    await sel(page, "shopping-toggle")
      .and(page.locator(`[aria-label$="${renamed}"]`))
      .click();
    await eventually(async () => (await findItem(renamed))?.checked === false, {
      label: "unchecked item",
    });

    await settle(page);
    await page.locator(`[data-action="shopping-delete"][aria-label$="${renamed}"]`).click();
    await eventually(async () => !(await findItem(renamed)), { label: "deleted item" });
    assert.deepEqual(page.problems, []);
  } finally {
    await context.close();
  }
});

test("clearing checked items removes only the checked ones of the chosen list", async () => {
  assert.ok(listId, "the list test must run first");
  const keep = uniqueName("Bleibt");
  const gone = uniqueName("Geht");
  for (const [note, checked] of [
    [keep, false],
    [gone, true],
  ])
    await mealie("POST", "/api/households/shopping/items", {
      shoppingListId: listId,
      note,
      quantity: 0,
      checked,
    });
  const seededChecked = (await shoppingItems()).filter(
    (i) => i.checked && i.shoppingListId !== listId,
  ).length;
  const context = await openContext(state.browser);
  try {
    const page = await openShopping(context);
    await page.locator("select").first().selectOption({ label: listName });
    await page.locator(`[aria-label$="${gone}"]`).first().waitFor();
    await settle(page);
    await sel(page, "shopping-clear-form").click();
    await sel(page, "shopping-clear-confirm").click();
    await eventually(async () => !(await findItem(gone)), { label: "cleared item" });
    assert.ok(await findItem(keep));
    assert.equal(
      (await shoppingItems()).filter((i) => i.checked && i.shoppingListId !== listId).length,
      seededChecked,
    );
  } finally {
    await context.close();
  }
});

test("ingredients of a recipe can be added to the list from the recipe dialog", async () => {
  assert.ok(listId, "the list test must run first");
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Rezepte");
    await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
    await page.locator(".recipe-tile", { hasText: "Zitronen-Nudeln" }).click();
    await settle(page);
    await sel(page, "recipe-to-list-form").click();
    await settle(page);
    await page.locator('.modal select[name="list_id"]').selectOption({ label: listName });
    await page.locator('.modal button[type="submit"]').click();
    const items = await eventually(
      async () => {
        const found = (await shoppingItems()).filter((i) => i.shoppingListId === listId);
        return found.length >= 3 ? found : null;
      },
      { label: "recipe ingredients on the list" },
    );
    const text = items.map((i) => `${i.note} ${i.display}`).join(" ");
    assert.match(text, /Spaghetti/);
    assert.match(text, /Parmesan/);
  } finally {
    await context.close();
  }
});

test("the German and English UI use their own words for the list", async () => {
  for (const [locale, heading, placeholder] of [
    ["de-DE", "Alles für den Einkauf", "Artikel hinzufügen"],
    ["en-US", "Shopping list", "Add an item"],
  ]) {
    const context = await openContext(state.browser, { locale });
    try {
      const page = await openApp(context, baseUrl);
      await page.locator('[data-action="nav"][data-value="shopping"]').first().click();
      await page.locator("h1", { hasText: heading }).waitFor();
      assert.equal(
        await page.locator('input[name="note"]').getAttribute("placeholder"),
        placeholder,
      );
    } finally {
      await context.close();
    }
  }
});
