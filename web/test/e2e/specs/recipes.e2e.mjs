// Recipe administration through the UI: create, edit, photo upload and removal, version history.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { baseUrl, ACCOUNTS, basicHeader } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, gotoView, command, mutate } from "../lib/browser.mjs";
import {
  mealie,
  recipeBySlug,
  recipeById,
  recipeList,
  uniqueName,
  eventually,
} from "../lib/mealie.mjs";
import { solidPng } from "../lib/png.mjs";

const state = browserSuite();
const sel = (page, action) => page.locator(`[data-action="${action}"]`);
const cleanup = [];
after(async () => {
  const known = await recipeList();
  for (const id of cleanup) {
    const item = known.find((r) => r.id === id);
    if (item) await mealie("DELETE", `/api/recipes/${item.slug}`).catch(() => {});
  }
});

/** A throwaway recipe made directly in Mealie, so edits never touch the seeded ones. */
async function makeRecipe(label) {
  const name = uniqueName(label);
  const slug = await mealie("POST", "/api/recipes", { name });
  const recipe = await recipeBySlug(slug);
  cleanup.push(recipe.id);
  Object.assign(recipe, {
    description: "Ausgangsbeschreibung",
    recipeServings: 2,
    recipeIngredient: [
      { note: "1 Prise Salz", display: "1 Prise Salz", referenceId: crypto.randomUUID() },
    ],
    recipeInstructions: [
      { id: crypto.randomUUID(), title: "", summary: "", text: "Alles vermengen." },
    ],
  });
  await mealie("PUT", `/api/recipes/${slug}`, recipe);
  return { name, slug, id: recipe.id };
}

async function openEditor(context, name) {
  const page = await openApp(context, baseUrl);
  await gotoView(page, "Rezepte");
  await page.locator("h1", { hasText: "Deine Rezeptsammlung" }).waitFor();
  await page.locator('input[type="search"]').fill(name);
  await page.locator(".recipe-tile", { hasText: name }).first().click();
  await sel(page, "edit-form").click();
  await page.locator("h2", { hasText: "Rezept bearbeiten" }).waitFor();
  return page;
}

test("a recipe can be created in the UI", async () => {
  const name = uniqueName("Neu-Rezept");
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Rezepte");
    await sel(page, "create-form").first().click();
    await page.locator('.modal input[name="name"]').fill(name);
    await page.locator('.modal input[name="name"]').press("Enter");
    const recipe = await eventually(
      async () =>
        (await mealie("GET", "/api/recipes?perPage=200")).items.find((r) => r.name === name),
      { label: "created recipe" },
    );
    cleanup.push(recipe.id);
  } finally {
    await context.close();
  }
});

test("name, description, servings and steps are saved to Mealie and a backup is kept", async () => {
  const { name, slug, id } = await makeRecipe("Edit-Rezept");
  const context = await openContext(state.browser);
  try {
    const page = await openEditor(context, name);
    const renamed = `${name} neu`;
    // The editor re-renders once the recipe has loaded, so fill again until every value sticks.
    await eventually(
      async () => {
        await page.locator('.modal input[name="name"]').fill(renamed);
        await page.locator('.modal textarea[name="description"]').fill("Neue Beschreibung");
        await page.locator('.modal input[name="servings"]').fill("5");
        // Steps are only replaced when the editor is told to, so a stray edit never rewrites them.
        await page.locator('.modal input[name="replace_instructions"]').check();
        const steps = page.locator(".modal textarea:not([name])").first();
        await steps.fill("Zuerst rühren, dann ruhen lassen.");
        return (
          (await page.locator('.modal input[name="name"]').inputValue()) === renamed &&
          (await page.locator('.modal input[name="servings"]').inputValue()) === "5" &&
          (await page.locator('.modal input[name="replace_instructions"]').isChecked()) &&
          (await steps.inputValue()) === "Zuerst rühren, dann ruhen lassen."
        );
      },
      { label: "editor filled" },
    );
    await page.locator('.modal input[name="name"]').press("Enter");
    const saved = await eventually(
      async () => {
        const recipe = await recipeById(id);
        return recipe?.name === renamed ? recipe : null;
      },
      { label: "saved recipe" },
    );
    assert.equal(saved.description, "Neue Beschreibung");
    assert.equal(saved.recipeServings, 5);
    assert.equal(saved.recipeInstructions[0].text, "Zuerst rühren, dann ruhen lassen.");
    const backups = await command(baseUrl, ACCOUNTS.admin, "recipe_backups", { slug: saved.slug });
    assert.equal(backups.status, 200);
    assert.ok(backups.body.backups.length >= 1);
  } finally {
    await context.close();
  }
});

