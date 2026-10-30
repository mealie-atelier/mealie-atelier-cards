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

test("accent colors carry translated names, never raw hex labels", () => {
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

function makeEditor(config, hass = { language: "en" }) {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = hass;
  editor._wizardMode = false;
  const emitted = [];
  const emit = editor._emitConfig.bind(editor);
  editor._emitConfig = () => {
    emit();
    emitted.push(editor._emittedConfig());
  };
  editor.setConfig(config);
  return { editor, emitted };
}

test("editor emits only the stub and changed keys, type first, without private flags", () => {
  const { editor, emitted } = makeEditor({ type: "custom:mealie-atelier-card", mode: "recipes" });
  editor._handleChange({ target: { dataset: { key: "theme" }, value: "light" } });
  editor._handleChange({ target: { dataset: { key: "columns" }, value: "3" } });
  editor._handleChange({
    target: { dataset: { key: "cooking_volume" }, value: "0.3" },
  });
  const out = emitted.at(-1);
  assert.deepEqual(Object.keys(out), ["type", "mode", "theme", "cooking_volume"]);
  assert.equal(out.cooking_volume, 0.3);
  editor._handleClick({
    target: { closest: () => ({ dataset: { editorAction: "skip" } }) },
    preventDefault() {},
  });
  assert.equal("_setup_complete" in editor._emittedConfig(), false);
});

test("the echo of the editor's own change does not rebuild the form", () => {
  const { editor } = makeEditor({ type: "custom:mealie-atelier-card", mode: "recipes" });
  editor._handleChange({
    target: { dataset: { key: "print_image" }, checked: true, type: "checkbox" },
  });
  editor.shadowRoot.innerHTML = "sentinel";
  editor.setConfig(editor._emittedConfig());
  assert.equal(editor.shadowRoot.innerHTML, "sentinel");
  editor.setConfig({ type: "custom:mealie-atelier-card", mode: "pantry" });
  assert.notEqual(editor.shadowRoot.innerHTML, "sentinel");
});

test("a render restores the open advanced section and the focused control", () => {
  const { editor } = makeEditor({ type: "custom:mealie-atelier-card", mode: "recipes" });
  const details = { open: true };
  let focused = null;
  const root = editor.shadowRoot;
  root.querySelector = (selector) => (selector === ".editor-advanced" ? details : null);
  root.activeElement = { id: "atelier-theme" };
  // Replacing the markup closes a fresh <details>, as the browser does.
  Object.defineProperty(root, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => {
      details.open = false;
    },
  });
  root.getElementById = (id) => ({ focus: () => (focused = id) });
  editor._render();
  assert.equal(focused, "atelier-theme");
  assert.equal(details.open, true);
});

test("entity fields use neutral placeholders, suggestions and a domain warning", () => {
  const { editor } = makeEditor(
    { type: "custom:mealie-atelier-card", cooking_scene: "light.kitchen" },
    { language: "en", states: { "scene.dinner": {}, "light.kitchen": {} } },
  );
  const html = editor.shadowRoot.innerHTML;
  assert.match(html, /placeholder="scene\.kitchen_cooking"/);
  assert.match(html, /placeholder="media_player\.kitchen"/);
  assert.doesNotMatch(html, /kueche/);
  assert.match(html, /<option value="scene\.dinner">/);
  assert.doesNotMatch(html, /<option value="light\.kitchen">/);
  assert.match(html, /id="atelier-cooking_scene-warning"/);
  assert.doesNotMatch(html, /atelier-cooking_media_player-warning/);
  assert.match(html, />10%</);
  assert.match(html, />18%</);
  assert.doesNotMatch(html, /Cockpit/);
});

test("editing an entity field updates its warning in place without re-rendering", () => {
  const { editor } = makeEditor(
    { type: "custom:mealie-atelier-card", cooking_scene: "scene.dinner" },
    { language: "en", states: {} },
  );
  let renders = 0;
  editor._render = () => renders++;
  const nodes = new Map();
  let inserted = "";
  editor.shadowRoot.getElementById = (id) =>
    nodes.get(id) ||
    (id === "atelier-list-cooking_scene"
      ? { insertAdjacentHTML: (_where, html) => (inserted = html) }
      : null);
  const change = (value) =>
    editor._handleChange({ target: { dataset: { key: "cooking_scene" }, type: "text", value } });
  change("scene.foo-bar");
  assert.equal(renders, 0);
  assert.match(inserted, /id="atelier-cooking_scene-warning"/);
  inserted = "";
  nodes.set("atelier-cooking_scene-warning", {
    remove: () => nodes.delete("atelier-cooking_scene-warning"),
  });
  change("scene.dinner");
  assert.equal(renders, 0);
  assert.equal(nodes.size, 0);
  assert.equal(inserted, "");
});

test("cooking volume options follow the locale percent format", () => {
  const de = makeEditor({ type: "custom:mealie-atelier-card" }, { language: "de" }).editor;
  assert.match(de.shadowRoot.innerHTML, />10\u00a0%</);
  assert.doesNotMatch(de.shadowRoot.innerHTML, />10%</);
});

test("entity warning uses the untrimmed value like the card gate", () => {
  const { editor } = makeEditor(
    { type: "custom:mealie-atelier-card", cooking_scene: " scene.foo" },
    { language: "en" },
  );
  assert.match(editor.shadowRoot.innerHTML, /id="atelier-cooking_scene-warning"/);
});

test("the Mealie connection uses one term in the editor basics hint", () => {
  for (const [language, term] of [
    ["en", /Mealie connection/],
    ["de", /Mealie-Verbindung/],
  ]) {
    const { editor } = makeEditor(
      { type: "custom:mealie-atelier-card", mode: "recipes" },
      { language },
    );
    const html = editor.shadowRoot.innerHTML;
    assert.doesNotMatch(html, /Mealie instance|Mealie-Instanz/);
    assert.match(html, term);
  }
});

test("every editor Mealie label says connection, never instance", () => {
  for (const language of ["en", "de"]) {
    for (const wizard of [false, true]) {
      const { editor } = makeEditor(
        { type: "custom:mealie-atelier-card", mode: "recipes" },
        { language, states: { "sensor.mealie_recipes": {} } },
      );
      editor._nativeEntries = [{ entry_id: "a", name: "Home" }];
      editor._entriesState = "native";
      editor._wizardMode = wizard;
      editor._step = 0;
      editor._render();
      const html = editor.shadowRoot.innerHTML;
      assert.match(html, /atelier-mealie_entry_id/);
      assert.doesNotMatch(html, /Mealie instance|Mealie-Instanz/);
    }
  }
});

test("the editor explains that the setup wizard is remembered per browser", () => {
  for (const [language, text] of [
    ["en", /kept per browser, not your card settings.*on every card in this browser/],
    ["de", /gilt pro Browser, nicht deine Karteneinstellungen.*bei allen Karten in diesem Browser/],
  ]) {
    const { editor } = makeEditor({ type: "custom:mealie-atelier-card" }, { language });
    assert.match(editor.shadowRoot.innerHTML, text);
    editor._wizardMode = true;
    editor._render();
    assert.match(editor.shadowRoot.innerHTML, text);
  }
});
