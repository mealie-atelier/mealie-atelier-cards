/* Standalone PWA shopping sync and server timer control. Imported by the normal app shell. */
import "./offline-core.js";
const store = self.AtelierOfflineCore;
const offlineError = (code) => Object.assign(new Error(code), { code });
const syncChannel =
  typeof BroadcastChannel === "function" ? new BroadcastChannel("mealie-atelier-sync") : null;
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
    if (!["shopping_toggle", "shopping_add"].includes(action))
      throw offlineError("offlineRequiresConnection");
    const id = crypto.randomUUID(),
      data = { ...payload };
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
      await store.replay({ notify: () => this.notifyOtherTabs() });
      this.snapshot = await store.bridge("mealie_atelier/shopping");
      await store.put("snapshot", this.snapshot);
      this.lastError = "";
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
    const result = await store.bridge("mealie_atelier/alarm_cancel", { timer_id: id });
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
export function attachOfflineUi(card, offline, alarms) {
  const t = (key, values) => card?.t?.(key, values) ?? key;
  const localizedError = (error) => {
    const key = error?.code || error?.message;
    return key && card?.t?.(key) !== key ? t(key) : t("offlineUnexpectedError");
  };
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
      desc.textContent = op.reason || t("offlineReviewCurrentList");
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
    const conflicts = problems ? t("offlineConflictCount", { count: problems }) : "";
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
    $("a-sync-error").textContent = offline.lastError ? t(offline.lastError) : "";
    const caps = alarms.capabilities;
    const channel = caps?.homeAssistant
      ? t("offlineHomeAssistantActive")
      : caps?.webPush
        ? t("offlinePushConfigured")
        : t("offlineNoAlarmChannel");
    $("a-alarm-status").textContent =
      channel + (alarms.lastError ? " · " + t(alarms.lastError) : "");
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
