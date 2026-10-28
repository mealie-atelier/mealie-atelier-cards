import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

/** Input-like event target; the card also asks it for attributes. */
const field = (props) => ({ hasAttribute: () => false, ...props });
/** Objects built inside the card realm differ by prototype; compare plain JSON instead. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = () => new Promise((resolve) => setImmediate(resolve));
const recipe = (n) => ({ id: `id-${n}`, slug: `r-${n}`, name: `Recipe ${n}`, totalTime: "20 min" });
const rows = (from, count) => Array.from({ length: count }, (_, i) => recipe(from + i));
const page = (items, extra = {}) => ({
  items,
  total: items.length,
  page: 1,
  per_page: 20,
  total_pages: 1,
  ...extra,
});

/** Tiny DOM double: only the selectors the picker uses, with attribute bookkeeping. */
function element(initial = {}) {
  const attrs = new Map(Object.entries(initial));
  const node = {
    attrs,
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    focused: false,
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => attrs.get(k) ?? null,
    removeAttribute: (k) => attrs.delete(k),
    hasAttribute: (k) => attrs.has(k),
    toggleAttribute(k, force) {
      if (force) attrs.set(k, "");
      else attrs.delete(k);
    },
    focus() {
      node.focused = true;
    },
  };
  return node;
}

function fakeDom(card) {
  const id = "recipe-picker";
  const input = element({ "aria-expanded": "true" });
  input.dataset = { input: "picker-search" };
  const list = element();
  const options = new Map();
  list.querySelectorAll = () => {
    const found = [...list.innerHTML.matchAll(/<li role="option"[^>]* id="([^"]+)"/g)];
    return found.map(([, optionId]) => {
      if (!options.has(optionId)) options.set(optionId, element({ id: optionId }));
      return options.get(optionId);
    });
  };
  const dom = {
    input,
    list,
    options,
    panel: element(),
    state: element(),
    live: element(),
    hidden: element(),
    submit: element(),
    filters: element(),
    count: element(),
  };
  const map = {
    [`[data-combobox="${id}"]`]: input,
    [`[data-combobox-panel="${id}"]`]: dom.panel,
    [`[data-combobox-list="${id}"]`]: list,
    [`[data-combobox-state="${id}"]`]: dom.state,
    [`[data-combobox-live="${id}"]`]: dom.live,
    '[data-picker="value"]': dom.hidden,
    '[data-picker="submit"]': dom.submit,
    '[data-picker="filters"]': dom.filters,
    '[data-picker-count="category"]': dom.count,
  };
  card.shadowRoot.querySelector = (selector) => map[selector] ?? null;
  return dom;
}

/** A card in the plan dialog whose recipes endpoint is scripted by `respond(opts, call)`. */
function pickerCard(respond, { detail = null } = {}) {
  mock.timers.enable({ apis: ["setTimeout"] });
  const cards = loadCards();
  const calls = [];
  const card = makeCard(cards, {
    hass: {
      language: "en",
      callWS: async (message) => {
        if (message.type === "mealie_atelier/metadata")
          return {
            categories: [{ slug: "dinner", name: "Dinner" }],
            tags: [{ slug: "vegan", name: "Vegan" }],
          };
        if (message.type !== "mealie_atelier/recipes") return {};
        const { type, ...opts } = message;
        calls.push(opts);
        return respond(opts, calls.length);
      },
    },
  });
  card._detail = detail;
  const dom = fakeDom(card);
  card._modal = "plan";
  card._lastRenderedModal = "plan"; // as if the dialog had been rendered already
  card._pickerSync();
  const key = (name) => {
    const event = {
      key: name,
      target: dom.input,
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
    card._handleKeyDown(event);
    return event;
  };
  const type = (value) =>
    card._handleInput({ target: field({ dataset: { input: "picker-search" }, value }) });
  const click = (action, value = "") =>
    card._handleClick({ target: { closest: () => ({ dataset: { action, value } }) } });
  return { card, dom, calls, key, type, click };
}

test.afterEach(() => mock.timers.reset());

test("debounce collapses rapid typing into one recipes request", async () => {
  const { card, calls, type } = pickerCard(() => page(rows(1, 3)));
  await flush();
  assert.equal(calls.length, 1, "opening loads page 1");
  assert.deepEqual(plain(calls[0]), { page: 1, per_page: 20, search: "" });
  type("s");
  type("so");
  type("sou");
  mock.timers.tick(200);
  await flush();
  assert.equal(calls.length, 1, "nothing fires inside the debounce window");
  mock.timers.tick(50);
  await flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].search, "sou");
  assert.equal(card._picker.items.length, 3);
});

