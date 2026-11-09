import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";
import {
  dragStartsOnMove,
  dragHoldBroken,
  dragScrollStep,
  dragGridAt,
  dragDropDate,
  shiftYmd,
  keyMoveDate,
  planDragMethods,
} from "../src/components/plan-drag.js";

const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = () => new Promise((resolve) => setImmediate(resolve));
const MOVE = { mealplan_move: true };

/** A card on a Monday-based range with two entries; `mutate` calls are recorded and scripted. */
function setup({ features = MOVE, can_write = true, fail = false, win = {} } = {}) {
  const calls = [];
  const cards = loadCards({ window: win });
  const card = makeCard(cards, { permissions: { can_write, can_manage: false, features } });
  card._hass = {
    language: "en",
    callWS: async (msg) => {
      calls.push(plain(msg));
      if (msg.type === "mealie_atelier/mutate" && fail) throw new Error("boom");
      if (msg.type === "mealie_atelier/mealplan") return plain(card._data.mealplan);
      return {};
    },
  };
  card._data = { recipes: { total: 0, items: [] }, mealplan: [], shopping: { items: [] } };
  card._weekStart = new Date(2030, 0, 7);
  card._config.week_days = 7;
  card._config.mode = "mealplan";
  card._data.mealplan = [
    { id: "a", date: "2030-01-07", entryType: "dinner", title: "Soup", recipeId: "r1" },
    { id: "b", date: "2030-01-13", entryType: "lunch", title: "Note", text: "t" },
  ];
  card.renders = 0;
  card._render = () => card.renders++;
  card.isConnected = true;
  return { card, calls, cards };
}
const mutates = (calls) => calls.filter((c) => c.type === "mealie_atelier/mutate");

test("pure helpers: thresholds, scroll step, drop and key targets", () => {
  assert.equal(dragStartsOnMove("mouse", 5, 0), false);
  assert.equal(dragStartsOnMove("mouse", 6, 0), true);
  assert.equal(dragStartsOnMove("touch", 50, 0), false);
  assert.equal(dragStartsOnMove("pen", 50, 0), false);
  assert.equal(dragHoldBroken(8, 0), false);
  assert.equal(dragHoldBroken(6, 6), true);
  assert.equal(dragScrollStep(300, 800), 0);
  assert.ok(dragScrollStep(10, 800) < 0);
  assert.ok(dragScrollStep(790, 800) > 0);
  assert.ok(dragScrollStep(0, 800) < dragScrollStep(50, 800));
  assert.equal(dragDropDate("2030-01-07", "2030-01-07"), null);
  assert.equal(dragDropDate("2030-01-07", undefined), null);
  assert.equal(dragDropDate("2030-01-07", "2030-01-08"), "2030-01-08");
  assert.equal(shiftYmd("2030-01-31", 1), "2030-02-01");
  assert.equal(shiftYmd("2030-03-31", -7), "2030-03-24");
  assert.equal(keyMoveDate("ArrowRight", "2030-01-07", "2030-01-07", 7), "2030-01-08");
  assert.equal(keyMoveDate("ArrowLeft", "2030-01-07", "2030-01-07", 7), null);
  assert.equal(keyMoveDate("ArrowDown", "2030-01-07", "2030-01-07", 7), null);
  assert.equal(keyMoveDate("ArrowDown", "2030-01-07", "2030-01-07", 21), "2030-01-14");
  assert.equal(keyMoveDate("ArrowUp", "2030-01-14", "2030-01-07", 21), "2030-01-07");
  assert.equal(keyMoveDate("a", "2030-01-07", "2030-01-07", 7), null);
});

