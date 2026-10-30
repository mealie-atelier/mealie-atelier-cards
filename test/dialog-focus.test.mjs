import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function keyEvent(key, target, extra = {}) {
  const event = {
    key,
    target,
    defaultPrevented: false,
    shiftKey: false,
    composedPath: () => [target],
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...extra,
  };
  return event;
}

test("focus after a render is retried until the element is really focusable", async () => {
  // Home Assistant's ha-card renders its slot asynchronously: the first focus() does nothing.
  const card = makeCard(loadCards());
  const el = { calls: 0 };
  el.focus = () => {
    el.calls++;
    if (el.calls >= 3) card.shadowRoot.activeElement = el;
  };
  card._focusAfterRender(() => el);
  await tick();
  await tick();
  await tick();
  assert.equal(el.calls, 3);
  assert.equal(card.shadowRoot.activeElement, el);
});

test("a newer render cancels the pending focus retries of an older one", async () => {
  const card = makeCard(loadCards());
  const stale = { calls: 0, focus: () => stale.calls++ };
  const fresh = { calls: 0 };
  fresh.focus = () => {
    fresh.calls++;
    card.shadowRoot.activeElement = fresh;
  };
  card._focusAfterRender(() => stale);
  card._focusAfterRender(() => fresh);
  await tick();
  await tick();
  assert.equal(stale.calls, 1);
  assert.equal(fresh.calls, 1);
});

test("the page shortcut opens the palette in Home Assistant while nothing has focus", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callService() {}, callWS: async () => ({}) },
  });
  card.getClientRects = () => [{}];
  card._render = () => {};
  const body = {};
  cards.document.body = body;
  const ev = keyEvent("k", body, { ctrlKey: true });
  card._boundPageKeyDown(ev);
  assert.equal(card._modal, "command");
});

test("the page shortcut leaves a focused element in Home Assistant alone", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callService() {}, callWS: async () => ({}) },
  });
  card.getClientRects = () => [{}];
  card._render = () => {};
  cards.document.body = {};
  card._boundPageKeyDown(keyEvent("k", { tagName: "HOME-ASSISTANT" }, { ctrlKey: true }));
  card._boundPageKeyDown(keyEvent("/", { tagName: "HOME-ASSISTANT" }));
  assert.equal(card._modal, null);
});

test("the page shortcut is registered on connect and removed on disconnect", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._render = () => {};
  card.connectedCallback();
  assert.ok(cards.listeners.has("keydown"));
  card.disconnectedCallback();
  assert.ok(!cards.listeners.has("keydown"));
});

test("Escape closes an open dialog even when focus fell back to the body", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callService() {}, callWS: async () => ({}) },
  });
  card.getClientRects = () => [{}];
  card._render = () => {};
  const body = {};
  cards.document.body = body;
  card._modal = "settings";
  card._boundPageKeyDown(keyEvent("Escape", body));
  assert.equal(card._modal, null);
});

test("Tab pulls focus back into the dialog when it sits outside, and traps at the edges", () => {
  const card = makeCard(loadCards());
  const first = { focused: 0, getClientRects: () => [{}], focus: () => first.focused++ };
  const last = { focused: 0, getClientRects: () => [{}], focus: () => last.focused++ };
  const dialog = {
    contains: (node) => node === first || node === last,
    querySelectorAll: () => [first, last],
  };
  card.shadowRoot.querySelector = (selector) => (selector === '[role="dialog"]' ? dialog : null);
  card._modal = "settings";
  const outside = {};
  const ev = keyEvent("Tab", outside);
  card._handleKeyDown(ev);
  assert.ok(ev.defaultPrevented);
  assert.equal(first.focused, 1);
  const back = keyEvent("Tab", last);
  card._handleKeyDown(back);
  assert.equal(first.focused, 2);
  const shift = keyEvent("Tab", first, { shiftKey: true });
  card._handleKeyDown(shift);
  assert.equal(last.focused, 1);
});

/**
 * Drive the real _render against a stub shadow root. `world` describes what the DOM holds after
 * the subtree swap: `dialog`, `controls` (querySelectorAll results per selector) and `byQuery`.
 */
