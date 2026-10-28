/** Offline queue for shopping edits (ticks and added notes) in the Home Assistant card. */
const OFFLINE_CAP = 100;
const OFFLINE_ACTIONS = ["shopping_toggle", "shopping_add"];
const OFFLINE_CONFLICT_CODES = ["offline_conflict", "offline_add_uncertain", "offline_op_reused"];

/** Index of the last waiting tick on an item (no `findLastIndex`: older wall tablets lack it). */
function lastToggleIndex(ops, itemId) {
  for (let index = ops.length - 1; index >= 0; index--) {
    const op = ops[index];
    if (op.state !== "conflict" && op.action === "shopping_toggle" && op.payload.item_id === itemId)
      return index;
  }
  return -1;
}

export const offlineQueueMethods = {
  /** Active only when no host owns a queue, the Bridge can replay and the user may write. */
  _offlineActive() {
    return (
      this._providerActive !== "home_assistant" &&
      this._hass?.atelierOfflineHost !== true &&
      this._permissions.features.offline_queue === true &&
      this._permissions.can_write === true
    );
  },
  _offlineKey() {
    const user = String(this._hass?.user?.id || "anonymous");
    const entry = String(this._config.entry_id || this._statusEntry?.entry_id || "default");
    return `mealie-atelier-offline-v1:${user}:${entry}`;
  },
  /** Stored operations; any storage or parse failure reads as an empty queue. */
  _offlineLoad() {
    try {
      const raw = localStorage.getItem(this._offlineKey());
      const list = raw ? JSON.parse(raw) : [];
      return (Array.isArray(list) ? list : [])
        .filter(
          (op) =>
            op &&
            typeof op.id === "string" &&
            OFFLINE_ACTIONS.includes(op.action) &&
            op.payload &&
            typeof op.payload === "object",
        )
        .slice(0, OFFLINE_CAP);
    } catch {
      return [];
    }
  },
  _offlineSave(ops) {
    try {
      localStorage.setItem(this._offlineKey(), JSON.stringify(ops.slice(0, OFFLINE_CAP)));
      return true;
    } catch {
      return false;
    }
  },
  _offlineQueue() {
    return this._offlineActive() ? this._offlineLoad() : [];
  },
  _offlineIsConnectivityError(err) {
    if (this._hass?.connected === false) return true;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    if (err?.code === 3 || err?.code === "connection_lost") return true;
    return /connection lost|not connected/i.test(String(err?.message || ""));
  },
  /**
   * A tick on an item with a waiting tick takes that tick back. A tick never sent is dropped
   * locally; one that may have reached Mealie gets its reverse queued behind it, so order holds.
   */
  _offlineCollapse(action, payload) {
    if (action !== "shopping_toggle" || !this._offlineActive()) return false;
    const ops = this._offlineLoad();
    const index = lastToggleIndex(ops, payload.item_id);
    const waiting = ops[index];
    if (!waiting || waiting.payload.expected_checked !== payload.checked) return false;
    if (!waiting.attempted && waiting.state !== "failed") ops.splice(index, 1);
    else if (
      !this._offlinePush(
        ops,
        action,
        { ...waiting.payload, checked: payload.checked, expected_checked: waiting.payload.checked },
        waiting.label,
      )
    )
      return false;
    if (!this._offlineSave(ops)) return false;
    this._render();
    if (index < ops.length) this._offlineReplayLater();
    return true;
  },
  /** Append one operation with a fresh ID; false when the queue is full or IDs are unavailable. */
  _offlinePush(ops, action, payload, label) {
    if (
      ops.length >= OFFLINE_CAP ||
      typeof crypto === "undefined" ||
      typeof crypto.randomUUID !== "function"
    )
      return false;
    ops.push({
      id: crypto.randomUUID(),
      action,
      payload,
      label,
      state: "pending",
      created_at: Date.now(),
    });
    return true;
  },
  /** Called with a failed write (after its optimistic change was undone). True when it was queued. */
  _offlineHandleFailure(action, payload, err) {
    if (!OFFLINE_ACTIONS.includes(action) || !this._offlineActive()) return false;
    if (!this._offlineIsConnectivityError(err)) return false;
    const ops = this._offlineLoad();
    const item = asArray(this._data.shopping?.items).find(
      (x) => String(x.id) === String(payload.item_id),
    );
    // The state the user saw: a waiting tick on the same item wins over the last loaded state.
    const before = ops[lastToggleIndex(ops, String(payload.item_id))];
    const seen = before ? before.payload.checked : item?.checked;
    const entry =
      action === "shopping_toggle"
        ? {
            item_id: String(payload.item_id),
            checked: payload.checked === true,
            expected_checked: typeof seen === "boolean" ? seen : !payload.checked,
          }
        : { list_id: String(payload.list_id), note: String(payload.note) };
    const label = action === "shopping_add" ? entry.note : this._offlineItemName(item);
    if (!this._offlinePush(ops, action, entry, label)) return false;
    if (!this._offlineSave(ops)) return false;
    this._error = "";
    this._flash(this.t("offlineSaved"));
    return true;
  },
  _offlineItemName(item) {
    return String(item?.display || item?.note || item?.food?.name || this.t("itemFallback"));
  },
  /** Shopping items as the user expects them: waiting ticks applied, waiting adds appended. */
  _offlineItems(items) {
    const ops = this._offlineQueue().filter((op) => op.state !== "conflict");
    if (!ops.length) return items;
    const ticks = new Map(
      ops.filter((op) => op.action === "shopping_toggle").map((op) => [op.payload.item_id, op]),
    );
    const view = items.map((item) =>
      ticks.has(String(item.id))
        ? { ...item, checked: ticks.get(String(item.id)).payload.checked }
        : item,
    );
    for (const op of ops)
      if (op.action === "shopping_add")
        view.push({
          id: `local-${op.id}`,
          shoppingListId: op.payload.list_id,
          note: op.payload.note,
          checked: false,
          offlineWaiting: true,
        });
    return view;
  },
  /** Status line and conflict list for the shopping view. */
  _offlineBar() {
    const ops = this._offlineQueue();
    if (!ops.length) return "";
    const waiting = ops.filter((op) => op.state !== "conflict" && op.state !== "failed");
    // Conflicts wait for the user; failed sends are retried but can always be discarded.
    const conflicts = ops.filter((op) => op.state === "conflict" || op.state === "failed");
    const line = waiting.length
      ? `<div class="notice is-spaced offline-queue" role="status">${icon("cart", 16)} <strong>${esc(this.tp("offlineQueued", waiting.length))}</strong> <button class="btn tiny" data-action="offline-send">${esc(this.t("offlineSendNow"))}</button></div>`
      : "";
    const rows = conflicts
      .map(
        (op) =>
          `<div class="notice is-spaced offline-conflict" role="status">${icon("leaf", 16)} <span>${esc(this.t("offlineConflictItem", { item: op.label || this.t("itemFallback"), error: this._errorText({ code: op.reason, message: op.message }) }))}</span> <button class="btn tiny" data-action="offline-discard" data-value="${esc(op.id)}">${esc(this.t("offlineDiscard"))}</button></div>`,
      )
      .join("");
    return line + rows;
  },
  _offlineDiscard(id) {
    this._offlineSave(this._offlineLoad().filter((op) => op.id !== id));
    this._render();
  },
  async _offlineClick(action, value) {
    if (action === "offline-send") await this._offlineReplay();
    else this._offlineDiscard(value);
  },
  /**
   * Send waiting operations in order, one at a time; stop at the first connectivity failure.
   * Any other failure marks that operation and moves on, so one bad entry never blocks the rest.
   */
  async _offlineReplay() {
    if (this._offlineBusy || !this._offlineActive()) return;
    if (
      this._hass?.connected === false ||
      (typeof navigator !== "undefined" && navigator.onLine === false)
    )
      return;
    this._offlineBusy = true;
    let sent = 0;
    let dropped = 0;
    // Items with a failed tick in this run: later ticks on them wait, so their order holds.
    const blocked = new Set();
    try {
      for (const { id } of this._offlineLoad()) {
        // Re-read each entry: the user may have taken it back or discarded it meanwhile.
        const op = this._offlineLoad().find((x) => x.id === id);
        if (!op || op.state === "conflict") continue;
        if (op.action === "shopping_toggle" && blocked.has(op.payload.item_id)) continue;
        // Once sent, an operation may have reached Mealie: it is never dropped silently again.
        this._offlineSave(
          this._offlineLoad().map((x) => (x.id === op.id ? { ...x, attempted: true } : x)),
        );
        try {
          await this._ws("offline_replay", {
            operation: { id: op.id, action: op.action, payload: op.payload },
          });
          this._offlineSave(this._offlineLoad().filter((x) => x.id !== op.id));
          sent++;
        } catch (err) {
          if (this._offlineIsConnectivityError(err)) break;
          if (err?.code === "write_not_permitted") {
            // Nothing in this queue may be written any more, including entries behind this one.
            dropped = this._offlineLoad().length;
            this._offlineSave([]);
            await this._recoverPermissions(err);
            break;
          }
          if (OFFLINE_CONFLICT_CODES.includes(err?.code)) {
            this._offlineSave(
              this._offlineLoad().map((x) =>
                x.id === op.id ? { ...x, state: "conflict", reason: err.code } : x,
              ),
            );
            continue;
          }
          if (op.action === "shopping_toggle") blocked.add(op.payload.item_id);
          this._offlineSave(
            this._offlineLoad().map((x) =>
              x.id === op.id
                ? {
                    ...x,
                    state: "failed",
                    reason: String(err?.code || ""),
                    message: String(err?.message || "").slice(0, 200),
                  }
                : x,
            ),
          );
        }
      }
    } finally {
      this._offlineBusy = false;
    }
    if (sent) await this._loadShopping();
    else this._render();
    if (dropped) this._flash(this.t("offlineDropped"), "error");
  },
  /** `hass.connected` going from false to true replays the queue. */
  _offlineOnHass(next) {
    const was = this._hass?.connected;
    if (was === false && next?.connected !== false) this._offlineReplayLater();
  },
  _offlineReplayLater() {
    Promise.resolve().then(() => this._offlineReplay());
  },
  _offlineAttach() {
    this._boundOffline ||= () => this._offlineReplayLater();
    if (typeof window !== "undefined") window.addEventListener?.("online", this._boundOffline);
    this._offlineReplayLater();
  },
  _offlineDetach() {
    if (typeof window !== "undefined" && this._boundOffline)
      window.removeEventListener?.("online", this._boundOffline);
  },
};
