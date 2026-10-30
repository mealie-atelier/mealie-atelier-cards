// Recipe administration through the UI: create, edit, photo upload and removal, version history.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { baseUrl, ACCOUNTS, basicHeader } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import {
  openContext,
  openApp,
  gotoView,
  command,
  mutate,
  settle,
  openRecipeEditor,
} from "../lib/browser.mjs";
import {
  mealie,
  recipeBySlug,
  recipeById,
  makeRecipe as makeRecipeIn,
  recipeList,
  removeRecipes,
  uniqueName,
  eventually,
} from "../lib/mealie.mjs";
import { solidPng } from "../lib/png.mjs";

const state = browserSuite();
const sel = (page, action) => page.locator(`[data-action="${action}"]`);
const cleanup = [];
after(() => removeRecipes(cleanup));

const makeRecipe = (label) => makeRecipeIn(label, cleanup);

const openEditor = (context, name) => openRecipeEditor(context, baseUrl, name);

test("a recipe can be created in the UI", async () => {
  const name = uniqueName("Neu-Rezept");
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Rezepte");
    await sel(page, "create-form").first().click();
    await settle(page);
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
    await page.locator('.modal input[name="name"]').fill(renamed);
    await page.locator('.modal textarea[name="description"]').fill("Neue Beschreibung");
    await page.locator('.modal input[name="servings"]').fill("5");
    // Steps are only replaced when the editor is told to, so a stray edit never rewrites them.
    await page.locator('.modal input[name="replace_instructions"]').check();
    await page
      .locator(".modal textarea:not([name])")
      .first()
      .fill("Zuerst rühren, dann ruhen lassen.");
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
    await settle(again);
    await sel(again, "ed-restore-ask").first().click();
    await settle(again);
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

    await settle(page);
    await sel(page, "ed-photo-remove-ask").click();
    await settle(page);
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

const post = (body) =>
  fetch(`${baseUrl}/api/bridge`, {
    method: "POST",
    headers: {
      authorization: basicHeader(ACCOUNTS.admin),
      "content-type": "application/json",
      "x-atelier-request": "1",
    },
    body,
  });

test("limits: the non-upload command limit (32,000 bytes) is enforced and the bridge limit (400,000 bytes) caps everything", async () => {
  const status = (pad) => JSON.stringify({ type: "mealie_atelier/status", pad: "x".repeat(pad) });
  assert.equal((await post(status(20000))).status, 200, "a body under 32,000 bytes passes");
  assert.equal((await post(status(40000))).status, 413, "a 40 KB command is refused");
  const chunk = (bytes) =>
    JSON.stringify({
      type: "mealie_atelier/upload_chunk",
      upload_id: "none",
      index: 0,
      data: "A".repeat(bytes),
    });
  const large = await post(chunk(100000));
  assert.equal(large.status, 410, "a 100 KB upload chunk is allowed to reach the command");
  const huge = await post(chunk(410000));
  assert.equal(huge.status, 413, "nothing above 400,000 bytes is accepted, even a chunk");
});

test("recipe import validates the address before Mealie is asked", async () => {
  for (const url of ["not a url", "ftp://example.invalid/x", "https://user:pw@example.invalid/x"]) {
    const result = await mutate(baseUrl, ACCOUNTS.admin, "recipe_import", { url });
    assert.equal(result.status, 400, url);
    assert.equal(result.body.code, "invalid_request", url);
  }
});

test("the import dialog for an administrator submits a bad address and shows the refusal", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await gotoView(page, "Verwalten");
    await sel(page, "import-form").click();
    await settle(page);
    const field = page.locator('.modal input[name="url"]');
    await field.fill("ftp://example.invalid/rezept");
    assert.equal(await field.inputValue(), "ftp://example.invalid/rezept");
    const answered = page.waitForResponse(
      (r) => r.url().endsWith("/api/bridge") && r.status() === 400,
    );
    await field.press("Enter");
    await answered;
    // The refusal is shown and no recipe appeared.
    await page.locator(".toast-error, .notice.error").first().waitFor();
    assert.ok(!(await recipeList()).some((r) => /example\.invalid/.test(r.name)));
  } finally {
    await context.close();
  }
});

