/* Standalone PWA shopping sync and server timer control. Imported by the normal app shell. */
import "./offline-core.js";
const store = self.AtelierOfflineCore;
const offlineError = (code) => Object.assign(new Error(code), { code });
const syncChannel =
  typeof BroadcastChannel === "function" ? new BroadcastChannel("mealie-atelier-sync") : null;
export const OFFLINE_ACTIONS = [
  "shopping_toggle",
  "shopping_add",
  "shopping_delete",
  "shopping_update",
  "shopping_clear_checked",
];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export class AtelierOfflineClient {
  constructor() {
    this.enabled = false;
    this.snapshot = null;
    this.operations = [];
    this.onChange = () => {};
    this.syncing = false;
    this.onStatus = () => {};
    this.retryTimer = null;
    this.lastError = "";
  }
  async init() {
    await store.migrate();
    this.enabled = Boolean(await store.get("enabled"));
    this.snapshot = (await store.get("snapshot")) || null;
    this.operations = await store.allOps();
    if (syncChannel) syncChannel.onmessage = () => this.reload().catch(() => {});
    window.addEventListener("online", () => this.sync().catch(() => {}));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.sync().catch(() => {});
    });
    if (this.enabled) this.sync().catch(() => {});
    this.retryTimer = setInterval(() => {
      if (this.enabled && !document.hidden && navigator.onLine) this.sync().catch(() => {});
    }, 20000);
    this.onChange();
    return this;
  }
  get pendingCount() {
    return this.operations.filter((x) => ["pending", "sending"].includes(x.state)).length;
  }
  get conflicts() {
    return this.operations.filter((x) => x.state === "conflict");
  }
  get shopping() {
    return store.withPending(this.snapshot, this.operations);
  }
  async reload() {
    this.operations = await store.allOps();
    this.snapshot = (await store.get("snapshot")) || this.snapshot;
    this.onChange();
  }
  async enable() {
    this.enabled = true;
    await store.put("enabled", true);
    this.onChange();
    navigator.serviceWorker?.ready
      .then((reg) => reg.active?.postMessage({ type: "ENABLE_OFFLINE" }))
      .catch(() => {});
    await this.sync();
  }
  async disable() {
    this.enabled = false;
    await store.put("enabled", false);
    await store.del("snapshot");
    await store.del("permissions");
    await store.clearOps();
    this.snapshot = null;
    this.operations = [];
    this.onChange();
    this.notifyOtherTabs();
    navigator.serviceWorker?.ready
      .then((reg) => reg.active?.postMessage({ type: "CLEAR_OFFLINE" }))
      .catch(() => {});
  }
  notifyOtherTabs() {
    syncChannel?.postMessage({ type: "updated" });
  }
  async getShopping(originalBridge) {
    if (!this.enabled) return originalBridge();
    if (navigator.onLine) {
      try {
        const remote = await originalBridge();
        this.snapshot = remote;
        await store.put("snapshot", remote);
        await this.reload();
        return this.shopping;
      } catch (e) {
        this.lastError = e.code || "offlineUnexpectedError";
        if (!this.snapshot) throw e;
      }
    }
    if (this.snapshot) return this.shopping;
    throw offlineError("offlineNoSnapshot");
  }
  async enqueue(action, payload) {
    if (!this.enabled) throw offlineError("offlineNotEnabled");
    if (!this.snapshot) throw offlineError("offlineListNeedsRefresh");
    if (!OFFLINE_ACTIONS.includes(action)) throw offlineError("offlineRequiresConnection");
    const id = crypto.randomUUID();
    let data = { ...payload };
    if (action === "shopping_toggle") {
      const item = this.shopping.items.find((x) => String(x.id) === String(data.item_id));
      const original = this.snapshot.items.find((x) => String(x.id) === String(data.item_id));
      if (!item || !original || store.isTemporary(item))
        throw offlineError("offlineItemNotEditable");
      const previous = this.operations.find(
        (x) =>
          x.action === "shopping_toggle" &&
          x.payload.item_id === data.item_id &&
          x.state === "pending",
      );
      if (previous) {
        await store.deleteOp(previous.id);
        this.operations = this.operations.filter((x) => x !== previous);
      }
      if (data.checked === original.checked) {
        this.onChange();
        this.notifyOtherTabs();
        return { queued: false, reverted: true };
      }
      data.expected_checked = original.checked;
    } else if (action === "shopping_delete" || action === "shopping_update") {
      const item = this.shopping.items.find((x) => String(x.id) === String(data.item_id));
      if (!item || store.isTemporary(item)) throw offlineError("offlineItemNotEditable");
      if (action === "shopping_update") {
        const keys = ["item_id", "note", "name", "quantity"];
        for (const key of Object.keys(data)) if (!keys.includes(key)) delete data[key];
        if (Object.keys(data).length < 2 || ("name" in data && "note" in data))
          throw offlineError("offlineInvalidItem");
        // What the user saw, so the replay can report an edit made on another device meanwhile.
        if ("name" in data)
          data.expected_name = String(item.display || item.note || item.food?.name || "");
        if ("note" in data) data.expected_note = String(item.note || "");
        if ("quantity" in data || "name" in data)
          data.expected_quantity = Number(item.quantity) || 0;
      }
    } else if (action === "shopping_clear_checked") {
      if (!this.snapshot.lists.some((l) => String(l.id) === String(data.list_id)))
        throw offlineError("offlineInvalidItem");
      // The ticked rows the user saw. Without them the clear would remove ticks made elsewhere.
      const seenIds =
        Array.isArray(data.expected_ids) && data.expected_ids.length
          ? data.expected_ids.map(String)
          : this.shopping.items
              .filter(
                (x) =>
                  x.checked === true &&
                  String(x.shoppingListId) === String(data.list_id) &&
                  !store.isTemporary(x),
              )
              .map((x) => String(x.id));
      if (!seenIds.length) throw offlineError("offlineInvalidItem");
      data = { list_id: data.list_id, expected_ids: seenIds };
    } else {
      if (
        typeof data.note !== "string" ||
        !data.note.trim() ||
        data.note.length > 250 ||
        !this.snapshot.lists.some((l) => String(l.id) === String(data.list_id))
      )
        throw offlineError("offlineInvalidItem");
    }
    this.operations.push({ id, action, payload: data, state: "pending", createdAt: Date.now() });
    await store.putOp(this.operations[this.operations.length - 1]);
    this.onChange();
    this.notifyOtherTabs();
    if (navigator.serviceWorker?.ready) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.sync?.register("mealie-atelier-shopping").catch(() => {}),
      );
    }
    if (navigator.onLine) this.sync().catch(() => {});
    return { queued: true, id };
  }
  async sync() {
    if (!this.enabled || this.syncing || !navigator.onLine) return;
    this.syncing = true;
    this.onChange();
    try {
      const replayed = await store.replay({ notify: () => this.notifyOtherTabs() });
      this.snapshot = await store.bridge("mealie_atelier/shopping");
      await store.put("snapshot", this.snapshot);
      // Visible notice when queued edits were dropped because the account has no write grant.
      this.lastError = replayed?.dropped ? "errWriteNotPermitted" : "";
    } catch (e) {
      this.lastError = e.code || "offlineUnexpectedError";
    } finally {
      this.syncing = false;
      await this.reload();
      this.onChange();
    }
  }
  async discard(id) {
    const target = this.operations.find((x) => x.id === id && x.state === "conflict");
    if (!target) return;
    this.operations = this.operations.filter((x) => x !== target);
    await store.deleteOp(target.id);
    this.onChange();
    this.notifyOtherTabs();
  }
  async refresh() {
    await this.reload();
    return this.shopping;
  }
}
export class AtelierAlarmClient {
  constructor() {
    this.capabilities = null;
    this.alarms = [];
    this.onChange = () => {};
    this.lastError = "";
    this.subscription = null;
  }
  async init() {
    try {
      this.capabilities = await store.bridge("mealie_atelier/alarm_capabilities");
      const status = await store.bridge("mealie_atelier/alarms");
      this.alarms = status.alarms || [];
      const registration = await navigator.serviceWorker?.getRegistration?.("/");
      this.subscription = (await registration?.pushManager?.getSubscription?.()) || null;
    } catch (e) {
      this.lastError = e.code || "offlineUnexpectedError";
    }
    this.onChange();
    return this;
  }
  async subscribe() {
    if (!this.capabilities?.webPush) throw offlineError("offlinePushKeysMissing");
    if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window))
      throw offlineError("offlinePushRequiresHttps");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw offlineError("offlinePushPermissionDenied");
    const reg = await navigator.serviceWorker.ready;
    const key = Uint8Array.from(
      atob(this.capabilities.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    await store.bridge("mealie_atelier/push_register", { subscription: sub.toJSON() });
    this.subscription = sub;
    this.lastError = "";
    this.onChange();
    return true;
  }
  async create(timer) {
    if (!navigator.onLine) throw offlineError("offlineAlarmRequiresServer");
    const result = await store.bridge("mealie_atelier/alarm_create", { timer });
    this.alarms.push(result);
    this.onChange();
    return result;
  }
  async cancel(id) {
    let result;
    try {
      result = await store.bridge("mealie_atelier/alarm_cancel", { timer_id: id });
    } catch (e) {
      if (!["timer_dispatched", "timer_not_found"].includes(e?.code)) throw e;
      // Already gone off or removed elsewhere: nothing is left to stop, so reload the list instead of failing.
      await this.refresh().catch(() => {});
      return null;
    }
    this.alarms = this.alarms.map((x) => (x.id === id ? result : x));
    this.onChange();
    return result;
  }
  async refresh() {
    const result = await store.bridge("mealie_atelier/alarms");
    this.alarms = result.alarms || [];
    this.onChange();
    return result;
  }
}
export function formatConflictCount(t, problems) {
  if (!problems) return "";
  return problems === 1 ? t("offlineConflictOne") : t("offlineConflictCount", { count: problems });
}

