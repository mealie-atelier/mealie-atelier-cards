import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const plain = (value) => JSON.parse(JSON.stringify(value));
const FEATURES = { structured_ingredients: true, uploads: true };
const LIMITS = { upload_max_bytes: 10485760, upload_chunk_bytes: 262144 };
const ADMIN = {
  permissions: { can_read: true, can_write: true, can_admin: true },
  features: FEATURES,
  limits: LIMITS,
  can_write: true,
  can_manage: true,
  can_edit_ingredients: true,
};
const PREVIEW = {
  slug: "gnocchi",
  recipe_id: "recipe-42",
  expected_hash: "h".repeat(64),
  servings: 2,
  rows: [
    {
      reference_id: "ref-1",
      quantity: 300,
      unit: { id: "unit-1", name: "Gram", abbreviation: "g" },
      food: { id: "food-1", name: "Gnocchi" },
      note: "",
      original_text: "300 g Gnocchi",
      display: "300 g Gnocchi",
      title: "",
    },
    {
      reference_id: "ref-2",
      quantity: 1.5,
      unit: null,
      food: { id: "food-2", name: "Salt" },
      note: "fine",
      original_text: "",
      display: "",
      title: "",
    },
  ],
};
const RECIPE = {
  id: "recipe-42",
  slug: "gnocchi",
  name: "Gnocchi",
  description: "",
  image: "tok",
  imageUrl: "/api/image/recipe-42",
  recipeServings: 2,
  recipeIngredient: [],
  recipeInstructions: [
    { id: "step-a", text: "Boil", imageUrls: ["/api/recipe-asset/recipe-42/pic-1.png"] },
    { id: "step-b", text: "Serve", imageUrls: [] },
  ],
};

function editor({ callWS, permissions = ADMIN, language = "en" } = {}) {
  const calls = [];
  const handler = async (message) => {
    calls.push(message);
    if (callWS) return callWS(message);
    if (message.type === "mealie_atelier/ingredients_get") return structuredClone(PREVIEW);
    return {};
  };
  const cards = loadCards({ globals: { crypto: webcrypto, btoa } });
  const card = makeCard(cards, { hass: { language, callWS: handler }, permissions });
  card._detail = structuredClone(RECIPE);
  card._modal = "edit";
  return { cards, card, calls };
}
const types = (calls) => calls.map((c) => c.type.replace("mealie_atelier/", ""));
function fileOf(bytes) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
  return {
    size: bytes.length,
    slice: (from, to) => ({ arrayBuffer: async () => buffer.slice(from, to) }),
    arrayBuffer: async () => buffer,
  };
}
const pngFile = (size) => {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (let i = 8; i < size; i++) bytes[i] = i % 251;
  return { bytes, file: fileOf(bytes) };
};

test("quantity parser accepts decimals, mixed numbers and vulgar fractions", () => {
  const { card } = editor();
  const parse = (text) => plain(card._editorParseQuantity(text));
  assert.deepEqual(parse("1,5"), { ok: true, value: 1.5 });
  assert.deepEqual(parse("1.5"), { ok: true, value: 1.5 });
  assert.deepEqual(parse("1 1/2"), { ok: true, value: 1.5 });
  assert.deepEqual(parse("½"), { ok: true, value: 0.5 });
  assert.deepEqual(parse("1½"), { ok: true, value: 1.5 });
  assert.deepEqual(parse("3/4"), { ok: true, value: 0.75 });
  assert.deepEqual(parse("  "), { ok: true, value: null });
  for (const bad of ["abc", "1/0", "-2", "1..5", "2000000", "1 1/", "½½"])
    assert.equal(parse(bad).ok, false, bad);
});

