// Direct Mealie API access for assertions and setup (the app under test never sees these calls).
import { mealieUrl, mealieToken } from "./config.mjs";

export async function mealie(method, path, body) {
  const response = await fetch(mealieUrl + path, {
    method,
    headers: {
      authorization: `Bearer ${mealieToken}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Mealie ${method} ${path} -> ${response.status}`);
  return text ? JSON.parse(text) : null;
}

export const shoppingItems = async () =>
  (await mealie("GET", "/api/households/shopping/items?perPage=500")).items;
export const recipeBySlug = (slug) => mealie("GET", `/api/recipes/${slug}`);
export const recipeList = async () => (await mealie("GET", "/api/recipes?perPage=200")).items;
/** Recipes keep their id when a rename changes the slug, so tests that rename look up by id. */
export async function recipeById(id) {
  const item = (await recipeList()).find((r) => r.id === id);
  return item ? recipeBySlug(item.slug) : null;
}
export const mealPlans = async () =>
  (await mealie("GET", "/api/households/mealplans?perPage=500")).items;
export const uniqueName = (prefix) =>
  `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Polls an async check until it returns a truthy value (the UI writes asynchronously). */
export async function eventually(check, { timeout = 10000, label = "condition" } = {}) {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    if (Date.now() > deadline) {
      const seen = last instanceof Error ? last.message : JSON.stringify(last)?.slice(0, 300);
      throw new Error(`timed out waiting for ${label}; last value: ${seen}`);
    }
    await new Promise((done) => setTimeout(done, 250));
  }
}

/** A throwaway recipe made directly in Mealie, so edits never touch the seeded ones. */
export async function makeRecipe(label, cleanup = []) {
  const name = uniqueName(label);
  const slug = await mealie("POST", "/api/recipes", { name });
  const recipe = await recipeBySlug(slug);
  cleanup.push(recipe.id);
  Object.assign(recipe, {
    description: "Ausgangsbeschreibung",
    recipeServings: 2,
    recipeIngredient: [
      { note: "1 Prise Salz", display: "1 Prise Salz", referenceId: crypto.randomUUID() },
    ],
    recipeInstructions: [
      { id: crypto.randomUUID(), title: "", summary: "", text: "Alles vermengen." },
    ],
  });
  await mealie("PUT", `/api/recipes/${slug}`, recipe);
  return { name, slug, id: recipe.id };
}

/** Removes the recipes whose ids were collected by makeRecipe or a test. */
export async function removeRecipes(ids) {
  const known = await recipeList();
  for (const id of ids) {
    const item = known.find((r) => r.id === id);
    if (item) await mealie("DELETE", `/api/recipes/${item.slug}`).catch(() => {});
  }
}
