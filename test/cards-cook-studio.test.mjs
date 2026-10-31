import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const Studio = runInNewContext(
  readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8") + "\nAtelierStudio",
  { Date, Intl, Number, Math, String, Set, Map, Object, RegExp },
);

test("substitutions match whole words, so rice gets no egg suggestion", () => {
  assert.equal(Studio.substitutions("Reis").length, 0);
  assert.equal(
    Studio.substitutions("Reis mit Ei")
      .map((x) => x.to)
      .join(),
    "studioSwapEgg",
  );
});

test("substitutions know English names and report the typed word", () => {
  const eggs = Studio.substitutions("Eggs");
  assert.equal(eggs[0].to, "studioSwapEgg");
  assert.equal(eggs[0].from, "Eggs");
  assert.equal(Studio.substitutions("whole milk")[0].to, "studioSwapMilk");
  assert.equal(Studio.substitutions("Butter")[0].from, "Butter");
  assert.equal(Studio.substitutions("flour")[0].to, "studioSwapFlour");
});

test("scaleIngredient handles mixed numbers, fractions and the locale", () => {
  const s = (row, locale) => Studio.scaleIngredient(row, 6, 4, locale);
  assert.equal(s("1 1/2 cups all-purpose flour", "en"), "2 1/4 cups all-purpose flour");
  assert.equal(s("1/2 cup cold butter, cubed", "en"), "3/4 cup cold butter, cubed");
  assert.equal(s("1.5 cups buttermilk", "en"), "2.25 cups buttermilk");
  assert.equal(s("1.5 cups buttermilk", "de"), "2,25 cups buttermilk");
  assert.equal(s("1.5 cups buttermilk"), "2,25 cups buttermilk");
  assert.equal(s("1 x 400 g Dose", "de"), "1 x 400 g Dose");
  assert.equal(s("1 pinch salt", "en"), "1.5 pinch salt");
  assert.equal(Studio.scaleIngredient("1½ Tassen Mehl", 4, 2), "3 Tassen Mehl");
  assert.equal(Studio.scaleIngredient("½ Zitrone", 6, 4), "¾ Zitrone");
});

test("formatTime uses lowercase min in German", () => {
  assert.equal(Studio.formatTime(30, "de"), "30 min");
  assert.equal(Studio.formatTime("45", "de"), "45 min");
});

function cookCard(session, steps = 4) {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    recipeInstructions: Array.from({ length: steps }, (_, i) => ({ text: `Step ${i}` })),
  };
  card._studio = { revision: 4, family: { session }, journal: {} };
  card._status = { entries: [{ entry_id: "e", can_write: true }] };
  card._render = () => {};
  card._atelierDialog = async () => true;
  const writes = [];
  card._studioWrite = async (action, payload) => writes.push(JSON.stringify([action, payload]));
  card._studioSyncStep = async (id, step) => writes.push(JSON.stringify(["step", { id, step }]));
  return { card, writes };
}
const click = (card, action) => {
  const button = { dataset: { action }, disabled: false, closest: () => button };
  return card._handleClick({ target: { closest: () => button }, preventDefault() {} });
};

test("Done ends the shared session of this recipe", async () => {
  const { card, writes } = cookCard({ id: "s1", slug: "pancakes", name: "P", step: 3, timers: [] });
  await click(card, "cook-finish");
  assert.ok(writes.includes('["session_end",{"session_id":"s1"}]'));
});

const finishedAt = "2026-05-01T12:00:00.000Z";
const lastStepSession = (extra = {}) => ({
  id: "s1",
  slug: "pancakes",
  name: "P",
  step: 3,
  started: "2026-05-01T11:00:00.000Z",
  timers: [],
  ...extra,
});