test("a stale response never overwrites a newer search", async () => {
  const pending = [];
  const { card, type } = pickerCard((opts) => {
    if (opts.search === "") return page([]);
    return new Promise((resolve) => pending.push({ search: opts.search, resolve }));
  });
  await flush();
  type("a");
  mock.timers.tick(250);
  await flush();
  type("ab");
  mock.timers.tick(250);
  await flush();
  assert.deepEqual(
    pending.map((x) => x.search),
    ["a", "ab"],
  );
  pending[1].resolve(page([recipe(2)]));
  await flush();
  pending[0].resolve(page([recipe(1)]));
  await flush();
  assert.deepEqual(
    card._picker.items.map((x) => x.id),
    ["id-2"],
  );
});

test("Load more requests the next page, appends, and stops at the last page", async () => {
  const { card, dom, calls, click } = pickerCard((opts) =>
    page(rows((opts.page - 1) * 20 + 1, opts.page === 3 ? 5 : 20), {
      page: opts.page,
      total: 45,
      total_pages: 3,
    }),
  );
  await flush();
  assert.match(dom.state.innerHTML, /data-action="picker-more"/);
  assert.equal(dom.live.textContent, "20 of 45 recipes");
  await click("picker-more");
  await flush();
  assert.equal(calls[1].page, 2);
  assert.equal(card._picker.items.length, 40);
  await click("picker-more");
  await flush();
  assert.equal(calls[2].page, 3);
  assert.equal(card._picker.items.length, 45);
  assert.doesNotMatch(dom.state.innerHTML, /picker-more/);
  assert.match(dom.state.innerHTML, /End of list/);
  await click("picker-more");
  await flush();
  assert.equal(calls.length, 3, "no request beyond total_pages");
});

test("keyboard moves the active option, selects with Enter and closes in two Escape steps", async () => {
  const { card, dom, key } = pickerCard(() => page(rows(1, 25), { total: 25 }));
  await flush();
  const active = () => dom.input.getAttribute("aria-activedescendant");
  assert.equal(dom.list.querySelectorAll().length, 25);
  assert.equal(dom.input.getAttribute("aria-expanded"), "true");
  key("ArrowDown");
  assert.equal(active(), "recipe-picker-opt-0");
  key("ArrowDown");
  assert.equal(active(), "recipe-picker-opt-1");
  key("ArrowUp");
  assert.equal(active(), "recipe-picker-opt-0");
  key("End");
  assert.equal(active(), "recipe-picker-opt-24");
  key("Home");
  assert.equal(active(), "recipe-picker-opt-0");
  key("PageDown");
  assert.equal(active(), "recipe-picker-opt-10");
  key("PageUp");
  assert.equal(active(), "recipe-picker-opt-0");
  key("PageDown");
  key("ArrowDown");
  assert.equal(dom.options.get("recipe-picker-opt-11").getAttribute("aria-selected"), "true");
  assert.equal(dom.options.get("recipe-picker-opt-10").getAttribute("aria-selected"), "false");
  const enter = key("Enter");
  assert.equal(enter.prevented, true);
  assert.equal(dom.hidden.value, "id-12");
  assert.equal(dom.input.value, "Recipe 12");
  assert.equal(dom.input.getAttribute("aria-expanded"), "false");
  assert.equal(dom.submit.disabled, false);
  key("ArrowDown");
  assert.equal(dom.input.getAttribute("aria-expanded"), "true");
  const first = key("Escape");
  assert.equal(first.prevented, true);
  assert.equal(dom.input.getAttribute("aria-expanded"), "false");
  assert.equal(card._modal, "plan", "first Escape only closes the list");
  key("Escape");
  assert.equal(card._modal, null, "second Escape closes the dialog");
  assert.equal(card._picker, null);
});

test("ArrowDown on the last loaded option loads the next page and moves onto it", async () => {
  const { dom, calls, key } = pickerCard((opts) =>
    page(rows((opts.page - 1) * 20 + 1, 20), { page: opts.page, total: 40, total_pages: 2 }),
  );
  await flush();
  key("End");
  key("ArrowDown");
  await flush();
  assert.equal(calls[1].page, 2);
  assert.equal(dom.input.getAttribute("aria-activedescendant"), "recipe-picker-opt-20");
});

