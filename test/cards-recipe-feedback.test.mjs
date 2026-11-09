import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

// The vm context has no FormData: a form stub carries its values.
class FormData {
  constructor(form) {
    this.values = form.values;
  }
  entries() {
    return Object.entries(this.values)[Symbol.iterator]();
  }
}

function setup({
  feature = true,
  can_write = true,
  own = { rating: 4, favorite: true },
  fail,
} = {}) {
  const cards = loadCards({ globals: { FormData } });
  const calls = [];
  const card = makeCard(cards, {
    permissions: {
      can_write,
      can_manage: can_write,
      features: feature ? { recipe_feedback: true } : {},
    },
    hass: {
      language: "en",
      callWS: async (message) => {
        calls.push(message);
        if (message.type.endsWith("/recipe"))
          return { id: "r1", slug: "soup", name: "Soup", recipeInstructions: [] };
        if (message.type.endsWith("/recipe_feedback")) return own;
        if (fail && message.type.endsWith(`/${fail}`)) throw new Error("Mealie down");
        return {};
      },
    },
  });
  card._studio = { revision: 0, journal: {}, family: { members: [] }, profile: {}, pantry: [] };
  card._status = {
    entries: [
      {
        entry_id: "e1",
        read_only: false,
        permissions: { can_read: true, can_write, can_admin: can_write },
        features: feature ? { recipe_feedback: true } : {},
      },
    ],
  };
  card._render = () => {};
  const saved = [];
  card._studioWrite = async (action, payload) => {
    saved.push(payload);
    return true;
  };
  return { card, calls, saved };
}
const submit = (card, values) => {
  const form = {
    dataset: { form: "journal" },
    values,
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  return card._handleSubmit({ target: { closest: () => form }, preventDefault() {} });
};
const typesOf = (calls) => calls.map((c) => c.type.replace("mealie_atelier/", ""));

test("opening a recipe prefills the journal form from Mealie where the journal is empty", async () => {
  const { card, calls } = setup();
  await card._openRecipe("soup");
  assert.deepEqual(calls.find((c) => c.type.endsWith("/recipe_feedback")).recipe_id, "r1");
  const markup = card._journalMarkup();
  assert.match(markup, /<option value="4" selected>/);
  assert.match(markup, /name="favorite" checked/);
});

test("Mealie's rating beats a stale journal value, and the hint says what is synced", async () => {
  const { card } = setup();
  card._journal.soup = { rating: 2, favorite: false };
  await card._openRecipe("soup");
  const markup = card._journalMarkup();
  assert.doesNotMatch(markup, /<option value="2" selected>/);
  assert.match(markup, new RegExp(card.t("journalHintSynced")));
});

test("a local rating stands when Mealie holds none or did not answer", async () => {
  const { card } = setup();
  await card._openRecipe("soup");
  card._feedback = { slug: "soup", rating: 0, favorite: false };
  card._journal.soup = { rating: 2 };
  assert.match(card._journalMarkup(), /<option value="2" selected>/);
  card._feedback = null;
  assert.match(card._journalMarkup(), /<option value="2" selected>/);
  assert.doesNotMatch(card._journalMarkup(), new RegExp(card.t("journalHintSynced")));
});

test("without the feature nothing is fetched or sent", async () => {
  const { card, calls } = setup({ feature: false });
  await card._openRecipe("soup");
  assert.deepEqual(typesOf(calls), ["recipe"]);
  await submit(card, { rating: "5", note: "", favorite: "on" });
  assert.deepEqual(typesOf(calls), ["recipe"]);
});

test("saving sends only the values that changed", async () => {
  const { card, calls, saved } = setup();
  await card._openRecipe("soup");
  await submit(card, { rating: "5", note: "good", favorite: "on" });
  assert.equal(saved.length, 1);
  assert.deepEqual(
    calls
      .filter((c) => /recipe_(rate|favorite)$/.test(c.type))
      .map((c) => [c.type, c.slug, c.rating, c.favorite]),
    [["mealie_atelier/recipe_rate", "soup", 5, undefined]],
  );
  await submit(card, { rating: "5", note: "good" });
  const last = calls.at(-1);
  assert.equal(last.type, "mealie_atelier/recipe_favorite");
  assert.equal(last.favorite, false);
  const count = calls.length;
  await submit(card, { rating: "5", note: "good" });
  assert.equal(calls.length, count, "unchanged values send nothing");
});

test("a failed Mealie write keeps the journal and says so", async () => {
  const { card, saved } = setup({ fail: "recipe_rate" });
  await card._openRecipe("soup");
  await submit(card, { rating: "1", note: "x", favorite: "on" });
  assert.equal(saved.length, 1, "journal saved");
  assert.equal(card._toastKind, "error");
  assert.match(card._toast, /could not be sent to Mealie/);
});

test("a reader never sends feedback", async () => {
  const { card, calls } = setup({ can_write: false });
  await card._openRecipe("soup");
  await submit(card, { rating: "1", note: "" });
  assert.equal(calls.filter((c) => /recipe_(rate|favorite)$/.test(c.type)).length, 0);
});
