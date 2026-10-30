/**
 * Smart Shopping Sync from Mealie to Bring! for the standalone app.
 *
 * A port of the Bridge sync manager (one serialized outbox per rule). The guarantees are the
 * same: a Mealie item is only checked off after the destination accepted it (or a matching item
 * was confirmed there), an uncertain write is reconciled against the destination before it is
 * sent again, and each rule runs one pass at a time. A destination is a Bring! list, addressed
 * as `bring:<listUuid>` where the Bridge uses a To-do entity id.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BringAuthError,
  BringNetworkError,
  BringRateLimitError,
  BringRequestError,
} from "./bring-client.mjs";
import {
  bringTitle,
  fingerprint,
  mapItem,
  normalize,
  planBatch,
} from "./shopping-sync-mapping.mjs";

export const MAX_RULES = 5;
export const BATCH_SIZE = 50;
export const MAX_LINE_FAILURES = 3;
export const STARTUP_DELAY = 60;
export const STOP_TIMEOUT = 10;
export const AUDIT_LIMIT = 200;
export const RECORD_LIMIT = 2000;
export const PRUNE_DAYS = 30;
const NAME_MAX = 60;
const DAY_MS = 86400000;
const DEBOUNCE_RANGE = [5, 600];
const POLL_RANGE = [60, 3600];
const DESTINATION_CACHE_MS = 30000;

export const STATES = [
  "pending",
  "sending",
  "sent",
  "source_completed",
  "failed",
  "needs_reconciliation",
  "changed_after_send",
  "removed_after_send",
];
// Records the user must look at; pruning never drops them.
const PROTECTED = new Set([
  "pending",
  "sending",
  "failed",
  "needs_reconciliation",
  "changed_after_send",
  "removed_after_send",
]);
const MODES = ["copy", "move"];
const DUPLICATE_POLICIES = ["skip_exact", "skip_exact_merge_same_unit", "none"];
const AUTOMATIC_TRIGGERS = new Set(["after_atelier_add", "watch", "startup"]);
const RESULT_COUNTS = [
  "sent",
  "skipped_duplicates",
  "merged",
  "failed",
  "needs_reconciliation",
  "completed_in_source",
];
const PUBLIC_HIDDEN = ["fingerprint", "sent_fingerprint"];
const DESTINATION_ID = /^bring:[A-Za-z0-9-]{8,64}$/;
const SOURCE_ID = /^[a-zA-Z0-9_-]{1,150}$/;

/** A sync failure with a stable error code and the HTTP status the web app answers with. */
export class SyncError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.status = status;
  }
}

const now = () => new Date().toISOString();
const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

function intInRange(value, [low, high], field) {
  if (!Number.isInteger(value) || value < low || value > high)
    throw new SyncError(
      "invalid_request",
      `${field} must be a whole number from ${low} to ${high}`,
    );
  return value;
}

/** Normalised rule fields of a draft; throws a `SyncError` (invalid_request) otherwise. */
export function validateDraft(draft) {
  const invalid = (message) => new SyncError("invalid_request", message);
  if (!isObject(draft)) throw invalid("rule must be an object");
  const allowed = new Set([
    "name",
    "source_list_id",
    "destination_entity_id",
    "mode",
    "triggers",
    "debounce_seconds",
    "poll_interval_seconds",
    "duplicate_policy",
  ]);
  const unknown = Object.keys(draft).filter((key) => !allowed.has(key));
  if (unknown.length)
    throw invalid(`Unknown rule fields: ${unknown.sort().join(", ")}`.slice(0, 200));
  if (typeof draft.source_list_id !== "string" || !SOURCE_ID.test(draft.source_list_id))
    throw invalid("Invalid identifier");
  if (
    typeof draft.destination_entity_id !== "string" ||
    !DESTINATION_ID.test(draft.destination_entity_id)
  )
    throw invalid("destination_entity_id must be a Bring! list");
  let name = draft.name ?? null;
  if (name !== null) {
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > NAME_MAX)
      throw invalid(`name must have 1 to ${NAME_MAX} characters`);
    name = name.trim();
  }
  const mode = draft.mode ?? "copy";
  if (!MODES.includes(mode)) throw invalid("mode must be copy or move");
  const policy = draft.duplicate_policy ?? "skip_exact";
  if (!DUPLICATE_POLICIES.includes(policy)) throw invalid("Unknown duplicate_policy");
  const triggers = draft.triggers ?? {};
  if (
    !isObject(triggers) ||
    Object.keys(triggers).some((k) => !["after_atelier_add", "watch"].includes(k))
  )
    throw invalid("triggers accepts after_atelier_add and watch");
  const afterAdd = triggers.after_atelier_add ?? true;
  const watch = triggers.watch ?? false;
  if (typeof afterAdd !== "boolean" || typeof watch !== "boolean")
    throw invalid("triggers must be booleans");
  return {
    name,
    source_list_id: draft.source_list_id,
    destination_entity_id: draft.destination_entity_id,
    mode,
    triggers: { after_atelier_add: afterAdd, watch },
    debounce_seconds: intInRange(draft.debounce_seconds ?? 30, DEBOUNCE_RANGE, "debounce_seconds"),
    poll_interval_seconds: intInRange(
      draft.poll_interval_seconds ?? 120,
      POLL_RANGE,
      "poll_interval_seconds",
    ),
    duplicate_policy: policy,
  };
}

function newRecord(ruleId, itemId, at) {
  return {
    key: `${ruleId}:${itemId}`,
    rule_id: ruleId,
    source_item_id: itemId,
    state: "pending",
    title: "",
    description: null,
    fingerprint: "",
    sent_fingerprint: null,
    merged_into: null,
    duplicate_of: null,
    destination_uid: null,
    batch_id: null,
    attempts: 0,
    last_error: null,
    completion_pending: false,
    enqueued_at: at,
    sent_at: null,
    completed_at: null,
    updated_at: at,
  };
}

// Store

const emptyData = () => ({ rules: {}, records: {}, audit: [] });
const validData = (data) =>
  isObject(data) &&
  isObject(data.rules) &&
  isObject(data.records) &&
  Array.isArray(data.audit) &&
  Object.values(data.rules).every(isObject) &&
  Object.values(data.records).every((r) => isObject(r) && STATES.includes(r.state));
