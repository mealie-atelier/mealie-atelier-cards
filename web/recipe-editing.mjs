/** Structured recipe editing, backups, restore and photo upload commands (contract B.5 and B.7). */
import { randomBytes } from "node:crypto";
import {
  ingredientFingerprint,
  mergeIngredients,
  verifyIngredientWrite,
} from "./recipe-safety.mjs";
import { RecipeBackups } from "./recipe-backups.mjs";
import { UploadSessions, editError } from "./upload-sessions.mjs";

const PREFIX = "mealie_atelier/";
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const LINK_ID = /^[a-zA-Z0-9_-]{1,150}$/;
const COVER_BACKUP_MAX = 10 * 1024 * 1024;
const COMMANDS = new Set([
  "foods",
  "units",
  "food_create",
  "unit_create",
  "ingredients_get",
  "ingredients_save",
  "recipe_backups",
  "recipe_restore",
  "upload_begin",
  "upload_chunk",
  "recipe_image_set",
  "recipe_image_delete",
  "step_image_add",
  "step_image_remove",
]);
const invalid = (message) => editError(400, "invalid_request", message);

function text(value, min, max, label) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max)
    throw invalid(`Invalid ${label}`);
  return value.trim();
}
function optionalText(value, max, label) {
  if (value === undefined || value === null || value === "") return "";
  return text(value, 0, max, label);
}
function integer(value, min, max, fallback) {
  const n = Number.isInteger(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}
/** Image tags that point at one of this recipe's assets, in text order. */
function assetTags(stepText, recipeId) {
  const prefix = `/api/media/recipes/${recipeId}/assets/`;
  return [...String(stepText || "").matchAll(/<img\b[^>]*>/gi)].flatMap((match) => {
    const src = match[0].match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const value = src?.[1] || src?.[2] || src?.[3] || "";
    const file = value.startsWith(prefix) ? value.slice(prefix.length) : "";
    return FILE_NAME.test(file) ? [file] : [];
  });
}
export function appendStepImage(stepText, recipeId, fileName) {
  return `${String(stepText || "").trimEnd()}\n\n<img src="/api/media/recipes/${recipeId}/assets/${fileName}" alt="" />`;
}
export function stripStepImage(stepText, recipeId, fileName) {
  const prefix = `/api/media/recipes/${recipeId}/assets/`;
  return String(stepText || "").replace(/\s*<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const value = src?.[1] || src?.[2] || src?.[3] || "";
    return value === prefix + fileName ? "" : tag;
  });
}
export function ingredientPreviewV2(recipe) {
  return {
    slug: recipe.slug,
    recipe_id: recipe.id,
    expected_hash: ingredientFingerprint(recipe),
    servings: recipe.recipeServings ?? null,
    rows: recipe.recipeIngredient.map((r) => ({
      reference_id: r.referenceId ?? null,
      quantity: r.quantity ?? null,
      unit: r.unit
        ? { id: r.unit.id, name: r.unit.name, abbreviation: r.unit.abbreviation || "" }
        : null,
      food: r.food ? { id: r.food.id, name: r.food.name } : null,
      note: r.note || "",
      original_text: r.originalText || "",
      display: r.display || "",
      title: r.title || "",
    })),
  };
}
function checkRows(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100)
    throw invalid("Expected 1 to 100 ingredient rows");
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw invalid("Invalid row");
    const quantity = row.quantity ?? null;
    if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000))
      throw invalid("Quantity out of range");
    for (const key of ["unit_id", "food_id"])
      if (row[key] != null && !LINK_ID.test(String(row[key]))) throw invalid("Invalid link id");
    if (row.reference_id != null && typeof row.reference_id !== "string")
      throw invalid("Invalid reference id");
    return {
      ...(row.reference_id ? { referenceId: row.reference_id } : {}),
      quantity,
      unit_id: row.unit_id ?? null,
      food_id: row.food_id ?? null,
      note: optionalText(row.note, 300, "note"),
      originalText: optionalText(row.original_text, 1000, "original text"),
      ...(row.title ? { title: optionalText(row.title, 300, "title") } : {}),
    };
  });
}

/**
 * `mealie(method, path, body?, query?)` is the JSON client, `mealieRaw(method, path, {body})` returns
 * `{ok, status, body: Buffer}` for binary and multipart calls. `actor` is the signed-in person.
 */