test("draft rows become request rows: reference ids kept, removed rows absent, new rows null", async () => {
  const { card } = editor();
  card._editorOpen();
  await card._editorLoad();
  const state = card._ed;
  state.rows.splice(1, 1); // remove ref-2
  state.rows[0].quantityText = "250";
  state.rows[0].note = "soft";
  state.rows.push(card._editorRowFromServer({ reference_id: null, quantity: null }));
  state.rows[1].quantityText = "2 1/2";
  state.rows[1].food = { id: "food-3", name: "Basil" };
  state.rows[1].unit = { id: "unit-2", name: "Bunch", abbreviation: "" };
  const { rows, invalid } = card._editorRequestRows();
  assert.equal(invalid, -1);
  assert.deepEqual(plain(rows), [
    {
      reference_id: "ref-1",
      quantity: 250,
      unit_id: "unit-1",
      food_id: "food-1",
      note: "soft",
      original_text: "300 g Gnocchi",
    },
    {
      reference_id: null,
      quantity: 2.5,
      unit_id: "unit-2",
      food_id: "food-3",
      note: "",
      original_text: "",
    },
  ]);
  assert.deepEqual(plain(card._editorDiff()), { changed: 1, added: 1, removed: 1 });
});

test("invalid quantity and unlinked rows without text are flagged and block the request", async () => {
  const { card } = editor();
  card._editorOpen();
  await card._editorLoad();
  card._ed.rows[0].quantityText = "lots";
  card._ed.rows.push(card._editorRowFromServer({ reference_id: null, quantity: 1 }));
  const { invalid } = card._editorRequestRows();
  assert.equal(invalid, 0);
  assert.equal(card._ed.rows[0].quantityError, true);
  assert.equal(card._ed.rows[2].textError, true);
  card._ed.rows[0].quantityText = "300";
  assert.equal(card._editorRequestRows().invalid, 2);
});

test("servings preview scales the display only and never changes the request", async () => {
  const { card } = editor();
  card._editorOpen();
  await card._editorLoad();
  const before = plain(card._editorRequestRows().rows);
  assert.equal(card._editorScaled(card._ed.rows[1]), "");
  card._ed.preview = 4;
  assert.equal(card._editorScaled(card._ed.rows[0]), "600");
  assert.equal(card._editorScaled(card._ed.rows[1]), "3");
  assert.deepEqual(plain(card._editorRequestRows().rows), before);
  assert.equal(card._ed.rows[0].quantityText, "300");
  card._editorInput({ target: { dataset: { edInput: "servings" }, value: "6" } });
  assert.equal(card._ed.preview, 6);
});

test("saving sends the hash and rows, reloads the rows and keeps the backup for undo", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("ingredients_get")) return structuredClone(PREVIEW);
      if (message.type.endsWith("ingredients_save"))
        return { saved: true, backup_id: "b-1", expected_hash: "n".repeat(64), recipe: RECIPE };
      return {};
    },
  });
  card._editorOpen();
  await card._editorLoad();
  calls.length = 0;
  card._ed.rows[0].quantityText = "100";
  await card._editorSave();
  const save = calls.find((c) => c.type.endsWith("ingredients_save"));
  assert.equal(save.slug, "gnocchi");
  assert.equal(save.expected_hash, PREVIEW.expected_hash);
  assert.equal(save.rows[0].quantity, 100);
  assert.deepEqual(types(calls), ["ingredients_save", "ingredients_get"]);
  assert.equal(card._ed.lastBackup.id, "b-1");
  assert.match(card._toast, /^Saved\. Backup from /);
});

test("a recipe_changed answer opens the reload dialog and keeps the draft until reload", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("ingredients_get")) return structuredClone(PREVIEW);
      if (message.type.endsWith("ingredients_save"))
        throw Object.assign(new Error("changed"), { code: "recipe_changed" });
      return structuredClone(RECIPE);
    },
  });
  card._editorOpen();
  await card._editorLoad();
  card._ed.rows[0].quantityText = "7";
  await card._editorSave();
  assert.equal(card._ed.conflict, true);
  assert.equal(card._ed.rows[0].quantityText, "7");
  assert.match(card._editorIngredientsHtml(), /changed elsewhere/);
  await card._editorReloadFresh();
  assert.equal(card._ed.rows[0].quantityText, "300");
  assert.equal(card._ed.conflict, false);
  assert.ok(types(calls).includes("recipe"));
});

