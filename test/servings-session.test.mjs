import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const cards = loadCards();
const FLAGS = { recipe_scale: true, session_servings: true };
const row = (quantity, food) => ({
  quantity,
  food: { name: food },
  display: `${quantity} ${food}`,
});
const session = (extra = {}) => ({ id: "s1", slug: "r", name: "R", step: 0, timers: [], ...extra });

function setup({ features = FLAGS, can_write = true, active = session(), kid = false } = {}) {
  const card = makeCard(cards, {
    hass: { language: "en", callWS: async () => ({}) },
    permissions: { can_write, can_manage: true, features },
  });
  card._detail = {
    slug: "r",
    name: "R",
    recipeServings: 2,
    recipeIngredient: [row(2, "eggs")],
    recipeInstructions: [{ text: "a" }, { text: "b" }],
  };
  card._modal = "recipe";
  card._kidView = kid;
  card._studio = { revision: 1, family: { session: active }, journal: {} };
  card.renders = 0;
  card._render = () => card.renders++;
  card.writes = [];
  card._studioWrite = async (action, payload) => {
    card.writes.push([action, payload]);
    return true;
  };
  return card;
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const plain = (value) => JSON.parse(JSON.stringify(value));
const click = (card, action) => {
  const button = { dataset: { action }, disabled: false, closest: () => button };
  return card._handleClick({ target: { closest: () => button }, preventDefault() {} });
};

test("cook start sends the servings pair with the flag and nothing without it", async () => {
  for (const [features, expected] of [
    [FLAGS, { servings: 4, servings_base: 2 }],
    [{}, {}],
  ]) {
    const card = setup({ features, active: null });
    card._servingsSet(4);
    card._studioRefresh = async () => true;
    await click(card, "cook-start");
    const start = card.writes.find(([action]) => action === "session_start");
    assert.deepEqual(plain(start[1]), {
      slug: "r",
      name: "R",
      replace_existing: false,
      ...expected,
    });
  }
});

test("three quick steps make one debounced session_servings write", async () => {
  const card = setup();
  card._servingsStep(1);
  card._servingsStep(1);
  card._servingsStep(1);
  assert.equal(card._servingsWritePending, true);
  assert.equal(card.writes.length, 0);
  await wait(450);
  assert.equal(card.writes.length, 1);
  assert.deepEqual(plain(card.writes[0]), [
    "session_servings",
    { session_id: "s1", servings: 5, servings_base: 2 },
  ]);
  assert.equal(card._servingsWritePending, false);
});

for (const [label, opts, mutate] of [
  ["a reader", { can_write: false }],
  ["the kid view", { kid: true }],
  ["a missing flag", { features: {} }],
  ["a session of another recipe", { active: session({ slug: "other" }) }],
  ["no session", { active: null }],
]) {
  test(`no session write for ${label}`, async () => {
    const card = setup(opts);
    card._servingsStep(1);
    assert.equal(card._servingsWritePending, undefined);
    await wait(450);
    assert.deepEqual(card.writes, []);
    assert.equal(card._servingsTarget(), 3);
  });
}

test("a queued write is dropped when the session ended or the card disconnects", async () => {
  const ended = setup();
  ended._servingsStep(1);
  ended._studio.family.session = null;
  await wait(450);
  assert.deepEqual(ended.writes, []);
  assert.equal(ended._servingsWritePending, false);

  const gone = setup();
  gone._servingsStep(1);
  gone.disconnectedCallback();
  await wait(450);
  assert.deepEqual(gone.writes, []);
  assert.equal(gone._servingsWritePending, false);
});

test("opening another recipe clears the queued write", async () => {
  const card = setup();
  card._servingsStep(1);
  card._ws = async () => ({ slug: "other", name: "Other" });
  await card._openRecipe("other").catch(() => {});
  await wait(450);
  assert.deepEqual(card.writes, []);
});

test("a pending own write blocks adoption, a refresh adopts and renders otherwise", async () => {
  const shared = session({ servings: 6, servingsBase: 2 });
  const card = setup({ active: null });
  card._servingsWritePending = true;
  card._ws = async () => ({ revision: 2, family: { session: shared }, journal: {} });
  await card._studioRefresh({ silent: true });
  assert.equal(card._servings, undefined);
  card._servingsWritePending = false;
  card.renders = 0;
  card._ws = async () => ({ revision: 2, family: { session: shared }, journal: {} });
  await card._studioRefresh({ silent: true });
  assert.equal(card._servingsTarget(), 6);
  assert.ok(card.renders > 0);
  card.renders = 0;
  await card._studioRefresh({ silent: true });
  assert.equal(card.renders, 0);
});

test("a write result also adopts the session amount", async () => {
  const card = setup({ active: null });
  card._servingsAfterStudio(session({ servings: 4, servingsBase: 2 }));
  assert.equal(card._servingsTarget(), 4);
});

test("joining keeps the amount chosen on this device", async () => {
  const card = setup({ active: session({ servings: 6, servingsBase: 2 }) });
  card._servingsSet(3);
  card._studioRefresh = async () => true;
  await click(card, "cook-start");
  assert.equal(card._servingsTarget(), 3);
  await card._studioRefresh();
  card._servingsAfterStudio(card._studio.family.session);
  assert.equal(card._servingsTarget(), 3);
  await wait(450);
  assert.equal(card.writes.at(-1)[0], "session_servings");
});

test("studio-session-open opens the recipe and cook mode at the shared amount", async () => {
  const shared = session({ servings: 6, servingsBase: 2, step: 1 });
  const card = setup({ active: shared });
  card._modal = null;
  card._openRecipe = async () => {
    card._detail = { ...card._detail, slug: "r" };
    card._modal = "recipe";
  };
  await click(card, "studio-session-open");
  assert.equal(card._modal, "cook");
  assert.equal(card._cookIndex, 1);
  assert.equal(card._servingsTarget(), 6);
});

test("the voice answer for an ingredient is scaled", async () => {
  const recognizers = [];
  class Recognizer {
    constructor() {
      recognizers.push(this);
    }
    start() {}
  }
  const card = makeCard(loadCards({ window: { SpeechRecognition: Recognizer } }), {
    hass: { language: "en", callWS: async () => ({}) },
    permissions: { can_write: true },
  });
  card._detail = { slug: "r", recipeServings: 2, recipeIngredient: [row(2, "eggs")] };
  card._modal = "cook";
  card._render = () => {};
  card.flashes = [];
  card._flash = (text) => card.flashes.push(text);
  card._servingsSet(4);
  await click(card, "studio-voice-command");
  recognizers[0].onresult({ results: [[{ transcript: "how much eggs" }]] });
  assert.match(card.flashes[0], /^4 eggs/);
});
