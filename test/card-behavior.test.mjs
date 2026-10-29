import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const failing = (message) => async () => {
  throw new Error(message);
};

function shoppingCard(language, callWS) {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language, callWS } });
  card._activeList = "l1";
  card._data.shopping = {
    lists: [{ id: "l1", name: "Market" }],
    items: [
      { id: "i1", shoppingListId: "l1", note: "Milk", checked: false },
      { id: "i2", shoppingListId: "l1", note: "Eggs", checked: true },
    ],
  };
  card._data.mealplan = [
    { id: "m1", date: "2030-01-02", entryType: "dinner", recipe: { name: "Soup" } },
  ];
  return { cards, card };
}

// Dispatch a click on a [data-action] element the way the shadow root listener sees it.
const click = (card, dataset) => {
  const el = { dataset, disabled: false, closest: () => el };
  return card._handleClick({ target: el });
};

function toastOf(cards) {
  return cards.document.markup.match(
    /<div class="toast[^"]*" role="(\w+)" aria-live="(\w+)">(.*?)<\/div>/s,
  );
}

test("failed shopping toggle rolls back the checkbox and raises an accessible localized alert", async () => {
  const { cards, card } = shoppingCard("de", failing("Server down"));
  await click(card, { action: "shopping-toggle", id: "i1", checked: "false" });
  assert.equal(card._data.shopping.items[0].checked, false, "optimistic check must be undone");
  const toast = toastOf(cards);
  assert.ok(toast, "an error toast is rendered");
  assert.equal(toast[1], "alert");
  assert.equal(toast[2], "assertive");
  assert.match(toast[3], /Speichern fehlgeschlagen: Server down/);
  assert.match(toast[3], /rückgängig/);
});

test("successful shopping toggle keeps the optimistic state and uses a polite status toast", async () => {
  const { cards, card } = shoppingCard("en", async (message) =>
    message.type === "mealie_atelier/shopping" ? card._data.shopping : {},
  );
  const seen = [];
  const original = card._render.bind(card);
  card._render = () => {
    seen.push(card._data.shopping.items[0].checked);
    original();
  };
  await click(card, { action: "shopping-toggle", id: "i1", checked: "false" });
  assert.equal(seen[0], true, "UI flips before the server answers");
  assert.equal(toastOf(cards)[1], "status");
});

test("failed shopping add removes the pending row again", async () => {
  const { cards, card } = shoppingCard("en", failing("Boom"));
  await card._mutate("shopping_add", { list_id: "l1", note: "Bread" }, "shopping", () =>
    card._optimisticAdd("shopping", { id: "pending-1", shoppingListId: "l1", note: "Bread" }),
  );
  assert.deepEqual([...card._data.shopping.items.map((x) => x.id)], ["i1", "i2"]);
  assert.equal(toastOf(cards)[1], "alert");
  assert.match(toastOf(cards)[3], /Could not save: Boom/);
});

test("failed meal plan delete restores the entry, failed add removes the pending entry", async () => {
  const { cards, card } = shoppingCard("en", failing("Nope"));
  await click(card, { action: "remove-meal", value: "m1" });
  assert.deepEqual([...card._data.mealplan.map((x) => x.id)], ["m1"]);
  assert.equal(toastOf(cards)[1], "alert");
  await card._mutate(
    "mealplan_add",
    { date: "2030-01-03", meal_type: "lunch", recipe_id: "r1" },
    "mealplan",
    () => card._optimisticAdd("mealplan", { id: "pending-2", date: "2030-01-03" }),
  );
  assert.deepEqual([...card._data.mealplan.map((x) => x.id)], ["m1"]);
});

test("a skipped recipe fetch in the cookbook print is surfaced and the rest is still printed", async () => {
  const written = [];
  const popup = { document: { write: (html) => written.push(html), open() {}, close() {} } };
  const cards = loadCards({ window: { open: () => popup } });
  const card = makeCard(cards, {
    hass: {
      language: "en",
      callWS: async (message) => {
        if (message.slug === "broken") throw new Error("gone");
        return {
          slug: message.slug,
          name: `Recipe ${message.slug}`,
          recipeIngredient: [],
          recipeInstructions: [],
        };
      },
    },
  });
  card._fullCatalog = [{ slug: "broken", name: "Broken Pie" }, { slug: "a" }, { slug: "b" }];
  card._bookSelected = new Set(["a", "broken", "b"]);
  await card._studioPrintBook({ title: "Book", subtitle: "", photos: false });
  const html = written.join("");
  assert.ok(html.includes("Recipe a") && html.includes("Recipe b"), "remaining recipes are kept");
  assert.ok(!html.includes("Broken Pie"));
  const toast = toastOf(cards);
  assert.equal(toast[1], "alert");
  assert.match(toast[3], /1 recipes could not be loaded and were skipped: Broken Pie/);
});

