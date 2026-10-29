import test from "node:test";
import { webcrypto as crypto } from "node:crypto";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const plain = (value) => JSON.parse(JSON.stringify(value));
const lostError = () => Object.assign(new Error("Connection lost"), { code: 3 });
const ITEMS = () => [
  { id: "i1", shoppingListId: "l1", note: "Milk", display: "Milk", quantity: 1, checked: false },
  {
    id: "i2",
    shoppingListId: "l1",
    note: "organic",
    display: "2 Flour",
    quantity: 2,
    food: { name: "Flour" },
    checked: true,
  },
  { id: "i3", shoppingListId: "l1", note: "Eggs", display: "Eggs", quantity: 1, checked: true },
  { id: "o1", shoppingListId: "l2", note: "Other list", checked: true },
];

/** A card with a scripted `mutate` call and a recorded call log. */
function setup({ permissions = { can_write: true, can_manage: false }, language = "en" } = {}) {
  class FormData {
    constructor(form) {
      this.values = form.values;
    }
    entries() {
      return Object.entries(this.values)[Symbol.iterator]();
    }
  }
  const cards = loadCards({ globals: { crypto, FormData } });
  const calls = [];
  const script = { mutate: async () => ({}) };
  const card = makeCard(cards, { permissions });
  card._hass = {
    language,
    user: { id: "u1" },
    callWS: async (msg) => {
      calls.push(plain(msg));
      if (msg.type === "mealie_atelier/mutate") return script.mutate(msg);
      if (msg.type === "mealie_atelier/shopping")
        return { lists: card._data.shopping.lists, items: card._data.shopping.items };
      return {};
    },
  };
  card._data.shopping = {
    lists: [
      { id: "l1", name: "Groceries" },
      { id: "l2", name: "Hardware" },
    ],
    items: ITEMS(),
  };
  card._activeList = "l1";
  card._providerActive = "atelier";
  card._view = "shopping";
  card._flash = (text, kind) => {
    card.flashed = { text, kind };
  };
  const mutations = () => calls.filter((c) => c.type === "mealie_atelier/mutate");
  return { card, cards, calls, script, mutations };
}
const click = (card, dataset) => {
  const el = { dataset, disabled: false, closest: () => el };
  return card._handleClick({ target: el });
};
const submit = (card, values) => {
  const form = {
    dataset: { form: "shopping-edit" },
    values,
    querySelector: () => null,
  };
  return card._handleSubmit({ target: { closest: () => form }, preventDefault() {} });
};
const ids = (card) => plain(card._data.shopping.items.map((x) => x.id));

test("rows offer edit and delete only to writers, never on rows that exist only locally", () => {
  const { card } = setup();
  const html = card._shopping();
  assert.match(html, /data-action="shopping-edit-form" data-id="i1"/);
  assert.match(html, /data-action="shopping-delete" data-id="i1"/);
  assert.match(html, /aria-label="Edit: Milk"/);
  assert.match(html, /aria-label="Delete: Milk"/);
  assert.match(html, /data-action="shopping-clear-form"/);
  card._data.shopping.items.push({ id: "pending-1", shoppingListId: "l1", note: "Soon" });
  const row = card
    ._shopping()
    .match(/<div class="shopping-row[^>]*>(?:(?!<\/div>).)*Soon.*?<\/div>/s);
  assert.doesNotMatch(row[0], /shopping-edit-form|shopping-delete/);

  const readOnly = setup({ permissions: { can_write: false, can_manage: false } }).card._shopping();
  assert.doesNotMatch(readOnly, /shopping-edit-form|shopping-delete|shopping-clear-form/);
});

test("the clear button appears only while the active list has ticked items", () => {
  const { card } = setup();
  card._data.shopping.items = card._data.shopping.items.map((x) => ({ ...x, checked: false }));
  assert.doesNotMatch(card._shopping(), /shopping-clear-form/);
  card._data.shopping.items[0].checked = true;
  assert.match(card._shopping(), /shopping-clear-form/);
});

test("delete removes the row right away, sends shopping_delete and restores it on failure", async () => {
  const { card, script, mutations } = setup();
  const seen = [];
  script.mutate = async () => {
    seen.push(ids(card));
    return {};
  };
  await click(card, { action: "shopping-delete", id: "i1" });
  assert.deepEqual(mutations()[0], {
    type: "mealie_atelier/mutate",
    action: "shopping_delete",
    payload: { item_id: "i1" },
  });
  assert.deepEqual(seen[0], ["i2", "i3", "o1"]);

  const failing = setup();
  failing.script.mutate = async () => {
    throw Object.assign(new Error("boom"), { code: "mealie_error" });
  };
  await click(failing.card, { action: "shopping-delete", id: "i1" });
  assert.deepEqual(ids(failing.card), ["i1", "i2", "i3", "o1"]);
  assert.equal(failing.card.flashed.kind, "error");
});

test("clear opens a confirm dialog with the count and only the confirm button sends the action", async () => {
  const { card, mutations } = setup();
  await click(card, { action: "shopping-clear-form" });
  assert.equal(card._modal, "shopping-clear");
  const dialog = card._modalHtml();
  assert.match(dialog, /2 ticked items will be removed from this list/);
  assert.match(dialog, /data-action="shopping-clear-confirm"/);
  assert.equal(mutations().length, 0, "opening the dialog must not write");
  await click(card, { action: "shopping-clear-confirm" });
  assert.deepEqual(mutations()[0], {
    type: "mealie_atelier/mutate",
    action: "shopping_clear_checked",
    payload: { list_id: "l1", expected_ids: ["i2", "i3"] },
  });
  assert.equal(card._modal, null);
});

test("a failed clear brings the ticked rows back in place", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw Object.assign(new Error("boom"), { code: "mealie_error" });
  };
  await click(card, { action: "shopping-clear-confirm" });
  assert.deepEqual(ids(card), ["i1", "i2", "i3", "o1"]);
});

