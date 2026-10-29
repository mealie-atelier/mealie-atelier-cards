import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { searchDemoRecipes } from "../demo/recipe-search.js";

const data = JSON.parse(
  await readFile(new URL("../demo/data/recipes.json", import.meta.url), "utf8"),
);
function catalog(locale) {
  const recipes = data.recipes.map((recipe, index) => ({
    id: `recipe-${index + 1}`,
    slug: recipe.slug,
    name: recipe.title[locale],
    totalTime: recipe.prepMinutes + recipe.cookMinutes,
    recipeCategory: [{ name: recipe.category[locale] }],
    recipeCuisine: [{ name: recipe.cuisine[locale] }],
    tags: recipe.tags.map((name) => ({ name })),
  }));
  const details = data.recipes.map((recipe, index) => ({
    ...recipes[index],
    description: recipe.description[locale],
    searchTerms: [
      recipe.title[locale === "de" ? "en" : "de"],
      recipe.description[locale === "de" ? "en" : "de"],
      recipe.category[locale === "de" ? "en" : "de"],
      recipe.cuisine[locale === "de" ? "en" : "de"],
      ...recipe.ingredients[locale === "de" ? "en" : "de"],
    ],
    recipeServings: recipe.servings,
    recipeIngredient: recipe.ingredients[locale].map((display) => ({ display })),
  }));
  return { recipes, details };
}

test("demo recipe search finds ingredient matches, not only titles", () => {
  const { recipes, details } = catalog("en");
  const matches = searchDemoRecipes(recipes, details, "minced pork");
  assert.deepEqual(
    matches.map((recipe) => recipe.slug),
    ["wan-tan-suppe-mit-pak-choi"],
  );
});

test("localized demo routes can discover ingredients using the alternate language", () => {
  for (const locale of ["en", "de"]) {
    const { recipes, details } = catalog(locale);
    const alternateIngredient = locale === "de" ? "kale" : "grünkohl";
    const matches = searchDemoRecipes(recipes, details, alternateIngredient);
    assert.ok(
      matches.some((recipe) => recipe.slug === "kokos-curry-mit-champignons-und-gruenkohl"),
    );
  }
});

test("demo query transforms apply dietary, time, serving, and ingredient filters", () => {
  const { recipes, details } = catalog("en");
  const matches = searchDemoRecipes(recipes, details, "vegan ingredient:kale under 30 min for 4");
  assert.deepEqual(
    matches.map((recipe) => recipe.slug),
    ["kokos-curry-mit-champignons-und-gruenkohl"],
  );
});

test("demo recipe search handles German diacritics and exclusions", () => {
  const { recipes, details } = catalog("de");
  const soup = "kuerbissuppe-mit-feta-und-kuerbiskernen";
  assert.ok(
    searchDemoRecipes(recipes, details, "vegetarisch").some((recipe) => recipe.slug === soup),
  );
  const matches = searchDemoRecipes(recipes, details, "vegetarisch ohne Kürbiskerne");
  assert.ok(matches.length > 0);
  assert.ok(!matches.some((recipe) => recipe.slug === soup));
  assert.ok(
    searchDemoRecipes(recipes, details, "ingredient:Zitrone").some(
      (recipe) => recipe.slug === "zitronen-focaccia-mit-rosmarin",
    ),
  );
});

test("demo catalog remains exactly ten complete bilingual recipes with photo credits", () => {
  assert.equal(data.recipes.length, 10);
  assert.equal(new Set(data.recipes.map((recipe) => recipe.slug)).size, 10);
  for (const recipe of data.recipes) {
    assert.equal(recipe.image.file, `../photos/${recipe.slug}.webp`);
    assert.equal(recipe.image.url, undefined, "demo photos are self-hosted, never hotlinked");
    assert.ok(existsSync(new URL(`../demo/photos/${recipe.slug}.webp`, import.meta.url)));
    assert.ok(
      recipe.image.photographer && recipe.image.sourceUrl.startsWith("https://unsplash.com/"),
    );
    for (const locale of ["de", "en"]) {
      assert.ok(recipe.title[locale]);
      assert.ok(recipe.description[locale]);
      assert.ok(recipe.ingredients[locale].length >= 3);
      assert.ok(recipe.steps[locale].length >= 3);
    }
  }
});

test("demo photo folder holds only photos that a recipe uses", async () => {
  const files = (await readdir(new URL("../demo/photos/", import.meta.url))).filter((name) =>
    name.endsWith(".webp"),
  );
  assert.deepEqual(files.sort(), data.recipes.map((recipe) => `${recipe.slug}.webp`).sort());
});
