import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

/** A stand-in for the rendered backdrop that records what the card asks of it. */
function backdrop({ popover = true, open = false } = {}) {
  const el = { attrs: {}, shown: 0, setAttribute: (k, v) => (el.attrs[k] = v) };
  el.matches = (selector) => selector === ":popover-open" && open;
  if (popover) el.showPopover = () => el.shown++;
  return el;
}

test("an open dialog is raised into the top layer above Home Assistant's sidebar", () => {
  const card = makeCard(loadCards());
  const el = backdrop();
  card._raiseModal(el);
  assert.equal(el.attrs.popover, "manual");
  assert.equal(el.shown, 1);
});

test("an already raised dialog is not shown twice", () => {
  const card = makeCard(loadCards());
  const el = backdrop({ open: true });
  card._raiseModal(el);
  assert.equal(el.shown, 0);
});

test("browsers without the Popover API keep the fixed backdrop untouched", () => {
  const card = makeCard(loadCards());
  const el = backdrop({ popover: false });
  card._raiseModal(el);
  assert.deepEqual(el.attrs, {});
});

test("a failing showPopover never breaks rendering", () => {
  const card = makeCard(loadCards());
  const el = backdrop();
  el.showPopover = () => {
    throw new Error("InvalidStateError");
  };
  assert.doesNotThrow(() => card._raiseModal(el));
});

test("dialogs mark their first field without the native autofocus attribute", () => {
  // showPopover() focuses a native [autofocus] on every render; the card picks focus itself.
  const card = makeCard(loadCards());
  for (const modal of ["create", "create-list"]) {
    card._modal = modal;
    const html = card._modalHtml();
    assert.match(html, /data-autofocus/);
    assert.doesNotMatch(html, /\sautofocus[\s>=]/);
    if (modal === "create-list") assert.doesNotMatch(html, /LISTENNAME/);
  }
});