test("the edit form is prefilled and sends only what changed", async () => {
  const { card, mutations } = setup();
  await click(card, { action: "shopping-edit-form", id: "i2" });
  assert.equal(card._modal, "shopping-edit");
  const dialog = card._modalHtml();
  assert.match(dialog, /name="name"[^>]*value="Flour"/);
  assert.match(dialog, /name="quantity"[^>]*value="2"/);
  assert.match(dialog, /name="note"[^>]*value="organic"/);

  await submit(card, { name: "Flour", quantity: "2", note: "organic" });
  assert.equal(mutations().length, 0, "an unchanged form sends nothing");
  assert.equal(card._modal, null);

  await click(card, { action: "shopping-edit-form", id: "i2" });
  await submit(card, { name: "Spelt flour", quantity: "3", note: "" });
  assert.deepEqual(mutations()[0].payload, {
    item_id: "i2",
    name: "Spelt flour",
    quantity: 3,
  });
});

test("renaming a food item folds its note into the new name and never sends name with note", async () => {
  const { card, mutations } = setup();
  await click(card, { action: "shopping-edit-form", id: "i2" });
  await submit(card, { name: "Spelt flour", quantity: "2", note: "organic" });
  assert.deepEqual(mutations()[0].payload, { item_id: "i2", name: "Spelt flour organic" });
  const row = card._data.shopping.items.find((x) => x.id === "i2");
  assert.equal(row.food, null, "the renamed item is a free text item");
  assert.equal(row.note, "Spelt flour organic");
  assert.match(card._shoppingLabel(row), /Spelt flour organic/);
  // The form of a renamed item shows the new name, so a later save cannot undo it.
  await click(card, { action: "shopping-edit-form", id: "i2" });
  assert.match(card._modalHtml(), /name="name"[^>]*value="Spelt flour organic"/);
});

test("a quantity-only edit after a rename keeps the new name", async () => {
  const { card, mutations } = setup();
  await click(card, { action: "shopping-edit-form", id: "i2" });
  await submit(card, { name: "Spelt flour", quantity: "2", note: "organic" });
  await click(card, { action: "shopping-edit-form", id: "i2" });
  const form = card._modalHtml();
  const name = form.match(/name="name"[^>]*value="([^"]*)"/)[1];
  await submit(card, { name, quantity: "5" });
  assert.deepEqual(mutations()[1].payload, { item_id: "i2", quantity: 5 });
  assert.match(
    card._shoppingLabel(card._data.shopping.items.find((x) => x.id === "i2")),
    /^5 Spelt flour/,
  );
});

test("a free-text item has no separate note field: its new name is its note", async () => {
  const { card, mutations } = setup();
  await click(card, { action: "shopping-edit-form", id: "i1" });
  assert.doesNotMatch(card._modalHtml(), /name="note"/);
  await submit(card, { name: "Oat milk", quantity: "1" });
  assert.deepEqual(mutations()[0].payload, {
    item_id: "i1",
    name: "Oat milk",
  });
  assert.equal(card._data.shopping.items[0].note, "Oat milk");
});