function renderHarness(world, globals = {}) {
  const cards = loadCards({ globals });
  const card = makeCard(cards);
  card.getBoundingClientRect = () => ({ top: 0 });
  card._body = () => "";
  card._nav = () => "";
  card._topbar = () => "";
  card._pickerSync = () => {};
  card._modalHtml = () => '<div class="modal modal-backdrop"></div>';
  card._raiseModal = () => {};
  const root = card.shadowRoot;
  const focusable = (name) => ({
    name,
    disabled: false,
    focus() {
      root.activeElement = this;
    },
  });
  world.make = focusable;
  root.querySelector = (selector) => world.query?.(selector) ?? null;
  root.querySelectorAll = (selector) => world.queryAll?.(selector) ?? [];
  return { card, root, cards };
}

test("opening a dialog focuses its autofocus field, the search or the close button", async () => {
  const world = {};
  const { card, root } = renderHarness(world);
  const close = world.make("close");
  const search = world.make("search");
  world.query = (selector) => {
    if (selector === '[role="dialog"]') return {};
    if (selector.includes("command-search")) return search;
    if (selector.includes("close-modal")) return close;
    return null;
  };
  card._modal = "command";
  card._render();
  assert.equal(root.activeElement, search);

  // Without a search or autofocus field the close button takes the focus.
  root.activeElement = null;
  card._lastRenderedModal = null;
  world.query = (selector) => {
    if (selector === '[role="dialog"]') return {};
    if (selector.includes("close-modal") && !selector.includes("command-search")) return close;
    return null;
  };
  card._render();
  assert.equal(root.activeElement, close);
});

test("closing a dialog returns focus to the control that opened it", () => {
  const world = {};
  const { card, root } = renderHarness(world);
  const opener = world.make("opener");
  opener.dataset = { action: "open-settings" };
  opener.hasAttribute = (name) => name === "data-action";
  opener.getAttribute = () => "open-settings";
  root.activeElement = opener;
  world.queryAll = (selector) => (selector === "[data-action]" ? [opener] : []);
  world.query = (selector) => (selector === '[role="dialog"]' ? {} : null);
  card._modal = "settings";
  card._render();
  assert.deepEqual({ ...card._modalReturn }, { action: "open-settings", value: "" });
  // Dialog open: the subtree swap dropped focus, then the dialog closes.
  root.activeElement = null;
  world.query = () => null;
  card._modal = null;
  card._render();
  assert.equal(root.activeElement, opener);
  assert.equal(card._modalReturn, null);
});

/** A cook mode render whose focused control is `used`; after the swap the selector yields `fresh`. */
function cookRender({ index, disabledIndex = -1, primary = null }) {
  const world = {};
  const { card, root } = renderHarness(world);
  card._modal = "cook";
  card._lastRenderedModal = "cook";
  const close = world.make("close");
  const old = [world.make("old-0"), world.make("old-1")];
  const fresh = [world.make("fresh-0"), world.make("fresh-1")];
  if (disabledIndex >= 0) fresh[disabledIndex].disabled = true;
  const used = old[index];
  used.hasAttribute = (name) => name === "data-action";
  used.getAttribute = () => "cook-next";
  root.activeElement = used;
  let swapped = false;
  const primaryEl = primary ? Object.assign(world.make(primary.name), primary) : null;
  world.query = (selector) =>
    selector === '[role="dialog"]'
      ? {}
      : selector.includes(".btn.primary")
        ? // The step buttons live in .cook-actions; a plain .btn.primary would hit the timer first.
          selector.includes(".cook-actions .btn.primary")
          ? primaryEl
          : world.make("timer-start")
        : selector.includes("close-modal")
          ? close
          : null;
  world.queryAll = (selector) => {
    if (selector !== '[data-action="cook-next"]') return [];
    if (!swapped) {
      swapped = true;
      return old;
    }
    return fresh;
  };
  card._render();
  return { root, fresh, close };
}

