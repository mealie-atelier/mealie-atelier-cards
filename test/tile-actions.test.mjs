import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadCards } from "./support/card-harness.mjs";

/** A manual clock so the 500 ms hold needs no real waiting. */
function clock() {
  let now = 0;
  let next = 1;
  const timers = new Map();
  return {
    setTimeout: (fn, ms) => {
      timers.set(next, { fn, at: now + ms });
      return next++;
    },
    clearTimeout: (id) => timers.delete(id),
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers])
        if (timer.at <= now) {
          timers.delete(id);
          timer.fn();
        }
    },
    pending: () => timers.size,
  };
}

function setup(tag, config = {}) {
  const time = clock();
  const cards = loadCards({
    globals: { setTimeout: time.setTimeout, clearTimeout: time.clearTimeout },
  });
  const card = new (cards.registry.get(tag))();
  card.setConfig({ type: `custom:${tag}`, ...config });
  const fired = [];
  card.dispatchEvent = (event) => fired.push(event);
  const opened = [];
  card._openRecipe = async (slug) => opened.push(slug);
  card._render = () => {};
  return { card, time, fired, opened, cards };
}

const tile = (slug = "pasta-e-fagioli") => ({
  dataset: { tile: "", action: "open-recipe", value: slug },
  closest: (selector) =>
    selector === "[data-tile]" || selector === "[data-action]" ? tile.el : null,
});
function target(slug) {
  const el = tile(slug);
  tile.el = el;
  return el;
}
const down = (el, x = 100, y = 100) => ({
  target: el,
  button: 0,
  isPrimary: true,
  clientX: x,
  clientY: y,
});
const click = (el, detail = 1) => ({ target: el, detail, preventDefault() {} });

const NAVIGATE = { action: "navigate", navigation_path: "/recipes/{slug}" };

test("recipe tiles in all three compact views are marked as tiles", () => {
  const { card } = setup("mealie-atelier-recipes");
  card._data = { recipes: { items: [{ slug: "a", name: "A" }] } };
  assert.match(card._recipes(), /class="recipe-tile" data-tile data-action="open-recipe"/);
  const views = readViews();
  assert.match(
    views,
    /class="day-meal\$\{photo \? " has-photo" : ""\}"\$\{meal\.recipe\?\.slug \? " data-tile" : ""\}/,
  );
  assert.match(views, /class="btn tiny icon-only" data-tile data-action="open-recipe"/);
});

function readViews() {
  return readFileSync(new URL("../src/components/views.js", import.meta.url), "utf8");
}

test("the default tap still opens the recipe and fires no action event", async () => {
  const { card, fired, opened } = setup("mealie-atelier-recipes");
  await card._handleClick(click(target("risotto")));
  assert.deepEqual(opened, ["risotto"]);
  assert.equal(fired.length, 0);
});

test("a configured tap fires hass-action with the URL-encoded slug", async () => {
  const { card, fired, opened } = setup("mealie-atelier-recipes", { tap_action: NAVIGATE });
  await card._handleClick(click(target("kaese kuchen/4")));
  assert.equal(opened.length, 0);
  assert.equal(fired.length, 1);
  const event = fired[0];
  assert.equal(event.type, "hass-action");
  assert.equal(event.bubbles, true);
  assert.equal(event.composed, true);
  assert.equal(event.detail.action, "tap");
  assert.equal(event.detail.config.tap_action.navigation_path, "/recipes/kaese%20kuchen%2F4");
  assert.equal(NAVIGATE.navigation_path, "/recipes/{slug}");
});

test("url_path takes the slug placeholder too, and other actions pass through unchanged", async () => {
  const url = setup("mealie-atelier-today", {
    tap_action: { action: "url", url_path: "https://example.com/{slug}?x={slug}" },
  });
  await url.card._handleClick(click(target("a&b")));
  assert.equal(url.fired[0].detail.config.tap_action.url_path, "https://example.com/a%26b?x=a%26b");
  const service = setup("mealie-atelier-today", {
    tap_action: {
      action: "perform-action",
      perform_action: "script.turn_on",
      data: { v: "{slug}" },
    },
  });
  await service.card._handleClick(click(target("x")));
  assert.deepEqual(JSON.parse(JSON.stringify(service.fired[0].detail.config.tap_action.data)), {
    v: "{slug}",
  });
});

test("tap action none does nothing, an unknown action falls back to opening the recipe", async () => {
  const none = setup("mealie-atelier-recipes", { tap_action: { action: "none" } });
  await none.card._handleClick(click(target("x")));
  assert.equal(none.opened.length + none.fired.length, 0);
  const bad = setup("mealie-atelier-recipes", { tap_action: { action: "explode" } });
  await bad.card._handleClick(click(target("x")));
  assert.deepEqual(bad.opened, ["x"]);
});

test("a hold fires after 500 ms and the click that follows does not also tap", async () => {
  const { card, time, fired, opened } = setup("mealie-atelier-recipes", {
    hold_action: NAVIGATE,
  });
  const el = target("held");
  card._tileDown(down(el));
  time.advance(499);
  assert.equal(fired.length, 0);
  time.advance(1);
  assert.equal(fired.length, 1);
  assert.equal(fired[0].detail.action, "hold");
  assert.equal(fired[0].detail.config.hold_action.navigation_path, "/recipes/held");
  card._tileCancel();
  await card._handleClick(click(el));
  assert.equal(opened.length, 0);
  assert.equal(fired.length, 1);
  // The next plain tap works again.
  await card._handleClick(click(el));
  assert.deepEqual(opened, ["held"]);
});