test("hitting the Home Assistant provider limit shows a localized incompleteness notice", async () => {
  for (const [language, pattern] of [
    ["en", /first 500 matches[\s\S]*incomplete[\s\S]*Bridge/],
    ["de", /ersten 500 Treffer[\s\S]*unvollständig[\s\S]*Bridge/],
  ]) {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._providerActive = "home_assistant";
    card._view = "recipes";
    const rows = (count) =>
      Array.from({ length: count }, (_, i) => ({ slug: `r${i}`, name: `R${i}` }));
    card._nativeAction = async () => ({ recipes: rows(500) });
    card._data.recipes = await card._nativeRecipes("");
    assert.equal(card._providerTruncated, true);
    card._render();
    assert.match(cards.document.markup, pattern);
    card._nativeAction = async () => ({ recipes: rows(3) });
    card._data.recipes = await card._nativeRecipes("");
    assert.equal(card._providerTruncated, false);
    card._render();
    assert.doesNotMatch(cards.document.markup, /may be incomplete|möglicherweise unvollständig/);
  }
});

test("a failing write rolls back only its own change when another write succeeded meanwhile", async () => {
  const { card } = shoppingCard("en", async (message) => {
    if (message.type === "mealie_atelier/mutate" && message.action === "shopping_add")
      throw new Error("boom");
    return {};
  });
  let releaseA;
  card._ws = async (type, payload) => {
    if (type === "mutate" && payload.action === "shopping_add") {
      await new Promise((r) => (releaseA = r));
      throw new Error("A failed");
    }
    if (type === "shopping") return card._data.shopping;
    return {};
  };
  const a = card._mutate("shopping_add", {}, "shopping", () =>
    card._optimisticAdd("shopping", { id: "pending-a", note: "A" }),
  );
  await card._mutate("shopping_toggle", {}, "shopping", () => card._optimisticToggle("i1", true));
  card._data.shopping = {
    ...card._data.shopping,
    items: [...card._data.shopping.items, { id: "b", note: "B", shoppingListId: "l1" }],
  };
  releaseA();
  assert.equal(await a, false);
  const items = card._data.shopping.items;
  assert.equal(items.find((x) => x.id === "i1").checked, true, "B's toggle survives A's rollback");
  assert.ok(
    items.some((x) => x.id === "b"),
    "B's row survives",
  );
  assert.ok(!items.some((x) => x.id === "pending-a"), "A's pending row is gone");
});

test("a failed meal removal re-inserts the entry only when it is missing", () => {
  const { card } = shoppingCard("en", async () => ({}));
  const rollback = card._optimisticRemoveMeal("m1");
  card._data.mealplan = [{ id: "m2" }];
  rollback();
  assert.deepEqual([...card._data.mealplan.map((x) => x.id)], ["m1", "m2"]);
  const again = card._optimisticRemoveMeal("m1");
  card._data.mealplan = [{ id: "m1" }, { id: "m2" }];
  again();
  assert.equal(card._data.mealplan.filter((x) => x.id === "m1").length, 1);
});

test("pending rows render disabled controls with the saving label", () => {
  const { cards, card } = shoppingCard("en", async () => ({}));
  card._optimisticAdd("shopping", {
    id: "pending-1",
    shoppingListId: "l1",
    note: "Bread",
    checked: false,
  });
  card._view = "shopping";
  card._render();
  const html = cards.document.markup;
  const pending = html.match(/<button[^>]*data-id="pending-1"[^>]*>/);
  assert.ok(pending, "pending row is rendered");
  assert.match(pending[0], /disabled/);
  assert.match(pending[0], /aria-disabled="true"/);
  assert.match(pending[0], /aria-label="Saving…"/);
  const real = html.match(/<button[^>]*data-id="i1"[^>]*>/)[0];
  assert.doesNotMatch(real, /disabled/);
});

