// Meal plan through the UI; changes are verified in Mealie.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, ACCOUNTS } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, gotoView, mutate } from "../lib/browser.mjs";
import { mealie, mealPlans, recipeList, eventually } from "../lib/mealie.mjs";

const state = browserSuite();
const sel = (page, action) => page.locator(`[data-action="${action}"]`);
const ymd = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
const created = [];
after(async () => {
  for (const id of created)
    await mealie("DELETE", `/api/households/mealplans/${id}`).catch(() => {});
});

test("a dish is planned through the picker and shows up in Mealie and in the week", async () => {
  const date = ymd(2);
  const recipes = await recipeList();
  const nudeln = recipes.find((r) => r.name === "Zitronen-Nudeln");
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Wochenplan");
    await sel(page, "plan-form").first().click();
    await page.locator('.modal input[name="date"]').fill(date);
    await page.locator('.modal select[name="meal_type"]').selectOption("lunch");
    await page.locator(".combobox-input").fill("Nudeln");
    await sel(page, "picker-pick").first().click();
    await page.locator('[data-picker="submit"]').click();
    const entry = await eventually(
      async () => (await mealPlans()).find((p) => p.date === date && p.entryType === "lunch"),
      { label: "plan entry in Mealie" },
    );
    created.push(entry.id);
    assert.equal(entry.recipeId, nudeln.id);
    assert.deepEqual(page.problems, []);
  } finally {
    await context.close();
  }
});

test("the week view moves forward and back and a planned dish opens", async () => {
  const entry = await mealie("POST", "/api/households/mealplans", {
    date: ymd(9),
    entryType: "dinner",
    recipeId: (await recipeList()).find((r) => r.name === "Tomatensuppe").id,
  });
  created.push(entry.id);
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Wochenplan");
    const soup = page.locator(".day-meal", { hasText: "Tomatensuppe" });
    for (let weeks = 0; weeks < 3 && !(await soup.count()); weeks += 1) {
      await sel(page, "week-next").click();
      await page.waitForTimeout(700);
    }
    await soup.first().waitFor();
    await sel(page, "week-today").click();
    await page.locator(".day-meal", { hasText: "Zitronen-Nudeln" }).first().waitFor();
    await sel(page, "week-prev").click();
    await page.waitForTimeout(700);
    await sel(page, "week-today").click();
    await page.locator(".day-meal", { hasText: "Zitronen-Nudeln" }).first().waitFor();
    // The day dialog of a planned dish opens and closes again.
    await page.waitForTimeout(700);
    await page.locator(".day-meal", { hasText: "Zitronen-Nudeln" }).first().click();
    await page.locator(".modal").first().waitFor();
    await sel(page, "close-modal").first().click();
  } finally {
    await context.close();
  }
});

test("HTTP: plan writes validate the date and the meal type and a reader cannot plan", async () => {
  const recipe = (await recipeList())[0];
  const bad = await mutate(baseUrl, ACCOUNTS.writer, "mealplan_add", {
    date: "2026-02-30",
    recipe_id: recipe.id,
  });
  assert.equal(bad.status, 400);
  const type = await mutate(baseUrl, ACCOUNTS.writer, "mealplan_add", {
    date: ymd(3),
    meal_type: "brunch",
    recipe_id: recipe.id,
  });
  assert.equal(type.status, 400);
  const denied = await mutate(baseUrl, ACCOUNTS.reader, "mealplan_add", {
    date: ymd(3),
    recipe_id: recipe.id,
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, "write_not_permitted");
  const ok = await mutate(baseUrl, ACCOUNTS.writer, "mealplan_add", {
    date: ymd(4),
    recipe_id: recipe.id,
  });
  assert.equal(ok.status, 200);
  created.push(ok.body.id);
  const removed = await mutate(baseUrl, ACCOUNTS.writer, "mealplan_delete", {
    entry_id: String(ok.body.id),
  });
  assert.equal(removed.status, 200);
  assert.ok(!(await mealPlans()).some((p) => p.id === ok.body.id));
});

test("a planned dish is removed through the plan dialog and disappears from Mealie", async () => {
  // Day +6 carries no seeded dish, so the dialog lists exactly the entry created here.
  const date = ymd(6);
  const entry = await mealie("POST", "/api/households/mealplans", {
    date,
    entryType: "snack",
    recipeId: (await recipeList()).find((r) => r.name === "Haferflocken-Bowl").id,
  });
  created.push(entry.id);
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Wochenplan");
    const add = page.locator(`[data-action="plan-form"][data-value="${date}"]`);
    for (let weeks = 0; weeks < 3 && !(await add.count()); weeks += 1) {
      await sel(page, "week-next").click();
      await page.waitForTimeout(700);
    }
    await add.first().click();
    await sel(page, "remove-meal").first().click();
    await eventually(async () => !(await mealPlans()).some((p) => p.id === entry.id), {
      label: "plan entry removed in Mealie",
    });
  } finally {
    await context.close();
  }
});
