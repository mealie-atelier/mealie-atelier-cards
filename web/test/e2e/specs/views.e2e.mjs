// Every view of the card in German and English on phone, tablet and desktop viewports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, VIEWPORTS } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, settle } from "../lib/browser.mjs";

const state = browserSuite();

// view id -> [German label, German heading, English label, English heading]
const VIEWS = {
  dashboard: ["Übersicht", "Gutes Essen. Jeden Tag.", "Overview", "Good food. Every day."],
  today: ["Heute", "Deine Küche heute.", "Today", "Your kitchen today."],
  discover: ["Kochinspo", "Was kochen wir heute?", "Discover", "What should we cook today?"],
  recipes: ["Rezepte", "Deine Rezeptsammlung", "Recipes", "Your recipe collection"],
  mealplan: ["Wochenplan", "Die Woche im Blick", "Meal plan", "Your week at a glance"],
  pantry: ["Vorräte", "Vorräte & Einkauf", "Pantry", "Pantry & shopping"],
  shopping: ["Einkaufsliste", "Alles für den Einkauf", "Shopping", "Shopping list"],
  family: ["Gemeinsam kochen", "Gemeinsam kochen", "Cook together", "Cook together"],
  cookbook: ["Kochbuch", "Dein eigenes Kochbuch", "Cookbook", "Your own cookbook"],
  manage: ["Verwalten", "Rezeptverwaltung", "Manage", "Manage recipes"],
};

for (const viewport of Object.keys(VIEWPORTS))
  for (const locale of ["de-DE", "en-US"])
    test(`all views render in ${locale} on a ${viewport} viewport`, async () => {
      const de = locale === "de-DE";
      const context = await openContext(state.browser, { locale, viewport });
      try {
        const page = await openApp(context, baseUrl);
        await page.locator(".recipe-tile").first().waitFor();
        assert.equal(await page.locator("html").getAttribute("lang"), de ? "de" : "en");
        for (const [id, [deLabel, deHeading, enLabel, enHeading]] of Object.entries(VIEWS)) {
          const label = de ? deLabel : enLabel;
          const heading = de ? deHeading : enHeading;
          const button = page.locator(`[data-action="nav"][data-value="${id}"]`).first();
          assert.equal((await button.textContent()).trim(), label, `${id} label`);
          await button.click();
          await page.locator("h1", { hasText: heading }).first().waitFor({ timeout: 8000 });
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          assert.ok(overflow <= 1, `${id} overflows the ${viewport} viewport by ${overflow}px`);
        }
        assert.deepEqual(page.problems, []);
      } finally {
        await context.close();
      }
    });

test("views show the seeded Mealie data", async () => {
  const context = await openContext(state.browser, { locale: "de-DE" });
  try {
    const page = await openApp(context, baseUrl);
    const view = (id) => page.locator(`[data-action="nav"][data-value="${id}"]`).first().click();
    await page.locator(".recipe-tile").first().waitFor();
    for (const name of ["Zitronen-Nudeln", "Pfannen-Eier mit Tomaten", "Haferflocken-Bowl"])
      assert.ok(await page.locator(".recipe-tile", { hasText: name }).count(), `dashboard ${name}`);
    await view("today");
    await page.getByText("Pfannen-Eier mit Tomaten").first().waitFor();
    await view("recipes");
    await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
    await page.locator(".recipe-tile", { hasText: "Tomatensuppe" }).waitFor();
    await view("mealplan");
    await page.locator(".day-meal", { hasText: "Zitronen-Nudeln" }).waitFor();
    await view("shopping");
    await page.locator('[data-action="shopping-toggle"][aria-label$="Parmesan"]').waitFor();
    assert.ok(await page.locator('[aria-label="Als offen markieren: Haferflocken"]').count());
  } finally {
    await context.close();
  }
});

test("recipe search narrows the list and an empty search shows everything again", async () => {
  const context = await openContext(state.browser, { locale: "de-DE" });
  try {
    const page = await openApp(context, baseUrl);
    await page.locator(".recipe-tile").first().waitFor();
    await page.locator('[data-action="nav"][data-value="recipes"]').first().click();
    await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
    const search = page.locator('input[type="search"]');
    await search.fill("Nudeln");
    await page.waitForFunction(
      () =>
        document.querySelector("mealie-atelier-card").shadowRoot.querySelectorAll(".recipe-tile")
          .length === 1,
    );
    assert.equal(await page.locator(".recipe-tile").count(), 1);
    await search.fill("");
    await page.waitForFunction(
      () =>
        document.querySelector("mealie-atelier-card").shadowRoot.querySelectorAll(".recipe-tile")
          .length >= 4,
    );
  } finally {
    await context.close();
  }
});

test("the shopping sync button explains that sync needs Home Assistant", async () => {
  const context = await openContext(state.browser, { locale: "en-US" });
  try {
    const page = await openApp(context, baseUrl);
    await page.locator('[data-action="nav"][data-value="shopping"]').first().click();
    await page.locator('[data-action="sync-open"]').click();
    await page.locator("dialog, .modal").first().waitFor();
    assert.match(await page.locator(".modal, dialog").first().innerText(), /Home Assistant/);
  } finally {
    await context.close();
  }
});

test("the language and theme follow the browser, and the design studio changes and remembers them", async () => {
  const context = await openContext(state.browser, { locale: "en-US", colorScheme: "light" });
  try {
    const page = await openApp(context, baseUrl);
    assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
    // The shell follows the card's resolved language, which settles right after the first render.
    await page.waitForFunction(() => document.title === "Mealie Atelier · Your kitchen studio");
    await page.locator('[data-action="settings"]').first().click();
    const modal = page.locator(".modal").first();
    await modal.waitFor();
    assert.match(await modal.innerText(), /Design Studio[\s\S]*Appearance[\s\S]*Accent color/);
    await settle(page);
    await modal.locator('[data-action="design"][data-value="dark"]').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
    await modal.locator("select[data-input=language]").selectOption("de");
    await page.waitForFunction(() => document.title === "Mealie Atelier · Dein Küchenstudio");
    // The choice is stored on this device and survives a reload.
    await page.reload();
    await page.locator(".recipe-tile").first().waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    assert.equal(await page.locator("html").getAttribute("lang"), "de");
    await page.locator('[data-action="settings"]').first().click();
    await page.locator('[data-action="reset-design"]').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
  } finally {
    await context.close();
  }
});