test("Tab leaves without selecting and typing clears the chosen recipe", async () => {
  const { dom, key, type } = pickerCard(() => page(rows(1, 3)));
  await flush();
  key("ArrowDown");
  const tab = key("Tab");
  assert.equal(tab.prevented, false);
  assert.equal(dom.hidden.value, "");
  assert.equal(dom.input.getAttribute("aria-expanded"), "false");
  key("ArrowDown");
  key("Enter");
  assert.equal(dom.hidden.value, "id-1");
  type("x");
  assert.equal(dom.hidden.value, "");
  assert.equal(dom.submit.disabled, true);
});

test("empty, error and end states render their texts and roles", async () => {
  let mode = "empty";
  const { card, dom, calls, type, click } = pickerCard(() => {
    if (mode === "error") throw Object.assign(new Error("raw"), { code: "mealie_error" });
    if (mode === "ok") return page(rows(1, 2));
    return page([], { total: 0, total_pages: 0 });
  });
  await flush();
  assert.match(dom.state.innerHTML, /role="status">No recipes found\./);
  type("zzz");
  mock.timers.tick(250);
  await flush();
  assert.match(dom.state.innerHTML, /role="status">No recipe matches “zzz”\./);
  assert.doesNotMatch(dom.state.innerHTML, /picker-clear/, "no clear button without filters");
  assert.equal(dom.live.textContent, "No recipe matches “zzz”.");
  card._handleInput({ target: field({ dataset: { input: "picker-favorites" }, checked: true }) });
  await flush();
  assert.match(dom.state.innerHTML, /data-action="picker-clear"[^>]*>Clear filters/);
  mode = "error";
  type("boom");
  mock.timers.tick(250);
  await flush();
  assert.match(dom.state.innerHTML, /role="alert"/);
  assert.match(dom.state.innerHTML, /Recipes could not be loaded: Mealie is unreachable/);
  assert.doesNotMatch(dom.state.innerHTML, /: raw/, "contract codes show their translation");
  assert.match(dom.state.innerHTML, /data-action="picker-retry"[^>]*>Retry/);
  assert.equal(dom.list.getAttribute("aria-busy"), "false");
  mode = "ok";
  const before = calls.length;
  await click("picker-retry");
  await flush();
  assert.equal(calls.length, before + 1);
  assert.equal(calls.at(-1).search, "boom");
  assert.match(dom.state.innerHTML, /End of list/);
  assert.equal(dom.live.textContent, "2 of 2 recipes");
});

test("loading state marks the listbox busy and shows skeleton rows", async () => {
  let release;
  const { dom } = pickerCard(() => new Promise((resolve) => (release = resolve)));
  await flush();
  assert.equal(dom.list.getAttribute("aria-busy"), "true");
  assert.equal(dom.list.innerHTML.match(/picker-skeleton/g).length, 3);
  assert.match(dom.state.innerHTML, /Loading recipes/);
  release(page(rows(1, 1)));
  await flush();
  assert.equal(dom.list.getAttribute("aria-busy"), "false");
  assert.doesNotMatch(dom.list.innerHTML, /picker-skeleton/);
});

test("changing a filter resets to page 1 and sends the filter params", async () => {
  const { card, calls, click } = pickerCard((opts) =>
    page(rows(1, 20), { page: opts.page, total: 60, total_pages: 3 }),
  );
  await flush();
  await click("picker-more");
  await flush();
  assert.equal(calls.at(-1).page, 2);
  card._handleInput({ target: field({ dataset: { input: "picker-favorites" }, checked: true }) });
  await flush();
  assert.deepEqual(plain(calls.at(-1)), {
    page: 1,
    per_page: 20,
    search: "",
    favorites_only: true,
  });
  card._handleInput({ target: field({ dataset: { input: "picker-order" }, value: "recent" }) });
  card._handleInput({
    target: field({ dataset: { input: "picker-category" }, value: "dinner", checked: true }),
  });
  card._handleInput({
    target: field({ dataset: { input: "picker-tag" }, value: "vegan", checked: true }),
  });
  await flush();
  assert.deepEqual(plain(calls.at(-1)), {
    page: 1,
    per_page: 20,
    search: "",
    categories: ["dinner"],
    tags: ["vegan"],
    favorites_only: true,
    order: "recent",
  });
  await click("picker-clear");
  await flush();
  assert.deepEqual(plain(calls.at(-1)), { page: 1, per_page: 20, search: "" });
});

