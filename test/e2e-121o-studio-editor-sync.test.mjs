import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const en = JSON.parse(read("../src/i18n/en.json"));
const unesc = (text) => text.replace(/&#39;|&#x27;/g, "'").replace(/’/g, "'");

// ---- voice commands -------------------------------------------------------------------------
function voiceCard(language, ingredients = []) {
  const recognizers = [];
  class Recognizer {
    constructor() {
      recognizers.push(this);
    }
    start() {}
  }
  const spoken = [];
  const synthesis = { cancel() {}, speak: (u) => spoken.push(u.text) };
  const cards = loadCards({
    window: { SpeechRecognition: Recognizer, speechSynthesis: synthesis },
    globals: {
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: class {
        constructor(text) {
          this.text = text;
        }
      },
    },
  });
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
  card._modal = "cook";
  card._cookIndex = 1;
  card._flash = () => {};
  card._render = () => {};
  card._resetCookScroll = () => {};
  card._studioSyncStep = async () => {};
  card._detail = {
    slug: "bread",
    name: "Bread",
    recipeIngredient: ingredients,
    recipeInstructions: [{ text: "Mix" }, { text: "Whisk" }, { text: "Bake" }],
  };
  card._studio = { family: { members: [], session: null }, journal: {} };
  const reads = [];
  card.shadowRoot = {
    querySelector: (sel) =>
      sel.includes("studio-read-step") ? { click: () => reads.push(1) } : null,
  };
  const button = {
    dataset: { action: "studio-voice-command" },
    disabled: false,
    closest: () => button,
  };
  return {
    card,
    spoken,
    reads,
    async say(text) {
      await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
      recognizers.at(-1).onresult({ results: [[{ transcript: text }]] });
    },
  };
}

test("an ingredient question with read inside a word answers instead of reading the step", async () => {
  const rows = [
    {
      note: "",
      quantity: 2,
      unit: { name: "slices" },
      food: { name: "bread" },
      display: "2 slices bread",
    },
  ];
  for (const phrase of ["how much bread do i need", "how much spread"]) {
    const v = voiceCard("en", rows);
    await v.say(phrase);
    assert.equal(v.reads.length, 0, phrase);
  }
  const v = voiceCard("en", rows);
  await v.say("how many breadcrumbs");
  assert.equal(v.reads.length, 0);
  assert.equal(v.spoken.length, 1, "the answer is spoken");
});

test("German ingredient question is not read aloud and gelesen is not a read command", async () => {
  const v = voiceCard("de");
  await v.say("Wie viel Brot brauche ich");
  assert.equal(v.reads.length, 0);
  assert.equal(v.spoken.length, 1);
  const w = voiceCard("de");
  await w.say("das habe ich gelesen");
  assert.equal(w.reads.length, 0);
});

test("read aloud and vorlesen still read the step, and bread does not move the step", async () => {
  for (const [language, phrase] of [
    ["en", "read aloud"],
    ["en", "read"],
    ["de", "vorlesen"],
    ["de", "lies den Schritt vor"],
  ]) {
    const v = voiceCard(language);
    await v.say(phrase);
    assert.equal(v.reads.length, 1, phrase);
  }
  const v = voiceCard("en");
  await v.say("bread");
  assert.equal(v.reads.length, 0);
  assert.equal(v.card._cookIndex, 1);
});

// ---- restore confirm above the sticky save bar -----------------------------------------------
test("restore confirm is scrolled into view above the sticky save bar and keeps focus on its button", async () => {
  const cards = loadCards({});
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  card._modal = "edit";
  card._ed = {
    history: {
      open: true,
      loading: false,
      confirm: "",
      items: [{ backup_id: "b-1", created_at: "2030-01-02T10:15:00Z", kind: "image" }],
    },
  };
  const scrolls = [];
  const props = {};
  const scroller = { style: { setProperty: (k, v) => (props[k] = v) } };
  const confirm = {
    closest: () => scroller,
    scrollIntoView: (opts) => scrolls.push(opts),
  };
  let focused = "";
  const host = { innerHTML: "" };
  card.shadowRoot = {
    querySelector: (sel) => {
      if (sel === "[data-editor-history]") return host;
      if (sel === "[data-editor-history] .ed-confirm")
        return host.innerHTML.includes("ed-confirm") ? confirm : null;
      if (sel === ".editor-footer") return { offsetHeight: 88 };
      if (sel === '[data-action="ed-restore-do"]') return { focus: () => (focused = sel) };
      return null;
    },
  };
  await card._editorClick({ dataset: { action: "ed-restore-ask", value: "b-1" } });
  assert.equal(focused, '[data-action="ed-restore-do"]');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(JSON.parse(JSON.stringify(scrolls)), [{ block: "nearest" }]);
  assert.equal(props["--ed-footer-height"], "88px");
});

test("the editor dialog reserves the save bar height as scroll padding", () => {
  const css = read("../src/design-system/recipe-editor.css");
  assert.match(
    css,
    /\.modal:has\(\.atelier-editor \.editor-footer\)\s*\{[^}]*scroll-padding-bottom:\s*var\(--ed-footer-height,\s*96px\)/,
  );
});

// ---- sync dialog: one .env instruction -------------------------------------------------------
function syncCard(language, { rules = [], admin = true } = {}) {
  const card = makeCard(loadCards(), { hass: { language } });
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: { can_admin: admin, can_write: true },
        bring: { state: "reauth", account: "cook@example.test", from_env: true },
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  card._syncData().state = { rules, audit: [] };
  return card;
}

test("env mode with refused credentials shows the .env instruction once", () => {
  for (const language of ["en", "de"]) {
    const card = syncCard(language);
    const html = card._syncSyncHtml();
    const texts = JSON.parse(read(`../src/i18n/${language}.json`));
    assert.equal(html.split("BRING_EMAIL").length - 1, 1, `${language} instruction once`);
    assert.ok(unesc(html).includes(unesc(texts.bwReauthTextEnvNoRules)));
    assert.ok(!unesc(html).includes(unesc(texts.bwNoRules)), `${language} no body fallback`);
    assert.ok(!unesc(html).includes(unesc(texts.bwSessionExpiredEnv)), `${language} no hint`);
    assert.doesNotMatch(html, /id="sync-add-hint"/);
    assert.match(html, /disabled aria-describedby="bw-account-text"/);
    assert.match(html, /<p class="bw-text" id="bw-account-text">/);
  }
});

test("without env credentials or without reauth the sync body keeps its fallback", () => {
  const card = syncCard("en");
  card._status.entries[0].bring.from_env = false;
  assert.ok(unesc(card._syncSyncHtml()).includes(unesc(en.bwNoRules)));
});