test("restarting a finished recipe opens step 1 and resets the shared step", async () => {
  const { card, writes } = cookCard(lastStepSession());
  card._studio.journal = { pancakes: { lastCooked: finishedAt } };
  await click(card, "cook-start");
  assert.equal(card._modal, "cook");
  assert.equal(card._cookIndex, 0);
  assert.ok(writes.includes('["step",{"id":"s1","step":0}]'));
});

test("a read-only user restarts a finished recipe at step 1 without writing", async () => {
  const { card, writes } = cookCard(lastStepSession());
  card._status = { entries: [{ entry_id: "e", can_write: false }] };
  card._studio.journal = { pancakes: { lastCooked: finishedAt } };
  await click(card, "cook-start");
  assert.equal(card._cookIndex, 0);
  assert.deepEqual(writes, []);
});

test("the kid view restarts a finished recipe at step 1 without writing", async () => {
  const { card, writes } = cookCard(lastStepSession());
  card._kidView = true;
  card._studio.journal = { pancakes: { lastCooked: finishedAt } };
  await click(card, "cook-start");
  assert.equal(card._cookIndex, 0);
  assert.deepEqual(writes, []);
});

test("a session whose end write failed is still restarted at step 1 on this device", async () => {
  const { card } = cookCard(lastStepSession());
  card._studioWrite = async () => false;
  await click(card, "cook-finish");
  await click(card, "cook-start");
  assert.equal(card._cookIndex, 0);
});

test("a poll does not pull a restarted finished recipe back to the last step", async () => {
  const session = lastStepSession();
  const { card } = cookCard(session);
  card._studio.journal = { pancakes: { lastCooked: finishedAt } };
  card._ws = async () => ({
    revision: 5,
    family: { session },
    journal: { pancakes: { lastCooked: finishedAt } },
  });
  card._status = { entries: [{ entry_id: "e", can_write: false }] };
  await click(card, "cook-start");
  await card._studioRefresh({ silent: true });
  assert.equal(card._cookIndex, 0);
});

test("a running session on its last step without a finish is still joined there", async () => {
  const { card, writes } = cookCard(lastStepSession());
  await click(card, "cook-start");
  assert.equal(card._cookIndex, 3);
  assert.ok(!writes.some((w) => w.startsWith('["step"')));
});

test("the editor serving preview formats quantities in the UI language", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._ed = { servings: 4, preview: 6 };
  card._hass.language = "en";
  assert.equal(card._editorScaled({ quantityText: "1.5" }), "2.25");
  card._hass.language = "de";
  assert.equal(card._editorScaled({ quantityText: "1.5" }), "2,25");
});

