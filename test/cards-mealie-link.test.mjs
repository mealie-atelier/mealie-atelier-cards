import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const cards = loadCards();

function dialog({ config = {}, entry = {}, language = "en", slug = "pasta e fagioli" } = {}) {
  const c = makeCard(cards, {
    hass: { language, callWS: async () => ({}) },
    permissions: { can_write: true, can_manage: true, ...entry },
  });
  c.setConfig({ type: "custom:mealie-atelier-card", ...config });
  c._detail = {
    slug,
    name: "Test",
    recipeServings: 0,
    recipeIngredient: [],
    recipeInstructions: [{ text: "Do it" }],
  };
  c._modal = "recipe";
  c._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  return c._modalHtml();
}
const link = (html) =>
  html.match(/<a class="text-action"[^>]*data-mealie-link[^>]*>.*?<\/a>/s)?.[0];

test("no configured Mealie URL means no link", () => {
  assert.equal(link(dialog()), undefined);
});

test("config URL builds the link with group, encoded slug and safe target", () => {
  const html = link(dialog({ config: { mealie_url: "https://mealie.example.test/" } }));
  assert.match(html, /href="https:\/\/mealie\.example\.test\/g\/home\/r\/pasta%20e%20fagioli"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<svg/);
  assert.match(html, /Open in Mealie/);
});

test("the link sits in the quiet text action row, not among the buttons", () => {
  const html = dialog({ config: { mealie_url: "http://mealie.example.test:9925" } });
  const row = html.match(/<div class="text-actions">.*?<\/div>/s)[0];
  assert.ok(row.includes("data-mealie-link"));
  assert.ok(
    !html.match(/<div class="toolbar recipe-actions-main">.*?<\/div>/s)[0].includes("Mealie"),
  );
});

test("German text is exactly In Mealie öffnen", () => {
  const html = link(dialog({ language: "de", config: { mealie_url: "https://m.example.test" } }));
  assert.match(html, />\s*In Mealie öffnen\s*</);
});

test("custom group is used and the slug cannot break out of the path", () => {
  const html = link(
    dialog({
      config: { mealie_url: "https://m.example.test", mealie_group: "our-kitchen" },
      slug: "a/b?c#d",
    }),
  );
  assert.match(html, /href="https:\/\/m\.example\.test\/g\/our-kitchen\/r\/a%2Fb%3Fc%23d"/);
});

test("invalid URLs are ignored instead of throwing", () => {
  for (const bad of [
    "javascript:alert(1)",
    "ftp://m.example.test",
    "https://user:pw@m.example.test",
    "https://:pw@m.example.test",
    "https://m.example.test/sub?x=1",
    "not a url",
    42,
  ]) {
    assert.equal(link(dialog({ config: { mealie_url: bad } })), undefined, String(bad));
  }
});

test("web app status supplies the URL, the card's own config wins", () => {
  const entry = { mealie_url: "https://server.example.test", mealie_group: "family" };
  assert.match(link(dialog({ entry })), /href="https:\/\/server\.example\.test\/g\/family\/r\//);
  const own = link(
    dialog({ entry, config: { mealie_url: "https://own.example.test", mealie_group: "mine" } }),
  );
  assert.match(own, /href="https:\/\/own\.example\.test\/g\/mine\/r\//);
  assert.equal(link(dialog({ entry: { mealie_url: "javascript:x" } })), undefined);
});

test("editor offers both config keys", () => {
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._wizardMode = false;
  editor.setConfig({ type: "custom:mealie-atelier-card", mealie_url: "https://m.example.test" });
  const html = editor.shadowRoot.innerHTML;
  assert.match(html, /data-key="mealie_url"[^>]*value="https:\/\/m\.example\.test"/);
  assert.match(html, /data-key="mealie_group"[^>]*value="home"/);
});
