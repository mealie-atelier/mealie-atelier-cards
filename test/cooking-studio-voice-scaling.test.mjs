import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const Studio = runInNewContext(
  readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8") + "\nAtelierStudio",
  { Date, Intl, Number, Math, String, Set, Map, Object, RegExp },
);

function voiceCard({ language = "en", session = null, window = {}, globals = {} } = {}) {
  const cards = loadCards({ window, globals });
  const card = makeCard(cards, {
    hass: { language, callWS: async () => ({}) },
  });
  card._modal = "cook";
  card._cookIndex = 1;
  card.flashes = [];
  card._flash = (text, kind) => card.flashes.push([text, kind]);
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    recipeIngredient: [],
    recipeInstructions: [{ text: "Mix" }, { text: "Whisk" }, { text: "Bake" }],
  };
  card._studio = { family: { members: [], session }, journal: {} };
  card.scrollResets = 0;
  card._resetCookScroll = () => card.scrollResets++;
  card.syncs = [];
  card._studioSyncStep = async (id, step) => card.syncs.push([id, step]);
  card._render = () => {};
  return card;
}
const click = (card, action) => {
  const button = { dataset: { action }, disabled: false, closest: () => button };
  return card._handleClick({ target: { closest: () => button }, preventDefault() {} });
};
function recognizerWindow() {
  const recognizers = [];
  class Recognizer {
    constructor() {
      recognizers.push(this);
    }
    start() {}
  }
  return { recognizers, window: { SpeechRecognition: Recognizer } };
}
const say = (recognizer, transcript) => recognizer.onresult({ results: [[{ transcript }]] });

test("German UI (locale de-DE) uses the German recognizer language and voice commands", async () => {
  const { recognizers, window } = recognizerWindow();
  const session = { id: "s1", slug: "pancakes", step: 1, timers: [] };
  const card = voiceCard({ language: "de", session, window });
  assert.equal(card._locale, "de-DE");
  await click(card, "studio-voice-command");
  assert.equal(recognizers[0].lang, card.t("studioSpeechDe"));
  say(recognizers[0], "Weiter bitte");
  assert.equal(card._cookIndex, 2);
  say(recognizers[0], "zurück");
  assert.equal(card._cookIndex, 1);
});

test("German read aloud speaks with the German voice", async () => {
  const spoken = [];
  const synthesis = { cancel() {}, speak: (u) => spoken.push(u) };
  const card = voiceCard({
    language: "de",
    window: { speechSynthesis: synthesis },
    globals: {
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: class {
        constructor(text) {
          this.text = text;
        }
      },
    },
  });
  await click(card, "studio-read-step");
  assert.equal(spoken[0].lang, card.t("studioSpeechDe"));
});

test("voice next and back sync the shared step and reset the scroll", async () => {
  const { recognizers, window } = recognizerWindow();
  const session = { id: "s1", slug: "pancakes", step: 1, timers: [] };
  const card = voiceCard({ session, window });
  await click(card, "studio-voice-command");
  say(recognizers[0], "next");
  assert.equal(card._cookIndex, 2);
  assert.deepEqual(card.syncs, [["s1", 2]]);
  assert.equal(card.scrollResets, 1);
  say(recognizers[0], "go back");
  assert.equal(card._cookIndex, 1);
  assert.deepEqual(card.syncs, [
    ["s1", 2],
    ["s1", 1],
  ]);
  assert.equal(card.scrollResets, 2);
});

test("voice next without a shared session only moves locally", async () => {
  const { recognizers, window } = recognizerWindow();
  const card = voiceCard({ window });
  await click(card, "studio-voice-command");
  say(recognizers[0], "next");
  assert.equal(card._cookIndex, 2);
  assert.deepEqual(card.syncs, []);
  assert.equal(card.scrollResets, 1);
});

