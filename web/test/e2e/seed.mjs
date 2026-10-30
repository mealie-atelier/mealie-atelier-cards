// Seeds a disposable Mealie with fictional data for the end-to-end suite.
// Self-contained on purpose: nothing is imported from another repository.
// Usage: node seed.mjs <mealie-url> <token-file>   (writes the API token, seeds recipes, plan, list)
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Mealie's documented first-run administrator. The instance is disposable and bound to loopback.
const FIRST_RUN = { username: "changeme@example.com", password: "MyPassword" };

export const RECIPES = [
  {
    name: "Pfannen-Eier mit Tomaten",
    description: "Vier Eier stocken auf weichen Zwiebeln und frischen Tomaten.",
    servings: 2,
    prep: 5,
    cook: 12,
    ingredients: ["1 EL Olivenöl", "1 Zwiebel", "3 Tomaten", "4 Eier", "Basilikum"],
    steps: [
      { title: "Zwiebeln", text: "Zwiebeln in Öl 5 Minuten weich dünsten." },
      { title: "Tomaten", text: "Tomaten dazugeben und kurz köcheln lassen." },
      { title: "Eier", text: "Eier aufschlagen und zugedeckt stocken lassen." },
    ],
  },
  {
    name: "Zitronen-Nudeln",
    description: "Cremige Nudeln mit Zitrone und Parmesan.",
    servings: 4,
    prep: 10,
    cook: 15,
    ingredients: ["400 g Spaghetti", "2 Zitronen", "80 g Parmesan", "Pfeffer"],
    steps: [
      { title: "Kochen", text: "Spaghetti in Salzwasser 10 Minuten kochen." },
      { title: "Sauce", text: "Zitronensaft mit Parmesan verrühren." },
      { title: "Mischen", text: "Nudeln mit der Sauce vermengen." },
    ],
  },
  {
    name: "Haferflocken-Bowl",
    description: "Warmer Haferbrei mit Beeren.",
    servings: 1,
    prep: 2,
    cook: 6,
    ingredients: ["60 g Haferflocken", "250 ml Milch", "Beeren"],
    steps: [{ title: "Köcheln", text: "Haferflocken mit Milch 4 Minuten köcheln." }],
  },
  {
    name: "Tomatensuppe",
    description: "Schnelle Suppe aus Dosentomaten.",
    servings: 3,
    prep: 5,
    cook: 20,
    ingredients: ["1 Dose Tomaten", "1 Zwiebel", "Basilikum"],
    steps: [
      { title: "Ansetzen", text: "Zwiebel anbraten und Tomaten zugeben." },
      { title: "Garen", text: "20 Minuten leise köcheln lassen." },
    ],
  },
];

export const SHOPPING = ["Milch", "Eier", "Basilikum", "Zitronen", "Parmesan", "Haferflocken"];

async function call(
  base,
  token,
  method,
  path,
  body,
  raw,
  contentType = "application/json",
  attempt = 0,
) {
  const data = raw ?? (body === undefined ? undefined : JSON.stringify(body));
  const response = await fetch(base + path, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(data === undefined ? {} : { "content-type": contentType }),
    },
    body: data,
  });
  const text = await response.text();
  if (!response.ok) {
    // Right after the first boot Mealie can answer 5xx while it finishes its own setup.
    if (response.status >= 500 && attempt < 15) {
      await new Promise((done) => setTimeout(done, 2000));
      return call(base, token, method, path, body, raw, contentType, attempt + 1);
    }
    throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
}

export async function waitForMealie(base, tries = 80) {
  for (let i = 0; i < tries; i += 1) {
    try {
      if ((await fetch(`${base}/api/app/about`)).ok) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 3000));
  }
  throw new Error(`Mealie did not become ready at ${base}`);
}

export async function createToken(base) {
  const login = await fetch(`${base}/api/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(FIRST_RUN),
  });
  if (!login.ok) throw new Error(`Mealie first-run login failed: ${login.status}`);
  const { access_token: access } = await login.json();
  const created = await call(base, access, "POST", "/api/users/api-tokens", {
    name: "atelier-e2e",
  });
  return created.token;
}

export async function seed(base, token) {
  const existing = new Map(
    (await call(base, token, "GET", "/api/recipes?perPage=200")).items.map((r) => [r.name, r.slug]),
  );
  const slugs = [];
  for (const spec of RECIPES) {
    const slug =
      existing.get(spec.name) ||
      (await call(base, token, "POST", "/api/recipes", { name: spec.name }));
    const recipe = await call(base, token, "GET", `/api/recipes/${slug}`);
    Object.assign(recipe, {
      description: spec.description,
      recipeServings: spec.servings,
      recipeYield: `${spec.servings} Portionen`,
      prepTime: `${spec.prep} min`,
      performTime: `${spec.cook} min`,
      totalTime: `${spec.prep + spec.cook} min`,
      recipeIngredient: spec.ingredients.map((note) => ({
        note,
        display: note,
        referenceId: randomUUID(),
      })),
      recipeInstructions: spec.steps.map((step) => ({
        id: randomUUID(),
        title: step.title,
        summary: "",
        text: step.text,
      })),
    });
    await call(base, token, "PUT", `/api/recipes/${slug}`, recipe);
    slugs.push(slug);
  }
  let lists = (await call(base, token, "GET", "/api/households/shopping/lists")).items;
  if (!lists.length) {
    await call(base, token, "POST", "/api/households/shopping/lists", { name: "Wocheneinkauf" });
    lists = (await call(base, token, "GET", "/api/households/shopping/lists")).items;
  }
  const listId = lists[0].id;
  const items = (await call(base, token, "GET", "/api/households/shopping/items?perPage=500"))
    .items;
  const notes = new Set(items.map((item) => item.note));
  for (const [index, note] of SHOPPING.entries()) {
    if (notes.has(note)) continue;
    await call(base, token, "POST", "/api/households/shopping/items", {
      shoppingListId: listId,
      note,
      quantity: 0,
      checked: index === 5,
    });
  }
  const recipes = new Map(
    (await call(base, token, "GET", "/api/recipes?perPage=200")).items.map((r) => [r.slug, r]),
  );
  const today = new Date();
  const day = (offset) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  };
  const planned = (await call(base, token, "GET", "/api/households/mealplans?perPage=500")).items;
  for (const [offset, slug] of slugs.slice(0, 3).entries()) {
    if (planned.some((p) => p.date === day(offset) && p.recipeId === recipes.get(slug).id))
      continue;
    await call(base, token, "POST", "/api/households/mealplans", {
      date: day(offset),
      entryType: "dinner",
      recipeId: recipes.get(slug).id,
    });
  }
  return { slugs, listId };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const [base, tokenFile] = process.argv.slice(2);
  if (!base || !tokenFile) {
    console.error("Usage: node seed.mjs <mealie-url> <token-file>");
    process.exit(2);
  }
  await waitForMealie(base);
  const token = await createToken(base);
  writeFileSync(tokenFile, token, { mode: 0o600 });
  const result = await seed(base, token);
  console.log("seeded", result.slugs.length, "recipes");
}