test("each entry is a day-entry wrapper; the remove button needs write access and an id", () => {
  const { card } = setup();
  const html = card._week();
  assert.equal((html.match(/<button class="day-meal[ "]/g) || []).length, 2);
  assert.match(
    html,
    /<div class="day-entry" data-entry-id="a" data-date="2030-01-07" data-movable>/,
  );
  assert.match(
    html,
    /<button class="day-meal-remove" data-action="remove-meal" data-value="a" aria-label="Remove: Soup \(Dinner\)">/,
  );
  card._data.mealplan.push({ id: "pending-1", date: "2030-01-08", entryType: "lunch", title: "P" });
  const pending = card._week();
  assert.doesNotMatch(pending, /data-value="pending-1"/);
  assert.doesNotMatch(pending, /data-entry-id="pending-1"/);
  const readonly = setup({ can_write: false }).card._week();
  assert.doesNotMatch(readonly, /day-meal-remove/);
  assert.doesNotMatch(readonly, /data-movable/);
});

test("without the Bridge flag nothing is draggable and the plan view has no hint", () => {
  const { card } = setup({ features: {} });
  const html = card._week();
  assert.doesNotMatch(html, /data-movable/);
  assert.match(html, /day-meal-remove/);
  card._view = "mealplan";
  assert.doesNotMatch(card._body(), /plan-move-hint/);
});

test("the plan view shows the hint under the heading, the dashboard does not", () => {
  const { card } = setup();
  card._view = "mealplan";
  assert.match(
    card._body(),
    /<p class="plan-move-hint">Drag to move\. On the keyboard use Alt and the arrow keys\./,
  );
  assert.match(card._body(), /data-movable/);
  card._view = "dashboard";
  assert.doesNotMatch(card._body(), /plan-move-hint/);
});

test("a move sends the exact payload, changes the date optimistically and refreshes", async () => {
  const { card, calls } = setup();
  const seen = [];
  card._render = () => seen.push(card._data.mealplan.find((x) => x.id === "a").date);
  assert.equal(await card._moveMeal("a", "2030-01-09"), true);
  assert.deepEqual(plain(mutates(calls)[0]), {
    type: "mealie_atelier/mutate",
    action: "mealplan_move",
    payload: { entry_id: "a", date: "2030-01-09" },
  });
  assert.equal(seen[0], "2030-01-09");
});

test("a failed move rolls the date back", async () => {
  const { card } = setup({ fail: true });
  assert.equal(await card._moveMeal("a", "2030-01-09"), false);
  assert.equal(card._data.mealplan.find((x) => x.id === "a").date, "2030-01-07");
});

test("same-day, unknown, flagless and read-only moves call nothing", async () => {
  const { card, calls } = setup();
  assert.equal(await card._moveMeal("a", "2030-01-07"), false);
  assert.equal(await card._moveMeal("zzz", "2030-01-09"), false);
  const flagless = setup({ features: {} });
  assert.equal(await flagless.card._moveMeal("a", "2030-01-09"), false);
  const ro = setup({ can_write: false });
  assert.equal(await ro.card._moveMeal("a", "2030-01-09"), false);
  assert.equal(
    mutates(calls).length + mutates(flagless.calls).length + mutates(ro.calls).length,
    0,
  );
});

function keyEvent(card, id, key, extra = {}) {
  const entry = { dataset: { entryId: id, date: "x" } };
  const target = {
    closest: (sel) => (sel === ".day-entry[data-movable]" || sel === ".day-meal" ? entry : null),
  };
  const event = { key, altKey: true, target, defaultPrevented: false, ...extra };
  event.preventDefault = () => (event.defaultPrevented = true);
  return event;
}

test("Alt+Arrow moves one day or seven days and stops at the end of the range", async () => {
  const { card, calls } = setup();
  card._handleKeyDown(keyEvent(card, "a", "ArrowRight"));
  await flush();
  assert.equal(card._data.mealplan.find((x) => x.id === "a").date, "2030-01-08");
  card._handleKeyDown(keyEvent(card, "a", "ArrowLeft"));
  await flush();
  card._handleKeyDown(keyEvent(card, "a", "ArrowLeft"));
  await flush();
  assert.equal(card._data.mealplan.find((x) => x.id === "a").date, "2030-01-07");
  const before = mutates(calls).length;
  card._handleKeyDown(keyEvent(card, "a", "ArrowDown"));
  card._handleKeyDown(keyEvent(card, "a", "ArrowUp"));
  await flush();
  assert.equal(mutates(calls).length, before);
  assert.equal(card._data.mealplan.find((x) => x.id === "a").date, "2030-01-07");
  const stack = setup();
  stack.card._config.mode = "dashboard";
  stack.card._handleKeyDown(keyEvent(stack.card, "a", "ArrowDown"));
  await flush();
  assert.equal(stack.card._data.mealplan.find((x) => x.id === "a").date, "2030-01-14");
  assert.match(stack.card._toast, /^Moved to Monday, January 14$/);
});

