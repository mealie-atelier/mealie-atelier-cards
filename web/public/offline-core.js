/* Transactional IndexedDB queue shared between windows and Service Workers. */
(function (scope) {
  "use strict";
  const DB = "mealie-atelier-offline-v1";
  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("data")) db.createObjectStore("data");
        if (!db.objectStoreNames.contains("operations"))
          db.createObjectStore("operations", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function request(name, mode, method, arg) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(name, mode),
          r = tx.objectStore(name)[method](...arg);
        let result;
        r.onsuccess = () => {
          result = r.result;
        };
        r.onerror = () => reject(r.error);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
  const get = (key) => request("data", "readonly", "get", [key]);
  const put = (key, value) => request("data", "readwrite", "put", [value, key]);
  const del = (key) => request("data", "readwrite", "delete", [key]);
  const allOps = () => request("operations", "readonly", "getAll", []);
  const getOp = (id) => request("operations", "readonly", "get", [id]);
  const putOp = (op) => request("operations", "readwrite", "put", [op]);
  const deleteOp = (id) => request("operations", "readwrite", "delete", [id]);
  async function updateOp(id, patch) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("operations", "readwrite"),
          store = tx.objectStore("operations"),
          r = store.get(id);
        r.onsuccess = () => {
          if (r.result) store.put({ ...r.result, ...patch });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
  async function clearOps() {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("operations", "readwrite");
        tx.objectStore("operations").clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
  async function migrate() {
    const old = await get("operations");
    if (Array.isArray(old)) {
      for (const op of old) if (op?.id) await putOp(op);
      await del("operations");
    }
  }
  const isTemporary = (item) => String(item?.id || "").startsWith("local-");
  /** Applies a queued edit and rebuilds `display` the way Mealie does, so the label follows it. */
  function applyUpdate(item, payload) {
    if ("quantity" in payload) item.quantity = payload.quantity;
    if ("note" in payload) item.note = payload.note;
    // A rename turns the item into a free text item: its name is its note and the food link is gone.
    if ("name" in payload) Object.assign(item, { note: payload.name, food: null, isFood: false });
    const quantity = Number(item.quantity);
    const unit = String(item.unit?.name || item.unit?.abbreviation || "").trim();
    item.display = [
      quantity > 0 ? String(quantity) : "",
      unit,
      String((item.food ? item.food.name : item.note) || "").trim(),
      item.food ? String(item.note || "").trim() : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  function withPending(base, ops) {
    const shopping =
      base && typeof base === "object" ? structuredClone(base) : { lists: [], items: [] };
    shopping.lists = Array.isArray(shopping.lists) ? shopping.lists : [];
    shopping.items = Array.isArray(shopping.items) ? shopping.items : [];
    for (const op of ops) {
      if (op.state === "conflict" || op.state === "uncertain") continue;
      if (op.action === "shopping_toggle") {
        const item = shopping.items.find((x) => String(x.id) === String(op.payload.item_id));
        if (item) item.checked = op.payload.checked;
      } else if (op.action === "shopping_delete") {
        shopping.items = shopping.items.filter((x) => String(x.id) !== String(op.payload.item_id));
      } else if (op.action === "shopping_update") {
        const item = shopping.items.find((x) => String(x.id) === String(op.payload.item_id));
        if (item) applyUpdate(item, op.payload);
      } else if (op.action === "shopping_clear_checked") {
        shopping.items = shopping.items.filter(
          (x) =>
            !(
              x.checked === true &&
              String(x.shoppingListId) === String(op.payload.list_id) &&
              (!Array.isArray(op.payload.expected_ids) ||
                op.payload.expected_ids.map(String).includes(String(x.id)))
            ),
        );
      } else if (
        op.action === "shopping_add" &&
        !shopping.items.some((x) => String(x.id) === "local-" + op.id)
      ) {
        shopping.items.push({
          id: "local-" + op.id,
          shoppingListId: op.payload.list_id,
          note: op.payload.note,
          quantity: 1,
          checked: false,
          offlinePending: true,
        });
      }
    }
    return shopping;
  }
  async function bridge(type, extra = {}) {
    const response = await fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Atelier-Request": "1" },
      credentials: "same-origin",
      body: JSON.stringify({ type, ...extra }),
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Invalid server response");
    }
    if (!response.ok) {
      const e = new Error(payload.error || "Server response " + response.status);
      e.status = response.status;
      e.code = payload.code;
      throw e;
    }
    return payload;
  }
  async function replay({ notify = () => {} } = {}) {
    if (!(await get("enabled"))) return { skipped: true };
    const ops = await allOps();
    let completed = 0,
      conflicts = 0,
      dropped = 0;
    for (const old of ops) {
      const current = await getOp(old.id);
      if (!current || !["pending", "sending"].includes(current.state)) continue;
      try {
        await updateOp(current.id, { state: "sending" });
        await bridge("mealie_atelier/offline_replay", {
          operation: { id: current.id, action: current.action, payload: current.payload },
        });
        await deleteOp(current.id);
        completed++;
      } catch (e) {
        if (e.code === "write_not_permitted") {
          // The account may no longer write: drop the queued edit instead of retrying forever.
          await deleteOp(current.id);
          dropped++;
        } else if (e.status === 409 || e.status === 403 || e.code === "shopping_item_not_found") {
          // The code is kept so the conflict list can show it in the language of the user.
          await updateOp(current.id, { state: "conflict", reason: e.message, code: e.code });
          conflicts++;
        } else {
          await updateOp(current.id, { state: "pending", reason: e.message, code: e.code });
          break;
        }
      }
    }
    if (completed) {
      try {
        await put("snapshot", await bridge("mealie_atelier/shopping"));
      } catch {}
    }
    notify();
    return { completed, conflicts, dropped, pending: (await allOps()).length };
  }
  scope.AtelierOfflineCore = {
    open,
    get,
    put,
    del,
    allOps,
    getOp,
    putOp,
    deleteOp,
    updateOp,
    clearOps,
    migrate,
    withPending,
    bridge,
    replay,
    isTemporary,
  };
})(self);
