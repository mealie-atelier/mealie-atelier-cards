/** Server-owned, restart-safe timer scheduler. Closing all browsers does not stop the schedule. */
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { validateSubscription, subscriptionId } from "./web-push.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const err = (status, message) => Object.assign(new Error(message), { status });
const mayAccess = (alarm, access) =>
  !access || access.admin === true || (!!alarm.owner && alarm.owner === access.name);
const initial = () => ({ alarms: [], subscriptions: [] });
export class AlarmStore {
  constructor({ dir, deliver, clock = () => Date.now(), interval = 1000 }) {
    this.file = join(dir, "alarms.json");
    this.dir = dir;
    this.deliver = deliver;
    this.clock = clock;
    this.interval = interval;
    this.lock = Promise.resolve();
    this.handle = null;
  }
  async load() {
    try {
      const data = JSON.parse(await readFile(this.file, "utf8"));
      if (!Array.isArray(data.alarms) || !Array.isArray(data.subscriptions))
        throw Error("Invalid alarms data");
      return data;
    } catch (e) {
      if (e.code === "ENOENT") return initial();
      throw e;
    }
  }
  async save(data) {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const file = this.file + "." + randomUUID() + ".tmp";
    await writeFile(file, JSON.stringify(data, null, 2), { mode: 0o600, flag: "wx" });
    await rename(file, this.file);
  }
  atomic(callback) {
    const task = this.lock.then(async () => {
      const data = await this.load();
      const before = JSON.stringify(data);
      const result = await callback(data);
      if (JSON.stringify(data) !== before) await this.save(data);
      return result;
    });
    this.lock = task.catch(() => {});
    return task;
  }
  /**
   * `access` is `{ name, admin }` for a signed-in caller. Admins see every timer, others only
   * their own; timers stored without an owner are admin only. Without `access` (internal use)
   * nothing is filtered.
   */
  list(access) {
    return this.load().then((d) => ({
      alarms: d.alarms
        .filter((x) => x.createdAt > this.clock() - 7 * 86400000 && mayAccess(x, access))
        .map((x) => ({ ...x })),
      pushSubscribers: d.subscriptions.length,
    }));
  }
  async create({ id, label, deadline, locale = "de" }, owner = "") {
    if (!UUID.test(id || "") || typeof label !== "string" || !label.trim() || label.length > 100)
      throw err(400, "Invalid timer");
    if (!["de", "en"].includes(locale)) throw err(400, "Invalid timer locale");
    const time = Number(deadline),
      now = this.clock();
    if (!Number.isSafeInteger(time) || time < now + 1000 || time > now + 24 * 3600e3)
      throw err(400, "Timer must be 1 second to 24 hours in the future");
    return this.atomic(async (d) => {
      const same = d.alarms.find((x) => x.id === id);
      if (same) {
        if (same.owner && owner && same.owner !== owner)
          throw err(409, "Timer ID was already used");
        if (same.deadline !== time || same.label !== label.trim() || same.locale !== locale)
          throw err(409, "Timer ID was already used");
        return same;
      }
      const active = d.alarms.filter((x) => ["scheduled", "retry", "sending"].includes(x.status));
      if (active.length >= 300) throw err(429, "Too many stored timers");
      if (owner && active.filter((x) => x.owner === owner).length >= 20)
        throw err(429, "Too many active timers for this account");
      const record = {
        id,
        label: label.trim(),
        locale,
        deadline: time,
        owner: String(owner || ""),
        status: "scheduled",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        nextAttemptAt: time,
        channels: [],
        message: "",
      };
      d.alarms.push(record);
      return record;
    });
  }
  async cancel(id, access) {
    if (!UUID.test(id || "")) throw err(400, "Invalid timer ID");
    return this.atomic(async (d) => {
      const a = d.alarms.find((x) => x.id === id);
      if (!a) throw err(404, "Timer not found");
      if (!mayAccess(a, access))
        throw Object.assign(err(403, "Only the owner or an admin can cancel this timer"), {
          code: "unauthorized",
        });
      if (a.status === "sent" || a.status === "sending")
        throw err(409, "Timer has already been dispatched");
      a.status = "cancelled";
      a.updatedAt = this.clock();
      return a;
    });
  }
  async register(subscription) {
    const sub = validateSubscription(subscription),
      id = subscriptionId(sub);
    return this.atomic(async (d) => {
      if (!d.subscriptions.some((x) => x.id === id)) {
        if (d.subscriptions.length >= 16) throw err(429, "Too many devices subscribed");
        d.subscriptions.push({ id, subscription: sub, createdAt: this.clock() });
      }
      return { id, subscribed: true };
    });
  }
  async unregister(subscription) {
    const id = subscriptionId(subscription);
    return this.atomic(async (d) => {
      d.subscriptions = d.subscriptions.filter((x) => x.id !== id);
      return { removed: true };
    });
  }
  async start() {
    if (this.handle) return;
    await this.recover();
    this.handle = setInterval(
      () => this.tick().catch((e) => console.error("Alarm tick:", e.message)),
      this.interval,
    );
    this.handle.unref?.();
    await this.tick();
  }
  stop() {
    if (this.handle) clearInterval(this.handle);
    this.handle = null;
  }
  async recover() {
    await this.atomic(async (d) => {
      for (const a of d.alarms)
        if (a.status === "sending") {
          a.status = "retry";
          a.nextAttemptAt = this.clock() + 2000;
          a.message = "Restart after interrupted delivery";
        }
    });
  }
  async tick() {
    // Keep the critical section short; only one due alarm is claimed per tick.
    const target = await this.atomic(async (d) => {
      const now = this.clock();
      d.alarms = d.alarms.filter(
        (x) =>
          x.createdAt > now - 7 * 86400000 || ["scheduled", "retry", "sending"].includes(x.status),
      );
      const a = d.alarms.find(
        (x) => ["scheduled", "retry"].includes(x.status) && x.nextAttemptAt <= now,
      );
      if (!a) return null;
      if (a.deadline < now - 24 * 3600e3) {
        a.status = "expired";
        return null;
      }
      a.status = "sending";
      a.attempts++;
      a.updatedAt = now;
      return { ...a, subscriptions: d.subscriptions.map((x) => ({ ...x })) };
    });
    if (!target) return false;
    let result;
    try {
      result = await this.deliver(target);
    } catch (e) {
      result = {
        accepted: false,
        channels: [],
        expiredIds: [],
        error: e.message || "Delivery failed",
      };
    }
    await this.atomic(async (d) => {
      const a = d.alarms.find((x) => x.id === target.id);
      if (!a || a.status === "cancelled") return;
      if (result.expiredIds?.length)
        d.subscriptions = d.subscriptions.filter((s) => !result.expiredIds.includes(s.id));
      a.channels = result.channels || [];
      a.updatedAt = this.clock();
      a.message = String(result.error || "").slice(0, 180);
      if (result.accepted) {
        a.status = "sent";
        a.sentAt = this.clock();
      } else if (a.attempts >= 10 || this.clock() - a.deadline > 60 * 60e3) {
        a.status = "failed";
      } else {
        a.status = "retry";
        a.nextAttemptAt = this.clock() + Math.min(120000, 2000 * 2 ** Math.min(a.attempts, 6));
      }
    });
    return true;
  }
}