test("Alt+Arrow ignores plain arrows and cards without the flag", async () => {
  const { card, calls } = setup();
  const plainArrow = keyEvent(card, "a", "ArrowRight", { altKey: false });
  card._handleKeyDown(plainArrow);
  assert.equal(plainArrow.defaultPrevented, false);
  const flagless = setup({ features: {} });
  flagless.card._handleKeyDown(keyEvent(flagless.card, "a", "ArrowRight"));
  await flush();
  assert.equal(mutates(calls).length + mutates(flagless.calls).length, 0);
});

test("removing from the grid offers Undo, which re-creates the entry", async () => {
  const { card, calls } = setup();
  const button = { disabled: false, dataset: { action: "remove-meal", value: "a" } };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(mutates(calls)[0].action, "mealplan_delete");
  assert.equal(card._toast, "Removed: Soup");
  assert.equal(card._toastAction.label, "Undo");
  await card._handleClick({
    target: { closest: () => ({ dataset: { action: "toast-action" } }) },
    preventDefault() {},
  });
  const add = mutates(calls)[1];
  assert.equal(add.action, "mealplan_add");
  assert.deepEqual(plain(add.payload), {
    date: "2030-01-07",
    meal_type: "dinner",
    recipe_id: "r1",
    title: "Soup",
  });
});

test("removing from the plan dialog gives no Undo toast", async () => {
  const { card } = setup();
  card._modal = "plan";
  card._planDay = "2030-01-07";
  const button = { disabled: false, dataset: { action: "remove-meal", value: "a" } };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(card._toastAction, null);
});

test("a toast with an action stays about six seconds", async () => {
  const { card } = setup();
  card._flash("x", "status", { label: "Undo", run() {} });
  assert.match(card._toast, /x/);
  clearTimeout(card._toastTimer);
});

/** Pointer harness: window listeners are recorded so the test can fire them. */
function dragSetup(opts = {}) {
  const handlers = new Map();
  const win = {
    innerHeight: 800,
    scrolled: 0,
    addEventListener: (t, fn) => (handlers.get(t) || handlers.set(t, []).get(t)).push(fn),
    removeEventListener: (t, fn) =>
      handlers.set(
        t,
        (handlers.get(t) || []).filter((f) => f !== fn),
      ),
    scrollBy(_x, y) {
      this.scrolled += y;
    },
  };
  const ctx = setup({ ...opts, win });
  const { card } = ctx;
  const dayEls = {};
  const mkDay = (date) =>
    (dayEls[date] ||= {
      dataset: { date },
      classList: {
        set: new Set(),
        add(c) {
          this.set.add(c);
        },
        remove(c) {
          this.set.delete(c);
        },
      },
    });
  const clone = {
    classList: { add() {} },
    setAttribute() {},
    querySelector: () => null,
    style: {},
    remove() {
      clone.gone = true;
    },
  };
  const entry = {
    dataset: { entryId: "a", date: "2030-01-07" },
    classList: {
      set: new Set(),
      add(c) {
        this.set.add(c);
      },
      remove(c) {
        this.set.delete(c);
      },
    },
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 100, height: 40 }),
    cloneNode: () => clone,
  };
  let under = null;
  card.shadowRoot.elementFromPoint = () => (under ? { closest: () => mkDay(under) } : null);
  const down = (type = "mouse", id = 1) => {
    const target = { closest: (sel) => (sel === ".day-entry[data-movable]" ? entry : null) };
    card._planDragDown({
      target,
      button: 0,
      pointerType: type,
      pointerId: id,
      clientX: 20,
      clientY: 20,
    });
  };
  const fire = (type, event) => (handlers.get(type) || []).slice().forEach((fn) => fn(event));
  return {
    ...ctx,
    win,
    entry,
    clone,
    dayEls,
    handlers,
    down,
    fire,
    over: (d) => (under = d),
    move: (x, y, id = 1) => fire("pointermove", { clientX: x, clientY: y, pointerId: id }),
  };
}

