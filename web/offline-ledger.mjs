/** Durable idempotency and optimistic conflict checks for offline shopping edits.
 * A started non-idempotent add is never blindly replayed after a crash.
 */
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[a-zA-Z0-9_-]{1,150}$/;
const err = (status, message, atelierCode) =>
  Object.assign(new Error(message), { status, ...(atelierCode ? { atelierCode } : {}) });
export const OFFLINE_ACTIONS = [
  "shopping_toggle",
  "shopping_add",
  "shopping_delete",
  "shopping_update",
  "shopping_clear_checked",
];
const MAX_AGE = 30 * 86400e3;
const validAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 99999;
export function validateOperation(operation) {
  if (
    !operation ||
    typeof operation !== "object" ||
    Array.isArray(operation) ||
    !UUID.test(operation.id)
  )
    throw err(400, "Invalid offline operation ID");
  if (!OFFLINE_ACTIONS.includes(operation.action)) throw err(400, "Unsupported offline operation");
  const p = operation.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) throw err(400, "Invalid operation payload");
  if (operation.action === "shopping_toggle") {
    if (
      !ID.test(p.item_id || "") ||
      typeof p.checked !== "boolean" ||
      typeof p.expected_checked !== "boolean"
    )
      throw err(400, "Toggle needs item ID, desired and original state");
  } else if (operation.action === "shopping_delete") {
    if (!ID.test(p.item_id || "")) throw err(400, "Delete needs an item ID");
  } else if (operation.action === "shopping_update") {
    const fields = ["note", "name", "quantity"].filter((key) => key in p);
    if (
      !ID.test(p.item_id || "") ||
      !fields.length ||
      ("note" in p && (typeof p.note !== "string" || p.note.length > 250)) ||
      ("name" in p && (typeof p.name !== "string" || !p.name.trim() || p.name.length > 250)) ||
      ("name" in p && "note" in p) ||
      ["name", "note"].some(
        (key) => `expected_${key}` in p && typeof p[`expected_${key}`] !== "string",
      ) ||
      ("expected_quantity" in p && !validAmount(p.expected_quantity)) ||
      ("quantity" in p && !validAmount(p.quantity))
    )
      throw err(400, "Update needs an item ID and valid changes");
  } else if (operation.action === "shopping_clear_checked") {
    if (
      !ID.test(p.list_id || "") ||
      !Array.isArray(p.expected_ids) ||
      !p.expected_ids.length ||
      p.expected_ids.length > 1000 ||
      !p.expected_ids.every((id) => ID.test(id || ""))
    )
      throw err(400, "Clearing ticked items needs a list ID and the IDs of the items the user saw");
  } else if (
    !ID.test(p.list_id || "") ||
    typeof p.note !== "string" ||
    !p.note.trim() ||
    p.note.length > 250
  )
    throw err(400, "Add needs an existing list and note");
  return { id: operation.id, action: operation.action, payload: structuredClone(p) };
}
/** The name a list shows for an item, as the Bridge reads it. */
const seen = (key, item) =>
  key === "name" ? String(item.display || item.note || item.food?.name || "").trim() : item[key];
const same = (key, current, wanted) =>
  key === "quantity"
    ? (current || 0) === (wanted || 0)
    : String(current || "").trim() === String(wanted || "").trim();
const applied = (key, item, wanted) =>
  key === "name"
    ? !item.food && !item.isFood && same("note", item.note, wanted)
    : same(key, item[key], wanted);