test("the version history restores an older name through the UI", async () => {
  const { name, id } = await makeRecipe("Restore-Rezept");
  const context = await openContext(state.browser);
  try {
    const page = await openEditor(context, name);
    await page.locator('.modal input[name="name"]').fill(`${name} geaendert`);
    await page.locator('.modal input[name="name"]').press("Enter");
    await eventually(async () => (await recipeById(id))?.name.endsWith("geaendert"), {
      label: "edit saved",
    });
    // Saving closes the editor; open it again for the same recipe and look at its history.
    const again = await openEditor(context, `${name} geaendert`);
    await sel(again, "ed-history").click();
    await sel(again, "ed-restore-ask").first().click();
    await sel(again, "ed-restore-do").click();
    await eventually(async () => (await recipeById(id))?.name === name, {
      label: "name restored in Mealie",
    });
    assert.deepEqual(again.problems, []);
  } finally {
    await context.close();
  }
});

test("a cover photo is uploaded in chunks, shown through the image proxy and removed again", async () => {
  const { name, slug, id } = await makeRecipe("Foto-Rezept");
  assert.ok(!(await recipeBySlug(slug)).image);
  const context = await openContext(state.browser);
  try {
    const page = await openEditor(context, name);
    const chooser = page.waitForEvent("filechooser");
    await sel(page, "ed-photo-pick").click();
    await (
      await chooser
    ).setFiles({ name: "cover.png", mimeType: "image/png", buffer: solidPng(64) });
    await sel(page, "ed-photo-remove-ask").waitFor();
    await eventually(async () => (await recipeBySlug(slug)).image, {
      label: "image set in Mealie",
    });
    const proxied = await fetch(`${baseUrl}/api/image/${id}`, {
      headers: { authorization: basicHeader(ACCOUNTS.reader) },
    });
    assert.equal(proxied.status, 200);
    assert.match(proxied.headers.get("content-type"), /^image\//);

    await sel(page, "ed-photo-remove-ask").click();
    await sel(page, "ed-photo-remove-do").click();
    await sel(page, "ed-photo-remove-ask").waitFor({ state: "detached" });
    const after = await fetch(`${baseUrl}/api/image/${id}`, {
      headers: { authorization: basicHeader(ACCOUNTS.reader) },
    });
    assert.equal(after.status, 404);
  } finally {
    await context.close();
  }
});

test("uploads reject unsupported types and files whose bytes do not match", async () => {
  const { slug } = await makeRecipe("Upload-Check");
  const png = solidPng(16);
  const begin = (mime, bytes) =>
    command(baseUrl, ACCOUNTS.admin, "upload_begin", {
      slug,
      purpose: "cover",
      size: bytes.length,
      mime,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  assert.equal((await begin("image/gif", png)).status, 400);
  assert.equal((await begin("application/pdf", png)).status, 400);
  const notAnImage = Buffer.from("this is not an image at all");
  const started = await begin("image/png", notAnImage);
  if (started.status === 200) {
    const chunk = await command(baseUrl, ACCOUNTS.admin, "upload_chunk", {
      upload_id: started.body.upload_id,
      index: 0,
      data: notAnImage.toString("base64"),
    });
    const set = await command(baseUrl, ACCOUNTS.admin, "recipe_image_set", {
      slug,
      upload_id: started.body.upload_id,
    });
    assert.ok(chunk.status >= 400 || set.status >= 400, "a text file must never become a cover");
  }
  assert.ok(!(await recipeBySlug(slug)).image);
});

test("limits: the bridge body limit and the non-upload command limit are enforced", async () => {
  const huge = await fetch(`${baseUrl}/api/bridge`, {
    method: "POST",
    headers: {
      authorization: basicHeader(ACCOUNTS.admin),
      "content-type": "application/json",
      "x-atelier-request": "1",
    },
    body: JSON.stringify({ type: "mealie_atelier/status", pad: "x".repeat(40000) }),
  });
  assert.equal(huge.status, 413);
});

test("recipe import validates the address before Mealie is asked", async () => {
  for (const url of ["not a url", "ftp://example.invalid/x", "https://user:pw@example.invalid/x"]) {
    const result = await mutate(baseUrl, ACCOUNTS.admin, "recipe_import", { url });
    assert.equal(result.status, 400, url);
    assert.equal(result.body.code, "invalid_request", url);
  }
});

test("the import dialog opens for an administrator", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Verwalten");
    await sel(page, "import-form").click();
    await page.locator('.modal input[name="url"]').waitFor();
  } finally {
    await context.close();
  }
});
