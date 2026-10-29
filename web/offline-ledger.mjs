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
    const fields = ["note", "display", "quantity"].filter((key) => key in p);
    if (
      !ID.test(p.item_id || "") ||
      !fields.length ||
      ("note" in p && (typeof p.note !== "string" || p.note.length > 250)) ||
      ("display" in p &&
        (typeof p.display !== "string" || !p.display.trim() || p.display.length > 250)) ||
      ("quantity" in p &&
        (typeof p.quantity !== "number" ||
          !Number.isFinite(p.quantity) ||
          p.quantity < 0 ||
          p.quantity > 99999))
    )
      throw err(400, "Update needs an item ID and valid changes");
  } else if (operation.action === "shopping_clear_checked") {
    if (!ID.test(p.list_id || "")) throw err(400, "Clear needs a list ID");
  } else if (
    !ID.test(p.list_id || "") ||
    typeof p.note !== "string" ||
    !p.note.trim() ||
    p.note.length > 250
  )
    throw err(400, "Add needs an existing list and note");
  return { id: operation.id, action: operation.action, payload: structuredClone(p) };
}
export class OfflineLedger {
  constructor({ dir, readItem, mutate, readOnly = false }) {
    this.file = join(dir, "offline-ledger.json");
    this.dir = dir;
    this.readItem = readItem;
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
