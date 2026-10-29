/** Mealie Atelier companion web: zero-dependency, private-by-default Mealie proxy. Node 22+. */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { timingSafeEqual, randomUUID } from "node:crypto";
import {
  ingredientPreview,
  ingredientFingerprint,
  mergeIngredients,
  verifyIngredientWrite,
} from "./recipe-safety.mjs";
import { sniffImage, limitedBody } from "./photo-upload.mjs";
// BEGIN feature B: structured recipe editing, backups and uploads
import { createRecipeEditing } from "./recipe-editing.mjs";
import { RecipeBackups } from "./recipe-backups.mjs";
import { UploadSessions } from "./upload-sessions.mjs";
import { UPLOAD_MAX_BYTES, UPLOAD_CHUNK_BYTES } from "./upload-sessions.mjs";
// END feature B
import {
  prepare as prepareNutrition,
  search as searchNutrition,
  calculate as calculateNutrition,
  mealieNutrition,
  aiSuggest,
} from "./nutrition.mjs";
import { load as loadStudio, update as updateStudio } from "./studio-state.mjs";
import { aiSubstitute, aiAudit, resolveLocale } from "./studio-ai.mjs";
import { resolveAiConfig } from "./ai-client.mjs";
import { OfflineLedger } from "./offline-ledger.mjs";
import { AlarmStore } from "./alarm-store.mjs";
import { createDelivery, validateNotificationEnv } from "./alarm-delivery.mjs";
import {
  MIN_PASSWORD_LENGTH,
  commandLevel,
  createAuthThrottle,
  createCredentialVerifier,
  denial,
  parseUsers,
  rolePermissions,
  parseTrustedProxies,
  isPrivateAddress,
  clientAddress,
  inlineScriptHashes,
  packageVersion,
  renderServiceWorker,
  securityHeaders,
} from "./security.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error("PORT must be a whole number between 0 and 65535 (0 picks a free port).");
  process.exit(1);
}
const HOST = process.env.HOST || "0.0.0.0";
const MEALIE_URL = (process.env.MEALIE_URL || "").replace(/\/$/, "");
const MEALIE_API_TOKEN = process.env.MEALIE_API_TOKEN || "";
const USER = process.env.ATELIER_USERNAME || "atelier";
const PASSWORD = process.env.ATELIER_PASSWORD || "";
let USERS = [];
try {
  USERS = parseUsers(process.env.ATELIER_USERS);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const READ_ONLY = ["1", "true", "yes"].includes(
  String(process.env.ATELIER_READ_ONLY || "").toLowerCase(),
);
const USDA_KEY = process.env.USDA_FDC_API_KEY || "";
let AI_KEY = null;
try {
  AI_KEY = resolveAiConfig(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const VALID_ID = /^[a-zA-Z0-9_-]{1,150}$/;
const VALID_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATA_DIR = resolve(process.env.ATELIER_DATA_DIR || join(ROOT, "data"));
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "side", "dessert", "drink", "snack"]);
let notificationDelivery;
try {
  validateNotificationEnv();
  notificationDelivery = createDelivery();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const alarmStore = new AlarmStore({ dir: DATA_DIR, deliver: notificationDelivery.deliver });
const offlineLedger = new OfflineLedger({
  dir: DATA_DIR,
  readOnly: READ_ONLY,
  readItem: (id) => mealie("GET", `/api/households/shopping/items/${identifier(id)}`),
  mutate: (action, payload) => mutate(action, payload),
});

if (!MEALIE_API_TOKEN || !MEALIE_URL || (!PASSWORD && !USERS.length)) {
  console.error(
    "Configure MEALIE_URL, MEALIE_API_TOKEN and ATELIER_PASSWORD or ATELIER_USERS before starting.",
  );
  process.exit(1);
}
if (PASSWORD && PASSWORD.length < MIN_PASSWORD_LENGTH) {
  console.error(`ATELIER_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  process.exit(1);
}
if (PASSWORD && USERS.some((u) => u.name === USER)) {
  console.error(
    "ATELIER_USERS repeats the ATELIER_USERNAME of the shared password. Rename one of them.",
  );
  process.exit(1);
}
const parsed = URL.canParse(MEALIE_URL) ? new URL(MEALIE_URL) : null;
if (
  !parsed ||
  !["http:", "https:"].includes(parsed.protocol) ||
  parsed.username ||
  parsed.password ||
  parsed.search ||
  parsed.hash
) {
  console.error("MEALIE_URL must be an http(s) server URL without credentials or query.");
  process.exit(1);
}

const VERSION = packageVersion(readFileSync(join(ROOT, "package.json"), "utf8"));
const SECURITY_HEADERS = securityHeaders(
  inlineScriptHashes(readFileSync(join(ROOT, "public", "index.html"), "utf8")),
);
const authThrottle = createAuthThrottle();
let TRUSTED_PROXIES = [];
try {
  TRUSTED_PROXIES = parseTrustedProxies(process.env.ATELIER_TRUSTED_PROXIES);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const throttleClient = (req) =>
  clientAddress(req.socket.remoteAddress, req.headers["x-forwarded-for"], TRUSTED_PROXIES);

const credentials = createCredentialVerifier({
  users: USERS,
  legacy: PASSWORD ? { name: USER, password: PASSWORD } : null,
});
let warnedProxy = false;
/** Warns once when a private peer forwards a client address but no proxy is trusted. */
function warnUntrustedProxy(req) {
  if (warnedProxy || TRUSTED_PROXIES.length || !req.headers["x-forwarded-for"]) return;
  if (!isPrivateAddress(req.socket.remoteAddress)) return;
  warnedProxy = true;
  console.warn(
    "WARNING: a request from a private address carries X-Forwarded-For but ATELIER_TRUSTED_PROXIES is empty. " +
      "Behind a reverse proxy all users share one sign-in throttle counter. Set ATELIER_TRUSTED_PROXIES to the proxy address.",
  );
}
const alarmAccess = (req) => ({
  name: req.atelierUser?.name || "",
  admin: req.atelierUser?.role === "admin",
});
async function isAuthorized(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  // Only attempts that carry credentials count; the browser's first anonymous request does not.
  const client = throttleClient(req);
  const who = await credentials.verify(header);
  if (who) {
    authThrottle.succeed(client);
    req.atelierUser = who;
  } else authThrottle.fail(client);
  return !!who;
}
function reply(res, status, body, contentType = "application/json; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    ...SECURITY_HEADERS,
    ...headers,
  });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(body) : body);
}
const AUTH_PAGE_TEXT = {
  de: {
    signIn: [
      "Anmeldung erforderlich",
      "Melde dich bei Mealie Atelier an, um fortzufahren. Lade die Seite neu, um die Anmeldung erneut zu starten.",
    ],
    locked: (m) => [
      "Zu viele fehlgeschlagene Anmeldungen",
      `Aus Sicherheitsgründen ist die Anmeldung gesperrt. Versuche es in ${m} ${m === 1 ? "Minute" : "Minuten"} erneut.`,
    ],
  },
  en: {
    signIn: [
      "Sign-in required",
      "Sign in to Mealie Atelier to continue. Reload the page to start the sign-in again.",
    ],
    locked: (m) => [
      "Too many failed sign-ins",
      `Sign-in is locked for security reasons. Try again in ${m} ${m === 1 ? "minute" : "minutes"}.`,
    ],
  },
};
/** Small self-contained page for browser navigations that hit the sign-in gate. */
function authPage(req, kind, minutes = 1) {
  const text = AUTH_PAGE_TEXT[resolveLocale(req.headers["accept-language"])] || AUTH_PAGE_TEXT.en;
  const [title, body] = kind === "locked" ? text.locked(minutes) : text.signIn;
  const lang = text === AUTH_PAGE_TEXT.de ? "de" : "en";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#222}h1{font-size:1.4rem}</style></head><body><h1>${title}</h1><p>${body}</p></body></html>`;
}
const wantsHtml = (req) => String(req.headers.accept || "").includes("text/html");
function bad(text = "Invalid request") {
  const error = new Error(text);
  error.status = 400;
  error.code = "invalid_request";
  return error;
}
/** Error for a failed permission check, shaped like the contract 0.3 codes. */
function denied({ status, code, message }) {
  return Object.assign(new Error(message), { status, code });
}
function identifier(v) {
  if (typeof v !== "string" || !VALID_ID.test(v)) throw bad("Invalid identifier");
  return encodeURIComponent(v);
}
function day(v) {
  if (
    typeof v !== "string" ||
    !VALID_DAY.test(v) ||
    !Number.isFinite(Date.parse(v + "T12:00:00Z")) ||
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
  )
    throw bad("Use a real YYYY-MM-DD date");
  return v;
}
function text(v, n = 250) {
  if (typeof v !== "string" || !v.trim() || v.length > n) throw bad("Invalid text");
  return v.trim();
}
function int(v, min, max, fallback) {
  return Math.min(max, Math.max(min, Number.isInteger(v) ? v : fallback));
}
function params(data) {
  return new URLSearchParams(
    (Array.isArray(data) ? data : Object.entries(data))
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );
}

async function mealie(method, path, body, query) {
  if (!path.startsWith("/api/") || path.includes("..")) throw bad("Unsupported path");
  const url = MEALIE_URL + path + (query ? "?" + params(query) : "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${MEALIE_API_TOKEN}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status === 401) {
      // Never pass Mealie's 401 through: it would look like the app's own sign-in prompt.
      throw Object.assign(new Error("Mealie rejected the API token. Check MEALIE_API_TOKEN."), {
        status: 502,
        atelierCode: "mealie_auth",
      });
    }
    const mime = response.headers.get("content-type") || "";
    // A real Mealie answers errors and data as JSON; HTML or plain text means another server.
    if ((response.status === 404 || response.status < 300) && mime.includes("html"))
      throw Object.assign(
        new Error("The address does not answer like a Mealie server. Check MEALIE_URL."),
        {
          status: 502,
          atelierCode: "mealie_not_mealie",
        },
      );
    if (response.status >= 300) {
      throw Object.assign(new Error(`Mealie HTTP ${response.status}`), {
        status: response.status >= 500 ? 502 : response.status,
      });
    }
    if (response.status === 204) return null;
    return mime.includes("json") ? await response.json() : await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
/** Checks that MEALIE_URL answers like Mealie and accepts the token. */
async function mealieReachable() {
  // Bounded so a hanging Mealie never delays the status call (and with it card start).
  const limit = new Promise((resolve) => setTimeout(() => resolve(false), 2000).unref());
  const probe = mealie("GET", "/api/users/self").then(
    (who) => !!who && typeof who === "object",
    () => false,
  );
  return Promise.race([probe, limit]);
}
// BEGIN feature B: binary and multipart Mealie calls, editing service
async function mealieRaw(method, path, { body } = {}) {
  if (!path.startsWith("/api/") || path.includes("..")) throw bad("Unsupported path");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(MEALIE_URL + path, {
      method,
      headers: { Authorization: `Bearer ${MEALIE_API_TOKEN}`, Accept: "application/json" },
      body,
      redirect: "manual",
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      body: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    clearTimeout(timeout);
  }
}
const STRUCTURED_EDITS = process.env.ATELIER_STRUCTURED_EDITS === "true" && !READ_ONLY;
const editingShared = {
  mealie: (...args) => mealie(...args),
  mealieRaw,
  sign: (recipe) => withImage(recipe),
  identifier,
  dataDir: DATA_DIR,
  readOnly: READ_ONLY,
  structured: STRUCTURED_EDITS,
  sessions: new UploadSessions(),
  backups: new RecipeBackups({ dir: DATA_DIR }),
};
/** The editing service acts as the signed-in person: backups name them, uploads belong to them. */
function editingFor(req) {
  const name = req?.atelierUser?.name || USER;
  return createRecipeEditing({ ...editingShared, actor: { id: name, name } });
}
// END feature B
async function saveIngredientBackup(slug, recipe) {
  const folder = join(DATA_DIR, "ingredient-backups");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const file = join(folder, `${identifier(slug)}-${Date.now()}-${randomUUID()}.json`);
  await writeFile(file, JSON.stringify({ saved: new Date().toISOString(), recipe }, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  return file;
}
async function editStructuredIngredients(message) {
  if (READ_ONLY)
    throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
  if (process.env.ATELIER_STRUCTURED_EDITS !== "true")
    throw Object.assign(
      new Error("Enable ATELIER_STRUCTURED_EDITS only on a backed-up, tested Mealie 3.x instance"),
      { status: 403 },
    );
  if (message.confirm !== true) throw bad("Confirm structured ingredient changes before saving");
  const slug = identifier(message.slug),
    original = await mealie("GET", `/api/recipes/${slug}`);
  if (ingredientFingerprint(original) !== message.expected_hash)
    throw Object.assign(new Error("Recipe changed on another device. Reload before editing."), {
      status: 409,
    });
  const draft = await mergeIngredients(original, message.rows, async (kind, key) => {
    const record = await mealie(
      "GET",
      `/api/${kind === "food" ? "foods" : "units"}/${identifier(key)}`,
    );
    if (record?.id !== key) throw bad("Unknown ingredient " + kind);
    return record;
  });
  await saveIngredientBackup(slug, original); // Fail closed if backup fails
  await mealie("PATCH", `/api/recipes/${slug}`, { recipeIngredient: draft });
  const updated = await mealie("GET", `/api/recipes/${slug}`);
  if (!verifyIngredientWrite(draft, updated))
    throw Object.assign(
      new Error(
        "Mealie returned an unexpected ingredient result. Check the saved recipe and backup before retrying.",
      ),
      { status: 502 },
    );
  return { saved: true, recipe: withImage(updated), expected_hash: ingredientFingerprint(updated) };
}
function unwrap(v) {
  return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
}
function withImage(item) {
  if (!item || typeof item !== "object") return item;
  const id = typeof item.id === "string" ? item.id : "";
  const recipeInstructions =
    Array.isArray(item.recipeInstructions) && id
      ? item.recipeInstructions.map((step) => {
          if (!step || typeof step !== "object" || typeof step.text !== "string") return step;
          const imageUrls = [];
          const text = step.text
            .replace(/<img\b[^>]*>/gi, (tag) => {
              const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
              const src = match?.[1] || match?.[2] || match?.[3] || "";
              const prefix = `/api/media/recipes/${id}/assets/`;
              if (!src.startsWith(prefix)) return "";
              const filename = src.slice(prefix.length);
              if (
                !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(filename) ||
                filename === "." ||
                filename === ".."
              )
                return "";
              imageUrls.push(`/api/recipe-asset/${identifier(id)}/${encodeURIComponent(filename)}`);
              return "";
            })
            .trim();
          return { ...step, text, imageUrls };
        })
      : item.recipeInstructions;
  return {
    ...item,
    ...(recipeInstructions ? { recipeInstructions } : {}),
    ...(item.image && id ? { imageUrl: `/api/image/${identifier(id)}` } : {}),
  };
}
function withMealImage(item) {
  return { ...item, recipe: item?.recipe ? withImage(item.recipe) : item?.recipe };
}

async function addRecipeToShoppingList(listId, recipeId) {
  try {
    return await mealie("POST", `/api/households/shopping/lists/${listId}/recipe`, [{ recipeId }]);
  } catch (error) {
    if (![404, 405].includes(error.status)) throw error;
    return mealie("POST", `/api/households/shopping/lists/${listId}/recipe/${recipeId}`, {});
  }
}

/** A note may be cleared (empty string) but never exceeds 250 characters. */
function shoppingNote(v) {
  if (typeof v !== "string" || v.length > 250) throw bad("Invalid note");
  return v.trim();
}
/** Deleting an item that is already gone counts as done, so a replay or double tap stays harmless. */
async function deleteShoppingItem(id) {
  try {
    await mealie("DELETE", `/api/households/shopping/items/${id}`);
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  return { deleted: true };
}

async function mutate(action, payload, req) {
  if (READ_ONLY)
    throw Object.assign(new Error("Mealie Atelier is in read-only mode"), {
      status: 403,
      atelierCode: "read_only",
    });
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw bad("Invalid payload");
  switch (action) {
    case "shopping_toggle": {
      const id = identifier(payload.item_id);
      if (typeof payload.checked !== "boolean") throw bad("Expected checked boolean");
      const current = await mealie("GET", `/api/households/shopping/items/${id}`);
      return mealie("PUT", `/api/households/shopping/items/${id}`, {
        ...current,
        checked: payload.checked,
      });
    }
    case "shopping_delete":
      return deleteShoppingItem(identifier(payload.item_id));
    case "shopping_update": {
      const id = identifier(payload.item_id);
      const changes = {};
      if ("note" in payload) changes.note = shoppingNote(payload.note);
      if ("display" in payload) changes.display = text(payload.display);
      if ("quantity" in payload) {
        if (
          typeof payload.quantity !== "number" ||
          !Number.isFinite(payload.quantity) ||
          payload.quantity < 0 ||
          payload.quantity > 99999
        )
          throw bad("Invalid quantity");
        changes.quantity = payload.quantity;
      }
      if (!Object.keys(changes).length) throw bad("Nothing to update");
      const current = await mealie("GET", `/api/households/shopping/items/${id}`);
      // A free-text item has no food: its name is the note, so a new name must replace the note.
      if (changes.display !== undefined && !current?.food && !("note" in changes))
        changes.note = changes.display;
      return mealie("PUT", `/api/households/shopping/items/${id}`, { ...current, ...changes });
    }
    case "shopping_clear_checked": {
      const listId = typeof payload.list_id === "string" ? payload.list_id : "";
      identifier(listId);
      const all = unwrap(
        await mealie("GET", "/api/households/shopping/items", undefined, { perPage: -1 }),
      );
      const ids = all
        .filter((x) => x?.checked === true && String(x.shoppingListId) === listId)
        .map((x) => x.id);
      for (const id of ids) await deleteShoppingItem(identifier(String(id)));
      return { deleted: ids.length };
    }
    case "shopping_list_create":
      return mealie("POST", "/api/households/shopping/lists", { name: text(payload.name, 100) });
    case "shopping_from_recipe":
      return addRecipeToShoppingList(identifier(payload.list_id), identifier(payload.recipe_id));
    case "shopping_add":
      return mealie("POST", "/api/households/shopping/items", {
        shoppingListId: identifier(payload.list_id),
        note: text(payload.note),
        quantity: 0,
        checked: false,
      });
    case "mealplan_add": {
      const meal = payload.meal_type || "dinner";
      if (!MEAL_TYPES.has(meal)) throw bad("Invalid meal type");
      return mealie("POST", "/api/households/mealplans", {
        date: day(payload.date),
        entryType: meal,
        recipeId: identifier(payload.recipe_id),
        title: "",
        text: "",
      });
    }
    case "mealplan_delete":
      return mealie("DELETE", `/api/households/mealplans/${identifier(payload.entry_id)}`);
    case "recipe_create":
      return mealie("POST", "/api/recipes", { name: text(payload.name, 120) });
    case "recipe_update": {
      const changes = {};
      if ("name" in payload) changes.name = text(payload.name, 120);
      if ("description" in payload) {
        if (typeof payload.description !== "string" || payload.description.length > 2000)
          throw bad("Invalid description");
        changes.description = payload.description;
      }
      if ("servings" in payload) {
        if (!Number.isInteger(payload.servings) || payload.servings < 1 || payload.servings > 100)
          throw bad("Invalid servings");
        changes.recipeServings = payload.servings;
      }
      if ("instructions" in payload) {
        if (!Array.isArray(payload.instructions) || payload.instructions.length > 60)
          throw bad("Invalid instructions");
        const original = await mealie("GET", `/api/recipes/${identifier(payload.slug)}`);
        changes.recipeInstructions = payload.instructions.map((line, index) => {
          if (
            typeof line !== "string" &&
            (!line ||
              typeof line !== "object" ||
              Array.isArray(line) ||
              typeof line.text !== "string")
          )
            throw bad("Invalid instruction step");
          const stepTextValue = typeof line === "string" ? line : line.text;
          const previousId = typeof line === "object" && typeof line.id === "string" ? line.id : "";
          const previous = previousId
            ? (original.recipeInstructions || []).find((step) => step?.id === previousId)
            : original.recipeInstructions?.[index];
          const safeImages =
            typeof previous?.text === "string" ? previous.text.match(/<img\b[^>]*>/gi) || [] : [];
          const assetPrefix = `/api/media/recipes/${original.id}/assets/`;
          const preservedImages = safeImages.filter((tag) => {
            const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
            const src = match?.[1] || match?.[2] || match?.[3] || "";
            const filename = src.startsWith(assetPrefix) ? src.slice(assetPrefix.length) : "";
            return (
              /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(filename) &&
              filename !== "." &&
              filename !== ".."
            );
          });
          const stepText = text(stepTextValue, 2000);
          return {
            ...(previous && typeof previous === "object" ? previous : {}),
            text: [stepText, ...preservedImages].join("\n\n"),
          };
        });
      }
      if ("ingredients" in payload)
        throw Object.assign(new Error("Use the structured ingredient editor"), {
          status: 400,
          atelierCode: "use_structured_editor",
        });
      if (!Object.keys(changes).length) throw bad("Nothing to save");
      await editingFor(req).snapshotBeforeUpdate(identifier(payload.slug), changes);
      return mealie("PATCH", `/api/recipes/${identifier(payload.slug)}`, changes);
    }
    case "recipe_import": {
      const raw = text(payload.url, 2000);
      let url;
      try {
        url = new URL(raw);
      } catch {
        throw bad("Invalid recipe URL");
      }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
        throw bad("Invalid recipe URL");
      return mealie("POST", "/api/recipes/create/url", { url: raw });
    }
    default:
      throw bad("Unknown operation");
  }
}
async function bridge(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 400000) throw Object.assign(new Error("Payload too large"), { status: 413 });
    chunks.push(chunk);
  }
  let msg;
  try {
    msg = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw bad("Invalid JSON");
  }
  if (!msg || typeof msg.type !== "string") throw bad("Missing type");
  // Only upload chunks may be large; every other command stays within 32,000 bytes.
  if (size > 32000 && msg.type !== "mealie_atelier/upload_chunk")
    throw Object.assign(new Error("Payload too large"), { status: 413 });
  const level = commandLevel(msg);
  if (!level)
    throw bad(msg.type === "mealie_atelier/mutate" ? "Unknown operation" : "Unknown API command");
  const refusal = denial(req.atelierUser?.role, level, READ_ONLY);
  if (refusal) throw denied(refusal);
  const locale = resolveLocale(req.headers["accept-language"], msg.language ?? msg.locale);
  // BEGIN feature B: structured editing, backups and uploads
  const editing = editingFor(req);
  if (editing.handles(msg.type)) return editing.handle(msg);
  // END feature B
  switch (msg.type) {
    case "mealie_atelier/status": {
      const permissions = rolePermissions(req.atelierUser?.role, READ_ONLY);
      const structured = process.env.ATELIER_STRUCTURED_EDITS === "true" && !READ_ONLY;
      return {
        entries: [
          {
            entry_id: "companion",
            name: "Standalone Mealie",
            connected: await mealieReachable(),
            read_only: READ_ONLY,
            permissions,
            features: {
              shopping_sync: false,
              offline_queue: true,
              structured_ingredients: structured,
              uploads: true,
              ai: !!AI_KEY,
              recipe_filters: true,
              // One journal for the whole household, so changing it needs write access.
              shared_journal: true,
            },
            limits: { upload_max_bytes: UPLOAD_MAX_BYTES, upload_chunk_bytes: UPLOAD_CHUNK_BYTES },
            can_write: permissions.can_write,
            can_manage: permissions.can_admin,
            can_edit_ingredients: permissions.can_admin && structured,
          },
        ],
        version: VERSION,
      };
    }
    // BEGIN shopping sync (feature A): the standalone app never sends shopping data to third parties
    case "mealie_atelier/sync_state":
    case "mealie_atelier/sync_destinations":
    case "mealie_atelier/sync_preview":
    case "mealie_atelier/sync_rule_save":
    case "mealie_atelier/sync_rule_delete":
    case "mealie_atelier/sync_run":
    case "mealie_atelier/sync_pause":
    case "mealie_atelier/sync_resume":
    case "mealie_atelier/sync_retry":
    case "mealie_atelier/sync_resolve":
    case "mealie_atelier/sync_records":
      throw Object.assign(
        new Error("Shopping sync needs Home Assistant with the Mealie Atelier Bridge."),
        { status: 501, code: "sync_not_supported" },
      );
    // END shopping sync (feature A)
    case "mealie_atelier/offline_replay":
      return offlineLedger.process(msg.operation);
    case "mealie_atelier/alarm_capabilities":
      return {
        webPush: !!notificationDelivery.vapid,
        publicKey: notificationDelivery.vapid?.publicKey.toString("base64url") || "",
        homeAssistant: !!notificationDelivery.ha,
        mode: process.env.ATELIER_ALARM_CHANNEL || "both",
        secureContextRequired: true,
      };
    case "mealie_atelier/alarms":
      return alarmStore.list(alarmAccess(req));
    case "mealie_atelier/alarm_create": {
      if (READ_ONLY)
        throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
      const mode = process.env.ATELIER_ALARM_CHANNEL || "both";
      const subscribed = (await alarmStore.list()).pushSubscribers > 0;
      const canNotify =
        (mode !== "push" && !!notificationDelivery.ha) ||
        (mode !== "ha" && !!notificationDelivery.vapid && subscribed);
      if (!canNotify)
        throw Object.assign(
          new Error(
            "No background notification destination. Configure Home Assistant notify or subscribe to Web Push first.",
          ),
          { status: 409, atelierCode: "no_notification_destination" },
        );
      return alarmStore.create(msg.timer || {}, req.atelierUser?.name);
    }
    case "mealie_atelier/alarm_cancel": {
      if (READ_ONLY)
        throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
      return alarmStore.cancel(msg.timer_id, alarmAccess(req));
    }
    case "mealie_atelier/push_register": {
      if (READ_ONLY)
        throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
      if (!notificationDelivery.vapid)
        throw Object.assign(new Error("Web Push is not configured"), { status: 503 });
      return alarmStore.register(msg.subscription);
    }
    case "mealie_atelier/push_unregister":
      return alarmStore.unregister(msg.subscription);
    case "mealie_atelier/ingredient_preview": {
      const recipe = await mealie("GET", `/api/recipes/${identifier(msg.slug)}`);
      return ingredientPreview(recipe);
    }
    case "mealie_atelier/ingredient_save":
      return editStructuredIngredients(msg);
    case "mealie_atelier/ingredient_catalog": {
      if (!["food", "unit"].includes(msg.kind)) throw bad("Invalid catalog kind");
      const route = msg.kind === "food" ? "foods" : "units";
      const query = typeof msg.search === "string" ? msg.search.slice(0, 80) : "";
      const result = await mealie("GET", `/api/${route}`, undefined, {
        page: 1,
        perPage: 25,
        search: query,
      });
      return unwrap(result).map((x) => ({ id: x.id, name: x.name }));
    }
    case "mealie_atelier/studio_state":
      return loadStudio();
    case "mealie_atelier/studio_update": {
      if (READ_ONLY)
        throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
      if (msg.action === "session_timer" && !msg.payload?.remove) {
        const mode = process.env.ATELIER_ALARM_CHANNEL || "both";
        const subscribed = (await alarmStore.list()).pushSubscribers > 0;
        const available =
          (mode !== "push" && !!notificationDelivery.ha) ||
          (mode !== "ha" && !!notificationDelivery.vapid && subscribed);
        if (!available)
          throw Object.assign(
            new Error(
              "Configure a Home Assistant or Web Push destination before scheduling a kitchen timer.",
            ),
            { status: 409 },
          );
      }
      const oldState = await loadStudio();
      const updated = await updateStudio(msg.action, msg.payload, msg.expected_revision);
      if (["session_timer", "session_end"].includes(msg.action)) {
        const oldTimers = oldState.family?.session?.timers || [];
        const newTimers = updated.family?.session?.timers || [];
        const created = newTimers.filter((t) => !oldTimers.some((o) => o.id === t.id));
        const removed = oldTimers.filter((t) => !newTimers.some((n) => n.id === t.id));
        const errors = [];
        for (const timer of created) {
          try {
            await alarmStore.create(
              { id: timer.id, label: timer.name, deadline: timer.deadline },
              req.atelierUser?.name,
            );
          } catch (e) {
            errors.push(e.message);
          }
        }
        for (const timer of removed) {
          try {
            // Removing a session timer never cancels another person's alarm.
            await alarmStore.cancel(timer.id, alarmAccess(req));
          } catch (e) {
            if (![403, 404, 409].includes(e.status)) errors.push(e.message);
          }
        }
        if (errors.length) updated.alarmWarnings = errors;
      }
      return updated;
    }
    case "mealie_atelier/studio_substitute":
      return aiSubstitute(AI_KEY, msg.ingredient, msg.recipe, locale);
    case "mealie_atelier/studio_ai_audit":
      return aiAudit(AI_KEY, await mealie("GET", `/api/recipes/${identifier(msg.slug)}`), locale);
    case "mealie_atelier/nutrition_prepare": {
      const recipe = await mealie("GET", `/api/recipes/${identifier(msg.slug)}`);
      return prepareNutrition(recipe, { fdcEnabled: !!USDA_KEY, aiEnabled: !!AI_KEY });
    }
    case "mealie_atelier/nutrition_search":
      return searchNutrition(USDA_KEY, msg.query);
    case "mealie_atelier/nutrition_ai": {
      const recipe = await mealie("GET", `/api/recipes/${identifier(msg.slug)}`);
      const preview = prepareNutrition(recipe, { fdcEnabled: !!USDA_KEY, aiEnabled: !!AI_KEY });
      if (preview.hash !== msg.expected_hash) throw bad("Recipe changed since preview");
      return aiSuggest(
        AI_KEY,
        preview.ingredients.map((x) => x.text),
      );
    }
    case "mealie_atelier/nutrition_calculate": {
      const recipe = await mealie("GET", `/api/recipes/${identifier(msg.slug)}`);
      return calculateNutrition(USDA_KEY, recipe, msg.entries, msg.expected_hash);
    }
    case "mealie_atelier/nutrition_save": {
      if (READ_ONLY)
        throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
      const recipe = await mealie("GET", `/api/recipes/${identifier(msg.slug)}`);
      if (
        recipe.nutrition &&
        Object.values(recipe.nutrition).some((x) => x !== null && x !== "" && x !== undefined) &&
        msg.overwrite_existing !== true
      )
        throw bad("Existing nutrition values are protected. Explicitly confirm replacement");
      const report = await calculateNutrition(USDA_KEY, recipe, msg.entries, msg.expected_hash);
      const payload = {
        nutrition: mealieNutrition(report),
        settings: { ...(recipe.settings || {}), showNutrition: true },
      };
      await mealie("PATCH", `/api/recipes/${identifier(msg.slug)}`, payload);
      return { saved: true, report };
    }
    case "mealie_atelier/recipes": {
      // BEGIN recipe picker filters (feature D.1)
      const query = [
        ["page", int(msg.page, 1, 10000, 1)],
        ["perPage", int(msg.per_page, 1, 60, 24)],
        ["orderBy", msg.order === "recent" ? "updatedAt" : "name"],
        ["orderDirection", msg.order === "recent" ? "desc" : "asc"],
        ["search", typeof msg.search === "string" ? msg.search.slice(0, 100) : ""],
      ];
      if (msg.order !== undefined && !["name", "recent"].includes(msg.order))
        throw bad("Invalid order");
      if (msg.favorites_only !== undefined && typeof msg.favorites_only !== "boolean")
        throw bad("Invalid favorites_only");
      for (const [field, all] of [
        ["categories", "requireAllCategories"],
        ["tags", "requireAllTags"],
      ]) {
        const slugs = msg[field];
        if (slugs === undefined) continue;
        if (
          !Array.isArray(slugs) ||
          slugs.length > 10 ||
          !slugs.every((x) => typeof x === "string" && VALID_ID.test(x))
        )
          throw bad(`Invalid ${field}`);
        if (!slugs.length) continue;
        for (const slug of slugs) query.push([field, slug]);
        query.push([all, "false"]);
      }
      if (msg.favorites_only === true) {
        const favorites = await mealie("GET", "/api/users/self/favorites");
        const ids = [
          ...new Set(
            (Array.isArray(favorites?.ratings) ? favorites.ratings : [])
              .filter((x) => x?.isFavorite === true && typeof x.recipeId === "string")
              .map((x) => x.recipeId)
              .filter((id) => VALID_ID.test(id)),
          ),
        ].slice(0, 200);
        if (!ids.length)
          return {
            items: [],
            total: 0,
            page: 1,
            per_page: int(msg.per_page, 1, 60, 24),
            total_pages: 0,
          };
        query.push(["queryFilter", `id IN [${ids.map((id) => `"${id}"`).join(",")}]`]);
      }
      const data = await mealie("GET", "/api/recipes", undefined, query);
      // END recipe picker filters
      return { ...data, items: unwrap(data).map(withImage) };
    }
    case "mealie_atelier/recipe":
      return withImage(await mealie("GET", `/api/recipes/${identifier(msg.slug)}`));
    case "mealie_atelier/mealplan": {
      const start = day(msg.start),
        end = day(msg.end);
      if (start > end || new Date(end) - new Date(start) > 62 * 86400000)
        throw bad("Date range must be 62 days or less");
      return unwrap(
        await mealie("GET", "/api/households/mealplans", undefined, {
          start_date: start,
          end_date: end,
        }),
      ).map(withMealImage);
    }
    case "mealie_atelier/shopping": {
      const [lists, items] = await Promise.all([
        mealie("GET", "/api/households/shopping/lists", undefined, { perPage: -1 }),
        mealie("GET", "/api/households/shopping/items", undefined, { perPage: -1 }),
      ]);
      return { lists: unwrap(lists), items: unwrap(items) };
    }
    case "mealie_atelier/metadata": {
      const [categories, tags, cookbooks] = await Promise.all([
        mealie("GET", "/api/organizers/categories", undefined, { perPage: -1 }),
        mealie("GET", "/api/organizers/tags", undefined, { perPage: -1 }),
        mealie("GET", "/api/households/cookbooks", undefined, { perPage: -1 }),
      ]);
      return { categories: unwrap(categories), tags: unwrap(tags), cookbooks: unwrap(cookbooks) };
    }
    case "mealie_atelier/mutate":
      return mutate(msg.action, msg.payload, req);
    default:
      throw bad("Unknown API command");
  }
}

async function image(req, res, id) {
  const recipeId = identifier(id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${MEALIE_URL}/api/media/recipes/${recipeId}/images/min-original.webp`,
      {
        headers: { Authorization: `Bearer ${MEALIE_API_TOKEN}` },
        redirect: "manual",
        signal: controller.signal,
      },
    );
    if (
      response.status !== 200 ||
      !String(response.headers.get("content-type")).startsWith("image/webp")
    ) {
      reply(res, 404, { error: "Image not found" });
      return;
    }
    const pieces = [];
    let count = 0;
    for await (const part of response.body) {
      count += part.length;
      if (count > 2_000_000) {
        throw Object.assign(new Error("Image too large"), { status: 413 });
      }
      pieces.push(part);
    }
    reply(res, 200, Buffer.concat(pieces), "image/webp", {
      "Cache-Control": "private, max-age=300",
    });
  } finally {
    clearTimeout(timeout);
  }
}
async function recipeAsset(req, res, id, filename) {
  const recipeId = identifier(id);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(filename) || filename === "." || filename === "..")
    throw bad("Invalid recipe asset");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${MEALIE_URL}/api/media/recipes/${recipeId}/assets/${encodeURIComponent(filename)}`,
      {
        headers: { Authorization: `Bearer ${MEALIE_API_TOKEN}` },
        redirect: "manual",
        signal: controller.signal,
      },
    );
    if (response.status !== 200) {
      reply(res, 404, { error: "Recipe image not found" });
      return;
    }
    const parts = [];
    let size = 0;
    for await (const part of response.body) {
      size += part.length;
      if (size > 8_000_000)
        throw Object.assign(new Error("Recipe image too large"), { status: 413 });
      parts.push(part);
    }
    const bytes = Buffer.concat(parts),
      format = sniffImage(bytes);
    reply(res, 200, bytes, format.type, { "Cache-Control": "private, max-age=3600" });
  } finally {
    clearTimeout(timeout);
  }
}
async function uploadRecipeImage(req, slug) {
  if (READ_ONLY)
    throw Object.assign(new Error("Read-only mode"), { status: 403, atelierCode: "read_only" });
  const recipe = await mealie("GET", `/api/recipes/${identifier(slug)}`);
  const expected = req.headers["x-atelier-image-revision"];
  if (typeof expected !== "string" || expected !== String(recipe.image ?? ""))
    throw Object.assign(new Error("The image was changed elsewhere. Reload before replacing it."), {
      status: 409,
    });
  const bytes = await limitedBody(req),
    format = sniffImage(bytes);
  if (req.headers["content-type"] !== format.type)
    throw bad("Photo content type does not match file data");
  const folder = join(DATA_DIR, "photo-backups");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const basename = `${identifier(slug)}-${Date.now()}-${randomUUID()}`;
  await writeFile(
    join(folder, basename + ".json"),
    JSON.stringify({ saved: new Date().toISOString(), recipe }, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  if (recipe.image && recipe.id) {
    const previous = await fetch(
      `${MEALIE_URL}/api/media/recipes/${identifier(recipe.id)}/images/original.webp`,
      { headers: { Authorization: `Bearer ${MEALIE_API_TOKEN}` }, redirect: "manual" },
    );
    if (!previous.ok)
      throw Object.assign(new Error("Cannot back up existing photo. Upload canceled."), {
        status: 409,
      });
    const original = Buffer.from(await previous.arrayBuffer());
    if (original.length > 10 * 1024 * 1024)
      throw Object.assign(new Error("Existing image too large for backup"), { status: 413 });
    await writeFile(join(folder, basename + ".webp"), original, { mode: 0o600, flag: "wx" });
  }
  const form = new FormData();
  form.set("image", new Blob([bytes], { type: format.type }), `recipe.${format.ext}`);
  form.set("extension", format.ext);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${MEALIE_URL}/api/recipes/${identifier(slug)}/image`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${MEALIE_API_TOKEN}`, Accept: "application/json" },
      body: form,
      signal: controller.signal,
      redirect: "manual",
    });
    if (!response.ok)
      throw Object.assign(new Error(`Mealie refused image update (HTTP ${response.status})`), {
        status: 502,
      });
  } finally {
    clearTimeout(timer);
  }
  const refreshed = await mealie("GET", `/api/recipes/${identifier(slug)}`);
  if (!refreshed.image)
    throw Object.assign(
      new Error("Mealie did not report a saved image. Inspect the recipe and backup."),
      { status: 502 },
    );
  return { saved: true, image: refreshed.image, recipe: withImage(refreshed) };
}
const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/mealie-atelier-cards.js": ["mealie-atelier-cards.js", "text/javascript; charset=utf-8"],
  "/shell.css": ["shell.css", "text/css; charset=utf-8"],
  "/pwa-install.css": ["pwa-install.css", "text/css; charset=utf-8"],
  "/pwa-install.js": ["pwa-install.js", "text/javascript; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
  "/icon.svg": ["icon.svg", "image/svg+xml"],
  "/icon-192.png": ["icon-192.png", "image/png"],
  "/icon-512.png": ["icon-512.png", "image/png"],
  "/icon-maskable-512.png": ["icon-maskable-512.png", "image/png"],
  "/apple-touch-icon.png": ["apple-touch-icon.png", "image/png"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
  "/favicon.ico": ["favicon.ico", "image/x-icon"],
  "/favicon-32.png": ["favicon-32.png", "image/png"],
  "/badge-96.png": ["badge-96.png", "image/png"],
  "/icon-maskable.svg": ["icon-maskable.svg", "image/svg+xml"],
  "/sw.js": ["sw.js", "text/javascript; charset=utf-8"],
  "/offline-core.js": ["offline-core.js", "text/javascript; charset=utf-8"],
  "/offline-client.js": ["offline-client.js", "text/javascript; charset=utf-8"],
};
const server = createServer(async (req, res) => {
  warnUntrustedProxy(req);
  // A throttled address is refused before its credentials are checked, so the lockout cannot be
  // used as a password oracle.
  const retryMs = authThrottle.retryAfterMs(throttleClient(req));
  if (retryMs > 0) {
    const headers = { "Retry-After": String(Math.ceil(retryMs / 1000)) };
    if (wantsHtml(req))
      reply(
        res,
        429,
        authPage(req, "locked", Math.ceil(retryMs / 60000)),
        "text/html; charset=utf-8",
        headers,
      );
    else
      reply(res, 429, { error: "Too many failed sign-ins. Try again later." }, undefined, headers);
    return;
  }
  if (!(await isAuthorized(req))) {
    const headers = { "WWW-Authenticate": 'Basic realm="Mealie Atelier", charset="UTF-8"' };
    if (wantsHtml(req))
      reply(res, 401, authPage(req, "signIn"), "text/html; charset=utf-8", headers);
    else
      reply(
        res,
        401,
        { error: "Sign in to Mealie Atelier" },
        "application/json; charset=utf-8",
        headers,
      );
    return;
  }
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  try {
    if (req.method === "POST" && pathname.startsWith("/api/recipe-image/")) {
      if (req.headers["x-atelier-request"] !== "1") {
        reply(res, 403, { error: "Missing CSRF protection header" });
        return;
      }
      const refusal = denial(req.atelierUser?.role, "admin", READ_ONLY);
      if (refusal) throw denied(refusal);
      const result = await uploadRecipeImage(req, pathname.slice("/api/recipe-image/".length));
      reply(res, 200, result);
      return;
    }
    if (req.method === "POST" && pathname === "/api/bridge") {
      if (req.headers["x-atelier-request"] !== "1") {
        reply(res, 403, { error: "Missing CSRF protection header" });
        return;
      }
      const result = await bridge(req);
      reply(res, 200, result);
      return;
    }
    if (req.method === "GET" && pathname === "/api/health") {
      const who = await mealie("GET", "/api/users/self");
      reply(res, 200, { ok: true, username: who?.username });
      return;
    }
    if (req.method === "GET" && pathname.startsWith("/api/image/")) {
      await image(req, res, pathname.slice("/api/image/".length));
      return;
    }
    if (req.method === "GET" && pathname.startsWith("/api/recipe-asset/")) {
      const match = pathname.match(/^\/api\/recipe-asset\/([^/]+)\/([^/]+)$/);
      if (!match) throw bad("Invalid recipe asset path");
      await recipeAsset(req, res, decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      return;
    }
    if (req.method === "GET" && FILES[pathname]) {
      const [filename, contentType] = FILES[pathname];
      let data = await readFile(join(ROOT, "public", filename));
      if (filename === "sw.js") data = renderServiceWorker(data.toString("utf8"), VERSION);
      reply(res, 200, data, contentType, { "Cache-Control": "private, max-age=3600" });
      return;
    }
    reply(res, 404, { error: "Not found" });
  } catch (err) {
    const code = err.status >= 400 && err.status <= 599 ? err.status : 502;
    console.error("Request failed:", String(err.message || err).slice(0, 160));
    const ownCode = typeof err.code === "string" && /^[a-z_]{1,40}$/.test(err.code) ? err.code : "";
    const fallback = code === 400 ? "invalid_request" : code === 502 ? "mealie_error" : "";
    const errorCode = err.atelierCode || ownCode || fallback;
    reply(res, code, {
      error:
        code === 502 && !err.atelierCode
          ? "Could not reach Mealie"
          : String(err.message || "Invalid request").slice(0, 160),
      ...(errorCode ? { code: errorCode } : {}),
    });
  }
});
server.listen(PORT, HOST, async () => {
  console.log(
    `Mealie Atelier available on http://${HOST}:${server.address().port} (use HTTPS reverse proxy outside LAN)`,
  );
  try {
    await alarmStore.start();
    console.log("Persistent kitchen timer scheduler active");
  } catch (e) {
    console.error("FATAL: cannot initialize alarm scheduler:", e);
    server.close();
    process.exitCode = 1;
  }
});