/** Runs the chunked upload protocol over HTTP and returns the upload id. */
async function uploadOver(slug, purpose, bytes) {
  const started = await command(baseUrl, ACCOUNTS.admin, "upload_begin", {
    slug,
    purpose,
    size: bytes.length,
    mime: "image/png",
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  assert.equal(started.status, 200, JSON.stringify(started.body));
  const chunk = await command(baseUrl, ACCOUNTS.admin, "upload_chunk", {
    upload_id: started.body.upload_id,
    index: 0,
    data: bytes.toString("base64"),
  });
  assert.equal(chunk.status, 200, JSON.stringify(chunk.body));
  return started.body.upload_id;
}

test("a step photo is added and removed through the editor and Mealie keeps the asset until removal", async () => {
  const { name, slug, id } = await makeRecipe("Schritt-Foto");
  const context = await openContext(state.browser);
  try {
    const page = await openEditor(context, name);
    const chooser = page.waitForEvent("filechooser");
    await sel(page, "ed-step-pick").first().click();
    await (
      await chooser
    ).setFiles({ name: "step.png", mimeType: "image/png", buffer: solidPng(64) });
    await sel(page, "ed-step-remove-ask").waitFor();
    const withPhoto = await eventually(
      async () => {
        const recipe = await recipeBySlug(slug);
        return recipe.assets?.length === 1 ? recipe : null;
      },
      { label: "step asset in Mealie" },
    );
    assert.match(withPhoto.recipeInstructions[0].text, /<img src="[^"]*assets\/atelier-step-1-/);
    await settle(page);
    await sel(page, "ed-step-remove-ask").click();
    await settle(page);
    await sel(page, "ed-step-remove-do").click();
    const without = await eventually(
      async () => {
        const recipe = await recipeBySlug(slug);
        return /<img/.test(recipe.recipeInstructions[0].text) ? null : recipe;
      },
      { label: "step photo removed in Mealie" },
    );
    assert.equal(without.assets.length, 0);
    await page.locator(".ed-thumb").waitFor({ state: "detached" });
    const kinds = (
      await command(baseUrl, ACCOUNTS.admin, "recipe_backups", { slug })
    ).body.backups.map((b) => b.kind);
    assert.equal(kinds.filter((k) => k === "step_image").length, 2, "both changes were backed up");
    assert.deepEqual(page.problems, []);
  } finally {
    await context.close();
  }
  assert.ok(id);
});

test("HTTP: step photos need the matching step id and a photo of another step cannot be removed", async () => {
  const { slug } = await makeRecipe("Schritt-Foto-HTTP");
  const recipe = await recipeBySlug(slug);
  const step = recipe.recipeInstructions[0];
  // Only two uploads may be open at once, so the refused attempt and the real one share a session.
  const uploadId = await uploadOver(slug, "step", solidPng(64));
  const wrong = await command(baseUrl, ACCOUNTS.admin, "step_image_add", {
    slug,
    step_index: 0,
    step_id: "not-the-step",
    upload_id: uploadId,
  });
  assert.equal(wrong.status, 409);
  assert.equal(wrong.body.code, "step_not_found");
  const added = await command(baseUrl, ACCOUNTS.admin, "step_image_add", {
    slug,
    step_index: 0,
    step_id: step.id,
    upload_id: uploadId,
  });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.match(added.body.file_name, /^atelier-step-1-[0-9a-f]{8}\.png$/);
  // Mealie writes new step ids with every change, so the next call uses the id it answers with.
  const fresh = (await recipeBySlug(slug)).recipeInstructions[0];
  assert.notEqual(fresh.id, step.id, "Mealie renewed the step id");
  const stale = await command(baseUrl, ACCOUNTS.admin, "step_image_remove", {
    slug,
    step_index: 0,
    step_id: step.id,
    file_name: added.body.file_name,
  });
  assert.equal(stale.status, 409, "a step id from before the change is refused");
  const foreign = await command(baseUrl, ACCOUNTS.admin, "step_image_remove", {
    slug,
    step_index: 0,
    step_id: fresh.id,
    file_name: "never-attached.png",
  });
  assert.equal(foreign.body.code, "step_not_found");
  const writer = await command(baseUrl, ACCOUNTS.writer, "step_image_remove", {
    slug,
    step_index: 0,
    step_id: fresh.id,
    file_name: added.body.file_name,
  });
  assert.equal(writer.status, 403);
  assert.equal(writer.body.code, "unauthorized");
  const removed = await command(baseUrl, ACCOUNTS.admin, "step_image_remove", {
    slug,
    step_index: 0,
    step_id: fresh.id,
    file_name: added.body.file_name,
  });
  assert.equal(removed.body.removed, true);
});

test("HTTP: restoring a cover backup brings the previous photo back", async () => {
  const { slug } = await makeRecipe("Cover-Restore");
  const first = solidPng(32);
  const set = async (bytes) => {
    const current = await recipeBySlug(slug);
    const result = await command(baseUrl, ACCOUNTS.admin, "recipe_image_set", {
      slug,
      upload_id: await uploadOver(slug, "cover", bytes),
      expected_image: String(current.image ?? ""),
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body;
  };
  await set(first);
  const firstToken = (await recipeBySlug(slug)).image;
  await set(solidPng(96));
  const secondToken = (await recipeBySlug(slug)).image;
  assert.notEqual(firstToken, secondToken);
  const list = (await command(baseUrl, ACCOUNTS.admin, "recipe_backups", { slug })).body.backups;
  const replaced = list.find((b) => b.kind === "image" && b.has_image);
  assert.ok(replaced, "replacing the cover stored the old photo");
  const restored = await command(baseUrl, ACCOUNTS.admin, "recipe_restore", {
    slug,
    backup_id: replaced.backup_id,
  });
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  const after = await recipeBySlug(slug);
  assert.ok(after.image, "the recipe has a photo again");
  assert.notEqual(after.image, secondToken, "the newer photo was replaced by the backup");
  const reader = await command(baseUrl, ACCOUNTS.reader, "recipe_restore", {
    slug,
    backup_id: replaced.backup_id,
  });
  assert.equal(reader.status, 403);
});
