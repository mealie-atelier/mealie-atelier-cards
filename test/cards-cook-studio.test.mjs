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

test("joining a running session on its last step keeps the shared step", async () => {
  const { card, writes } = cookCard({ id: "s1", slug: "pancakes", name: "P", step: 3, timers: [] });
  await click(card, "cook-start");
  assert.equal(card._modal, "cook");
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

test("family timer rows share the mm:ss text and a done state", () => {
  const src = readFileSync(new URL("../src/studio-ui.js", import.meta.url), "utf8");
  assert.match(src, /data-shared-timer="\$\{esc\(x\.id\)\}">\$\{sharedTimerText\(x\)\}/);
  assert.match(src, /span\.closest\("\.cook-timer-card, \.studio-timer-row"\)/);
});

test("voice and read buttons expose listening and speaking state", () => {
  const src = readFileSync(new URL("../src/studio-ui.js", import.meta.url), "utf8");
  assert.match(src, /_voiceListening/);
  assert.match(src, /_readSpeaking/);
  assert.match(src, /aria-pressed/);
  assert.match(src, /recognizer\.onstart/);
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
