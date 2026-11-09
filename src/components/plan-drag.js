/** Moving meal plan entries: pure helpers first, then the card methods (pointer drag and keyboard). */

export const DRAG_MOUSE_SLOP_PX = 6;
export const DRAG_TOUCH_HOLD_MS = 300;
export const DRAG_TOUCH_SLOP_PX = 8;
export const DRAG_EDGE_PX = 60;
export const DRAG_SCROLL_MAX_PX = 18;
const DRAG_KEY_DAYS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/** A mouse drag starts once the pointer moved far enough; touch and pen only start by holding still. */
export function dragStartsOnMove(pointerType, dx, dy) {
  return pointerType === "mouse" && Math.hypot(dx, dy) >= DRAG_MOUSE_SLOP_PX;
}

/** A touch or pen press that moved this far is a scroll, not a drag. */
export function dragHoldBroken(dx, dy) {
  return Math.hypot(dx, dy) > DRAG_TOUCH_SLOP_PX;
}

/** Scroll speed (px per frame) for a pointer at `pos` inside `size`; 0 away from both edges. */
export function dragScrollStep(pos, size, edge = DRAG_EDGE_PX, max = DRAG_SCROLL_MAX_PX) {
  if (pos < edge) return -Math.ceil((max * (edge - Math.max(pos, 0))) / edge);
  if (pos > size - edge) return Math.ceil((max * (Math.min(pos, size) - (size - edge))) / edge);
  return 0;
}

/**
 * The horizontally scrolling week row at this height. Matched by height only: a finger at the
 * screen edge is outside the row, and that is exactly where the row has to scroll.
 */
export function dragGridAt(grids, y) {
  return (
    grids.find((grid) => {
      if (grid.scrollWidth <= grid.clientWidth) return false;
      const box = grid.getBoundingClientRect();
      return y >= box.top && y <= box.bottom;
    }) || null
  );
}

/** The day an entry lands on, or null when the drop changes nothing. */
export function dragDropDate(fromYmd, targetYmd) {
  return targetYmd && targetYmd !== fromYmd ? targetYmd : null;
}

/** YYYY-MM-DD shifted by whole days, calendar based so daylight saving never skews it. */
export function shiftYmd(ymd, days) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Target day of an Alt+Arrow key, or null when the key is no move or the day is out of range. */
export function keyMoveDate(key, fromYmd, firstYmd, dayCount) {
  const delta = DRAG_KEY_DAYS[key];
  if (!delta) return null;
  const target = shiftYmd(fromYmd, delta);
  return target >= firstYmd && target <= shiftYmd(firstYmd, dayCount - 1) ? target : null;
}