test("a mouse drag starts after 6 px, highlights the day and drops on it", async () => {
  const d = dragSetup();
  d.down();
  d.move(24, 20);
  assert.equal(d.card._drag.active, false);
  d.over("2030-01-09");
  d.move(30, 20);
  assert.equal(d.card._drag.active, true);
  assert.ok(d.entry.classList.set.has("drag-source"));
  assert.ok(d.dayEls["2030-01-09"].classList.set.has("drop-target"));
  d.fire("pointerup", { pointerId: 1 });
  await flush();
  assert.equal(d.clone.gone, true);
  assert.equal(d.card._drag, null);
  assert.equal(d.dayEls["2030-01-09"].classList.set.size, 0);
  assert.equal(d.card._data.mealplan.find((x) => x.id === "a").date, "2030-01-09");
  assert.equal(mutates(d.calls)[0].payload.date, "2030-01-09");
  assert.equal((d.handlers.get("pointermove") || []).length, 0);
});

test("dropping on the same day or nowhere sends nothing", async () => {
  const d = dragSetup();
  d.down();
  d.over("2030-01-07");
  d.move(40, 20);
  d.fire("pointerup", { pointerId: 1 });
  d.down();
  d.over(null);
  d.move(40, 20);
  d.fire("pointerup", { pointerId: 1 });
  await flush();
  assert.equal(mutates(d.calls).length, 0);
});

test("Escape and pointercancel cancel a drag without a move", async () => {
  const d = dragSetup();
  d.down();
  d.over("2030-01-09");
  d.move(40, 20);
  let stopped = false;
  d.fire("keydown", {
    key: "Escape",
    stopPropagation: () => (stopped = true),
    preventDefault() {},
  });
  assert.equal(stopped, true);
  assert.equal(d.card._drag, null);
  d.down();
  d.move(40, 20);
  d.fire("pointercancel", { pointerId: 1 });
  assert.equal(d.card._drag, null);
  await flush();
  assert.equal(mutates(d.calls).length, 0);
});

test("a render during a drag is deferred and runs once when the drag ends", () => {
  const d = dragSetup();
  const realRender = d.cards.registry.get("mealie-atelier-card").prototype._render;
  d.down();
  d.over("2030-01-09");
  d.move(40, 20);
  assert.equal(d.card._drag.active, true);
  d.card._render = realRender;
  d.card._render();
  assert.equal(d.card._renderDeferred, true);
  d.card._render = () => d.card.renders++;
  d.fire("pointercancel", {});
  assert.equal(d.card.renders, 1);
  assert.equal(d.card._renderDeferred, false);
});

test("touch drags only after the hold and a move before it keeps the page scrolling", async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const d = dragSetup();
  d.down("touch");
  d.move(40, 20);
  assert.equal(d.card._drag, null, "moving more than 8 px before the hold ends the gesture");
  await wait(350);
  assert.equal(d.entry.classList.set.has("drag-source"), false);
  d.down("touch");
  await wait(150);
  assert.equal(d.card._drag.active, false);
  await wait(250);
  assert.equal(d.card._drag.active, true);
  let prevented = false;
  d.fire("touchmove", { cancelable: true, preventDefault: () => (prevented = true) });
  assert.equal(prevented, true);
  d.fire("pointercancel", {});
});

