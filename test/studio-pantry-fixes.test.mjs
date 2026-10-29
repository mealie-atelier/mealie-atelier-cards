import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const pantryCard = (pantry, extra = {}) => {
  const card = makeCard(loadCards(), extra);
  card._studio = { revision: 0, journal: {}, profile: {}, family: { members: [] }, pantry };
  return card;
};
const listOf = (card) => card._studioPantry().split('class="studio-pantry-list"')[1];

test("pantry dates drop the zero padding, add a foreign year and never wrap", () => {
  const html = listOf(
    pantryCard([{ id: "a", name: "Rice", amount: 1, unit: "g", expires: "2099-05-07" }]),
  );
  assert.match(html, /May 7, 2099/);
  assert.doesNotMatch(html, /May 07/);
});

test("expired and soon expiring pantry items carry a text marker", () => {
  const now = new Date();
  const ymd = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const html = listOf(
    pantryCard([
      { id: "a", name: "Old", amount: 1, unit: "g", expires: ymd(-2) },
      { id: "b", name: "Soon", amount: 1, unit: "g", expires: ymd(2) },
      { id: "c", name: "Later", amount: 1, unit: "g", expires: ymd(30) },
    ]),
  );
  assert.equal(html.match(/studio-expiry--expired">Expired</g).length, 1);
  assert.equal(html.match(/studio-expiry--soon">Expires soon</g).length, 1);
  assert.equal(html.match(/studio-expiry /g).length, 2);
});

test("editing a pantry row shows a Save button with Cancel and survives a re-render", async () => {
  const card = pantryCard([{ id: "p1", name: "Rice", amount: 500, unit: "g", staple: true }]);
  card._render = () => {};
  card.shadowRoot.querySelector = () => ({
    getBoundingClientRect: () => ({ top: 0, bottom: 10 }),
    scrollIntoView() {},
  });
  const plain = card._studioPantry();
  assert.ok(!plain.includes("studio-pantry-edit-cancel"));
  assert.ok(plain.includes("Add</button>"));
  const el = { dataset: { action: "studio-pantry-edit", id: "p1" }, closest: () => el };
  await card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
  const editing = card._studioPantry();
  assert.ok(editing.includes('data-action="studio-pantry-edit-cancel"'));
  assert.match(editing, /Save<\/button>/);
  assert.match(editing, /name="name"[^>]* value="Rice"/);
  assert.match(editing, /value="500"/);
  assert.match(editing, /<option value="g" selected>/);
  assert.match(editing, /name="staple" checked/);
  const cancel = { dataset: { action: "studio-pantry-edit-cancel" }, closest: () => cancel };
  await card._handleClick({ target: cancel, preventDefault() {}, stopPropagation() {} });
  assert.ok(!card._studioPantry().includes("studio-pantry-edit-cancel"));
});

test("the pantry list flows with the page instead of cutting rows in a nested scroller", () => {
  const css = readFileSync(new URL("../src/design-system/kitchen.css", import.meta.url), "utf8");
  const rule = css.match(/\.studio-pantry-list \{[^}]*\}/)[0];
  assert.doesNotMatch(rule, /max-height|overflow/);
});

test("cookbook rows without a photo keep a placeholder so names line up", () => {
  const card = makeCard(loadCards());
  card._studio = { pantry: [], family: {} };
  card._fullCatalog = [{ slug: "a", name: "No photo" }];
  card._bookSelected = new Set();
  assert.match(card._studioCookbook(), /studio-book-photo--empty/);
});

test("the cookbook print preview offers a close button and a viewport meta", async () => {
  let written = "";
  const popup = {
    document: {
      write: (html) => (written = html),
      open() {},
      close() {},
    },
  };
  const card = makeCard(loadCards({ window: { open: () => popup } }));
  card._fullCatalog = [
    { slug: "a", name: "A", recipeInstructions: [{ text: "Stir." }], recipeIngredient: [] },
  ];
  card._bookSelected = new Set(["a"]);
  await card._studioPrintBook({ title: "T", subtitle: "S", photos: false });
  assert.match(written, /name="viewport"/);
  assert.match(written, /@media screen and \(max-width:840px\)\{\.page,\.chapter\{width:auto/);
  assert.match(written, /window\.close\(\)">Close</);
});

test("deleting the row under edit clears the edit target and typed values survive a re-render", async () => {
  const card = pantryCard([{ id: "p1", name: "Rice", amount: 500, unit: "g" }], {});
  card._render = () => {};
  card._atelierDialog = async () => true;
  card._pantryEdit = "p1";
  const form = {
    dataset: { form: "studio-pantry" },
    elements: {
      name: { value: "Basmati" },
      amount: { value: "750" },
      unit: { value: "g" },
      expires: { value: "" },
      staple: { checked: false },
    },
  };
  const field = { dataset: {}, hasAttribute: () => false, closest: () => form };
  card._handleInput({ target: field });
  assert.match(card._studioPantry(), /name="name"[^>]* value="Basmati"/);
  card._studioWrite = async () => true;
  const del = { dataset: { action: "studio-pantry-delete", id: "p1" }, closest: () => del };
  await card._handleClick({ target: del, preventDefault() {}, stopPropagation() {} });
  assert.equal(card._pantryEdit, null);
  assert.equal(card._pantryDraft, null);
});