export const planDragMethods = {
  /** Moving needs write access and a Bridge that announces the feature. */
  _planMovable() {
    const permissions = this._permissions;
    return permissions.can_write === true && permissions.features?.mealplan_move === true;
  },
  _optimisticMoveMeal(entry_id, date) {
    const find = () => asArray(this._data.mealplan).find((x) => String(x.id) === String(entry_id));
    const entry = find();
    if (!entry) return null;
    const before = entry.date;
    entry.date = date;
    return () => {
      const current = find();
      if (current && current.date === date) current.date = before;
    };
  },
  /** Moves an entry to another day. Same day, unknown entries and unsynced entries do nothing. */
  async _moveMeal(entry_id, date) {
    if (!this._planMovable() || String(entry_id).startsWith("pending-")) return false;
    const entry = asArray(this._data.mealplan).find((x) => String(x.id) === String(entry_id));
    if (!entry || !dragDropDate(entry.date, date)) return false;
    return this._mutate("mealplan_move", { entry_id, date }, "mealplan", () =>
      this._optimisticMoveMeal(entry_id, date),
    );
  },
  /** Undo of a removal from the grid: creates the entry again through the regular add action. */
  _undoRemoveMeal(entry) {
    const recipe_id = entry.recipeId || entry.recipe?.id;
    const payload = { date: entry.date, meal_type: entry.entryType };
    if (recipe_id) payload.recipe_id = recipe_id;
    if (entry.title) payload.title = entry.title;
    if (entry.text) payload.text = entry.text;
    return this._mutate("mealplan_add", payload, "mealplan", () =>
      this._optimisticAdd("mealplan", {
        id: `pending-${Date.now()}-${(this._pendingSeq = (this._pendingSeq || 0) + 1)}`,
        date: entry.date,
        entryType: entry.entryType,
        title: entry.title,
        text: entry.text,
        recipeId: recipe_id,
        recipe: entry.recipe,
      }),
    );
  },
  /** Alt+Arrow on a focused entry: one day sideways, a week up or down, inside the visible range. */
  _planKeyMove(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || !this._planMovable()) return false;
    const entryEl = event.target?.closest?.(".day-entry[data-movable]");
    if (!entryEl || !event.target.closest(".day-meal")) return false;
    if (!Object.hasOwn(DRAG_KEY_DAYS, event.key)) return false;
    event.preventDefault?.();
    const id = entryEl.dataset.entryId;
    const entry = asArray(this._data.mealplan).find((x) => String(x.id) === String(id));
    const first = dateYmd(this._weekStart);
    const target = entry && keyMoveDate(event.key, entry.date, first, this._planDayCount());
    if (!target) return true;
    this._moveMeal(id, target).then((ok) => {
      if (!ok) return;
      const day = new Date(`${target}T12:00:00`);
      this._flash(
        this.t("planMovedTo", {
          weekday: dayString(this._locale, day, { weekday: "long" }),
          date: dayString(this._locale, day, { day: "numeric", month: "long" }),
        }),
      );
      this._focusAfterRender(() =>
        [...this.shadowRoot.querySelectorAll(".day-entry")]
          .find((el) => el.dataset.entryId === String(id))
          ?.querySelector(".day-meal"),
      );
    });
    return true;
  },
  /** Pointer press on a movable entry: arms a drag (mouse by distance, touch and pen by a hold). */
  _planDragDown(event) {
    if (this._drag || event.button > 0 || event.isPrimary === false || !this._planMovable()) return;
    const entry = event.target?.closest?.(".day-entry[data-movable]");
    if (!entry || event.target.closest(".day-meal-remove")) return;
    const touch = event.pointerType !== "mouse";
    // A configured hold action owns the touch long press on recipe tiles.
    if (touch && entry.querySelector("[data-tile]") && this._tileAction("hold").action !== "none")
      return;
    const drag = (this._drag = {
      entry,
      id: entry.dataset.entryId,
      from: entry.dataset.date,
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
      target: null,
      listeners: [],
    });
    const on = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      drag.listeners.push([target, type, fn, options]);
    };
    on(window, "pointermove", (e) => this._planDragMove(e));
    on(window, "pointerup", (e) => this._planDragUp(e));
    on(window, "pointercancel", () => this._planDragEnd(false));
    on(window, "blur", () => this._planDragEnd(false));
    on(document, "mouseleave", () => this._planDragEnd(false));
    on(window, "keydown", (e) => this._planDragKey(e), true);
    on(window, "dragstart", (e) => e.preventDefault(), true);
    on(window, "contextmenu", (e) => e.preventDefault(), true);
    // iOS Safari decides panning at touchstart, so only a non-passive listener can stop a scroll.
    on(window, "touchmove", (e) => drag.active && e.cancelable !== false && e.preventDefault(), {
      passive: false,
    });
    if (touch) drag.timer = setTimeout(() => this._planDragStart(), DRAG_TOUCH_HOLD_MS);
  },
  _planDragMove(event) {
    const drag = this._drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const dx = drag.x - drag.x0,
      dy = drag.y - drag.y0;
    if (!drag.active) {
      if (drag.pointerType !== "mouse" && dragHoldBroken(dx, dy)) this._planDragEnd(false);
      else if (dragStartsOnMove(drag.pointerType, dx, dy)) this._planDragStart();
      return;
    }
    this._planDragPlace();
    this._planDragHover();
  },
  _planDragStart() {
    const drag = this._drag;
    if (!drag || drag.active) return;
    clearTimeout(drag.timer);
    // A render during the hold replaced the pressed element: continue with its successor.
    if (drag.entry.isConnected === false) {
      const next = [...this.shadowRoot.querySelectorAll(".day-entry[data-movable]")].find(
        (el) => el.dataset.entryId === drag.id,
      );
      if (!next) return this._planDragEnd(false);
      drag.entry = next;
    }
    this._tileCancel();
    drag.active = true;
    const rect = drag.entry.getBoundingClientRect();
    drag.rect = rect;
    const clone = drag.entry.cloneNode(true);
    clone.querySelector(".day-meal-remove")?.remove();
    clone.classList.add("drag-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.inert = true;
    clone.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px`;
    drag.clone = clone;
    drag.root = this.shadowRoot.querySelector(".atelier") || this.shadowRoot;
    drag.root.appendChild(clone);
    drag.root.classList?.add("plan-dragging");
    drag.entry.classList.add("drag-source");
    this._planDragPlace();
    this._planDragHover();
    const tick = () => {
      if (this._drag !== drag || !drag.active) return;
      const step = dragScrollStep(drag.y, window.innerHeight);
      if (step) window.scrollBy(0, step);
      const grid = dragGridAt([...this.shadowRoot.querySelectorAll(".week-grid")], drag.y);
      if (grid) {
        const box = grid.getBoundingClientRect();
        grid.scrollLeft += dragScrollStep(drag.x - box.left, box.width);
      }
      this._planDragHover();
      drag.frame = requestAnimationFrame(tick);
    };
    drag.frame = requestAnimationFrame(tick);
  },
  _planDragPlace() {
    const drag = this._drag;
    drag.clone.style.transform = `translate3d(${drag.x - drag.x0}px, ${drag.y - drag.y0}px, 0)`;
  },
  /** Marks the day under the pointer. Hit testing stays inside the shadow root. */
  _planDragHover() {
    const drag = this._drag;
    // A finger held at the screen edge sits in the page gutter, beside the row it is scrolling.
    const box = dragGridAt(
      [...this.shadowRoot.querySelectorAll(".week-grid")],
      drag.y,
    )?.getBoundingClientRect();
    const x = box ? Math.min(box.right - 1, Math.max(box.left + 1, drag.x)) : drag.x;
    const day = this.shadowRoot.elementFromPoint?.(x, drag.y)?.closest?.(".day[data-date]");
    const date = dragDropDate(drag.from, day?.dataset?.date);
    if (drag.target?.el === day && drag.target?.date === date) return;
    drag.target?.el?.classList?.remove("drop-target");
    drag.target = day && date ? { el: day, date } : null;
    drag.target?.el.classList.add("drop-target");
  },
  _planDragUp() {
    const drag = this._drag;
    if (!drag) return;
    this._planDragEnd(drag.active);
  },
  _planDragKey(event) {
    if (event.key !== "Escape" || !this._drag?.active) return;
    event.stopPropagation();
    event.preventDefault();
    this._planDragEnd(false);
  },
  /** Ends the gesture: removes every listener and the clone, then drops or cancels. */
  _planDragEnd(drop) {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    clearTimeout(drag.timer);
    if (drag.frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(drag.frame);
    for (const [target, type, fn, options] of drag.listeners)
      target.removeEventListener(type, fn, options);
    if (!drag.active) return;
    drag.clone?.remove();
    drag.root?.classList?.remove("plan-dragging");
    drag.entry.classList.remove("drag-source");
    drag.target?.el?.classList?.remove("drop-target");
    // The click that follows a drag must not open the recipe.
    const swallow = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("click", swallow, true);
    setTimeout(() => window.removeEventListener("click", swallow, true), 50);
    const date = drop ? drag.target?.date : null;
    const flush = this._renderDeferred === true;
    this._renderDeferred = false;
    if (date)
      this._moveMeal(drag.id, date).then((ok) => {
        if (!ok && flush) this._render();
      });
    else if (flush) this._render();
  },
};