test("filters limit each list to ten slugs", async () => {
  const { card, calls } = pickerCard(() => page(rows(1, 1)));
  await flush();
  for (let i = 0; i < 11; i++) {
    const target = field({ dataset: { input: "picker-category" }, value: `c${i}`, checked: true });
    card._handleInput({ target });
    if (i === 10) assert.equal(target.checked, false);
  }
  await flush();
  assert.equal(calls.at(-1).categories.length, 10);
});

test("home assistant provider pages client side by 20 and hides filters", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const cards = loadCards();
  const card = makeCard(cards);
  const dom = fakeDom(card);
  const searches = [];
  card._providerActive = "home_assistant";
  card._ws = async (type, opts) => {
    searches.push([type, opts]);
    return { items: rows(1, 45) };
  };
  card._modal = "plan";
  card._pickerSync();
  await flush();
  assert.deepEqual(plain(searches), [["recipes", { search: "" }]]);
  assert.equal(card._picker.items.length, 20);
  assert.equal(card._pickerFiltersMarkup(card._picker), "");
  assert.doesNotMatch(card._pickerMarkup(), /picker-order|picker-favorites/);
  await card._pickerClick("picker-more", "");
  await card._pickerClick("picker-more", "");
  await flush();
  assert.equal(card._picker.items.length, 45);
  assert.equal(searches.length, 1, "later pages come from the cached result");
  assert.match(dom.state.innerHTML, /End of list/);
});

test("markup carries combobox and listbox semantics and the preselected recipe", async () => {
  const { card } = pickerCard(() => page(rows(1, 3)), { detail: recipe(2) });
  await flush();
  const html = card._pickerMarkup();
  assert.match(
    html,
    /role="combobox"[^>]*aria-autocomplete="list"[^>]*aria-expanded="true"[^>]*aria-controls="recipe-picker-list"/,
  );
  assert.match(html, /<ul class="picker-list" role="listbox" id="recipe-picker-list"/);
  assert.match(html, /<div class="picker-vh" aria-live="polite"/);
  assert.match(html, /name="recipe_id"[^>]*value="id-2"/);
  assert.equal(card._picker.items[0].id, "id-2", "the open recipe is shown first");
  assert.match(html, /aria-activedescendant="recipe-picker-opt-0"/);
  assert.match(
    html,
    /role="option" class="picker-option" id="recipe-picker-opt-0" aria-selected="true"/,
  );
});

test("combobox helper adds no action or autofocus unless asked", () => {
  const { card } = pickerCard(() => page([]));
  const html = card._comboboxMarkup({ id: "x", label: "L", value: "", placeholder: "P" });
  assert.doesNotMatch(html, /autofocus|data-action/);
  const picker = card._comboboxMarkup({
    id: "x",
    label: "L",
    action: "picker-open",
    autofocus: true,
  });
  assert.match(picker, /autofocus/);
  assert.match(picker, /data-action="picker-open"/);
});

test("a re-render keeps the typed query in the input", async () => {
  const { card } = pickerCard(() => page(rows(1, 3)));
  await flush();
  card._picker.selected = null;
  card._picker.query = "pas";
  assert.match(card._pickerMarkup(), /data-input="picker-search"[^>]*value="pas"/);
});

test("_errorText maps error codes to err keys and falls back to the message", () => {
  const card = makeCard(loadCards());
  card.t = (key) => ({ errWriteNotPermitted: "Not allowed", error: "Generic" })[key] ?? key;
  assert.equal(card._errorText({ code: "write_not_permitted", message: "x" }), "Not allowed");
  assert.equal(card._errorText({ code: "unmapped_code", message: "plain" }), "plain");
  assert.equal(card._errorText({}), "Generic");
  assert.equal(card._errorText(undefined), "Generic");
});

test("picker translations exist in English and German", () => {
  const keys = [
    "pickerLabel",
    "pickerPlaceholder",
    "pickerCount",
    "pickerLoadMore",
    "pickerLoading",
    "pickerEmpty",
    "pickerClearFilters",
    "pickerError",
    "pickerRetry",
    "pickerEnd",
    "pickerCategory",
    "pickerTag",
    "pickerFavorites",
    "pickerFavoritesHint",
    "pickerSort",
    "pickerSortName",
    "pickerSortRecent",
  ];
  for (const locale of ["en", "de"]) {
    const labels = JSON.parse(
      readFileSync(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8"),
    );
    for (const key of keys) assert.ok(labels[key], `${locale}.${key}`);
    assert.doesNotMatch(
      JSON.stringify(Object.entries(labels).filter(([k]) => k.startsWith("picker"))),
      /[—–]/,
    );
  }
});