test("a step changed by another device resets the cook scroll", async () => {
  const session = { id: "s1", slug: "pancakes", step: 2, timers: [] };
  const card = voiceCard({ session });
  card._cookIndex = 0;
  card._ws = async () => ({ revision: 3, family: { session }, journal: {} });
  await card._studioRefresh({ silent: true });
  assert.equal(card._cookIndex, 2);
  assert.equal(card.scrollResets, 1);
  await card._studioRefresh({ silent: true });
  assert.equal(card.scrollResets, 1, "an unchanged step keeps the scroll position");
});

test("voice and read failures show as error toasts", async () => {
  // Unsupported read aloud and voice command.
  const bare = voiceCard();
  await click(bare, "studio-read-step");
  await click(bare, "studio-voice-command");
  assert.deepEqual(bare.flashes, [
    [bare.t("studioReadUnsupported"), "error"],
    [bare.t("studioVoiceUnsupported"), "error"],
  ]);
  // Unknown command, microphone error.
  const { recognizers, window } = recognizerWindow();
  const card = voiceCard({ window });
  await click(card, "studio-voice-command");
  say(recognizers[0], "xyzzy");
  recognizers[0].onerror();
  assert.deepEqual(
    card.flashes.map((f) => f[1]),
    ["error", "error"],
  );
  assert.equal(card.flashes[1][0], card.t("studioMicrophoneError"));
  // Recognizer that cannot start.
  class Broken {
    start() {
      throw new Error("busy");
    }
  }
  const broken = voiceCard({ window: { SpeechRecognition: Broken } });
  await click(broken, "studio-voice-command");
  assert.deepEqual(broken.flashes, [[broken.t("studioSpeechStartFailed"), "error"]]);
});

test("scaling keeps thousands grouping, glued units, bare fractions and decimal commas", () => {
  const s = (row, locale) => Studio.scaleIngredient(row, 4, 2, locale);
  assert.equal(s("1.000 g Mehl"), "2.000 g Mehl");
  assert.equal(s("1,000 g flour", "en"), "2,000 g flour");
  assert.equal(s("200g Butter"), "400g Butter");
  assert.equal(s("1/2"), "1");
  assert.equal(s("1,5 l Milch"), "3 l Milch");
  assert.equal(s("2x 400 g Tomaten"), "2x 400 g Tomaten");
  assert.equal(s("1 x 400 g Tomaten"), "1 x 400 g Tomaten");
});

test("scaling keeps leading-zero decimals with three decimals", () => {
  const s = (row) => Studio.scaleIngredient(row, 4, 2, "de");
  assert.equal(s("0.125 l"), "0,25 l");
  assert.equal(s("0,250 kg"), "0,5 kg");
});

test("scaleIngredient scales each alternative around oder and or", () => {
  assert.equal(Studio.scaleIngredient("2 Eier oder 1 Banane", 6, 3, "de"), "4 Eier oder 2 Banane");
  assert.equal(Studio.scaleIngredient("2 eggs or 1 banana", 4, 2, "en"), "4 eggs or 2 banana");
  assert.equal(
    Studio.scaleIngredient("1/2 Tasse Milch ODER 1 EL Öl", 4, 2, "de"),
    "1 Tasse Milch ODER 2 EL Öl",
  );
});

test("scaleIngredient keeps a parenthesized pack size fixed", () => {
  assert.equal(
    Studio.scaleIngredient("1 Dose (400 g) Tomaten", 6, 3, "de"),
    "2 Dose (400 g) Tomaten",
  );
  assert.equal(
    Studio.scaleIngredient("1 can (14 oz) tomatoes or 2 fresh (200 g)", 4, 2, "en"),
    "2 can (14 oz) tomatoes or 4 fresh (200 g)",
  );
});

test("scaleIngredient leaves unchanged lines and words containing oder untouched", () => {
  assert.equal(Studio.scaleIngredient("2 Eier oder 1 Banane", 3, 3, "de"), "2 Eier oder 1 Banane");
  assert.equal(Studio.scaleIngredient("2 Eier", 4, 2, "de"), "4 Eier");
  assert.equal(
    Studio.scaleIngredient("1 Prise Salz oder Pfeffer", 4, 2, "de"),
    "2 Prise Salz oder Pfeffer",
  );
});
