import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function editorMarkup(config, language) {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language };
  editor._wizardMode = false;
  editor._detectNativeEntries();
  editor.setConfig({ type: "custom:mealie-atelier-card", ...config });
  return editor.shadowRoot.innerHTML;
}

test("the editor footer does not claim the Overview mode for other views", () => {
  assert.doesNotMatch(editorMarkup({ view: "today" }, "de"), /Übersicht“ enthält die komplette/);
  assert.doesNotMatch(editorMarkup({ view: "recipes" }, "en"), /contains the complete kitchen/);
  assert.match(editorMarkup({ view: "recipes" }, "en"), /Design Studio/);
});

test("the recipe editor offers Add photo when the recipe has no photo", () => {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  card._detail = { slug: "gnocchi", name: "Gnocchi" };
  const bare = card._editorPhotoHtml();
  assert.match(bare, /Add photo/);
  assert.doesNotMatch(bare, /Replace photo/);
  card._detail = {
    slug: "gnocchi",
    name: "Gnocchi",
    image: "tok",
    imageUrl: "/api/image/recipe-42",
  };
  const withPhoto = card._editorPhotoHtml();
  assert.match(withPhoto, /Replace photo/);
});