test("a keyboard click after a hold is never swallowed", async () => {
  const { card, time, opened } = setup("mealie-atelier-recipes", { hold_action: NAVIGATE });
  const el = target("kb");
  card._tileDown(down(el));
  time.advance(500);
  await card._handleClick(click(el, 0));
  assert.deepEqual(opened, ["kb"]);
});

test("a hold is cancelled by movement over 10 px but not by a small wobble", () => {
  const { card, time, fired } = setup("mealie-atelier-recipes", { hold_action: NAVIGATE });
  card._tileDown(down(target("m"), 100, 100));
  card._tileMove({ clientX: 106, clientY: 108 });
  time.advance(500);
  assert.equal(fired.length, 1);
  card._tileDown(down(target("m"), 100, 100));
  card._tileMove({ clientX: 100, clientY: 111 });
  time.advance(500);
  assert.equal(fired.length, 1);
});

test("a hold is cancelled by pointer up, pointer cancel and scroll", () => {
  const { card, time, fired } = setup("mealie-atelier-recipes", { hold_action: NAVIGATE });
  for (const _ of [1, 2, 3]) {
    card._tileDown(down(target("c")));
    assert.equal(time.pending(), 1);
    card._tileCancel();
    time.advance(600);
  }
  assert.equal(fired.length, 0);
});

test("the card registers pointer, scroll and context menu listeners for tiles", () => {
  const added = [];
  const time = clock();
  const windowAdded = [];
  const cards = loadCards({
    window: { addEventListener: (type, _fn, options) => windowAdded.push([type, options]) },
    globals: { setTimeout: time.setTimeout, clearTimeout: time.clearTimeout },
  });
  const card = new (cards.registry.get("mealie-atelier-recipes"))();
  card.shadowRoot.addEventListener = (type, _fn, options) => added.push([type, options]);
  card._render = () => {};
  Object.defineProperty(card, "isConnected", { value: true });
  card.connectedCallback();
  const types = added.map(([type]) => type);
  for (const type of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "scroll",
    "contextmenu",
  ])
    assert.ok(types.includes(type), type);
  const scroll = added.find(([type]) => type === "scroll")[1];
  assert.equal(scroll.capture, true);
  // Scrolling the page itself is only seen by a capturing window listener.
  const windowScroll = windowAdded.filter(([type]) => type === "scroll");
  assert.equal(windowScroll.length, 1);
  assert.equal(windowScroll[0][1].capture, true);
});

test("no hold action configured means no timer and no long-press suppression", () => {
  const { card, time } = setup("mealie-atelier-recipes", { tap_action: NAVIGATE });
  card._tileDown(down(target("n")));
  assert.equal(time.pending(), 0);
  let prevented = false;
  card._tileMenu({ target: target("n"), preventDefault: () => (prevented = true) });
  assert.equal(prevented, false);
});

test("the complete card ignores tap_action and hold_action", async () => {
  const { card, time, fired, opened } = setup("mealie-atelier-card", {
    tap_action: NAVIGATE,
    hold_action: NAVIGATE,
  });
  card._tileDown(down(target("full")));
  assert.equal(time.pending(), 0);
  await card._handleClick(click(target("full")));
  assert.deepEqual(opened, ["full"]);
  assert.equal(fired.length, 0);
});

test("the editor offers tap and hold fields in the compact views and stores action objects", () => {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language: "de" };
  editor._wizardMode = false;
  editor.setConfig({ type: "custom:mealie-atelier-recipes" });
  const html = editor.shadowRoot.innerHTML;
  assert.match(html, /data-key="tap_action" data-action-part="action"/);
  assert.match(html, /data-key="hold_action" data-action-part="action"/);
  assert.match(html, /Antippen eines Rezepts/);
  assert.match(html, /Gedrückt halten auf einem Rezept/);
  assert.doesNotMatch(html, /atelier-tap_action-path/);

  const emitted = [];
  editor.dispatchEvent = (event) => emitted.push(event.detail.config);
  editor._handleChange({
    target: { dataset: { key: "tap_action", actionPart: "action" }, value: "navigate" },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(emitted.at(-1).tap_action)), { action: "navigate" });
  assert.match(editor.shadowRoot.innerHTML, /atelier-tap_action-path/);
  editor._handleChange({
    target: { dataset: { key: "tap_action", actionPart: "path" }, value: "/r/{slug}" },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(emitted.at(-1).tap_action)), {
    action: "navigate",
    navigation_path: "/r/{slug}",
  });
  editor._handleChange({
    target: { dataset: { key: "tap_action", actionPart: "action" }, value: "open-recipe" },
  });
  assert.equal("tap_action" in emitted.at(-1), false);

  editor.setConfig({ type: "custom:mealie-atelier-card" });
  assert.doesNotMatch(editor.shadowRoot.innerHTML, /tap_action/);
});

test("the editor labels exist in English and German", () => {
  const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));
  const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
  for (const key of [
    "editorTapAction",
    "editorHoldAction",
    "editorActionOpenRecipe",
    "editorActionNone",
    "editorActionNavigate",
    "editorActionUrl",
    "editorActionSlugHint",
  ]) {
    assert.ok(en[key], `en ${key}`);
    assert.ok(de[key], `de ${key}`);
  }
});
