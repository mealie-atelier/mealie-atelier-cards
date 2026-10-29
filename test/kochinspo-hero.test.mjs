import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const heroCard = (language, hero, extra = []) => {
  const card = makeCard(loadCards(), {
    hass: { language, callWS: async () => ({}), callService: async () => ({}) },
  });
  card._studio = { revision: 0, journal: {}, profile: {}, family: { members: [] }, pantry: [] };
  card._discoverResults = true;
  card._discoverDraft = {
    step: 3,
    mealStyle: "any",
    cookbooks: [],
    people: 2,
    maxMinutes: 40,
    usePantry: true,
    exclude: [],
  };
  card._discoverCandidates = [hero, ...extra];
  return card;
};
const recipeFor = (over = {}) => ({
  slug: "soup",
  name: "Soup",
  recipe: { slug: "soup", name: "Soup" },
  timeLabel: "32 min",
  servings: 4,
  people: 2,
  reasons: [
    { key: "studioReasonPantryUnchecked" },
    { key: "studioReasonAmountsUnclear", values: { count: 2 }, plural: true },
    { key: "studioReasonServingsBase", values: { servings: 4, count: 4 }, plural: true },
    { key: "studioReasonWithinBudget", values: { minutes: 32 } },
  ],
  ...over,
});
const heroHtml = (card) => card._studioDiscover().split('class="studio-discover-hero"')[1];
const reasonLine = (html) =>
  html.match(/<\/div><p>([^<]*)<\/p><div class="studio-discover-hero-actions"/)[1];

test("the Kochinspo hero shows time and servings once, in German", () => {
  const html = heroHtml(heroCard("de", recipeFor()));
  assert.match(html, /Rezeptbasis: 4 Portionen/);
  assert.equal(html.match(/32 min/g).length, 1);
  assert.equal(html.match(/Rezeptbasis/g).length, 1);
  assert.equal(
    reasonLine(html),
    "Vorrat noch nicht geprüft · Bei 2 Zutaten ist die Menge unklar · Im Zeitbudget",
  );
});

test("the Kochinspo hero shows time and servings once, in English", () => {
  const html = heroHtml(heroCard("en", recipeFor()));
  assert.equal(html.match(/32 min/g).length, 1);
  assert.equal(html.match(/Recipe base/g).length, 1);
  assert.match(reasonLine(html), /Within the time budget$/);
});

test("an over budget hero keeps the warning without repeating the minutes", () => {
  const hero = recipeFor({
    reasons: [{ key: "studioReasonOverBudget", values: { minutes: 55 } }],
    timeLabel: "55 min",
  });
  const html = heroHtml(heroCard("en", hero));
  assert.equal(html.match(/55/g).length, 1);
  assert.match(reasonLine(html), /^Slightly over the time budget$/);
});

test("the hero photo carries no badge and the fallback meta says servings", () => {
  const html = heroHtml(heroCard("de", recipeFor({ servings: null, people: 1 })));
  const photo = html.split('class="studio-discover-hero-copy"')[0];
  assert.doesNotMatch(photo, /studio-discover-match|<span/);
  assert.match(html, /Für 1 Portion</);
  assert.doesNotMatch(html, /Person/);
});

test("a hero without servings does not say servings are open next to the people count", () => {
  // Reasons exactly as studio-core builds them for a recipe without servings.
  const reasons = [
    { key: "studioReasonPantryUnchecked" },
    { key: "studioReasonServingsOpen" },
    { key: "studioReasonWithinBudget", values: { minutes: 30 } },
  ];
  const de = heroHtml(
    heroCard("de", recipeFor({ servings: null, people: 2, reasons, timeLabel: "30 min" })),
  );
  assert.match(de, /Für 2 Portionen</);
  assert.doesNotMatch(reasonLine(de), /Portionen offen/);
  assert.match(reasonLine(de), /Vorrat noch nicht geprüft/);
  const en = heroHtml(
    heroCard("en", recipeFor({ servings: null, people: 2, reasons, timeLabel: "30 min" })),
  );
  assert.match(en, /For 2 servings</);
  assert.doesNotMatch(reasonLine(en), /Servings not set/);
});

test("alternative cards pluralise servings per language", () => {
  const alt = (servings) => ({ ...recipeFor({ slug: "alt", name: "Alt", servings }), reasons: [] });
  const de = heroCard("de", recipeFor(), [alt(1)])._studioDiscover();
  assert.match(de, / · 1 Portion</);
  assert.doesNotMatch(de, /1 Portionen/);
  const en = heroCard("en", recipeFor(), [alt(1), { ...alt(3), slug: "alt3" }])._studioDiscover();
  assert.match(en, / · 1 serving</);
  assert.match(en, / · 3 servings</);
  assert.doesNotMatch(en, /Servings/);
});

test("the recipe dialog scale note uses the real serving wiring", () => {
  const card = makeCard(loadCards(), {
    hass: { language: "de", callWS: async () => ({}), callService: async () => ({}) },
  });
  card._detail = {
    slug: "soup",
    name: "Soup",
    recipeServings: 4,
    recipeInstructions: [],
    recipeIngredient: [],
  };
  card._discoverResults = true;
  card._discoverSelected = "soup";
  card._discoverDraft = { people: 1 };
  card._modal = "recipe";
  const html = card._modalHtml();
  assert.match(html, /studio-serving-note">Mengen für 1 Portion angepasst/);
  assert.match(html, /Rezept[^<]*4 Portionen/);
});