/** Resolves an offline or Bridge error to translated text: a direct key, then the err* key of its code. */
export function localizeOfflineError(card, error) {
  const translate = (key) => card?.t?.(key);
  const code = typeof error?.code === "string" ? error.code : "";
  const bridgeKey = /^[a-z][a-z0-9_]*$/.test(code)
    ? "err" + code.replace(/(?:^|_)([a-z0-9])/g, (_, c) => c.toUpperCase())
    : "";
  for (const key of [error?.code, bridgeKey, error?.message])
    if (key && translate(key) !== key) return translate(key);
  return translate("offlineUnexpectedError") ?? "offlineUnexpectedError";
}

export function attachOfflineUi(card, offline, alarms) {
  const t = (key, values) => card?.t?.(key, values) ?? key;
  const localizedError = (error) => localizeOfflineError(card, error);
  const panel = document.createElement("details");
  panel.className = "atelier-connectivity";
  panel.setAttribute("aria-label", t("offlinePanelLabel"));
  panel.innerHTML = `
    <summary class="a-summary">
      <span class="a-summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.8 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.2-3"/></svg></span>
      <span class="a-summary-copy"><strong>${t("offlineSyncTimers")}</strong><small id="a-sync-summary" role="status" aria-live="polite">${t("offlineLoading")}</small></span>
      <span class="a-sync-indicator" id="a-sync-indicator" aria-hidden="true"></span>
      <svg class="a-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="a-connectivity-details" id="a-connectivity-details">
      <section class="a-connectivity-group" aria-labelledby="a-shopping-title">
        <header><h3 id="a-shopping-title">${t("offlineShopping")}</h3></header>
        <p>${t("offlineStorageNote")}</p>
        <p class="a-error" id="a-sync-error" hidden role="alert"></p>
        <div class="a-actions"><button type="button" id="a-sync-enable">${t("offlineEnable")}</button><button type="button" data-quiet id="a-sync-now" hidden>${t("offlineSyncNow")}</button><button type="button" data-quiet id="a-sync-conflicts" hidden>${t("offlineReviewConflicts")}</button></div>
        <div class="a-conflicts" id="a-conflicts" hidden></div>
      </section>
      <section class="a-connectivity-group" aria-labelledby="a-timers-title">
        <header><h3 id="a-timers-title">${t("offlineBackgroundTimers")}</h3></header>
        <p id="a-alarm-status" role="status">${t("offlineCheckingDelivery")}</p>
        <div class="a-actions"><button type="button" id="a-push-enable" hidden>${t("offlineAllowPush")}</button><button type="button" data-quiet id="a-alarm-refresh">${t("offlineRefreshTimers")}</button></div>
        <div class="a-alarms" id="a-alarms"></div>
      </section>
    </div>`;
  const host = document.querySelector("main") || document.body;
  host.insertBefore(panel, card);
  const $ = (id) => panel.querySelector("#" + id);
  const renderConflicts = () => {
    const box = $("a-conflicts");
    box.replaceChildren();
    for (const op of offline.conflicts) {
      const row = document.createElement("div");
      row.className = "a-conflict";
      const copy = document.createElement("div");
      copy.className = "a-conflict-copy";
      const title = document.createElement("strong");
      title.textContent =
        op.action === "shopping_toggle" ? t("offlineConflictToggle") : t("offlineConflictList");
      const desc = document.createElement("small");
      desc.textContent = op.code
        ? localizedError({ code: op.code })
        : op.reason || t("offlineReviewCurrentList");
      copy.append(title, desc);
      const discard = document.createElement("button");
      discard.type = "button";
      discard.textContent = t("offlineDiscardChange");
      discard.dataset.discard = op.id;
      row.append(copy, discard);
      box.append(row);
    }
  };
  const renderAlarms = () => {
    const box = $("a-alarms");
    box.replaceChildren();
    const active = alarms.alarms
      .filter((a) => ["scheduled", "retry", "sending"].includes(a.status))
      .slice(0, 5);
    for (const alarm of active) {
      const row = document.createElement("div");
      row.className = "a-alarm";
      const copy = document.createElement("div");
      copy.className = "a-conflict-copy";
      const title = document.createElement("strong");
      title.textContent = alarm.label;
      const time = document.createElement("small");
      const locale = card?._locale || "en-US";
      const formattedTime = new Date(alarm.deadline).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
      time.textContent = t("offlinePlanned", { time: formattedTime });
      copy.append(title, time);
      row.append(copy);
      if (alarm.status === "scheduled" || alarm.status === "retry") {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.cancelAlarm = alarm.id;
        button.textContent = t("offlineStopTimer");
        row.append(button);
      }
      box.append(row);
    }
  };
  const update = () => {
    const offlineNow = !navigator.onLine,
      problems = offline.conflicts.length;
    const conflicts = formatConflictCount(t, problems);
    const syncing = offline.syncing ? t("offlineSyncing") : "";
    const status = t("offlineStatus", {
      connection: offlineNow ? "Offline" : "Online",
      pending: offline.pendingCount,
      conflicts,
      syncing,
    });
    $("a-sync-summary").textContent = !offline.enabled ? t("offlineDisabled") : status;
    $("a-sync-indicator").dataset.tone = offlineNow
      ? "offline"
      : problems || offline.pendingCount
        ? "warning"
        : "ok";
    $("a-sync-enable").textContent = offline.enabled ? t("offlineClearLocal") : t("offlineEnable");
    $("a-sync-now").hidden = !offline.enabled;
    $("a-sync-now").disabled = offlineNow || offline.syncing;
    $("a-sync-conflicts").hidden = !problems;
    $("a-sync-error").hidden = !offline.lastError;
    $("a-sync-error").textContent = offline.lastError
      ? localizedError({ code: offline.lastError })
      : "";
    const caps = alarms.capabilities;
    const channel = caps?.homeAssistant
      ? t("offlineHomeAssistantActive")
      : caps?.webPush
        ? t("offlinePushConfigured")
        : t("offlineNoAlarmChannel");
    $("a-alarm-status").textContent =
      channel + (alarms.lastError ? " · " + localizedError({ code: alarms.lastError }) : "");
    $("a-push-enable").hidden = !caps?.webPush;
    $("a-push-enable").textContent = alarms.subscription
      ? t("offlinePushReady")
      : t("offlineAllowPush");
    $("a-push-enable").disabled = Boolean(alarms.subscription);
    if (offline.enabled && card?._view === "shopping" && offline.snapshot) {
      card._data.shopping = offline.shopping;
      card._render();
    }
    if (!$("a-conflicts").hidden) renderConflicts();
    renderAlarms();
  };
  offline.onChange = update;
  alarms.onChange = update;
  window.addEventListener("offline", update);
  window.addEventListener("online", update);
  card?.addEventListener("mealie-atelier-language-change", update);
  $("a-sync-enable").addEventListener("click", async () => {
    try {
      if (offline.enabled) {
        if (
          !(await card._atelierDialog({
            title: t("offlineDeleteConfirmTitle"),
            body: t("offlineDeleteConfirmBody"),
            confirmLabel: t("offlineDeleteConfirmAction"),
          }))
        )
          return;
        await offline.disable();
      } else if (
        await card._atelierDialog({
          title: t("offlineEnableConfirmTitle"),
          body: t("offlineEnableConfirmBody"),
          confirmLabel: t("offlineEnableConfirmAction"),
        })
      )
        await offline.enable();
    } catch (e) {
      card._flash(localizedError(e));
    }
  });
  $("a-sync-now").addEventListener("click", () => offline.sync());
  $("a-sync-conflicts").addEventListener("click", () => {
    const box = $("a-conflicts");
    box.hidden = !box.hidden;
    if (!box.hidden) renderConflicts();
  });
  $("a-conflicts").addEventListener("click", async (event) => {
    const b = event.target.closest("button[data-discard]");
    if (!b) return;
    await offline.discard(b.dataset.discard);
    $("a-conflicts").hidden = true;
  });
  $("a-push-enable").addEventListener("click", async () => {
    try {
      await alarms.subscribe();
    } catch (e) {
      alarms.lastError = e.code || "offlineUnexpectedError";
      alarms.onChange();
      card._flash(`${t("offlineAlarmError")}: ${localizedError(e)}`);
    }
  });
  $("a-alarm-refresh").addEventListener("click", async () => {
    try {
      await alarms.refresh();
    } catch (e) {
      alarms.lastError = e.code || "offlineUnexpectedError";
      alarms.onChange();
    }
  });
  $("a-alarms").addEventListener("click", async (event) => {
    const b = event.target.closest("button[data-cancel-alarm]");
    if (!b) return;
    try {
      await alarms.cancel(b.dataset.cancelAlarm);
    } catch (e) {
      card._flash(localizedError(e));
    }
  });
  update();
  return panel;
}