test("cook mode: focus returns to the same nth control after the subtree is swapped", () => {
  const { root, fresh } = cookRender({ index: 1 });
  assert.equal(root.activeElement, fresh[1]);
  const first = cookRender({ index: 0 });
  assert.equal(first.root.activeElement, first.fresh[0]);
});

test("cook mode: a disabled target hands focus to the close button when no primary is left", () => {
  const { root, close } = cookRender({ index: 1, disabledIndex: 1 });
  assert.equal(root.activeElement, close);
});

test("cook mode: a gone or disabled target hands focus to the primary button, not to close", () => {
  // Back disabled on step one, or Next replaced by Done on the last step: a repeated Enter must
  // land on the primary action instead of closing cooking mode.
  const primary = { name: "primary" };
  const { root } = cookRender({ index: 1, disabledIndex: 1, primary });
  assert.equal(root.activeElement?.name, "primary");
});

const touchGlobals = (coarse) => ({
  matchMedia: (query) => ({
    matches: coarse && query === "(pointer: coarse)",
    addEventListener() {},
  }),
});

test("on a touch screen a dialog takes focus itself instead of raising the keyboard", () => {
  // A focused text field opens the iOS keyboard over half of the dialog the moment it appears.
  const world = {};
  const { card, root } = renderHarness(world, touchGlobals(true));
  const dialog = world.make("dialog");
  const nameField = { ...world.make("name"), tagName: "INPUT", type: "text" };
  world.query = (selector) => {
    if (selector === '[role="dialog"]') return dialog;
    if (selector.includes("data-autofocus")) return nameField;
    return null;
  };
  card._modal = "create";
  card._render();
  assert.equal(root.activeElement, dialog);
});

test("on a touch screen a non-text autofocus control or the close button still takes focus", () => {
  const world = {};
  const { card, root } = renderHarness(world, touchGlobals(true));
  const dialog = world.make("dialog");
  const select = { ...world.make("select"), tagName: "SELECT" };
  world.query = (selector) => {
    if (selector === '[role="dialog"]') return dialog;
    if (selector.includes("data-autofocus")) return select;
    return null;
  };
  card._modal = "sync";
  card._render();
  assert.equal(root.activeElement, select);
});

test("with a fine pointer the text field of a dialog keeps the autofocus", () => {
  const world = {};
  const { card, root } = renderHarness(world, touchGlobals(false));
  const dialog = world.make("dialog");
  const nameField = { ...world.make("name"), tagName: "INPUT", type: "text" };
  world.query = (selector) => {
    if (selector === '[role="dialog"]') return dialog;
    if (selector.includes("data-autofocus")) return nameField;
    return null;
  };
  card._modal = "create";
  card._render();
  assert.equal(root.activeElement, nameField);
});

test("on a touch iPad with a hardware keyboard Cmd+K still focuses the palette search", () => {
  const world = {};
  const { card, root } = renderHarness(world, touchGlobals(true));
  const dialog = world.make("dialog");
  const search = { ...world.make("search"), tagName: "INPUT", type: "text" };
  world.query = (selector) => {
    if (selector === '[role="dialog"]') return dialog;
    if (selector.includes("command-search")) return search;
    return null;
  };
  card._handleKeyDown({
    key: "k",
    metaKey: true,
    target: {},
    preventDefault() {},
  });
  assert.equal(card._modal, "command");
  assert.equal(root.activeElement, search);
});

test("only keyboard-raising controls count as opening the touch keyboard", () => {
  const card = makeCard(loadCards({ globals: touchGlobals(true) }));
  assert.equal(card._opensTouchKeyboard({ tagName: "INPUT", type: "text" }), true);
  assert.equal(card._opensTouchKeyboard({ tagName: "INPUT", type: "number" }), true);
  assert.equal(card._opensTouchKeyboard({ tagName: "TEXTAREA" }), true);
  assert.equal(card._opensTouchKeyboard({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(card._opensTouchKeyboard({ tagName: "SELECT" }), false);
  assert.equal(card._opensTouchKeyboard({ tagName: "BUTTON" }), false);
  assert.equal(card._opensTouchKeyboard(null), false);
});