test("upload client sends a 600 KiB file as three chunks with the right indices and checksum", async () => {
  const { bytes, file } = pngFile(600 * 1024);
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("upload_begin"))
        return { upload_id: "u-1", chunk_bytes: 262144, chunks: 3 };
      if (message.type.endsWith("upload_chunk")) return { received: message.index + 1 };
      return { saved: true, backup_id: "b-2", recipe: RECIPE };
    },
  });
  card._editorOpen();
  card._ed.pick = { target: "cover" };
  await card._editorUploadFlow(file);
  const begin = calls.find((c) => c.type.endsWith("upload_begin"));
  assert.equal(begin.purpose, "cover");
  assert.equal(begin.mime, "image/png");
  assert.equal(begin.size, bytes.length);
  assert.equal(begin.sha256, createHash("sha256").update(bytes).digest("hex"));
  const chunks = calls.filter((c) => c.type.endsWith("upload_chunk"));
  assert.deepEqual(
    chunks.map((c) => c.index),
    [0, 1, 2],
  );
  assert.equal(Buffer.from(chunks[0].data, "base64").length, 262144);
  assert.equal(Buffer.from(chunks[2].data, "base64").length, 600 * 1024 - 2 * 262144);
  const joined = Buffer.concat(chunks.map((c) => Buffer.from(c.data, "base64")));
  assert.ok(joined.equals(Buffer.from(bytes)));
  const set = calls.find((c) => c.type.endsWith("recipe_image_set"));
  assert.equal(set.upload_id, "u-1");
  assert.equal(set.expected_image, "tok");
  assert.equal(card._ed.upload, null);
});

test("upload client rejects a PDF by magic bytes and an oversized file before any call", async () => {
  const { card, calls } = editor();
  card._editorOpen();
  const pdf = new Uint8Array(2000);
  pdf.set(Buffer.from("%PDF-1.7"));
  await assert.rejects(() => card._editorSendFile(fileOf(pdf), "cover"), {
    code: "client_wrong_type",
  });
  await assert.rejects(
    () => card._editorSendFile({ ...fileOf(pdf), size: 11 * 1048576 }, "cover"),
    {
      code: "client_too_large",
    },
  );
  assert.deepEqual(
    calls.filter((c) => !c.type.endsWith("ingredients_get")),
    [],
  );
  card._ed.pick = { target: "cover" };
  await card._editorUploadFlow(fileOf(pdf));
  assert.equal(card._toastKind, "error");
  assert.match(card._toast, /Only JPEG, PNG and WebP/);
});

test("an expired upload session restarts from the beginning once and a cancel stops sending", async () => {
  const { file } = pngFile(300 * 1024);
  let begun = 0;
  let expireOnce = true;
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("upload_begin"))
        return { upload_id: `u-${++begun}`, chunk_bytes: 262144 };
      if (message.type.endsWith("upload_chunk")) {
        if (expireOnce && message.index === 1) {
          expireOnce = false;
          throw Object.assign(new Error("gone"), { code: "upload_expired" });
        }
        return {};
      }
      return { saved: true, backup_id: "b", recipe: RECIPE };
    },
  });
  card._editorOpen();
  card._ed.pick = { target: "cover" };
  await card._editorUploadFlow(file);
  assert.equal(begun, 2);
  assert.equal(calls.find((c) => c.type.endsWith("recipe_image_set")).upload_id, "u-2");

  const cancelled = editor({
    callWS: async (message) => {
      if (message.type.endsWith("upload_begin")) return { upload_id: "u", chunk_bytes: 100000 };
      if (message.type.endsWith("upload_chunk")) {
        cancelled.card._ed.upload.cancelled = true;
        return {};
      }
      return {};
    },
  });
  cancelled.card._editorOpen();
  cancelled.card._ed.pick = { target: "cover" };
  await cancelled.card._editorUploadFlow(pngFile(300 * 1024).file);
  assert.equal(cancelled.calls.filter((c) => c.type.endsWith("upload_chunk")).length, 1);
  assert.ok(!cancelled.calls.some((c) => c.type.endsWith("recipe_image_set")));
  assert.match(cancelled.card._toast, /cancelled/);
});

