import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const bundle = readFileSync(new URL("../../dist/mealie-atelier-cards.js", import.meta.url), "utf8");

/** Evaluate the built bundle against minimal DOM stubs and return its card classes. */
export function loadCards({
  navigator: nav = { language: "en-US" },
  document: doc,
  window = {},
  globals = {},
} = {}) {
  const listeners = new Map();
  const document = doc || {
    visibilityState: "visible",
    markup: "",
    createElement() {
      return {
        set innerHTML(value) {
          document.markup = value;
        },
        content: { firstElementChild: {} },
      };
    },
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
  };
  class Element {
    attachShadow() {
      this.shadowRoot = {
        innerHTML: "",
        addEventListener() {},
        removeEventListener() {},
        appendChild() {},
        querySelector: () => null,
        querySelectorAll: () => [],
        activeElement: null,
      };
      return this.shadowRoot;
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {}
  }
  const registry = new Map();
  const storage = new Map();
  const context = {
    HTMLElement: Element,
    customElements: {
      define: (tag, ctor) => registry.set(tag, ctor),
      get: (tag) => registry.get(tag),
    },
    window,
    document,
    navigator: nav,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    console: { info() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval() {},
    Intl,
    Date,
    URL,
    URLSearchParams,
    Promise,
    Map,
    Set,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    Boolean,
    RegExp,
    Error,
    Symbol,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    CustomEvent: class {},
    ...globals,
  };
  context.globalThis = context;
  runInNewContext(
    `${bundle}\nglobalThis.__cards = { MealieAtelierCard, AtelierWakeLock };`,
    context,
  );
  return { ...context.__cards, registry, listeners, document, storage };
}

/** Create a connected card; the last rendered markup lands in `cards.document.markup`. */
export function makeCard(
  cards,
  { hass, permissions = { can_write: true, can_manage: true } } = {},
) {
  const card = new (cards.registry.get("mealie-atelier-card"))();
  card.setConfig({ type: "custom:mealie-atelier-card" });
  Object.defineProperty(card, "isConnected", { value: true });
  card._status = { entries: [{ entry_id: "e1", ...permissions }] };
  card._hass = hass || { language: "en", callWS: async () => ({}) };
  card.renders = 0;
  return card;
}
