import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const Studio = vm.runInNewContext(
  readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8") + "\nAtelierStudio",
  {},
);

test("word ranges scale on both ends in German", () => {
  assert.equal(Studio.scaleIngredient("1 bis 2 Zehen", 6, 4, "de"), "1½ bis 3 Zehen");
  assert.equal(Studio.scaleIngredient("1 bis 2 Zehen", 7, 2, "de"), "3½ bis 7 Zehen");
  assert.equal(Studio.scaleIngredient("1 bis 2 Zehen", 1, 4, "de"), "¼ bis ½ Zehe");
});

test("word ranges scale on both ends in English", () => {
  assert.equal(Studio.scaleIngredient("1 to 2 cloves", 8, 4, "en"), "2 to 4 cloves");
  assert.equal(Studio.scaleIngredient("2-3 cloves", 4, 2, "en"), "4-6 cloves");
});

test("editor toast is raised into the top layer", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  const raised = [];
  const appended = [];
  const toast = { classList: {} };
  const root = {
    querySelector: () => null,
    appendChild: (el) => appended.push(el),
  };
  const shadowRoot = { querySelector: (sel) => (sel === ".atelier" ? root : null) };
  Object.defineProperty(card, "shadowRoot", { value: shadowRoot });
  card._raiseModal = (el) => raised.push(el);
  cards.document.createElement = () => ({
    set innerHTML(_) {},
    content: { firstElementChild: toast },
  });
  globalThis.document ??= cards.document;
  card._editorToast("Restored");
  clearTimeout(card._toastTimer);
  assert.deepEqual(appended, [toast]);
  assert.deepEqual(raised, [toast]);
});