test("a failed edit restores the old values", async () => {
  const { card, script } = setup();
  script.mutate = async () => {
    throw Object.assign(new Error("boom"), { code: "mealie_error" });
  };
  await click(card, { action: "shopping-edit-form", id: "i1" });
  await submit(card, { name: "Oat milk", quantity: "4" });
  assert.equal(card._data.shopping.items[0].note, "Milk");
  assert.equal(card._data.shopping.items[0].quantity, 1);
});

test("a read-only card ignores the new actions", async () => {
  const { card, mutations } = setup({ permissions: { can_write: false, can_manage: false } });
  await click(card, { action: "shopping-delete", id: "i1" });
  await click(card, { action: "shopping-clear-confirm" });
  await click(card, { action: "shopping-edit-form", id: "i1" });
  assert.equal(mutations().length, 0);
  assert.notEqual(card._modal, "shopping-edit");
});

test("German texts use real umlauts and the informal du", () => {
  const { card } = setup({ language: "de" });
  assert.equal(card.t("shoppingClearTicked"), "Erledigte entfernen");
  assert.match(card.tp("shoppingClearConfirm", 3), /^3 erledigte Artikel werden/);
  assert.match(card.t("shoppingEditTip"), /Ändere .* du /);
});

// Offline queue

function offlineSetup() {
  const s = setup({
    permissions: { can_write: true, can_manage: false, features: { offline_queue: true } },
  });
  s.card._render = () => {};
  s.script.mutate = async () => {
    throw lostError();
  };
  return s;
}
const queue = (card) => plain(card._offlineLoad());

test("connectivity failures queue delete, update and clear with exactly the Bridge payloads", async () => {
  const { card } = offlineSetup();
  assert.equal(
    await card._mutate("shopping_update", { item_id: "i2", quantity: 5, extra: 1 }, "shopping"),
    true,
  );
  assert.equal(await card._mutate("shopping_delete", { item_id: "i1" }, "shopping"), true);
  assert.equal(
    await card._mutate(
      "shopping_clear_checked",
      { list_id: "l1", expected_ids: ["i2", "i3"] },
      "shopping",
    ),
    true,
  );
  const ops = queue(card);
  assert.deepEqual(
    ops.map((op) => [op.action, op.payload]),
    [
      ["shopping_update", { item_id: "i2", quantity: 5, expected_quantity: 2 }],
      ["shopping_delete", { item_id: "i1" }],
      ["shopping_clear_checked", { list_id: "l1", expected_ids: ["i2", "i3"] }],
    ],
  );
  assert.equal(ops[2].label, "Groceries");
});

test("waiting operations change the list the user sees, in the order they were made", async () => {
  const { card } = offlineSetup();
  await card._mutate("shopping_update", { item_id: "i1", name: "Oat milk" }, "shopping");
  await card._mutate("shopping_delete", { item_id: "i3" }, "shopping");
  await card._mutate(
    "shopping_clear_checked",
    { list_id: "l1", expected_ids: ["i2", "i3"] },
    "shopping",
  );
  const view = card._offlineItems(card._data.shopping.items);
  assert.deepEqual(
    view.map((x) => x.id),
    ["i1", "o1"],
  );
  assert.equal(view[0].display, "1 Oat milk");
});

test("a waiting tick still counts when clear runs behind it", async () => {
  const { card } = offlineSetup();
  await card._mutate("shopping_toggle", { item_id: "i1", checked: true }, "shopping");
  await card._mutate(
    "shopping_clear_checked",
    { list_id: "l1", expected_ids: ["i1", "i2", "i3"] },
    "shopping",
  );
  assert.deepEqual(
    card._offlineItems(card._data.shopping.items).map((x) => x.id),
    ["o1"],
  );
});

test("replay sends the new actions through offline_replay in order and empties the queue", async () => {
  const { card, calls, script } = offlineSetup();
  await card._mutate("shopping_delete", { item_id: "i1" }, "shopping");
  await card._mutate(
    "shopping_clear_checked",
    { list_id: "l1", expected_ids: ["i2", "i3"] },
    "shopping",
  );
  script.mutate = async () => ({});
  await card._offlineReplay();
  const sent = calls.filter((c) => c.type === "mealie_atelier/offline_replay");
  assert.deepEqual(
    sent.map((c) => c.operation.action),
    ["shopping_delete", "shopping_clear_checked"],
  );
  assert.deepEqual(queue(card), []);
});