test("a touch press on a tile with hold_action configured does not arm a drag", () => {
  const d = dragSetup();
  d.card._tileAction = () => ({ action: "navigate" });
  d.entry.querySelector = () => ({});
  d.down("touch");
  assert.equal(d.card._drag, null);
  d.down("mouse");
  assert.notEqual(d.card._drag, null);
  d.fire("pointercancel", {});
});

test("the remove button and a missing flag never arm a drag", () => {
  const d = dragSetup();
  d.card._permissions; // read-only getter
  const removeTarget = {
    closest: (sel) =>
      sel === ".day-meal-remove" || sel === ".day-entry[data-movable]" ? {} : null,
  };
  d.card._planDragDown({
    target: removeTarget,
    button: 0,
    pointerType: "mouse",
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  });
  assert.equal(d.card._drag, null);
  const flagless = dragSetup({ features: {} });
  flagless.down();
  assert.equal(flagless.card._drag, null);
});

test("the pointer near the viewport edge scrolls the window each frame", async () => {
  const d = dragSetup();
  d.down();
  d.over("2030-01-09");
  d.move(40, 790);
  await new Promise((resolve) => setTimeout(resolve, 20));
  d.fire("pointercancel", {});
  assert.ok(d.win.scrolled > 0);
});

test("disconnecting removes the drag listeners and the clone", () => {
  const d = dragSetup();
  d.down();
  d.move(40, 20);
  assert.equal(d.card._drag.active, true);
  d.card.disconnectedCallback();
  assert.equal(d.card._drag, null);
  assert.equal(d.clone.gone, true);
  assert.equal((d.handlers.get("pointermove") || []).length, 0);
  assert.equal((d.handlers.get("touchmove") || []).length, 0);
});

test("the auto-scroll row is found by height, even with the finger outside it", () => {
  const grid = (top, bottom, scrollWidth = 900, clientWidth = 360) => ({
    scrollWidth,
    clientWidth,
    getBoundingClientRect: () => ({ top, bottom }),
  });
  const first = grid(100, 300);
  const second = grid(320, 520);
  assert.equal(dragGridAt([first, second], 400), second);
  assert.equal(dragGridAt([first, second], 310), null);
  assert.equal(dragGridAt([grid(100, 300, 360, 360)], 200), null);
});

test("a render during the touch hold hands the drag to the new element", () => {
  const { card, entry, down } = dragSetup();
  down("touch");
  entry.isConnected = false;
  const fresh = { ...entry, isConnected: true, dataset: { entryId: "a", date: "2030-01-07" } };
  card.shadowRoot.querySelectorAll = () => [fresh];
  card._planDragStart();
  assert.equal(card._drag.entry, fresh);
  card._planDragEnd(false);
});

test("a render that removed the pressed entry ends the drag", () => {
  const { card, entry, down } = dragSetup();
  down("touch");
  entry.isConnected = false;
  card.shadowRoot.querySelectorAll = () => [];
  card._planDragStart();
  assert.ok(!card._drag);
});

test("a finger in the gutter beside the row still lands on a day", () => {
  const seen = [];
  const grid = {
    getBoundingClientRect: () => ({
      top: 100,
      bottom: 300,
      left: 15,
      right: 375,
      width: 360,
      height: 200,
    }),
  };
  planDragMethods._planDragHover.call({
    _drag: { x: 388, y: 200, from: "2030-01-07" },
    shadowRoot: {
      querySelectorAll: () => [grid],
      elementFromPoint: (x) => {
        seen.push(x);
        return null;
      },
    },
  });
  assert.deepEqual(seen, [374]);
});

test("the day an entry came from is no drop target", () => {
  const ctx = {
    _drag: { x: 50, y: 50, from: "2030-01-07" },
    shadowRoot: {
      querySelectorAll: () => [],
      elementFromPoint: () => ({
        closest: () => ({ dataset: { date: "2030-01-07" }, classList: { add() {}, remove() {} } }),
      }),
    },
  };
  planDragMethods._planDragHover.call(ctx);
  assert.equal(ctx._drag.target, null);
});
