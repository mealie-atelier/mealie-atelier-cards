import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function setup(wsImpl) {
  const card = makeCard(loadCards());
  card._detail = { slug: "pancakes", name: "Pancakes", recipeInstructions: [{ text: "Mix" }] };
  card._studio = { revision: 1, family: { session: null }, journal: {} };
  card._ws = wsImpl;
  card._render = () => {};
  card._studioWrite = async () => {};
  const dialogs = [];
  card._atelierDialog = async (o) => (dialogs.push(o), true);
  return { card, dialogs };
}
const click = (card) => {
  const button = { dataset: { action: "cook-start" }, disabled: false, closest: () => button };
  return card._handleClick({ target: { closest: () => button }, preventDefault() {} });
};

test("cook start asks about a session another device started after the last poll", async () => {
  const other = { id: "s9", slug: "soup", name: "Soup", step: 0, timers: [] };
  const { card, dialogs } = setup(async () => ({
    revision: 2,
    family: { session: other },
    journal: {},
  }));
  await click(card);
  assert.equal(dialogs.length, 1);
});

test("cook start does not ask about a session another device already ended", async () => {
  const other = { id: "s9", slug: "soup", name: "Soup", step: 0, timers: [] };
  const { card, dialogs } = setup(async () => ({
    revision: 3,
    family: { session: null },
    journal: {},
  }));
  card._studio.family.session = other;
  await click(card);
  assert.equal(dialogs.length, 0);
});

test("cook start still works when the refresh hangs", async () => {
  const { card, dialogs } = setup(() => new Promise(() => {}));
  await click(card);
  assert.equal(dialogs.length, 0);
  assert.equal(card._modal, "cook");
});

test("German shopping note renders cups as Tasse and Tassen", () => {
  const { card } = setup(async () => ({}));
  card._hass = { language: "de", callWS: async () => ({}) };
  assert.equal(
    card._studioNoteAmount({ unit: "cup", quantity: 1 }).join(" "),
    ["1", "Tasse"].join(" "),
  );
  assert.equal(
    card._studioNoteAmount({ unit: "cup", quantity: 2 }).join(" "),
    ["2", "Tassen"].join(" "),
  );
  card._hass = { language: "en", callWS: async () => ({}) };
  assert.equal(
    card._studioNoteAmount({ unit: "cup", quantity: 2 }).join(" "),
    ["2", "cups"].join(" "),
  );
});

test("a second click while the start refresh is pending starts no second run", async () => {
  let release;
  let calls = 0;
  const { card } = setup(() => {
    calls++;
    return new Promise((resolve) => (release = resolve));
  });
  card._studioWrite = async () => {
    writes++;
  };
  let writes = 0;
  const attrs = {};
  const button = {
    dataset: { action: "cook-start" },
    disabled: false,
    closest: () => button,
    setAttribute: (k, v) => (attrs[k] = v),
    removeAttribute: (k) => delete attrs[k],
  };
  const press = () => card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  const first = press();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(button.disabled, true);
  assert.equal(attrs["aria-busy"], "true");
  await press();
  assert.equal(calls, 1);
  release({ revision: 2, family: { session: null }, journal: {} });
  await first;
  assert.equal(writes, 1);
  assert.equal(button.disabled, false);
  assert.equal(attrs["aria-busy"], undefined);
});

test("the start button is enabled again when the refresh fails", async () => {
  const { card } = setup(async () => {
    throw new Error("offline");
  });
  const button = { dataset: { action: "cook-start" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(button.disabled, false);
  assert.equal(card._cookStartPending, false);
  assert.equal(card._modal, "cook");
});