const grants = (can_read, can_write, can_admin, extra = {}) => ({
  permissions: { can_read, can_write, can_admin },
  can_write,
  can_manage: can_admin,
  ...extra,
});
function permissionCard(permissions, language = "en") {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) }, permissions });
  card._activeList = "l1";
  card._data.shopping = {
    lists: [{ id: "l1", name: "Market" }],
    items: [{ id: "i1", shoppingListId: "l1", note: "Milk", checked: false }],
  };
  card._data.mealplan = [];
  card._data.recipes = { items: [] };
  return { cards, card };
}

test("shopping write controls are hidden and the grant notice shows when can_write is false", () => {
  const { cards, card } = permissionCard(grants(true, false, false));
  card._view = "shopping";
  card._render();
  const html = cards.document.markup;
  assert.doesNotMatch(html, /data-form="shopping-add"/);
  assert.doesNotMatch(html, /data-action="create-list-form"/);
  assert.match(html, /may view this kitchen but not change it/);
  assert.match(html, /data-action="shopping-toggle"[^>]*aria-disabled="true"/);
  const writer = permissionCard(grants(true, true, false));
  writer.card._view = "shopping";
  writer.card._render();
  assert.match(writer.cards.document.markup, /data-form="shopping-add"/);
  assert.doesNotMatch(writer.cards.document.markup, /may view this kitchen but not change it/);
});

test("the read-only notice stays for a read-only kitchen instead of the grant notice", () => {
  const { cards, card } = permissionCard(grants(true, false, false, { read_only: true }));
  card._view = "shopping";
  card._render();
  assert.doesNotMatch(cards.document.markup, /may view this kitchen but not change it/);
  assert.match(cards.document.markup, /Read-only mode/);
});

test("recipe management and the editor stay hidden without can_admin", () => {
  const writer = permissionCard(grants(true, true, false));
  writer.card._view = "recipes";
  writer.card._render();
  assert.doesNotMatch(writer.cards.document.markup, /data-action="create-form"/);
  assert.doesNotMatch(writer.cards.document.markup, /data-value="manage"/);
  const admin = permissionCard(grants(true, true, true));
  admin.card._view = "recipes";
  admin.card._render();
  assert.match(admin.cards.document.markup, /data-action="create-form"/);
  assert.equal(admin.card._permissions.can_manage, true);
});

test("a reader sees the web app wording only inside the standalone web app", () => {
  const grants = { can_read: true, can_write: false, can_manage: false };
  const make = (hass) => {
    const cards = loadCards();
    const card = makeCard(cards, { hass });
    card._status = { entries: [{ entry_id: "e1", permissions: grants }] };
    return card;
  };
  const web = make({ language: "en", atelierOfflineHost: true, callWS: async () => ({}) });
  assert.equal(web._noWriteGrant, true);
  assert.equal(web._noWriteGrantText, web.t("uiNoWriteGrantWeb"));
  assert.doesNotMatch(web._noWriteGrantText, /Home Assistant/);
  const german = make({ language: "de", atelierOfflineHost: true, callWS: async () => ({}) });
  assert.match(german._noWriteGrantText, /Schreibrolle/);
  const ha = make({ language: "en", callWS: async () => ({}) });
  assert.match(ha._noWriteGrantText, /Home Assistant/);
});

test("a legacy status without permissions still drives the card", () => {
  const { card } = permissionCard({ can_write: true, can_manage: false });
  assert.equal(card._permissions.can_write, true);
  assert.equal(card._permissions.can_admin, false);
  assert.equal(card._noWriteGrant, false);
  const admin = permissionCard({ can_write: true, can_manage: true, can_edit_ingredients: true });
  assert.equal(admin.card._permissions.can_admin, true);
  assert.equal(admin.card._permissions.can_manage, true);
  assert.equal(admin.card._permissions.can_edit_ingredients, true);
});