export class OfflineLedger {
  constructor({ dir, readItem, readItems, mutate, readOnly = false }) {
    this.file = join(dir, "offline-ledger.json");
    this.dir = dir;
    this.readItem = readItem;
    this.readItems = readItems;
    this.mutate = mutate;
    this.readOnly = readOnly;
    this.lock = Promise.resolve();
  }
  async load() {
    try {
      const v = JSON.parse(await readFile(this.file, "utf8"));
      return v && typeof v === "object" ? v : {};
    } catch (e) {
      if (e.code === "ENOENT") return {};
      throw e;
    }
  }
  async save(data) {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const filename = this.file + "." + randomUUID() + ".tmp";
    await writeFile(filename, JSON.stringify(data), { mode: 0o600, flag: "wx" });
    await rename(filename, this.file);
  }
  async process(operation) {
    const safe = validateOperation(operation);
    if (this.readOnly) throw err(403, "Read-only mode");
    const work = this.lock.then(() => this.processLocked(safe));
    this.lock = work.catch(() => {});
    return work;
  }
  async processLocked(op) {
    const data = await this.load();
    const now = Date.now();
    for (const [key, value] of Object.entries(data))
      if (value.updatedAt < now - MAX_AGE && value.state === "completed") delete data[key];
    let record = data[op.id];
    if (record && JSON.stringify(record.operation) !== JSON.stringify(op))
      throw err(409, "Operation ID reused with different content", "offline_op_reused");
    if (record?.state === "completed") return { ...record.result, replayed: true };
    if (record?.state === "conflict")
      throw err(
        409,
        record.message || "A newer edit exists. Resolve on this device",
        "offline_conflict",
      );
    if (record?.state === "uncertain" && op.action === "shopping_add")
      throw err(
        409,
        "An earlier add may have succeeded. Inspect the Mealie list before retrying.",
        "offline_add_uncertain",
      );
    if (!record) {
      data[op.id] = record = { operation: op, state: "checking", updatedAt: now };
      await this.save(data);
    }
    const set = async (state, fields = {}) => {
      Object.assign(record, { state, updatedAt: Date.now(), ...fields });
      await this.save(data);
    };
    if (op.action === "shopping_toggle") {
      let current;
      try {
        current = await this.readItem(op.payload.item_id);
      } catch (e) {
        await set("checking");
        throw e;
      }
      if (typeof current?.checked !== "boolean")
        throw err(502, "Mealie returned an invalid shopping item");
      if (current.checked === op.payload.checked) {
        const result = { ok: true, alreadyApplied: true, item: current };
        await set("completed", { result });
        return result;
      }
      if (current.checked !== op.payload.expected_checked) {
        await set("conflict", {
          message: "This item was changed on another device. Review both values.",
        });
        throw err(409, record.message, "offline_conflict");
      }
    } else if (op.action === "shopping_update") {
      let current;
      try {
        current = await this.readItem(op.payload.item_id);
      } catch (e) {
        // Not sticky: a replay must report the same code again.
        await set("checking");
        if (e.status === 404)
          throw err(404, "This item no longer exists in Mealie", "shopping_item_not_found");
        throw e;
      }
      const changes = ["name", "note", "quantity"].filter((key) => key in op.payload);
      if (changes.every((key) => applied(key, current, op.payload[key]))) {
        const result = { ok: true, alreadyApplied: true, item: current };
        await set("completed", { result });
        return result;
      }
      // The values the user saw are optional: without one, that edit wins.
      if (
        changes.some(
          (key) =>
            `expected_${key}` in op.payload &&
            !same(key, seen(key, current), op.payload[`expected_${key}`]),
        )
      ) {
        await set("conflict", {
          message: "This item was changed on another device. Review both values.",
        });
        throw err(409, record.message, "offline_conflict");
      }
    } else if (op.action === "shopping_clear_checked") {
      const items = await this.readItems(op.payload.list_id).catch(async (e) => {
        await set("checking");
        throw e;
      });
      const ticked = new Set(items.filter((x) => x?.checked === true).map((x) => String(x.id)));
      const existing = new Set(items.map((x) => String(x.id)));
      const expected = new Set(op.payload.expected_ids.filter((id) => existing.has(id)));
      // A ticked item the user saw that is gone meanwhile is fine. Any other difference means
      // another device ticked or unticked something the user never saw.
      if (ticked.size !== expected.size || [...ticked].some((id) => !expected.has(id))) {
        await set("conflict", {
          message: "The ticked items changed on another device. Review the list.",
        });
        throw err(409, record.message, "offline_conflict");
      }
    } else if (
      op.action === "shopping_add" &&
      (record.state === "uncertain" || record.state === "sending")
    ) {
      throw err(
        409,
        "Earlier add may have reached Mealie. Check the list to avoid a duplicate.",
        "offline_add_uncertain",
      );
    }
    // Persist the sending marker BEFORE touching Mealie. A process crash cannot cause a blind add replay.
    await set("sending");
    try {
      const result = await this.mutate(op.action, op.payload);
      const response = { ok: true, result };
      await set("completed", { result: response });
      return response;
    } catch (e) {
      // Only an add is unsafe to repeat; every other action ends in the same state when replayed.
      await set(op.action === "shopping_add" ? "uncertain" : "checking", {
        message: String(e.message || e).slice(0, 200),
      });
      throw e;
    }
  }
}