export function createRecipeEditing({
  mealie: mealieJson,
  mealieRaw,
  sign,
  identifier,
  dataDir,
  readOnly,
  structured,
  actor,
  sessions = new UploadSessions(),
  backups = new RecipeBackups({ dir: dataDir }),
}) {
  // Every Mealie failure becomes {code, 502} (contract 0.1 and 0.3), whatever status Mealie used.
  const mealie = async (...args) => {
    try {
      return await mealieJson(...args);
    } catch (error) {
      // A plain 403 from Mealie keeps the editing contract (mealie_auth, 502); a plain 404 stays an upstream status.
      const plain = ["mealie_forbidden", "mealie_not_found"].includes(error?.atelierCode);
      if (error?.atelierCode && !plain) throw error;
      const auth = error?.status === 401 || error?.status === 403;
      throw Object.assign(
        editError(
          502,
          auth ? "mealie_auth" : "mealie_error",
          auth ? "Mealie refused the access token" : "Could not reach Mealie",
        ),
        { upstreamStatus: error?.status },
      );
    }
  };
  const adminGate = () => {
    if (readOnly) throw editError(403, "read_only", "Mealie Atelier is in read-only mode");
  };
  const raw = async (method, path, options) => {
    const response = await mealieRaw(method, path, options);
    if (!response.ok)
      throw editError(502, "mealie_error", `Mealie refused the request (HTTP ${response.status})`);
    return response;
  };
  const fetchRecipe = (slug) => mealie("GET", `/api/recipes/${slug}`);
  const catalog = async (kind, msg) => {
    const page = integer(msg.page, 1, 10000, 1);
    const data = await mealie("GET", `/api/${kind}`, undefined, {
      search: optionalText(msg.search, 80, "search"),
      page,
      perPage: integer(msg.per_page, 1, 50, 20),
      orderBy: "name",
    });
    const rows = Array.isArray(data?.items) ? data.items : [];
    const items = rows.map((x) =>
      kind === "foods"
        ? { id: x.id, name: x.name, pluralName: x.pluralName || "" }
        : {
            id: x.id,
            name: x.name,
            pluralName: x.pluralName || "",
            abbreviation: x.abbreviation || "",
            useAbbreviation: x.useAbbreviation === true,
            fraction: x.fraction !== false,
          },
    );
    return { items, page, total: Number.isFinite(data?.total) ? data.total : items.length };
  };
  const findExact = async (kind, name) => {
    const data = await mealie("GET", `/api/${kind}`, undefined, {
      search: name,
      page: 1,
      perPage: 50,
      orderBy: "name",
    });
    const wanted = name.toLowerCase();
    return (Array.isArray(data?.items) ? data.items : []).find(
      (x) => String(x.name).toLowerCase() === wanted,
    );
  };
  const createFood = async (msg) => {
    adminGate();
    const name = text(msg.name, 1, 120, "name");
    const plural = optionalText(msg.plural_name, 120, "plural name");
    const hit = await findExact("foods", name);
    const food =
      hit ||
      (await mealie("POST", "/api/foods", { name, ...(plural ? { pluralName: plural } : {}) }));
    return {
      id: food.id,
      name: food.name,
      pluralName: food.pluralName || "",
      existing: Boolean(hit),
    };
  };
  const createUnit = async (msg) => {
    adminGate();
    const name = text(msg.name, 1, 60, "name");
    const abbreviation = optionalText(msg.abbreviation, 20, "abbreviation");
    const hit = await findExact("units", name);
    const unit =
      hit ||
      (await mealie("POST", "/api/units", {
        name,
        ...(abbreviation ? { abbreviation } : {}),
        useAbbreviation: Boolean(abbreviation),
      }));
    return {
      id: unit.id,
      name: unit.name,
      abbreviation: unit.abbreviation || "",
      existing: Boolean(hit),
    };
  };
  const fetchCover = async (recipeId) => {
    let response;
    try {
      response = await raw(
        "GET",
        `/api/media/recipes/${identifier(recipeId)}/images/original.webp`,
      );
    } catch {
      throw editError(507, "backup_failed", "The current photo could not be backed up.");
    }
    if (response.body.length > COVER_BACKUP_MAX)
      throw editError(507, "backup_failed", "The current photo is too large to back up.");
    return response.body;
  };
  const putCover = async (slug, upload) => {
    const form = new FormData();
    form.set("image", new Blob([upload.bytes], { type: upload.mime }), `recipe.${upload.ext}`);
    form.set("extension", upload.ext);
    await raw("PUT", `/api/recipes/${slug}/image`, { body: form });
  };
  const unverified = (backup) =>
    editError(
      502,
      "write_unverified",
      `Mealie accepted the change but the saved recipe differs. Backup ${backup.backup_id} is available.`,
    );
  const locateStep = (recipe, msg) => {
    const steps = Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions : [];
    const index = msg.step_index;
    if (!Number.isInteger(index) || index < 0 || index >= steps.length)
      throw editError(409, "step_not_found", "That step no longer exists. Reload the recipe.");
    const step = steps[index];
    if (step?.id && msg.step_id !== step.id)
      throw editError(409, "step_not_found", "That step changed. Reload the recipe.");
    return { index, step, steps };
  };
  const checkFile = (name) => {
    if (typeof name !== "string" || !FILE_NAME.test(name)) throw invalid("Invalid file name");
    return name;
  };

  async function ingredientsSave(msg) {
    adminGate();
    if (!structured)
      throw editError(403, "disabled", "Structured ingredient editing is switched off");
    const slug = identifier(msg.slug);
    const rows = checkRows(msg.rows);
    const original = await fetchRecipe(slug);
    if (ingredientFingerprint(original) !== msg.expected_hash)
      throw editError(409, "recipe_changed", "The recipe changed elsewhere. Reload it first.");
    const links = new Map();
    const draft = await mergeIngredients(original, rows, async (kind, key) => {
      const cacheKey = `${kind}:${key}`;
      if (!links.has(cacheKey)) {
        const record = await mealie(
          "GET",
          `/api/${kind === "food" ? "foods" : "units"}/${identifier(key)}`,
        ).catch((error) => {
          if (error.upstreamStatus === 404) throw invalid(`Unknown ${kind}`);
          throw error;
        });
        links.set(cacheKey, record);
      }
      return links.get(cacheKey);
    }).catch((error) => {
      if (error.atelierCode) throw error;
      throw error.status === 400 ? invalid(String(error.message).slice(0, 160)) : error;
    });
    const backup = await backups.save({
      recipe: original,
      kind: "ingredients",
      summary: `${original.recipeIngredient.length} ingredients`,
      actor,
    });
    await mealie("PATCH", `/api/recipes/${slug}`, { recipeIngredient: draft });
    const updated = await fetchRecipe(slug);
    if (!verifyIngredientWrite(draft, updated)) throw unverified(backup);
    return {
      saved: true,
      backup_id: backup.backup_id,
      expected_hash: ingredientFingerprint(updated),
      recipe: sign(updated),
    };
  }
  async function restore(msg) {
    adminGate();
    const slug = identifier(msg.slug);
    const current = await fetchRecipe(slug);
    const snapshot = await backups.get(current.id, msg.backup_id);
    const cover = snapshot.kind === "image" && snapshot.image_file;
    const bytes = cover ? await backups.readImage(current.id, snapshot) : null;
    const before = await backups.save({
      recipe: current,
      kind: "restore",
      summary: `Before restoring: ${snapshot.summary}`,
      actor,
      image: cover && current.image ? await fetchCover(current.id) : null,
    });
    const changes = Object.fromEntries(
      Object.entries(snapshot.fields || {}).filter(([, value]) => value !== null),
    );
    // Restoring an older name moves the recipe to a new slug in Mealie, so carry on with the slug
    // Mealie answers with; the old one is gone and would turn a finished restore into a 502.
    let target = slug;
    if (Object.keys(changes).length) {
      const patched = await mealie("PATCH", `/api/recipes/${slug}`, changes);
      if (typeof patched?.slug === "string" && patched.slug) target = identifier(patched.slug);
    }
    if (bytes) await putCover(target, { bytes, mime: "image/webp", ext: "webp" });
    return { restored: true, backup_id: before.backup_id, recipe: sign(await fetchRecipe(target)) };
  }
  async function coverSet(msg) {
    adminGate();
    const slug = identifier(msg.slug);
    const upload = sessions.peek(actor.id, msg.upload_id, "cover");
    const current = await fetchRecipe(slug);
    if (
      typeof msg.expected_image !== "string" ||
      msg.expected_image !== String(current.image ?? "")
    )
      throw editError(409, "recipe_changed", "The photo changed elsewhere. Reload the recipe.");
    const backup = await backups.save({
      recipe: current,
      kind: "image",
      summary: current.image ? "Cover photo replaced" : "Cover photo added",
      actor,
      image: current.image ? await fetchCover(current.id) : null,
    });
    await putCover(slug, upload);
    sessions.consume(msg.upload_id);
    const updated = await fetchRecipe(slug);
    if (!updated.image) throw unverified(backup);
    return { saved: true, backup_id: backup.backup_id, recipe: sign(updated) };
  }
  async function coverDelete(msg) {
    adminGate();
    const slug = identifier(msg.slug);
    const current = await fetchRecipe(slug);
    if (
      typeof msg.expected_image !== "string" ||
      msg.expected_image !== String(current.image ?? "")
    )
      throw editError(409, "recipe_changed", "The photo changed elsewhere. Reload the recipe.");
    if (!current.image) throw invalid("The recipe has no photo");
    const backup = await backups.save({
      recipe: current,
      kind: "image",
      summary: "Cover photo removed",
      actor,
      image: await fetchCover(current.id),
    });
    await raw("DELETE", `/api/recipes/${slug}/image`);
    return { deleted: true, backup_id: backup.backup_id, recipe: sign(await fetchRecipe(slug)) };
  }
  async function stepImageAdd(msg) {
    adminGate();
    const slug = identifier(msg.slug);
    const upload = sessions.peek(actor.id, msg.upload_id, "step");
    const current = await fetchRecipe(slug);
    const { index, step, steps } = locateStep(current, msg);
    const replace = msg.replace_file_name == null ? "" : checkFile(msg.replace_file_name);
    if (replace && !assetTags(step.text, current.id).includes(replace))
      throw editError(409, "step_not_found", "That photo is not part of this step.");
    const backup = await backups.save({
      recipe: current,
      kind: "step_image",
      summary: `Step ${index + 1} photo`,
      actor,
    });
    const name = `atelier-step-${index + 1}-${randomBytes(4).toString("hex")}`;
    const form = new FormData();
    form.set("name", name);
    form.set("icon", "mdi-image");
    form.set("extension", upload.ext);
    form.set("file", new Blob([upload.bytes], { type: upload.mime }), `${name}.${upload.ext}`);
    const asset = JSON.parse(
      (await raw("POST", `/api/recipes/${slug}/assets`, { body: form })).body,
    );
    if (!FILE_NAME.test(String(asset?.fileName)))
      throw editError(502, "mealie_error", "Mealie returned an unexpected asset name");
    const base = replace ? stripStepImage(step.text, current.id, replace) : step.text;
    await mealie("PATCH", `/api/recipes/${slug}`, {
      assets: [
        ...(current.assets || []).filter((a) => !replace || a.fileName !== replace),
        { name: asset.name || name, icon: asset.icon || "mdi-image", fileName: asset.fileName },
      ],
      recipeInstructions: steps.map((s, i) =>
        i === index ? { ...s, text: appendStepImage(base, current.id, asset.fileName) } : s,
      ),
    });
    sessions.consume(msg.upload_id);
    const updated = await fetchRecipe(slug);
    if (!assetTags(updated.recipeInstructions?.[index]?.text, current.id).includes(asset.fileName))
      throw unverified(backup);
    return {
      saved: true,
      backup_id: backup.backup_id,
      file_name: asset.fileName,
      recipe: sign(updated),
    };
  }
  async function stepImageRemove(msg) {
    adminGate();
    const slug = identifier(msg.slug);
    const current = await fetchRecipe(slug);
    const { index, step, steps } = locateStep(current, msg);
    const file = checkFile(msg.file_name);
    if (!assetTags(step.text, current.id).includes(file))
      throw editError(409, "step_not_found", "That photo is not part of this step.");
    const backup = await backups.save({
      recipe: current,
      kind: "step_image",
      summary: `Step ${index + 1} photo removed`,
      actor,
    });
    await mealie("PATCH", `/api/recipes/${slug}`, {
      assets: (current.assets || []).filter((a) => a.fileName !== file),
      recipeInstructions: steps.map((s, i) =>
        i === index ? { ...s, text: stripStepImage(s.text, current.id, file) } : s,
      ),
    });
    const updated = await fetchRecipe(slug);
    if (assetTags(updated.recipeInstructions?.[index]?.text, current.id).includes(file))
      throw unverified(backup);
    return { removed: true, backup_id: backup.backup_id, recipe: sign(updated) };
  }

  return {
    handles: (type) => typeof type === "string" && COMMANDS.has(type.slice(PREFIX.length)),
    /** Snapshot taken by `mutate recipe_update` right before its PATCH. */
    async snapshotBeforeUpdate(slug, changes) {
      const current = await fetchRecipe(slug);
      const instructions = "recipeInstructions" in changes;
      await backups.save({
        recipe: current,
        kind: instructions ? "instructions" : "basics",
        summary: instructions
          ? `${(current.recipeInstructions || []).length} steps`
          : String(current.name || "").slice(0, 80),
        actor,
      });
    },
    async handle(msg) {
      switch (msg.type.slice(PREFIX.length)) {
        case "foods":
          return catalog("foods", msg);
        case "units":
          return catalog("units", msg);
        case "food_create":
          return createFood(msg);
        case "unit_create":
          return createUnit(msg);
        case "ingredients_get":
          return ingredientPreviewV2(await fetchRecipe(identifier(msg.slug)));
        case "ingredients_save":
          return ingredientsSave(msg);
        case "recipe_backups": {
          const recipe = await fetchRecipe(identifier(msg.slug));
          return { backups: await backups.list(recipe.id) };
        }
        case "recipe_restore":
          return restore(msg);
        case "upload_begin":
          adminGate();
          identifier(msg.slug);
          return sessions.begin(actor.id, msg);
        case "upload_chunk":
          adminGate();
          return sessions.chunk(actor.id, msg.upload_id, msg.index, msg.data);
        case "recipe_image_set":
          return coverSet(msg);
        case "recipe_image_delete":
          return coverDelete(msg);
        case "step_image_add":
          return stepImageAdd(msg);
        default:
          return stepImageRemove(msg);
      }
    },
  };
}
