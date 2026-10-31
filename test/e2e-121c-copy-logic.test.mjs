import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const core = readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8");
const Studio = runInNewContext(core + "\nAtelierStudio", {
  Date,
  Intl,
  Number,
  Math,
  String,
  Set,
  Map,
  Array,
  Object,
  RegExp,
  JSON,
  Boolean,
  Error,
});
const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));

test("buttermilk gets its own swap and never the butter swap", () => {
  for (const word of ["Buttermilch", "buttermilk", "300 ml Buttermilch"]) {
    const keys = Studio.substitutions(word).map((s) => s.to);
    assert.equal(JSON.stringify(keys), JSON.stringify(["studioSwapButtermilk"]), word);
  }
  assert.equal(
    JSON.stringify(Studio.substitutions("Butter").map((s) => s.to)),
    JSON.stringify(["studioSwapButter"]),
  );
  assert.equal(
    JSON.stringify(Studio.substitutions("Butterschmalz").map((s) => s.to)),
    JSON.stringify(["studioSwapButter"]),
  );
  assert.ok(de.studioSwapButtermilk && en.studioSwapButtermilk);
});

test("the cook button label matches the dialog title in both languages", () => {
  assert.equal(de.studioReplacementLabel, "Zutat ersetzen");
  assert.equal(en.studioReplacementLabel, "Replace ingredient");
});

test("editing a rule with an unavailable destination keeps it selected and saveable", async () => {
  const cards = loadCards();
  const rule = {
    id: "r1",
    revision: 1,
    name: "Weekly → Einkaufsliste",
    source_list_id: "l1",
    source_list_name: "Weekly",
    destination_entity_id: "todo.gone",
    mode: "copy",
    triggers: { after_atelier_add: true, watch: false },
    debounce_seconds: 30,
    poll_interval_seconds: 120,
    duplicate_policy: "skip_exact",
    activated: true,
    destination: { entity_id: "todo.gone", name: "todo.gone", available: false },
  };
  const callWS = async (m) => {
    const n = m.type.replace("mealie_atelier/", "");
    if (n === "sync_state") return { supported: true, rules: [rule], audit: [] };
    if (n === "sync_destinations")
      return { entities: [{ entity_id: "todo.x", name: "X", platform: "bring" }] };
    return {};
  };
  const card = makeCard(cards, { hass: { language: "en", callWS } });
  card._status = {
    entries: [
      { entry_id: "e1", can_write: true, can_manage: true, features: { shopping_sync: true } },
    ],
  };
  card._data.shopping = { lists: [{ id: "l1", name: "Weekly" }], items: [] };
  card._activeList = "l1";
  card._view = "shopping";
  await card._syncLoad?.();
  await card._syncSetupOpen("r1");
  const html = card._syncSetupHtml();
  assert.match(html, /<option value="todo\.gone" selected>Einkaufsliste \(unavailable\)<\/option>/);
  const d = card._syncData().setup;
  assert.equal(d.destination_entity_id, "todo.gone");
  assert.equal(card._syncDraftRequest(d).destination_entity_id, "todo.gone");
});