test("family timer rows show mm:ss and flip to a done state when the timer ends", () => {
  const card = makeCard(loadCards());
  const session = {
    id: "s1",
    slug: "pancakes",
    name: "P",
    step: 0,
    started: "2026-05-01T11:00:00.000Z",
    tasks: [],
    timers: [
      { id: "t1", name: "Pan", deadline: Date.now() + 61000 },
      { id: "t2", name: "Oven", deadline: Date.now() - 1000 },
    ],
  };
  card._studio = { family: { members: [], session }, journal: {} };
  const html = card._studioFamily();
  assert.match(html, /studio-timer-row"><span>Pan<\/span><b data-shared-timer="t1">01:0\d</);
  assert.match(
    html,
    /studio-timer-row is-done"><span>Oven<\/span><b data-shared-timer="t2">00:00<\/b><small[^>]*>READY</,
  );
  assert.match(html, /studio-timer-row"><span>Pan.*?RUNNING</s);
  // The tick moves a row from running to done without a render.
  const row = { classList: { done: null, toggle: (_, on) => (row.classList.done = on) } };
  const status = { textContent: "" };
  const span = {
    dataset: { sharedTimer: "t1" },
    textContent: "",
    closest: () => ({
      classList: row.classList,
      querySelector: () => status,
    }),
  };
  card.shadowRoot.querySelectorAll = (q) => (q === "[data-shared-timer]" ? [span] : []);
  session.timers[0].deadline = Date.now() - 1;
  card._tickTimers();
  assert.equal(span.textContent, "00:00");
  assert.equal(row.classList.done, true);
  assert.equal(status.textContent, "READY");
});

function cookModalCard(options) {
  const card = makeCard(loadCards(options));
  card._modal = "cook";
  card._cookIndex = 0;
  card._flash = () => {};
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    recipeIngredient: [],
    recipeInstructions: [{ text: "Mix" }, { text: "Bake" }],
  };
  card._studio = { family: { members: [], session: null }, journal: {} };
  card._render = () => {};
  return card;
}
const toolButton = (html, action) =>
  html.match(new RegExp(`<button class="btn[^"]*" data-action="${action}"[^>]*>`))?.[0] || "";

test("voice command button shows a listening state while the recognizer runs", async () => {
  const recognizers = [];
  class Recognizer {
    constructor() {
      recognizers.push(this);
    }
    start() {}
  }
  const card = cookModalCard({ window: { SpeechRecognition: Recognizer } });
  const idle = toolButton(card._modalHtml(), "studio-voice-command");
  assert.match(idle, /aria-pressed="false"/);
  assert.doesNotMatch(idle, /is-active/);
  await click(card, "studio-voice-command");
  recognizers[0].onstart();
  const listening = toolButton(card._modalHtml(), "studio-voice-command");
  assert.match(listening, /aria-pressed="true"/);
  assert.match(listening, /is-active/);
  recognizers[0].onend();
  assert.match(toolButton(card._modalHtml(), "studio-voice-command"), /aria-pressed="false"/);
});

test("voice command button leaves the listening state on a recognizer error", async () => {
  const recognizers = [];
  class Recognizer {
    constructor() {
      recognizers.push(this);
    }
    start() {}
  }
  const card = cookModalCard({ window: { SpeechRecognition: Recognizer } });
  await click(card, "studio-voice-command");
  recognizers[0].onstart();
  recognizers[0].onerror();
  assert.match(toolButton(card._modalHtml(), "studio-voice-command"), /aria-pressed="false"/);
});

test("read aloud button shows a speaking state and a second press stops it", async () => {
  const spoken = [];
  const synthesis = { cancel() {}, speak: (u) => spoken.push(u) };
  const window = { speechSynthesis: synthesis };
  const card = cookModalCard({
    window,
    globals: {
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: class {
        constructor(text) {
          this.text = text;
        }
      },
    },
  });
  assert.match(toolButton(card._modalHtml(), "studio-read-step"), /aria-pressed="false"/);
  await click(card, "studio-read-step");
  spoken[0].onstart();
  const speaking = toolButton(card._modalHtml(), "studio-read-step");
  assert.match(speaking, /aria-pressed="true"/);
  assert.match(speaking, /is-active/);
  await click(card, "studio-read-step");
  assert.match(toolButton(card._modalHtml(), "studio-read-step"), /aria-pressed="false"/);
});

test("the voice question cleanup only removes whole words", () => {
  const src = readFileSync(new URL("../src/studio-ui.js", import.meta.url), "utf8");
  const m = src.match(/speech\.replace\(\s*(\/.+?\/g),/s);
  const re = runInNewContext(m[1]);
  assert.equal("wie viel mandeln brauche ich".replace(re, "").trim(), "mandeln");
  assert.equal("how much bananen do i need".replace(re, "").trim(), "bananen");
});

test("the recipe dialog scales ingredients in the UI language", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._modal = "recipe";
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    recipeYieldQuantity: 4,
    recipeYield: "servings",
    recipeIngredient: [{ display: "1.5 cups buttermilk" }],
    recipeInstructions: [],
  };
  card._discoverResults = [{}];
  card._discoverSelected = "pancakes";
  card._discoverDraft = { people: 6 };
  const html = card._modalHtml();
  assert.match(html, /2\.25 cups buttermilk/);
});
