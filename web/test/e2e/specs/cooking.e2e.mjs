// Cooking mode: every step, back and forth, kitchen timers and the finishing dialog.
import { test, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, ACCOUNTS } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, gotoView, endCookingSession } from "../lib/browser.mjs";
import { eventually } from "../lib/mealie.mjs";

const state = browserSuite();
// Starting to cook opens a household-wide session; later tests must not meet a replace dialog.
before(() => endCookingSession(baseUrl, ACCOUNTS.admin));
afterEach(() => endCookingSession(baseUrl, ACCOUNTS.admin));
const sel = (page, action) => page.locator(`[data-action="${action}"]`);
const modalText = (page) =>
  page.evaluate(
    () =>
      document.querySelector("mealie-atelier-card").shadowRoot.querySelector(".modal").innerText,
  );

async function startCooking(page, recipe, viewLabel, tileHeading) {
  await gotoView(page, viewLabel);
  await page.locator("h1", { hasText: tileHeading }).waitFor();
  await page.locator(".recipe-tile", { hasText: recipe }).click();
  await sel(page, "cook-start").click();
}

test("cooking mode walks through every step, back and forth, and finishes", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await startCooking(page, "Zitronen-Nudeln", "Rezepte", "Deine Rezeptsammlung");
    await page.getByText("01 / 03").waitFor();
    assert.match(await modalText(page), /Spaghetti in Salzwasser 10 Minuten kochen/);
    assert.equal(await sel(page, "cook-back").isDisabled(), true);
    await sel(page, "cook-next").click();
    await page.getByText("02 / 03").waitFor();
    assert.match(await modalText(page), /Zitronensaft mit Parmesan verrühren/);
    await sel(page, "cook-next").click();
    await page.getByText("03 / 03").waitFor();
    assert.match(await modalText(page), /Nudeln mit der Sauce vermengen/);
    assert.equal(
      await sel(page, "cook-next").count(),
      0,
      "the last step offers Fertig, not Weiter",
    );
    await sel(page, "cook-back").click();
    await page.getByText("02 / 03").waitFor();
    await sel(page, "cook-next").click();
    await sel(page, "cook-finish").click();
    await page.getByText("03 / 03").waitFor({ state: "detached" });
    assert.deepEqual(page.problems, []);
  } finally {
    await context.close();
  }
});

test("a kitchen timer survives step changes, counts down, expires and can be removed", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl, { clock: true });
    await startCooking(page, "Tomatensuppe", "Rezepte", "Deine Rezeptsammlung");
    await page.getByText("Noch kein Timer läuft").waitFor();
    await sel(page, "timer-preset").first().click();
    await sel(page, "timer-start").click();
    await page.getByText("1 aktiv").waitFor();
    await page.getByText("LÄUFT", { exact: true }).waitFor();
    await page.getByText("5 Minuten · Schritt 1").waitFor();
    // Without Home Assistant or Web Push the timer only runs in this browser, and the toast says so.
    await page.locator(".toast", { hasText: "Hintergrundtimer" }).waitFor();
    await sel(page, "cook-next").click();
    await page.getByText("02 / 02").waitFor();
    await page.getByText("1 aktiv").waitFor();
    await page.clock.fastForward("04:30");
    await page
      .getByText(/00:[0-3]\d/)
      .first()
      .waitFor();
    await page.clock.fastForward("01:00");
    await page.getByText("FERTIG", { exact: true }).waitFor();
    await page.getByText("0 aktiv").waitFor();
    await sel(page, "timer-remove").first().click();
    await page.getByText("FERTIG", { exact: true }).waitFor({ state: "detached" });
  } finally {
    await context.close();
  }
});

test("a custom timer with its own minutes and label is created", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await startCooking(page, "Haferflocken-Bowl", "Rezepte", "Deine Rezeptsammlung");
    // The modal re-renders while the session loads, so fill again until the values stick.
    await eventually(
      async () => {
        await page.locator('.modal input[type="number"]').fill("7");
        await page.locator('.modal input[type="text"]').fill("Brei rühren");
        return (
          (await page.locator('.modal input[type="number"]').inputValue()) === "7" &&
          (await page.locator('.modal input[type="text"]').inputValue()) === "Brei rühren"
        );
      },
      { label: "timer form filled" },
    );
    await sel(page, "timer-start").click();
    await page.getByText("Brei rühren").first().waitFor();
    await page.getByText("07:00").or(page.getByText("06:59")).first().waitFor();
    await sel(page, "timer-remove").first().click();
  } finally {
    await context.close();
  }
});

test("a running timer is still there after a page reload", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await startCooking(page, "Tomatensuppe", "Rezepte", "Deine Rezeptsammlung");
    await sel(page, "timer-preset").nth(1).click();
    await sel(page, "timer-start").click();
    await page.getByText("1 aktiv").waitFor();
    await page.reload();
    await page.locator(".recipe-tile").first().waitFor();
    await gotoView(page, "Rezepte");
    await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
    await page.locator(".recipe-tile", { hasText: "Tomatensuppe" }).click();
    await sel(page, "cook-start").click();
    await page.getByText("1 aktiv").waitFor();
    await sel(page, "timer-remove").first().click();
  } finally {
    await context.close();
  }
});

test("cooking mode speaks English in an English browser", async () => {
  const context = await openContext(state.browser, { locale: "en-US" });
  try {
    const page = await openApp(context, baseUrl);
    await startCooking(page, "Tomatensuppe", "Recipes", "Your recipe collection");
    await page.getByText("COOKING MODE").waitFor();
    assert.match(await modalText(page), /Start timer/i);
    assert.equal((await sel(page, "cook-next").textContent()).trim(), "Next");
    await sel(page, "cook-next").click();
    assert.equal((await sel(page, "cook-finish").textContent()).trim(), "Done");
  } finally {
    await context.close();
  }
});
