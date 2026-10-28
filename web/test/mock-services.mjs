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
      recipeInstructions: [{ text: "Kochen" }],
      recipeIngredient: [{ id: "r1", originalText: "Tomaten" }],
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