test("a cancel that arrives while the last chunk is in flight stops before the target command", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("upload_begin")) return { upload_id: "u", chunk_bytes: 262144 };
      if (message.type.endsWith("upload_chunk")) {
        card._ed.upload.cancelled = true;
        return {};
      }
      return { saved: true, backup_id: "b", recipe: RECIPE };
    },
  });
  card._editorOpen();
  card._ed.pick = { target: "cover" };
  await card._editorUploadFlow(pngFile(100 * 1024).file);
  assert.equal(calls.filter((c) => c.type.endsWith("upload_chunk")).length, 1);
  assert.ok(!calls.some((c) => c.type.endsWith("recipe_image_set")));
  assert.match(card._toast, /cancelled/);
});

test("the servings stepper label and aria-label follow the previewed count", async () => {
  const { card } = editor();
  card._editorOpen();
  await card._editorLoad();
  const label = { textContent: "" };
  const input = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const query = card.shadowRoot.querySelector;
  card.shadowRoot.querySelector = (selector) =>
    selector === "[data-ed-servings-label]"
      ? label
      : selector === '[data-ed-input="servings"]'
        ? input
        : null;
  card._ed.preview = 5;
  card._editorUpdateScaled();
  card.shadowRoot.querySelector = query;
  assert.equal(label.textContent, "Preview for 5 servings");
  assert.equal(input.attrs["aria-label"], "Preview for 5 servings");
});

test("unit and food fields use the shared combobox keyboard model", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("ingredients_get")) return structuredClone(PREVIEW);
      if (message.type.endsWith("/foods"))
        return {
          items: [
            { id: "f1", name: "Basil leaves", pluralName: "" },
            { id: "f2", name: "Basil oil", pluralName: "" },
          ],
          page: 1,
          total: 2,
        };
      return {};
    },
  });
  card._editorOpen();
  await card._editorLoad();
  const key = (name) => ({
    key: name,
    target: { dataset: { edInput: "food", edRow: "0" }, value: "Basil" },
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  });
  const down = key("ArrowDown");
  assert.equal(card._editorKeyDown(down), true, "ArrowDown opens a closed list");
  assert.ok(down.prevented);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(calls.filter((c) => c.type.endsWith("/foods")).length, 1);
  // Two items plus "Create" (admin, no exact match).
  assert.equal(card._editorComboOptions().length, 3);
  card._editorKeyDown(key("ArrowDown"));
  assert.equal(card._ed.combo.active, 0);
  card._editorKeyDown(key("End"));
  assert.equal(card._ed.combo.active, 2);
  card._editorKeyDown(key("ArrowDown"));
  assert.equal(card._ed.combo.active, 2, "the last option stays active, like in the recipe picker");
  card._editorKeyDown(key("Home"));
  assert.equal(card._ed.combo.active, 0);
  card._editorKeyDown(key("PageDown"));
  assert.equal(card._ed.combo.active, 2);
  const tab = key("Tab");
  assert.equal(card._editorKeyDown(tab), false, "Tab leaves the field");
  assert.equal(card._ed.combo, null);
  card._editorKeyDown(key("ArrowDown"));
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(card._editorKeyDown(key("Escape")), true);
  assert.equal(card._ed.combo, null);
  assert.match(
    card._editorComboMarkup({ id: "x", label: "Food", attrs: 'data-a="1"' }),
    /role="combobox"[^>]*aria-controls="x-list"[\s\S]*role="listbox" id="x-list"/,
  );
});

test("step photos address the step by index and id and can replace a file in one command", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("upload_begin")) return { upload_id: "u", chunk_bytes: 262144 };
      if (message.type.endsWith("step_image_add"))
        return { saved: true, backup_id: "b", file_name: "new.png", recipe: RECIPE };
      return {};
    },
  });
  card._editorOpen();
  card._ed.pick = { target: "step-a", replace: "pic-1.png" };
  await card._editorUploadFlow(pngFile(2000).file);
  const add = calls.find((c) => c.type.endsWith("step_image_add"));
  assert.equal(add.step_index, 0);
  assert.equal(add.step_id, "step-a");
  assert.equal(add.replace_file_name, "pic-1.png");
  assert.equal(calls.find((c) => c.type.endsWith("upload_begin")).purpose, "step");
  await card._editorStepRemove("step-a", "pic-1.png");
  const removal = calls.find((c) => c.type.endsWith("step_image_remove"));
  assert.deepEqual(plain(removal), {
    type: "mealie_atelier/step_image_remove",
    slug: "gnocchi",
    step_index: 0,
    step_id: "step-a",
    file_name: "pic-1.png",
  });
  const html = card._editorStepPhotosInner("step-a");
  assert.match(html, /data-ed-file-name="pic-1.png"/);
  assert.match(card._editorStepPhotosInner(""), /Save this step first/);
});

