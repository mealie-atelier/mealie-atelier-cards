/** Test fixture only: local Mealie-like REST and Home Assistant notify. */
import { createServer } from "node:http";
let checked = false,
  writes = 0,
  adds = 0,
  alerts = [];
const item = () => ({
  id: "item-a",
  checked,
  note: "Tomaten",
  shoppingListId: "list-a",
  quantity: 1,
});
const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
// MOCK_RICH_RECIPE=1 gives the recipe the length of a real one, so the recipe dialog scrolls past its heading in
// desktop windows as well (the browser check of the dialog strip needs that).
const rich = process.env.MOCK_RICH_RECIPE === "1";
const richSteps = rich
  ? Array.from({ length: 8 }, (_, n) => ({
      text: `Schritt ${n + 2}: die Zutaten vorsichtig verrühren, ruhen lassen und danach in einer Pfanne goldbraun ausbacken.`,
    }))
  : [];
const richIngredients = rich
  ? Array.from({ length: 10 }, (_, n) => ({
      id: `r${n + 2}`,
      originalText: `${n + 1} EL Zutat ${n + 2}`,
    }))
  : [];
const richDescription =
  "Ein langes Rezept für die Familie, das nach dem Einkauf am Wochenende in Ruhe gekocht wird und auch am nächsten Tag noch schmeckt. Die Beschreibung ist absichtlich länger, damit der Dialog auch in einem Desktopfenster scrollt.";
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/api/services/notify/")) {
    let raw = "";
    for await (const buf of req) raw += buf.toString();
    alerts.push(JSON.parse(raw));
    return json(res, 200, []);
  }
  if (path === "/events") return json(res, 200, { checked, writes, adds, alerts });
  if (req.headers.authorization !== "Bearer LOCAL_TEST_TOKEN")
    return json(res, 401, { error: "Unauthorized" });
  if (path === "/api/users/self") return json(res, 200, { username: "fixture", id: "user-1" });
  if (path === "/api/recipes" && req.method === "GET")
    return json(res, 200, {
      items: [{ id: "recipe-a", slug: "testgericht", name: "Testgericht", recipeServings: 2 }],
      total: 1,
      page: 1,
      per_page: 24,
    });
  if (path === "/api/recipes/testgericht")
    return json(res, 200, {
      id: "recipe-a",
      slug: "testgericht",
      name: "Testgericht",
      recipeServings: 2,
      recipeInstructions: [{ text: "Kochen" }, ...richSteps],
      recipeIngredient: [{ id: "r1", originalText: "Tomaten" }, ...richIngredients],
      ...(rich ? { description: richDescription } : {}),
    });
  if (path === "/api/households/mealplans") return json(res, 200, []);
  if (path === "/api/households/shopping/lists")
    return json(res, 200, { items: [{ id: "list-a", name: "Einkauf" }] });
  if (path === "/api/households/shopping/items" && req.method === "GET")
    return json(res, 200, {
      items: [
        item(),
        ...Array.from({ length: adds }, (_, n) => ({
          id: `add-${n}`,
          shoppingListId: "list-a",
          note: "Milch",
          checked: false,
          quantity: 1,
        })),
      ],
    });
  if (path === "/api/households/shopping/items" && req.method === "POST") {
    adds++;
    return json(res, 200, { id: `add-${adds}` });
  }
  if (path === "/api/households/shopping/items/item-a" && req.method === "GET")
    return json(res, 200, item());
  if (path === "/api/households/shopping/items/item-a" && req.method === "PUT") {
    let raw = "";
    for await (const chunk of req) raw += chunk.toString();
    checked = JSON.parse(raw).checked;
    writes++;
    return json(res, 200, item());
  }
  if (path === "/api/organizers/categories" || path === "/api/organizers/tags")
    return json(res, 200, { items: [] });
  if (path === "/api/households/cookbooks")
    return json(res, 200, {
      items: [{ name: "Schnell", slug: "schnell", queryFilter: { parts: [] } }],
    });
  json(res, 404, { missing: path });
});
server.listen(0, "127.0.0.1", () => console.log(server.address().port));