const parseTime = (value) => {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
};

/**
 * Drops old finished records, never one that still needs attention. `present` maps rule ids to
 * the source item ids seen in the latest read of that rule's list: only finished records whose
 * item is gone and that are older than the retention are dropped. Returns the count.
 */
export function prune(data, { present, at = Date.now() } = {}) {
  const records = data.records;
  const before = Object.keys(records).length;
  for (const [key, record] of Object.entries(records))
    if (!data.rules[record.rule_id]) delete records[key];
  if (present) {
    const cutoff = at - PRUNE_DAYS * DAY_MS;
    for (const [key, record] of Object.entries(records)) {
      const seen = present[record.rule_id];
      if (
        seen &&
        record.state === "source_completed" &&
        !seen.has(record.source_item_id) &&
        parseTime(record.updated_at) < cutoff
      )
        delete records[key];
    }
  }
  const overflow = Object.keys(records).length - RECORD_LIMIT;
  if (overflow > 0) {
    // Completed items go first: a dropped `sent` record of an item that is still open in Mealie
    // would be enqueued again on the next run.
    const finished = Object.values(records)
      .filter((record) => !PROTECTED.has(record.state))
      .sort(
        (a, b) =>
          Number(a.state !== "source_completed") - Number(b.state !== "source_completed") ||
          parseTime(a.updated_at) - parseTime(b.updated_at),
      );
    for (const record of finished.slice(0, overflow)) delete records[record.key];
  }
  data.audit.splice(0, Math.max(0, data.audit.length - AUDIT_LIMIT));
  return before - Object.keys(records).length;
}

/** Durable sync state in the data directory with atomic writes. A damaged file never breaks start. */
export class SyncStore {
  constructor({ dir }) {
    this.dir = dir;
    this.file = join(dir, "shopping-sync.json");
    this.data = emptyData();
    this.queue = Promise.resolve();
    this.timer = null;
  }

  async load() {
    let loaded = null;
    let damaged = false;
    try {
      loaded = JSON.parse(await readFile(this.file, "utf8"));
      damaged = !validData(loaded);
    } catch (error) {
      damaged = error.code !== "ENOENT";
    }
    if (damaged) {
      console.error("Shopping sync storage is unreadable; starting empty");
      await rename(this.file, this.file + ".corrupt").catch(() => {});
      loaded = null;
    }
    this.data = loaded ?? emptyData();
    prune(this.data);
    return this.data;
  }

