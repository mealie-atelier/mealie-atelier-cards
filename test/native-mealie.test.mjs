import test from "node:test";
import assert from "node:assert/strict";
import {
  mapNativeMealplan,
  nativeTodoEntityIds,
  mapNativeShopping,
} from "../src/components/native-mealie.js";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const plain = (value) => JSON.parse(JSON.stringify(value));

test("meal plan rows map to the view shape", () => {
  const rows = mapNativeMealplan({
    mealplan: [
      {
        mealplan_id: 4,
        entry_type: "dinner",
        mealplan_date: "2026-05-04",
        title: "",
        description: "",
        recipe: { recipe_id: "r1", slug: "soup", name: "Soup" },
      },
      {
        mealplan_id: 5,
        entry_type: "lunch",
        mealplan_date: "2026-05-05T00:00:00",
        title: "Leftovers",
        description: "cold",
        recipe: null,
      },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].entryType, "dinner");
  assert.equal(rows[0].date, "2026-05-04");
  assert.equal(rows[0].recipe.slug, "soup");
  assert.equal(rows[0].recipe.id, "r1");
  assert.equal(rows[1].date, "2026-05-05");
  assert.equal(rows[1].title, "Leftovers");
  assert.equal(rows[1].text, "cold");
  assert.equal(rows[1].recipe, null);
  assert.deepEqual(mapNativeMealplan(undefined), []);
  assert.deepEqual(mapNativeMealplan({ mealplan: "x" }), []);
});

test("only todo entities of the mealie platform are lists", () => {
  assert.deepEqual(
    nativeTodoEntityIds({
      a: { platform: "mealie", entity_id: "todo.market" },
      b: { platform: "mealie", entity_id: "sensor.x" },
      c: { platform: "other", entity_id: "todo.other" },
      d: null,
    }),
    ["todo.market"],
  );
  assert.deepEqual(nativeTodoEntityIds(undefined), []);
});

test("todo items map to shopping items and lists", () => {
  const data = mapNativeShopping(
    ["todo.market", "todo.broken"],
    { "todo.market": { attributes: { friendly_name: "Market" } } },
    {
      "todo.market": {
        items: [
          { summary: "Milk", uid: "u1", status: "needs_action" },
          { summary: "Eggs", uid: "u2", status: "completed" },
          { summary: "No uid" },
        ],
      },
    },
  );
  assert.deepEqual(data.lists, [{ id: "todo.market", name: "Market" }]);
  assert.equal(data.items.length, 2);
  assert.deepEqual(data.items[0], {
    id: "u1",
    display: "Milk",
    note: "Milk",
    checked: false,
    shoppingListId: "todo.market",
  });
  assert.equal(data.items[1].checked, true);
});

function nativeCard(extra = {}) {
  const calls = [];
  const card = makeCard(loadCards(), { hass: { language: "en", callWS: async () => ({}) } });
  card._providerActive = "home_assistant";
  card._status = { entries: [], provider: "home_assistant", read_only: true };
  card._config = { ...card._config, mealie_entry_id: "e1" };
  card._hass = {
    language: "en",
    entities: {
      m: { platform: "mealie", config_entry_id: "e1", entity_id: "todo.market" },
    },
    states: { "todo.market": { attributes: { friendly_name: "Market" } } },
    services: { mealie: { get_recipes: {}, get_recipe: {}, get_mealplan: {} } },
    callService: async (domain, service, data, target, notify, response) => {
      calls.push({ domain, service, data, target, response });
      if (service === "get_mealplan")
        return {
          response: {
            mealplan: [
              {
                mealplan_id: 1,
                entry_type: "dinner",
                mealplan_date: "2026-05-04",
                recipe: null,
                title: "Pasta",
              },
            ],
          },
        };
      if (service === "get_items")
        return {
          response: {
            "todo.market": { items: [{ summary: "Milk", uid: "u1", status: "needs_action" }] },
          },
        };
      return {};
    },
    ...extra,
  };
  return { card, calls };
}

test("native mode serves the meal plan through mealie.get_mealplan", async () => {
  const { card, calls } = nativeCard();
  const rows = await card._ws("mealplan", { start: "2026-05-04", end: "2026-05-10" });
  assert.deepEqual(plain(calls[0]), {
    domain: "mealie",
    service: "get_mealplan",
    data: { config_entry_id: "e1", start_date: "2026-05-04", end_date: "2026-05-10" },
    response: true,
  });
  assert.equal(rows[0].title, "Pasta");
});

test("native mode serves shopping through todo.get_items, one call per list", async () => {
  const { card, calls } = nativeCard();
  const data = await card._ws("shopping");
  assert.deepEqual(plain(calls[0].target), { entity_id: "todo.market" });
  assert.equal(calls[0].domain, "todo");
  assert.equal(calls[0].service, "get_items");
  assert.equal(calls[0].response, true);
  assert.equal(data.items[0].display, "Milk");
  assert.equal(data.lists[0].name, "Market");
});

test("without a todo entity shopping is empty, not an error", async () => {
  const { card } = nativeCard({ entities: {} });
  assert.deepEqual(plain(await card._ws("shopping")), { lists: [], items: [] });
});

test("without the meal plan service the meal plan is empty, not an error", async () => {
  const { card } = nativeCard({ services: { mealie: { get_recipes: {}, get_recipe: {} } } });
  assert.deepEqual(plain(await card._ws("mealplan", { start: "a", end: "b" })), []);
});

test("other bridge-only calls still say the Bridge is required", async () => {
  const { card } = nativeCard();
  await assert.rejects(() => card._ws("metadata"), /Bridge/);
});

test("ticking an item in native mode calls todo.update_item and nothing else is writable", async () => {
  const { card, calls } = nativeCard();
  card._data.shopping = await card._ws("shopping");
  calls.length = 0;
  await card._nativeShoppingToggle("u1", true);
  const update = calls.find((c) => c.service === "update_item");
  assert.equal(update.domain, "todo");
  assert.deepEqual(plain(update.data), { item: "u1", status: "completed" });
  assert.deepEqual(plain(update.target), { entity_id: "todo.market" });
  assert.equal(card._permissions.can_write, false);
});

test("the native shopping view lets the tick button work but hides edit and delete", async () => {
  const { card } = nativeCard();
  card._data.shopping = await card._ws("shopping");
  card._activeList = "todo.market";
  card._view = "shopping";
  const html = card._shopping();
  assert.match(html, /data-action="shopping-toggle"/);
  assert.doesNotMatch(html, /shopping-toggle"[^>]*disabled/);
  assert.doesNotMatch(html, /shopping-delete/);
  assert.doesNotMatch(html, /shopping-edit-form/);
});

test("a native refresh loads the meal plan and shopping lists", async () => {
  const { card } = nativeCard();
  card._config = { ...card._config, provider: "home_assistant" };
  card._nativeRecipes = async () => ({ items: [], total: 0 });
  await card._refresh();
  assert.equal(card._data.mealplan[0].title, "Pasta");
  assert.equal(card._data.shopping.items[0].display, "Milk");
  assert.equal(card._activeList, "todo.market");
});

test("clicking the tick button in native mode goes to todo.update_item", async () => {
  const { card, calls } = nativeCard();
  card._data.shopping = await card._ws("shopping");
  calls.length = 0;
  const el = {
    dataset: { action: "shopping-toggle", id: "u1", checked: "false" },
    disabled: false,
  };
  el.closest = () => el;
  await card._handleClick({ target: el });
  assert.equal(calls.find((c) => c.service === "update_item")?.data.status, "completed");
});

test("a failing meal plan or shopping read does not break the native refresh", async () => {
  const { card } = nativeCard();
  card._config = { ...card._config, provider: "home_assistant" };
  card._nativeRecipes = async () => ({ items: [], total: 0 });
  card._nativeMealplan = async () => {
    throw new Error("down");
  };
  card._nativeShopping = async () => {
    throw new Error("down");
  };
  card._data.mealplan = [{ id: "stale" }];
  card._data.shopping = { lists: [], items: [] };
  await card._refresh();
  assert.equal(card._data.mealplan, null);
  assert.equal(card._data.shopping, null);
  assert.equal(card._data.recipes.total, 0);
});