test("a quantity-only or note-only edit changes the row label at once", async () => {
  const { card } = setup();
  await click(card, { action: "shopping-edit-form", id: "i2" });
  await submit(card, { name: "Flour", quantity: "3", note: "organic" });
  assert.equal(card._shoppingLabel(card._data.shopping.items[1]), "3 Flour organic");
  await click(card, { action: "shopping-edit-form", id: "i2" });
  await submit(card, { name: "Flour", quantity: "3", note: "fine" });
  assert.equal(card._shoppingLabel(card._data.shopping.items[1]), "3 Flour fine");
  await click(card, { action: "shopping-edit-form", id: "i1" });
  await submit(card, { name: "Milk", quantity: "2" });
  assert.equal(card._shoppingLabel(card._data.shopping.items[0]), "2 Milk");
});

test("a waiting quantity edit shows in the label of the offline view", async () => {
  const { card } = offlineSetup();
  await card._mutate("shopping_update", { item_id: "i1", quantity: 4 }, "shopping");
  assert.equal(card._shoppingLabel(card._offlineItems(card._data.shopping.items)[0]), "4 Milk");
});

test("a failed write blocks later writes on the same item in the same replay", async () => {
  const { card, calls, script } = offlineSetup();
  await card._mutate("shopping_update", { item_id: "i1", quantity: 2 }, "shopping");
  await card._mutate("shopping_update", { item_id: "i1", quantity: 3 }, "shopping");
  await card._mutate("shopping_delete", { item_id: "i1" }, "shopping");
  await card._mutate("shopping_update", { item_id: "i3", quantity: 5 }, "shopping");
  script.mutate = async () => ({});
  const inner = card._hass.callWS;
  card._hass.callWS = async (msg) => {
    if (msg.type === "mealie_atelier/offline_replay" && msg.operation.payload.quantity === 2) {
      calls.push(plain(msg));
      throw Object.assign(new Error("boom"), { code: "mealie_error" });
    }
    return inner(msg);
  };
  await card._offlineReplay();
  const sent = calls.filter((c) => c.type === "mealie_atelier/offline_replay");
  assert.deepEqual(
    sent.map((c) => [c.operation.action, c.operation.payload.item_id]),
    [
      ["shopping_update", "i1"],
      ["shopping_update", "i3"],
    ],
  );
  assert.deepEqual(
    queue(card).map((o) => [o.payload.item_id, o.state || "pending"]),
    [
      ["i1", "failed"],
      ["i1", "pending"],
      ["i1", "pending"],
    ],
  );
});

test("an offline edit carries the value the user saw for every changed field", async () => {
  const { card } = offlineSetup();
  await card._mutate("shopping_update", { item_id: "i1", name: "Oat milk" }, "shopping");
  await card._mutate("shopping_update", { item_id: "i2", note: "fine" }, "shopping");
  await card._mutate("shopping_update", { item_id: "i2", quantity: 5 }, "shopping");
  await card._mutate("shopping_update", { item_id: "i2", quantity: 6 }, "shopping");
  assert.deepEqual(
    queue(card).map((op) => op.payload),
    [
      { item_id: "i1", name: "Oat milk", expected_name: "Milk" },
      { item_id: "i2", note: "fine", expected_note: "organic" },
      { item_id: "i2", quantity: 5, expected_quantity: 2 },
      // The second edit saw the waiting first edit.
      { item_id: "i2", quantity: 6, expected_quantity: 5 },
    ],
  );
});

test("an offline clear is not queued without the IDs of the ticked items the user saw", async () => {
  const { card } = offlineSetup();
  assert.equal(await card._mutate("shopping_clear_checked", { list_id: "l1" }, "shopping"), false);
  assert.deepEqual(queue(card), []);
});

test("the offline view of a clear leaves items ticked after it was queued", async () => {
  const { card } = offlineSetup();
  await card._mutate("shopping_clear_checked", { list_id: "l1", expected_ids: ["i2"] }, "shopping");
  assert.deepEqual(
    card._offlineItems(card._data.shopping.items).map((x) => x.id),
    ["i1", "i3", "o1"],
  );
});

test("chained offline edits send the name the earlier edit leaves behind", async () => {
  const { card } = offlineSetup();
  await card._mutate("shopping_update", { item_id: "i1", name: "Oat milk" }, "shopping");
  await card._mutate("shopping_update", { item_id: "i1", quantity: 4 }, "shopping");
  await card._mutate("shopping_update", { item_id: "i1", name: "Soy milk" }, "shopping");
  assert.equal(queue(card).at(-1).payload.expected_name, "4 Oat milk");
});
