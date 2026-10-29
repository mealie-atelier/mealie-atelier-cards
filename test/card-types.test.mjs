import test from "node:test";
import assert from "node:assert/strict";
import { loadCards } from "./support/card-harness.mjs";

const FOCUSED = {
  "mealie-atelier-today": "today",
  "mealie-atelier-recipes": "recipes",
  "mealie-atelier-mealplan": "mealplan",
  "mealie-atelier-shopping": "shopping",
  "mealie-atelier-manage": "manage",
  "mealie-atelier-discover": "discover",
  "mealie-atelier-pantry": "pantry",
  "mealie-atelier-family": "family",
  "mealie-atelier-cookbook": "cookbook",
};

test("each focused card type opens its own view when YAML names only the type", () => {
  const cards = loadCards();
  for (const [tag, mode] of Object.entries(FOCUSED)) {
    const card = new (cards.registry.get(tag))();
    card.setConfig({ type: `custom:${tag}` });
    assert.equal(card._view, mode, tag);
    assert.equal(card._config.mode, mode, tag);
  }
});

test("the complete card still opens the dashboard and an explicit mode always wins", () => {
  const cards = loadCards();
  const full = new (cards.registry.get("mealie-atelier-card"))();
  full.setConfig({ type: "custom:mealie-atelier-card" });
  assert.equal(full._view, "dashboard");
  const shopping = new (cards.registry.get("mealie-atelier-shopping"))();
  shopping.setConfig({ type: "custom:mealie-atelier-shopping", mode: "mealplan" });
  assert.equal(shopping._view, "mealplan");
});

test("status is asked without entry_id even when the card is bound to one Bridge entry", async () => {
  const cards = loadCards();
  const calls = [];
  const card = new (cards.registry.get("mealie-atelier-card"))();
  card.setConfig({ type: "custom:mealie-atelier-card", entry_id: "e1" });
  card._hass = { callWS: async (message) => (calls.push(message), {}) };
  await card._ws("status");
  await card._ws("recipes", { search: "x" });
  assert.equal("entry_id" in calls[0], false);
  assert.equal(calls[1].entry_id, "e1");
});

test("the card picker lists German names in a German Home Assistant", () => {
  const german = { customCards: [] };
  loadCards({ navigator: { language: "de-DE" }, window: german });
  const english = { customCards: [] };
  loadCards({ navigator: { language: "en-US" }, window: english });
  assert.equal(german.customCards.length, 10);
  assert.equal(
    german.customCards.find((c) => c.type === "mealie-atelier-today").name,
    "Mealie Atelier · Heute",
  );
  assert.equal(
    english.customCards.find((c) => c.type === "mealie-atelier-today").name,
    "Mealie Atelier · Today",
  );
});