  /** Writes now; used around destination calls so a crash leaves a known state. */
  save() {
    clearTimeout(this.timer);
    this.timer = null;
    const write = async () => {
      await mkdir(this.dir, { recursive: true, mode: 0o700 });
      const temp = `${this.file}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(this.data), { mode: 0o600, flag: "wx" });
      await rename(temp, this.file);
    };
    const task = this.queue.then(write);
    this.queue = task.catch(() => {});
    return task;
  }

  delaySave(ms = 2000) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save().catch((error) => console.error("Shopping sync could not save:", error.message));
    }, ms);
    this.timer.unref?.();
  }

  async flush() {
    if (this.timer) await this.save();
    else await this.queue;
  }
}

// Destination: Bring! lists

/** Titles of Bring! items are compared by `name (detail)`, the way they are written. */
const summaryOf = (item) => bringTitle(item.name, item.spec);

/**
 * Adapter for the Bring! lists of one account. `supports.description` is true because the detail
 * text of a Bring! item carries the amount and the note.
 */
export class BringDestination {
  constructor(client, { cacheMs = DESTINATION_CACHE_MS, clock = () => Date.now() } = {}) {
    this.client = client;
    this.cacheMs = cacheMs;
    this.clock = clock;
    this.cache = null;
  }

  get connected() {
    return !!this.client?.configured;
  }

  /** Drops the cached lists, for example after another account was connected. */
  forget() {
    this.cache = null;
  }

  async lists() {
    if (this.cache && this.clock() - this.cache.at < this.cacheMs) return this.cache.rows;
    const rows = (await this.client.lists()).map((row) => ({
      entity_id: `bring:${row.uuid}`,
      uuid: row.uuid,
      name: row.name,
    }));
    this.cache = { at: this.clock(), rows };
    return rows;
  }

  describe(row, available = true) {
    return {
      entity_id: row.entity_id,
      name: row.name,
      platform: "bring",
      available,
      supports: { create: true, description: true, update: false },
    };
  }

  /** The destination row of a rule, or null when the account has no such list. */
  async find(entityId) {
    return (await this.lists()).find((row) => row.entity_id === entityId) ?? null;
  }

  /** All lists of the account, sorted by name. */
  async destinations() {
    return (await this.lists())
      .map((row) => this.describe(row))
      .sort((a, b) => a.name.localeCompare(b.name) || a.entity_id.localeCompare(b.entity_id));
  }

  /** Every item (open ones as `needs_action`, completed ones as `completed`) or null when unreadable. */
  async items(entityId) {
    try {
      const { purchase, recently } = await this.client.items(entityId.slice("bring:".length));
      return [
        ...purchase.map((row) => ({
          uid: row.uuid || null,
          summary: summaryOf(row),
          status: "needs_action",
          name: row.name,
          spec: row.spec,
        })),
        ...recently.map((row) => ({
          uid: row.uuid || null,
          summary: summaryOf(row),
          status: "completed",
          name: row.name,
          spec: row.spec,
        })),
      ];
    } catch {
      return null;
    }
  }

  /**
   * Adds one line. Returns null on success or an error code: `destination_rejected` (not stored),
   * `destination_unavailable` (not stored, try later) or `destination_timeout` (outcome unknown).
   */
  async add(entityId, line, uid) {
    const list = entityId.slice("bring:".length);
    try {
      // Bring! keeps one entry per name: an open entry of the same name keeps its detail text.
      const open = (await this.client.items(list)).purchase.find(
        (row) => normalize(row.name) === normalize(line.name),
      );
      let spec = line.spec;
      if (open?.spec && normalize(open.spec) !== normalize(spec))
        spec = [open.spec, spec].filter(Boolean).join(", ");
      await this.client.addItem(list, { name: line.name, spec, uuid: uid });
    } catch (error) {
      if (error instanceof BringAuthError || error instanceof BringRateLimitError)
        return "destination_unavailable";
      if (error instanceof BringRequestError) return "destination_rejected";
      // Unknown outcome: Bring! may have stored the item.
      return "destination_timeout";
    }
    return null;
  }
}

class Mutex {
  constructor() {
    this.tail = Promise.resolve();
    this.held = false;
  }
  get locked() {
    return this.held;
  }
  async run(task) {
    const previous = this.tail;
    let release;
    this.tail = new Promise((resolve) => (release = resolve));
    await previous;
    this.held = true;
    try {
      return await task();
    } finally {
      this.held = false;
      release();
    }
  }
}

const snapshot = (items) =>
  JSON.stringify(
    items
      .filter((item) => typeof item.id === "string")
      .map((item) => [item.id, fingerprint(item)])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  );

export function publicRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !PUBLIC_HIDDEN.includes(key)));
}

const defaultTimers = {
  set(callback, ms) {
    const handle = setTimeout(callback, ms);
    handle.unref?.();
    return () => clearTimeout(handle);
  },
};

/**
 * Owns rules, the outbox and every trigger.
 *
 * `source` is `{ lists(), items(listId), item(id), setChecked(id, checked, current) }` against
 * Mealie, `destination` a `BringDestination`. `language` returns the language code that decides
 * about decimal commas.
 */
export class SyncManager {
  constructor({
    store,
    source,
    destination,
    language = () => "de",
    timers = defaultTimers,
    startupDelay = STARTUP_DELAY,
    readOnly = false,
    onFinished = () => {},
  }) {
    this.store = store;
    this.source = source;
    this.destination = destination;
    this.language = language;
    this.timers = timers;
    this.startupDelay = startupDelay;
    this.readOnly = readOnly;
    this.onFinished = onFinished;
    this.locks = new Map();
    this.saveLock = new Mutex();
    this.rerun = new Map();
    this.scheduled = new Map();
    this.watchers = new Map();
    this.baseline = new Map();
    this.tasks = new Set();
    this.stopped = false;
  }

  get rules() {
    return this.store.data.rules;
  }
  get records() {
    return this.store.data.records;
  }

  get connected() {
    return this.destination.connected;
  }

  rule(ruleId) {
    const rule =
      typeof ruleId === "string" && Object.hasOwn(this.rules, ruleId) ? this.rules[ruleId] : null;
    if (!rule) throw new SyncError("sync_rule_not_found", "Unknown sync rule", 404);
    return rule;
  }
  ruleRecords(ruleId) {
    return Object.values(this.records).filter((record) => record.rule_id === ruleId);
  }
  /** Records merged into this line that share its state. */
  members(record) {
    return Object.values(this.records).filter(
      (other) =>
        other.merged_into === record.key &&
        other.key !== record.key &&
        other.state === record.state,
    );
  }
  isMember(record) {
    const lead = this.records[record.merged_into || ""];
    return !!lead && lead !== record && lead.state === record.state;
  }
  set(record, state, changes = {}) {
    Object.assign(record, changes, { state, updated_at: now() });
  }

  /** Content-free numbers for diagnostics. */
  counts() {
    const states = Object.fromEntries(STATES.map((state) => [state, 0]));
    for (const record of Object.values(this.records)) states[record.state] += 1;
    const rules = Object.values(this.rules);
    return {
      rules: rules.length,
      activated: rules.filter((rule) => rule.activated).length,
      paused: rules.filter((rule) => rule.paused).length,
      records: states,
      audit: this.store.data.audit.length,
      watchers: this.watchers.size,
    };
  }

  // Lifecycle

  async start() {
    this.stopped = false;
    await this.store.load();
    const interrupted = Object.values(this.records).filter((record) => record.state === "sending");
    for (const record of interrupted) {
      // The process stopped between "about to send" and "result recorded": the destination may
      // or may not have the item, so it is looked up before anything is sent again.
      this.set(record, "needs_reconciliation", { last_error: "destination_timeout" });
    }
    if (interrupted.length) await this.store.save();
    for (const rule of Object.values(this.rules)) {
      if (!rule.activated || rule.paused) continue;
      if (
        this.ruleRecords(rule.id).some(
          (record) => record.state === "needs_reconciliation" || record.completion_pending,
        )
      )
        this.scheduleRun(rule.id, "startup", this.startupDelay);
    }
    this.refreshWatchers();
  }

  /** Cancels timers and background work, lets running passes finish briefly, flushes. */
  async stop() {
    this.stopped = true;
    for (const { cancel } of this.scheduled.values()) cancel();
    this.scheduled.clear();
    for (const ruleId of [...this.watchers.keys()]) this.stopWatcher(ruleId);
    if (this.tasks.size) {
      // A pass cut off while a line is `sending` keeps that state on disk and is reconciled
      // after the next start.
      let timer;
      await Promise.race([
        Promise.allSettled([...this.tasks]),
        new Promise((resolve) => (timer = setTimeout(resolve, STOP_TIMEOUT * 1000))),
      ]);
      clearTimeout(timer);
    }
    await this.store.save();
  }

  spawn(promise) {
    const task = promise.catch(() => {});
    this.tasks.add(task);
    task.finally(() => this.tasks.delete(task));
  }

  // Triggers

  /** A source list changed: (re)start the debounce of every rule that listens to it. */
  notifySourceChanged(listId, origin) {
    if (this.stopped || this.readOnly) return;
    for (const rule of Object.values(this.rules)) {
      if (
        rule.source_list_id !== listId ||
        !rule.activated ||
        rule.paused ||
        !rule.triggers?.[origin]
      )
        continue;
      this.scheduleRun(rule.id, origin, rule.debounce_seconds);
    }
  }

  scheduleRun(ruleId, trigger, delay) {
    if (this.readOnly) return;
    this.cancelScheduled(ruleId);
    const cancel = this.timers.set(() => this.scheduledDue(ruleId, trigger), delay * 1000);
    this.scheduled.set(ruleId, { cancel, due: new Date(Date.now() + delay * 1000) });
  }
  cancelScheduled(ruleId) {
    this.scheduled.get(ruleId)?.cancel();
    this.scheduled.delete(ruleId);
  }
  scheduledDue(ruleId, trigger) {
    this.scheduled.delete(ruleId);
    if (!this.stopped && this.rules[ruleId]) this.spawn(this.runQuietly(ruleId, trigger));
  }
  async runQuietly(ruleId, trigger) {
    try {
      await this.run(ruleId, trigger);
    } catch (error) {
      if (!(error instanceof SyncError)) console.error("Shopping sync run failed:", error?.message);
    }
  }

  wantsWatch(rule) {
    return !!(rule.activated && !rule.paused && rule.triggers?.watch);
  }
  /** Polls exactly the activated, unpaused rules that ask for it. */
  refreshWatchers() {
    if (this.stopped || this.readOnly) return;
    const wanted = new Set(
      Object.values(this.rules)
        .filter((rule) => this.wantsWatch(rule))
        .map((rule) => rule.id),
    );
    for (const ruleId of [...this.watchers.keys()])
      if (!wanted.has(ruleId)) this.stopWatcher(ruleId);
    for (const ruleId of wanted) if (!this.watchers.has(ruleId)) this.schedulePoll(ruleId);
  }
  stopWatcher(ruleId) {
    const handle = this.watchers.get(ruleId);
    if (typeof handle === "function") handle();
    this.watchers.delete(ruleId);
    this.baseline.delete(ruleId);
  }
  schedulePoll(ruleId) {
    this.watchers.set(
      ruleId,
      this.timers.set(() => this.pollDue(ruleId), this.rules[ruleId].poll_interval_seconds * 1000),
    );
  }
  pollDue(ruleId) {
    const token = {};
    this.watchers.set(ruleId, token);
    this.spawn(this.poll(ruleId, token));
  }
  async poll(ruleId, token) {
    const rule = this.rules[ruleId];
    try {
      if (rule) {
        const items = await this.source.items(rule.source_list_id);
        const current = snapshot(items);
        const previous = this.baseline.get(ruleId);
        this.baseline.set(ruleId, current);
        const untracked =
          previous === undefined &&
          items.some(
            (item) =>
              typeof item.id === "string" && !item.checked && !this.records[`${ruleId}:${item.id}`],
          );
        if (untracked || (previous !== undefined && previous !== current))
          this.notifySourceChanged(rule.source_list_id, "watch");
      }
    } catch {
      // The next poll tries again.
    } finally {
      // Reschedule only when nobody paused, deleted or restarted this watcher meanwhile.
      if (this.watchers.get(ruleId) === token) {
        this.watchers.delete(ruleId);
        this.refreshWatchers();
      }
    }
  }

  // Destination

  /** Describes a destination for a rule; unreachable or missing lists read as unavailable. */
  async describe(entityId, fallbackName = "") {
    try {
      const row = await this.destination.find(entityId);
      if (row) return this.destination.describe(row);
    } catch {
      // Fall through to the unavailable description.
    }
    return this.destination.describe(
      { entity_id: entityId, name: fallbackName || entityId },
      false,
    );
  }

  /** The destination of a rule or draft, or a `SyncError` when the account has no such list. */
  async requireDestination(entityId) {
    let row;
    try {
      row = await this.destination.find(entityId);
    } catch (error) {
      throw destinationFailure(error);
    }
    if (!row)
      throw new SyncError(
        "sync_destination_unsupported",
        "Choose a Bring! list of the connected account.",
      );
    return this.destination.describe(row);
  }

  async destinations() {
    try {
      return await this.destination.destinations();
    } catch (error) {
      throw destinationFailure(error);
    }
  }

  options(destination) {
    return {
      decimalComma: String(this.language() || "en")
        .toLowerCase()
        .startsWith("de"),
      supportsDescription: destination.supports.description,
      layout: "bring",
    };
  }

  // Run

  /** Runs one pass for a rule; a trigger during a running pass queues exactly one more. */
  async run(ruleId, trigger, { confirmFirstBatch = false } = {}) {
    if (this.stopped) throw new SyncError("not_configured", "Shopping sync is stopping", 409);
    if (this.readOnly) throw new SyncError("read_only", "Mealie Atelier is in read-only mode", 403);
    this.rule(ruleId);
    let lock = this.locks.get(ruleId);
    if (!lock) this.locks.set(ruleId, (lock = new Mutex()));
    if (lock.locked && !confirmFirstBatch) {
      this.rerun.set(ruleId, trigger);
      return { queued: true };
    }
    const pass = lock.run(async () => {
      const outcome = await this.pass(ruleId, trigger, confirmFirstBatch);
      // The result of a pass (activation, last run, records) survives a crash right away.
      await this.store.save();
      return outcome;
    });
    const tracked = pass.catch(() => {});
    this.tasks.add(tracked);
    let result;
    try {
      result = await pass;
    } finally {
      this.tasks.delete(tracked);
    }
    const again = this.rerun.get(ruleId);
    this.rerun.delete(ruleId);
    if (again !== undefined && this.rules[ruleId] && !this.stopped)
      this.spawn(this.runQuietly(ruleId, again));
    return result;
  }

  result(ruleId, batchId, outcome, counts) {
    const pending = this.ruleRecords(ruleId).filter((record) => record.state === "pending").length;
    return { rule_id: ruleId, batch_id: batchId, outcome, ...counts, pending_left: pending };
  }

  audit(ruleId, trigger, count, outcome) {
    // Minimal by design: no titles, no notes, no tokens.
    this.store.data.audit.push({ at: now(), rule_id: ruleId, trigger, count, outcome });
  }

  finish(rule, trigger, batchId, outcome, counts, { confirm = false, present } = {}) {
    const ruleId = rule.id;
    const result = this.result(ruleId, batchId, outcome, counts);
    const items = RESULT_COUNTS.filter((key) => key !== "completed_in_source").reduce(
      (sum, key) => sum + counts[key],
      0,
    );
    const count =
      items ||
      counts.completed_in_source ||
      (outcome === "destination_unavailable" ? result.pending_left : 0);
    if (this.rules[ruleId]) {
      rule.last_run = { at: now(), trigger, outcome, count };
      this.audit(ruleId, trigger, count, outcome);
      if (confirm && ["sent", "partial"].includes(outcome) && !rule.activated) {
        rule.activated = true;
        rule.updated_at = now();
        this.refreshWatchers();
      }
    }
    prune(this.store.data, { present: present ? { [ruleId]: present } : undefined });
    this.store.delaySave();
    this.onFinished({ rule_id: ruleId, outcome, count });
    return result;
  }

  async pass(ruleId, trigger, confirm) {
    const rule = this.rule(ruleId);
    const counts = Object.fromEntries(RESULT_COUNTS.map((key) => [key, 0]));
    const batchId = randomUUID().replaceAll("-", "");
    if (AUTOMATIC_TRIGGERS.has(trigger) && (rule.paused || !rule.activated))
      return this.result(ruleId, batchId, rule.paused ? "paused" : "not_activated", counts);
    const entityId = rule.destination_entity_id;
    const destination = await this.describe(entityId, rule.destination_name);
    if (!destination.available)
      return this.finish(rule, trigger, batchId, "destination_unavailable", counts);
    let items;
    try {
      items = await this.source.items(rule.source_list_id);
    } catch {
      return this.finish(rule, trigger, batchId, "source_unavailable", counts);
    }
    const byId = new Map(
      items.filter((item) => typeof item.id === "string").map((item) => [item.id, item]),
    );
    const options = this.options(destination);
    const destinationItems = await this.destination.items(entityId);
    if (destinationItems !== null) {
      const { settled, confirmed } = this.reconcile(ruleId, destinationItems);
      if (settled) this.audit(ruleId, trigger, settled, "reconciled");
      // Lines found at the destination were delivered by an earlier, uncertain call.
      counts.sent += confirmed;
    }
    this.detectChanges(ruleId, byId, options);
    this.enqueue(ruleId, items, options);
    if (destinationItems === null && rule.duplicate_policy !== "none") {
      // Without the destination list neither duplicates nor earlier uncertain writes can be
      // checked, so nothing new is sent.
      return this.finish(rule, trigger, batchId, "destination_unavailable", counts, {
        present: new Set(byId.keys()),
      });
    }
    const lost = await this.sendBatch(rule, batchId, byId, destinationItems || [], options, counts);
    let completionFailed = 0;
    if (rule.mode === "move") completionFailed = await this.completeSources(ruleId, byId, counts);
    this.baseline.set(ruleId, snapshot([...byId.values()]));
    const delivered = counts.sent + counts.skipped_duplicates;
    const problems = counts.failed + counts.needs_reconciliation;
    let outcome;
    if (lost && !delivered && !problems) outcome = "destination_unavailable";
    else if (!delivered && !problems) outcome = completionFailed ? "partial" : "nothing_to_send";
    else if (!problems && !lost && !completionFailed) outcome = "sent";
    else if (delivered) outcome = "partial";
    else outcome = "failed";
    return this.finish(rule, trigger, batchId, outcome, counts, {
      confirm,
      present: new Set(byId.keys()),
    });
  }

  /**
   * Settles uncertain writes against what the destination really holds. Returns how many records
   * were settled and how many of them were found at the destination.
   */
  reconcile(ruleId, destinationItems) {
    const titles = new Map();
    const uids = new Set();
    for (const item of destinationItems) {
      const title = normalize(item.summary);
      titles.set(title, [...(titles.get(title) || []), item.uid]);
      if (typeof item.uid === "string") uids.add(item.uid);
    }
    let settled = 0;
    let confirmed = 0;
    for (const record of this.ruleRecords(ruleId)) {
      if (record.state !== "needs_reconciliation" || this.isMember(record)) continue;
      const group = [record, ...this.members(record)];
      const matches = titles.get(normalize(record.title)) || [];
      let uid;
      if (record.destination_uid && uids.has(record.destination_uid)) uid = record.destination_uid;
      else if (matches.length === 1) uid = matches[0];
      else if (!matches.length) {
        for (const member of group)
          this.set(member, "pending", { last_error: null, merged_into: null, duplicate_of: null });
        settled += group.length;
        continue;
      } else {
        // Several equal lines and no stored uid: only the user can tell which is ours.
        record.last_error = "ambiguous";
        continue;
      }
      for (const member of group)
        this.set(member, "sent", {
          destination_uid: uid,
          sent_at: member.sent_at || now(),
          sent_fingerprint: member.fingerprint,
          last_error: null,
        });
      settled += group.length;
      confirmed += 1;
    }
    return { settled, confirmed };
  }

  /** Flags edits after sending and refreshes lines not sent yet. Never touches the destination. */
  detectChanges(ruleId, byId, options) {
    for (const record of this.ruleRecords(ruleId)) {
      const item = byId.get(record.source_item_id);
      if (record.state === "sent") {
        if (!item) this.set(record, "removed_after_send");
        else {
          const current = fingerprint(item);
          if (current !== record.sent_fingerprint)
            this.set(record, "changed_after_send", { fingerprint: current });
        }
      } else if (record.state === "source_completed") {
        // A deleted completed item is normal; the record becomes prunable.
        if (item) {
          const current = fingerprint(item);
          if (current !== record.fingerprint)
            this.set(record, "changed_after_send", { fingerprint: current });
        }
      } else if (record.state === "pending" || record.state === "failed") {
        const mapped = item && !item.checked ? mapItem(item, options) : null;
        if (!mapped) {
          // Never sent, and the item is gone, checked or empty: nothing to protect.
          delete this.records[record.key];
          continue;
        }
        Object.assign(record, {
          title: mapped.title,
          description: mapped.description,
          fingerprint: fingerprint(item),
        });
      }
    }
  }

  enqueue(ruleId, items, options) {
    if (!this.rules[ruleId]) return;
    const at = now();
    for (const item of items) {
      if (typeof item.id !== "string" || item.checked) continue;
      const key = `${ruleId}:${item.id}`;
      if (this.records[key]) continue;
      const mapped = mapItem(item, options);
      if (!mapped) continue;
      this.records[key] = Object.assign(newRecord(ruleId, item.id, at), {
        title: mapped.title,
        description: mapped.description,
        fingerprint: fingerprint(item),
      });
    }
  }

  /** Plans and sends up to one batch. Returns true when the destination went away. */
  async sendBatch(rule, batchId, byId, destinationItems, options, counts) {
    const ruleId = rule.id;
    const entityId = rule.destination_entity_id;
    const pending = this.ruleRecords(ruleId)
      .filter((record) => record.state === "pending")
      .sort((a, b) => (a.enqueued_at < b.enqueued_at ? -1 : a.enqueued_at > b.enqueued_at ? 1 : 0))
      .slice(0, BATCH_SIZE);
    const openTitles = new Map();
    for (const item of destinationItems) {
      if (item.status !== "needs_action") continue;
      const title = normalize(item.summary);
      openTitles.set(title, openTitles.has(title) ? null : item.uid);
    }
    const inFlight = new Map(
      this.ruleRecords(ruleId)
        .filter((record) => record.state === "sending")
        .map((record) => [normalize(record.title), record.key]),
    );
    const lines = planBatch(
      pending.map((record) => [record.key, byId.get(record.source_item_id)]),
      {
        policy: rule.duplicate_policy,
        destinationOpen: openTitles,
        inFlight,
        ...options,
      },
    );
    const at = now();
    for (const line of lines) {
      const record = this.records[line.key];
      if (line.merged_into) {
        // Merged or duplicate of an earlier line in this batch: it stays pending and shares the
        // lead's result, so it is never confirmed before the lead is.
        Object.assign(record, { merged_into: line.merged_into, duplicate_of: line.duplicate_of });
        continue;
      }
      Object.assign(record, {
        title: line.title,
        description: line.description,
        merged_into: null,
        duplicate_of: null,
      });
      if (line.action === "skip_duplicate") {
        for (const member of [record, ...line.members.map((key) => this.records[key])])
          this.set(member, "sent", {
            duplicate_of: line.duplicate_of || "destination",
            sent_at: at,
            sent_fingerprint: member.fingerprint,
            batch_id: batchId,
          });
        counts.skipped_duplicates += 1 + line.members.length;
      }
    }
    let failures = 0;
    for (const line of lines) {
      if (line.action !== "send") continue;
      if (failures >= MAX_LINE_FAILURES || this.stopped || !this.rules[ruleId]) break;
      const group = [this.records[line.key], ...line.members.map((key) => this.records[key])];
      const uid = randomUUID();
      for (const record of group)
        this.set(record, "sending", {
          batch_id: batchId,
          attempts: record.attempts + 1,
          last_error: null,
          destination_uid: uid,
        });
      // Persist "sending" before the call so a crash cannot hide an uncertain write.
      await this.store.save();
      const error = await this.destination.add(entityId, line, uid);
      for (const record of group) {
        if (error === null)
          this.set(record, "sent", { sent_at: now(), sent_fingerprint: record.fingerprint });
        else if (error === "destination_rejected")
          this.set(record, "failed", { last_error: error, destination_uid: null });
        else if (error === "destination_unavailable")
          // Certainly not stored (login or rate limit): the line simply waits for the next pass.
          this.set(record, "pending", {
            attempts: record.attempts - 1,
            last_error: null,
            destination_uid: null,
          });
        else this.set(record, "needs_reconciliation", { last_error: error });
      }
      await this.store.save();
      if (error === "destination_unavailable") return true;
      if (error === null) {
        const duplicates = group.slice(1).filter((record) => record.duplicate_of).length;
        counts.sent += 1;
        counts.merged += group.length - 1 - duplicates;
        counts.skipped_duplicates += duplicates;
        failures = 0;
      } else {
        counts[error === "destination_rejected" ? "failed" : "needs_reconciliation"] +=
          group.length;
        failures += 1;
      }
    }
    return false;
  }

  /** Move mode: checks off items in Mealie that the destination confirmed. Returns failures. */
  async completeSources(ruleId, byId, counts) {
    let failed = 0;
    for (const record of this.ruleRecords(ruleId)) {
      if (record.state !== "sent" || !this.rules[ruleId]) continue;
      const itemId = record.source_item_id;
      let current;
      try {
        current = await this.source.item(itemId);
      } catch (error) {
        if (error?.status === 404) {
          this.set(record, "removed_after_send", { completion_pending: false });
          byId.delete(itemId);
          continue;
        }
        this.set(record, "sent", {
          completion_pending: true,
          last_error: "source_complete_failed",
        });
        failed += 1;
        continue;
      }
      const currentPrint = fingerprint(current);
      if (currentPrint !== record.sent_fingerprint) {
        // Edited between send and completion: the destination holds the old version.
        this.set(record, "changed_after_send", {
          fingerprint: currentPrint,
          completion_pending: false,
        });
        byId.set(itemId, current);
        continue;
      }
      try {
        await this.source.setChecked(itemId, true, current);
      } catch {
        this.set(record, "sent", {
          completion_pending: true,
          last_error: "source_complete_failed",
        });
        failed += 1;
        continue;
      }
      this.set(record, "source_completed", {
        fingerprint: fingerprint(current, true),
        completion_pending: false,
        completed_at: now(),
        last_error: null,
      });
      byId.set(itemId, { ...current, checked: true });
      counts.completed_in_source += 1;
    }
    this.store.delaySave();
    return failed;
  }

  // Rule management

  async ruleStatus(rule) {
    const counts = Object.fromEntries(STATES.map((state) => [state, 0]));
    for (const record of this.ruleRecords(rule.id)) counts[record.state] += 1;
    const scheduled = this.scheduled.get(rule.id);
    return {
      ...structuredClone(rule),
      counts,
      running: !!this.locks.get(rule.id)?.locked,
      next_run_at: scheduled ? scheduled.due.toISOString() : null,
      destination: await this.describe(rule.destination_entity_id, rule.destination_name),
    };
  }

  async state() {
    const rules = await Promise.all(Object.values(this.rules).map((rule) => this.ruleStatus(rule)));
    return {
      supported: true,
      rules,
      // Entries stored before deletes dropped their runs may name rules that are gone.
      audit: structuredClone(this.store.data.audit.filter((e) => this.rules[e.rule_id]).slice(-20)),
    };
  }

  saveRule(draft, options = {}) {
    return this.saveLock.run(() => this.saveRuleLocked(draft, options));
  }

  async saveRuleLocked(
    draft,
    { ruleId = null, expectedRevision = null, resetRecords = false, userId = null },
  ) {
    const fields = validateDraft(draft);
    const existing = ruleId !== null ? this.rule(ruleId) : null;
    if (existing && expectedRevision !== null && expectedRevision !== existing.revision)
      throw new SyncError("conflict", "The sync rule changed elsewhere. Refresh first", 409);
    const destination = await this.requireDestination(fields.destination_entity_id);
    if (
      Object.values(this.rules).some(
        (rule) => rule.source_list_id === fields.source_list_id && rule.id !== ruleId,
      )
    )
      throw new SyncError("sync_source_taken", "Another sync rule already uses this list", 409);
    if (!existing && Object.keys(this.rules).length >= MAX_RULES)
      throw new SyncError("sync_too_many_rules", `At most ${MAX_RULES} sync rules`, 409);
    const retarget =
      !!existing &&
      (existing.source_list_id !== fields.source_list_id ||
        existing.destination_entity_id !== fields.destination_entity_id);
    if (retarget && !resetRecords)
      throw new SyncError(
        "invalid_request",
        "Changing source or destination drops the sync history; confirm it",
      );
    const source = (await this.source.lists()).find((row) => row.id === fields.source_list_id);
    if (!source) throw new SyncError("invalid_request", "Unknown source shopping list");
    const sourceName = String(source.name || "").slice(0, 100);
    const at = now();
    const { name: draftName, ...rest } = fields;
    const name = draftName || `${sourceName} → ${destination.name}`.slice(0, 60).trim();
    let rule;
    if (!existing) {
      const id = randomUUID();
      rule = {
        id,
        revision: 1,
        name,
        source_list_name: sourceName,
        ...rest,
        destination_name: destination.name,
        activated: false,
        paused: false,
        created_by: userId,
        created_at: at,
        updated_at: at,
        last_run: null,
      };
      this.rules[id] = rule;
    } else {
      rule = existing;
      if (retarget) {
        for (const record of this.ruleRecords(rule.id)) delete this.records[record.key];
        rule.activated = false;
        this.cancelScheduled(rule.id);
      }
      Object.assign(rule, rest, {
        name,
        source_list_name: sourceName,
        destination_name: destination.name,
        revision: rule.revision + 1,
        updated_at: at,
      });
    }
    await this.store.save();
    this.stopWatcher(rule.id);
    this.refreshWatchers();
    return this.ruleStatus(rule);
  }

  async deleteRule(ruleId) {
    this.rule(ruleId);
    delete this.rules[ruleId];
    for (const record of this.ruleRecords(ruleId)) delete this.records[record.key];
    // "Recent runs" has no rule names, so runs of a deleted rule would read as current ones.
    this.store.data.audit = this.store.data.audit.filter((entry) => entry.rule_id !== ruleId);
    this.cancelScheduled(ruleId);
    this.stopWatcher(ruleId);
    this.rerun.delete(ruleId);
    await this.store.save();
  }

  async setPaused(ruleId, paused) {
    const rule = this.rule(ruleId);
    Object.assign(rule, { paused, revision: rule.revision + 1, updated_at: now() });
    if (paused) this.cancelScheduled(ruleId);
    await this.store.save();
    this.refreshWatchers();
    return this.ruleStatus(rule);
  }

  async retry(ruleId, recordKeys) {
    const rule = this.rule(ruleId);
    if (!rule.activated)
      throw new SyncError("sync_not_activated", "Send the first batch before retrying", 409);
    const wanted = recordKeys ? new Set(recordKeys) : null;
    for (const record of this.ruleRecords(ruleId))
      if (record.state === "failed" && (!wanted || wanted.has(record.key)))
        this.set(record, "pending", { last_error: null, merged_into: null, duplicate_of: null });
    await this.store.save();
    return this.run(ruleId, "retry");
  }

  async resolve(ruleId, recordKey, action) {
    this.rule(ruleId);
    const record = this.records[recordKey];
    if (!record || record.rule_id !== ruleId)
      throw new SyncError("invalid_request", "Unknown sync record");
    if (
      !["changed_after_send", "removed_after_send", "needs_reconciliation"].includes(record.state)
    )
      throw new SyncError("invalid_request", "Only conflicts and uncertain items can be resolved");
    const group = [record, ...this.members(record)];
    let deleted = false;
    for (const member of group) {
      if (action === "resend") {
        this.set(member, "pending", {
          sent_fingerprint: null,
          merged_into: null,
          duplicate_of: null,
          destination_uid: null,
          last_error: null,
          completion_pending: false,
          sent_at: null,
          completed_at: null,
        });
      } else if (member.state === "removed_after_send") {
        delete this.records[member.key];
        deleted = true;
      } else if (member.completed_at) {
        // Deliberate deviation from the contract (which says `sent`): the item was already checked
        // off in Mealie once, so `sent` would make a move rule check it off again. Accept the
        // current Mealie state as the new baseline instead.
        this.set(member, "source_completed", { last_error: null });
      } else {
        this.set(member, "sent", {
          sent_fingerprint: member.fingerprint,
          sent_at: member.sent_at || now(),
          last_error: null,
        });
      }
    }
    await this.store.save();
    return { record: publicRecord(record), ...(deleted ? { deleted: true } : {}) };
  }

  listRecords(ruleId, states, limit) {
    this.rule(ruleId);
    return this.ruleRecords(ruleId)
      .filter((record) => !states || states.includes(record.state))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0))
      .slice(0, limit)
      .map(publicRecord);
  }

  /** Shows the first batch of a rule or draft without writing anything. */
  async preview({ ruleId, draft }) {
    const fields = ruleId !== undefined ? this.rule(ruleId) : validateDraft(draft);
    const destination = await this.requireDestination(fields.destination_entity_id);
    const options = this.options(destination);
    const items = await this.source.items(fields.source_list_id);
    const candidates = items.filter((item) => {
      if (typeof item.id !== "string" || item.checked) return false;
      const record = ruleId !== undefined ? this.records[`${ruleId}:${item.id}`] : undefined;
      return !record || record.state === "pending";
    });
    const openTitles = new Map();
    for (const item of (await this.destination.items(fields.destination_entity_id)) || [])
      if (item.status === "needs_action") openTitles.set(normalize(item.summary), item.uid);
    const lines = planBatch(
      candidates.slice(0, BATCH_SIZE).map((item) => [item.id, item]),
      {
        policy: fields.duplicate_policy,
        destinationOpen: openTitles,
        inFlight: new Map(),
        ...options,
      },
    );
    const sampleLine = lines.find((line) => line.action !== "skip_empty");
    let sample;
    if (sampleLine)
      sample = mapItem(
        candidates.find((item) => item.id === sampleLine.key),
        options,
      );
    else {
      const german = options.decimalComma;
      sample = mapItem(
        {
          quantity: 300,
          unit: { name: "g", abbreviation: "g", useAbbreviation: true },
          food: { name: german ? "Kartoffeln" : "potatoes" },
          note: german ? "festkochend" : "waxy",
        },
        options,
      );
    }
    return {
      capabilities: destination.supports,
      sample: { title: sample.title, description: sample.description },
      lines: lines.map((line) => ({
        source_item_id: line.key,
        title: line.title,
        description: line.description,
        action: line.action,
        ...(line.merged_into ? { merged_into: line.merged_into } : {}),
      })),
      total_candidates: candidates.length,
    };
  }
}

/** A destination problem outside a pass (list, save, preview) as a `SyncError`. */
function destinationFailure(error) {
  if (error instanceof BringAuthError)
    return new SyncError("destination_auth", "Bring! refused the credentials", 502);
  if (error instanceof BringRateLimitError)
    return new SyncError("destination_rate_limit", "Bring! is rate limiting requests", 502);
  if (error instanceof BringNetworkError || error instanceof BringRequestError)
    return new SyncError("destination_unavailable", "Bring! is unreachable", 502);
  return error;
}

// Messages (the `mealie_atelier/sync_*` contract of the Bridge)

const need = (condition, message = "Invalid request") => {
  if (!condition) throw new SyncError("invalid_request", message);
};
const text = (value) => typeof value === "string" && value.length > 0;

/** Answers one `mealie_atelier/sync_*` message; the caller has already checked permissions. */
export async function handleSyncMessage(manager, msg) {
  const type = String(msg.type).replace(/^mealie_atelier\//, "");
  switch (type) {
    case "sync_state":
      return manager.state();
    case "sync_destinations":
      return { entities: await manager.destinations() };
    case "sync_preview": {
      need(!("rule_id" in msg && "rule" in msg), "Send rule_id or rule");
      if ("rule_id" in msg) {
        need(text(msg.rule_id), "rule_id must be a string");
        return manager.preview({ ruleId: msg.rule_id });
      }
      need("rule" in msg, "Send rule_id or rule");
      return manager.preview({ draft: msg.rule });
    }
    case "sync_rule_save": {
      need(isObject(msg.rule), "rule must be an object");
      need(msg.rule_id === undefined || text(msg.rule_id), "rule_id must be a string");
      need(
        msg.expected_revision === undefined || Number.isInteger(msg.expected_revision),
        "expected_revision must be a whole number",
      );
      need(
        msg.reset_records === undefined || typeof msg.reset_records === "boolean",
        "reset_records must be a boolean",
      );
      const rule = await manager.saveRule(msg.rule, {
        ruleId: msg.rule_id ?? null,
        expectedRevision: msg.expected_revision ?? null,
        resetRecords: msg.reset_records === true,
        userId: msg.user_id ?? null,
      });
      return { rule };
    }
    case "sync_rule_delete":
      need(text(msg.rule_id), "rule_id must be a string");
      await manager.deleteRule(msg.rule_id);
      return { deleted: true };
    case "sync_run": {
      need(text(msg.rule_id), "rule_id must be a string");
      need(
        msg.confirm_first_batch === undefined || typeof msg.confirm_first_batch === "boolean",
        "confirm_first_batch must be a boolean",
      );
      const confirm = msg.confirm_first_batch === true;
      const rule = manager.rule(msg.rule_id);
      if (!rule.activated && !confirm)
        throw new SyncError(
          "sync_not_activated",
          "Confirm the first batch before this rule runs",
          409,
        );
      return manager.run(msg.rule_id, "manual", { confirmFirstBatch: confirm });
    }
    case "sync_pause":
    case "sync_resume":
      need(text(msg.rule_id), "rule_id must be a string");
      return { rule: await manager.setPaused(msg.rule_id, type === "sync_pause") };
    case "sync_retry":
      need(text(msg.rule_id), "rule_id must be a string");
      need(
        msg.record_keys === undefined ||
          (Array.isArray(msg.record_keys) &&
            msg.record_keys.length <= 2000 &&
            msg.record_keys.every(text)),
        "record_keys must be a list of up to 2000 strings",
      );
      return manager.retry(msg.rule_id, msg.record_keys);
    case "sync_resolve":
      need(text(msg.rule_id) && text(msg.record_key), "rule_id and record_key are required");
      need(["dismiss", "resend"].includes(msg.action), "action must be dismiss or resend");
      return manager.resolve(msg.rule_id, msg.record_key, msg.action);
    case "sync_records": {
      need(text(msg.rule_id), "rule_id must be a string");
      const limit = msg.limit ?? 50;
      need(Number.isInteger(limit) && limit >= 1 && limit <= 200, "limit must be 1 to 200");
      need(
        msg.states === undefined ||
          (Array.isArray(msg.states) && msg.states.every((s) => STATES.includes(s))),
        "Unknown record state",
      );
      return { records: manager.listRecords(msg.rule_id, msg.states, limit) };
    }
    default:
      throw new SyncError("invalid_request", "Unknown API command");
  }
}