test("cover removal and restore go through the commands with their revision guards", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("recipe_backups"))
        return {
          backups: [
            {
              backup_id: "b-9",
              created_at: "2030-01-02T10:15:00Z",
              user_name: "Kai",
              kind: "image",
              summary: "Cover photo replaced",
              has_image: true,
            },
          ],
        };
      if (message.type.endsWith("ingredients_get")) return structuredClone(PREVIEW);
      return { deleted: true, restored: true, backup_id: "b-10", recipe: RECIPE };
    },
  });
  card._editorOpen();
  await card._editorLoad();
  await card._editorCoverRemove();
  assert.equal(calls.find((c) => c.type.endsWith("recipe_image_delete")).expected_image, "tok");
  await card._editorToggleHistory();
  const html = card._editorHistoryHtml();
  assert.match(html, /Cover photo replaced/);
  assert.match(html, /data-action="ed-restore-ask"/);
  await card._editorClick({ dataset: { action: "ed-restore-ask", value: "b-9" } });
  assert.match(card._editorHistoryHtml(), /Your current state is saved as a backup first/);
  await card._editorRestore("b-9");
  assert.deepEqual(plain(calls.find((c) => c.type.endsWith("recipe_restore"))), {
    type: "mealie_atelier/recipe_restore",
    slug: "gnocchi",
    backup_id: "b-9",
  });
  assert.equal(card._ed.lastBackup.id, "b-10");
});

test("combobox search, create and the already existed notice", async () => {
  const { card, calls } = editor({
    callWS: async (message) => {
      if (message.type.endsWith("ingredients_get")) return structuredClone(PREVIEW);
      if (message.type.endsWith("/foods"))
        return {
          items: [{ id: "food-9", name: "Basil leaves", pluralName: "" }],
          page: 1,
          total: 1,
        };
      return { id: "food-10", name: "Basil", pluralName: "", existing: true };
    },
  });
  card._editorOpen();
  await card._editorLoad();
  card._editorComboOpen("food", 0, "Basil");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const search = calls.find((c) => c.type.endsWith("/foods"));
  assert.equal(search.search, "Basil");
  assert.equal(search.per_page, 8);
  const options = card._editorComboOptions();
  assert.deepEqual(
    options.map((o) => o.type),
    ["item", "create"],
  );
  assert.match(card._editorOptionsHtml(), /Create “Basil”/);
  await card._editorChoose(1);
  assert.equal(calls.find((c) => c.type.endsWith("food_create")).name, "Basil");
  assert.equal(card._ed.rows[0].food.id, "food-10");
  assert.equal(card._ed.notice, "Already existed, linked");
  assert.equal(card._ed.combo, null);
});

test("the edit dialog has no plain-text ingredient textarea and shows structured rows", async () => {
  const { cards, card } = editor();
  card._modal = "edit";
  card._editorOpen();
  card._render();
  const markup = cards.document.markup;
  assert.doesNotMatch(markup, /name="ingredients"/);
  assert.doesNotMatch(markup, /replace_ingredients/);
  assert.match(markup, /data-editor-ingredients/);
  assert.match(markup, /accept="image\/jpeg,image\/png,image\/webp"/);
  await card._editorLoad();
  const rows = card._editorIngredientsHtml();
  assert.match(rows, /inputmode="decimal"/);
  assert.match(rows, /role="combobox"/);
  assert.match(rows, /aria-label="Quantity · Ingredient 1"/);
  assert.match(rows, /aria-label="Move ingredient 2 up"/);
  assert.match(rows, /Original text:/);
});