test("_permissions prefers the structured permissions over the legacy mirrors", () => {
  const { card } = permissionCard({
    permissions: { can_read: true, can_write: false, can_admin: false },
    can_write: true,
    can_manage: true,
    features: { uploads: true },
    limits: { upload_max_bytes: 5 },
  });
  const p = card._permissions;
  assert.deepEqual(
    [p.can_read, p.can_write, p.can_admin, p.can_manage],
    [true, false, false, false],
  );
  assert.equal(p.features.uploads, true);
  assert.equal(p.limits.upload_max_bytes, 5);
});

test("_errorText maps every contract code to its err key and falls back to the message", () => {
  const { card } = permissionCard(grants(true, true, true));
  assert.equal(
    card._errorText({ code: "write_not_permitted", message: "raw" }),
    card.t("errWriteNotPermitted"),
  );
  assert.notEqual(card.t("errWriteNotPermitted"), "errWriteNotPermitted");
  for (const code of [
    "not_configured",
    "invalid_request",
    "mealie_auth",
    "mealie_error",
    "read_only",
    "unauthorized",
    "write_not_permitted",
    "conflict",
    "recipe_changed",
    "disabled",
    "use_structured_editor",
    "write_unverified",
    "backup_failed",
    "backup_not_found",
    "upload_invalid",
    "upload_expired",
    "upload_busy",
    "step_not_found",
    "sync_rule_not_found",
    "sync_destination_unsupported",
    "sync_source_taken",
    "sync_too_many_rules",
    "sync_not_activated",
    "sync_not_supported",
  ])
    assert.notEqual(card._errorText({ code, message: "raw" }), "raw", code);
  assert.equal(card._errorText({ code: "unknown_code", message: "raw" }), "raw");
  assert.equal(card._errorText(new Error("plain")), "plain");
  assert.equal(card._errorText(null), card.t("error"));
  const german = permissionCard(grants(true, true, true), "de");
  assert.match(german.card._errorText({ code: "unauthorized" }), /Administrator/);
});

test("a refused write re-reads the status once and drops the write controls", async () => {
  let statusCalls = 0;
  const callWS = async (message) => {
    if (message.type === "mealie_atelier/status") {
      statusCalls++;
      return { entries: [{ entry_id: "e1", ...grants(true, false, false) }] };
    }
    throw Object.assign(new Error("denied"), { code: "write_not_permitted" });
  };
  const { cards, card } = permissionCard(grants(true, true, false));
  card._hass.callWS = callWS;
  card._view = "shopping";
  await card._mutate("shopping_add", { list_id: "l1", note: "Bread" }, "none");
  assert.equal(statusCalls, 1);
  assert.equal(card._permissions.can_write, false);
  assert.match(toastOf(cards)[3], /do not have permission/);
  assert.doesNotMatch(cards.document.markup, /data-form="shopping-add"/);
});

test("the personal journal stays writable without a write grant", async () => {
  const sent = [];
  const { card } = permissionCard(grants(true, false, false));
  const studio = { revision: 0, journal: {}, pantry: [], family: { members: [] }, profile: {} };
  card._studio = studio;
  card._hass.callWS = async (message) => {
    sent.push(message.action);
    return { ...studio, revision: 1 };
  };
  assert.equal(await card._studioWrite("journal_set", { slug: "soup" }), true);
  assert.equal(await card._studioWrite("pantry_put", { name: "Rice" }), false);
  assert.deepEqual(sent, ["journal_set"]);
});

function refusingCard(code) {
  let statusCalls = 0;
  const { cards, card } = permissionCard(grants(true, true, false));
  card._hass.callWS = async (message) => {
    if (message.type === "mealie_atelier/status") {
      statusCalls++;
      return { entries: [{ entry_id: "e1", ...grants(true, false, false) }] };
    }
    if (message.type === "mealie_atelier/mutate") throw Object.assign(new Error("raw"), { code });
    return {};
  };
  card._atelierDialog = async () => true;
  card._loadShopping = async () => {};
  card._loadMealplan = async () => {};
  return { cards, card, statusCalls: () => statusCalls };
}

test("sending groceries re-reads the status once after refused writes", async () => {
  const { card, statusCalls } = refusingCard("write_not_permitted");
  card._grocery = [{ name: "Rice", needed: 1, unit: "kg" }, { name: "Salt" }];
  await card._studioSendGroceries();
  assert.equal(statusCalls(), 1);
  assert.equal(card._permissions.can_write, false);
});

