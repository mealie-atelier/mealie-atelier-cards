import assert from "node:assert/strict";
import test from "node:test";
import { loadCards } from "./support/card-harness.mjs";

function renderEditor(config, hass) {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = hass;
  editor._wizardMode = false;
  editor._detectNativeEntries();
  editor.setConfig({ type: "custom:mealie-atelier-card", ...config });
  return editor.shadowRoot.innerHTML;
}

test("accent colours carry translated names, never raw hex labels", () => {
  const de = renderEditor({}, { language: "de" });
  const accent = de.match(/<select id="atelier-accent".*?<\/select>/s)[0];
  assert.match(accent, />Salbeigrün</);
  assert.doesNotMatch(accent, />#[0-9a-f]{6}</i);
  assert.match(de, /class="accent-dot"[^>]*#9dcbb2/);
  const en = renderEditor({ accent: "#e5ad92" }, { language: "en" });
  assert.match(en, /value="#e5ad92"\s+selected\s*>Apricot</);
});

test("stub configs name only the view, never an unused title", () => {
  const cards = loadCards();
  for (const [tag, mode] of [
    ["mealie-atelier-today", "today"],
    ["mealie-atelier-mealplan", "mealplan"],
    ["mealie-atelier-manage", "manage"],
    ["mealie-atelier-card", "dashboard"],
  ]) {
    const stub = cards.registry.get(tag).getStubConfig({ language: "de" });
    assert.equal(stub.mode, mode);
    assert.equal("title" in stub, false, tag);
  }
});

test("a stored value outside the presets stays selected and labelled", () => {
  const html = renderEditor({ language: "fr", columns: 9, theme: "purple" }, { language: "en" });
  assert.match(html, /value="fr"\s+selected\s*>fr \(custom/);
  assert.match(html, /value="9"\s+selected\s*>9 \(custom/);
  assert.match(html, /value="purple"\s+selected\s*>purple \(custom/);
  const known = renderEditor({ theme: "light" }, { language: "en" });
  assert.doesNotMatch(known, /\(custom/);
});

test("the built-in Mealie option is always listed, disabled with a hint without integration", () => {
  const without = renderEditor({}, { language: "en" });
  assert.match(without, /value="home_assistant"[^>]*disabled/);
  assert.match(without, /atelier-provider-native-hint/);
  const withNative = renderEditor(
    {},
    {
      language: "en",
      entities: { a: { platform: "mealie", config_entry_id: "m1", name: "Home" } },
    },
  );
  assert.match(withNative, /value="home_assistant"/);
  assert.doesNotMatch(withNative, /value="home_assistant"[^>]*disabled/);
  assert.doesNotMatch(withNative, /atelier-provider-native-hint/);
});