test("the editor is hidden without admin rights and ingredients stay read-only without the feature", () => {
  const writer = {
    permissions: { can_read: true, can_write: true, can_admin: false },
    can_write: true,
    can_manage: false,
    can_edit_ingredients: false,
  };
  const { cards, card } = editor({ permissions: writer });
  card._modal = "recipe";
  card._render();
  assert.doesNotMatch(cards.document.markup, /data-action="edit-form"/);
  card._modal = "edit";
  card._render();
  assert.doesNotMatch(cards.document.markup, /data-editor-ingredients>[^]*data-ed-input/);
  assert.match(card._editorIngredientsSection(), /Structured ingredient editing is switched off/);
  const admin = editor();
  admin.card._modal = "recipe";
  admin.card._render();
  assert.match(admin.cards.document.markup, /data-action="edit-form"/);
});

test("permissions prefer the new fields and fall back to the legacy mirrors; errors map to err keys", () => {
  const legacy = editor({
    permissions: { can_write: true, can_manage: true, can_edit_ingredients: true },
  }).card;
  assert.equal(legacy._permissions.can_admin, true);
  assert.equal(legacy._permissions.can_read, true);
  assert.deepEqual(plain(legacy._permissions.limits), {});
  const modern = editor({
    permissions: {
      permissions: { can_read: true, can_write: false, can_admin: false },
      can_write: true,
      can_manage: true,
    },
  }).card;
  assert.equal(modern._permissions.can_write, false);
  assert.equal(modern._permissions.can_manage, false);
  const derived = editor({
    permissions: {
      permissions: { can_read: true, can_write: true, can_admin: true },
      features: FEATURES,
    },
  }).card;
  assert.equal(derived._permissions.can_edit_ingredients, true);
  assert.equal(
    derived._errorText({ code: "write_unverified", message: "x" }).startsWith("Mealie accepted"),
    true,
  );
  assert.equal(derived._errorText({ code: "no_such_code", message: "Plain" }), "Plain");
  assert.equal(derived._errorText({}), "Something went wrong.");
  const german = editor({ language: "de" }).card;
  assert.match(german._errorText({ code: "backup_failed" }), /Backup/);
});

test("every editor and err translation key used by the component exists in en and de", () => {
  const source = readFileSync(
    new URL("../src/components/recipe-editor.js", import.meta.url),
    "utf8",
  );
  const locales = ["en", "de"].map((name) =>
    JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8")),
  );
  const used = new Set([...source.matchAll(/this\.t\(\s*"([A-Za-z.]+)"/g)].map((m) => m[1]));
  for (const key of "editorIngredientsLocked editorQuantity editorUnit editorFood editorNote editorOriginal editorAddIngredient editorMoveUp editorMoveDown editorRemoveRow editorCreateOption editorCreatedExisting editorQuantityInvalid editorServingsPreview editorServingsReset editorSaveSummary editorReloadChanged editorSavedWithBackup editorHistory editorRestore editorRestoreConfirm editorPhoto editorPhotoReplace editorPhotoRemove editorPhotoRemoveConfirm editorStepPhotoAdd editorStepPhotoKeptInMealie editorUploadTooLarge editorUploadWrongType editorUploadProgress editorUploadCancel".split(
    " ",
  ))
    used.add(key);
  for (const code of "not_configured invalid_request mealie_auth mealie_error conflict recipe_changed disabled use_structured_editor write_unverified backup_failed backup_not_found upload_invalid upload_expired upload_busy step_not_found".split(
    " ",
  ))
    used.add("err" + code.replace(/(?:^|_)([a-z])/g, (m, c) => c.toUpperCase()));
  for (const [i, locale] of locales.entries())
    for (const key of used)
      assert.ok(key in locale || `${key}.other` in locale, `${["en", "de"][i]}.${key}`);
  const german = locales[1];
  for (const key of used) {
    if (!key.startsWith("editor") && !key.startsWith("err")) continue;
    const text = german[key] ?? german[`${key}.other`];
    assert.doesNotMatch(text, /[—–]/, key);
    assert.doesNotMatch(text, /\b(ae|oe|ue)\b|[^a-zäöüß](Aender|Loesch)/i, key);
  }
});