test("committing a week plan maps the error code and re-reads the status once", async () => {
  const { card, statusCalls } = refusingCard("write_not_permitted");
  card._weekProposal = [
    { date: "2030-01-01", meal_type: "dinner", recipe_id: "r1" },
    { date: "2030-01-02", meal_type: "dinner", recipe_id: "r2" },
  ];
  await card._studioCommitWeek();
  assert.equal(statusCalls(), 1);
  assert.equal(card._weekProposal.length, 2, "refused entries stay proposed");
});

test("the helper task form needs can_manage, not just can_write", () => {
  const studio = {
    revision: 0,
    journal: {},
    pantry: [],
    profile: {},
    family: {
      members: [{ id: "m1", name: "Kim" }],
      session: {
        id: "s1",
        name: "Soup",
        step: 0,
        started: "2030-01-01T00:00:00Z",
        tasks: [],
        timers: [],
      },
    },
  };
  const writer = permissionCard(grants(true, true, false));
  writer.card._studio = studio;
  assert.doesNotMatch(writer.card._studioFamily(), /data-form="studio-task"/);
  const admin = permissionCard(grants(true, true, true));
  admin.card._studio = studio;
  assert.match(admin.card._studioFamily(), /data-form="studio-task"/);
});

test("a shared journal needs write access while a personal journal only needs a writable kitchen", () => {
  const shared = { features: { shared_journal: true } };
  assert.equal(permissionCard(grants(true, false, false, shared)).card._canJournal, false);
  assert.equal(permissionCard(grants(true, true, false, shared)).card._canJournal, true);
  assert.equal(permissionCard(grants(true, false, false)).card._canJournal, true);
  assert.equal(
    permissionCard(grants(true, true, false, { read_only: true })).card._canJournal,
    false,
  );
});

test("the piece unit is shown translated, never as its stored key", () => {
  for (const [language, label] of [
    ["de", "Stück"],
    ["en", "pcs"],
  ]) {
    const { card } = permissionCard(grants(true, true, false));
    card._config = { ...card._config, language };
    card._studio = {
      revision: 0,
      journal: {},
      profile: {},
      family: { members: [] },
      pantry: [{ id: "p1", name: "Eggs", amount: 6, unit: "stück" }],
    };
    const html = card._studioPantry().split('class="studio-pantry-list"')[1];
    assert.match(html, new RegExp(`6 ${label} `), language);
    assert.doesNotMatch(html, /stück/, language);
  }
});

const aiClick = (card, action) => {
  const el = { dataset: { action }, disabled: false, closest: () => el };
  return card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
};

test("an ai_error rejection renders the translated errAiError text on the AI flows", async () => {
  const aiError = () => Object.assign(new Error("AI provider HTTP 502 raw"), { code: "ai_error" });
  const setup = () => {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
    card._detail = { slug: "s", name: "Suppe" };
    card._ws = async () => {
      throw aiError();
    };
    card._atelierDialog = async (opts) => (opts.kind === "prompt" ? "Drachenfrucht" : true);
    return card;
  };
  const text = /Der KI-Anbieter hat nicht geantwortet/;
  let card = setup();
  card._detail.name = "Suppe";
  await aiClick(card, "studio-replacement");
  assert.match(card._aiSwap, text);
  assert.doesNotMatch(card._aiSwap, /raw/);

  card = setup();
  const flashed = [];
  card._flash = (message) => flashed.push(message);
  await aiClick(card, "studio-ai-audit");
  assert.match(flashed.join("\n"), text);

  card = setup();
  card._nutrition = { busy: false, preview: { ai_enabled: true, slug: "s", hash: "h" }, rows: [] };
  await aiClick(card, "nutri-ai");
  assert.match(card._nutrition.notice, text);
});

test("the card credit line follows the card language", () => {
  for (const [language, pattern] of [
    ["en", /Made with <span class="atelier-credit-heart"[^>]*>♥<\/span> by <a/],
    ["de", /Mit <span class="atelier-credit-heart"[^>]*>♥<\/span> von <a/],
  ]) {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._render();
    const globalPattern = new RegExp(pattern.source, "g");
    assert.equal(cards.document.markup.match(globalPattern)?.length, 2, language);
  }
});
