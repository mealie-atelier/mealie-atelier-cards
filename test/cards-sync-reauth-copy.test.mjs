import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));

const rule = {
  id: "r1",
  revision: 1,
  name: "Weekly → Einkauf",
  source_list_id: "l1",
  source_list_name: "Weekly",
  destination_entity_id: "todo.bring",
  mode: "copy",
  activated: true,
  paused: false,
  last_run: null,
  counts: { pending: 0, failed: 0, needs_reconciliation: 0 },
  destination: { entity_id: "todo.bring", name: "Einkauf", platform: "bring", available: true },
};

function make({ language = "en", env = false, rules = [], ws } = {}) {
  const card = makeCard(loadCards(), { hass: { language } });
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: { can_admin: true, can_write: true },
        bring: { state: "reauth", account: "cook@example.test", from_env: env },
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  card._syncData().state = { rules, audit: [] };
  card._ws = ws || (async () => ({}));
  return card;
}

const esc = (text) => text.replace(/&#39;|&#x27;/g, "'");
const caps = (card) => card._syncCaps?.() ?? card._syncCapabilities?.();

test("reauth text promises kept rules only when a rule exists", () => {
  for (const [language, texts] of [
    ["de", de],
    ["en", en],
  ])
    for (const env of [false, true]) {
      const base = env ? "bwReauthTextEnv" : "bwReauthText";
      const withRule = make({ language, env, rules: [rule] });
      const none = make({ language, env, rules: [] });
      const render = (card) => card._bwAccountHtml(caps(card));
      const promise = texts[base].slice(texts[`${base}NoRules`].length);
      assert.ok(promise.trim().length > 10);
      assert.ok(
        esc(render(withRule)).includes(esc(promise.trim())),
        `${language} env=${env} rules`,
      );
      const html = render(none);
      assert.ok(html.includes("bw-text"), `${language} env=${env}`);
      assert.ok(!esc(html).includes(esc(promise.trim())), `${language} env=${env} promise`);
      assert.ok(esc(html).includes(esc(texts[`${base}NoRules`])), `${language} env=${env} short`);
    }
});

test("no-rule reauth copy is the base copy without the promise sentence", () => {
  for (const texts of [de, en])
    for (const base of ["bwReauthText", "bwReauthTextEnv"]) {
      const short = texts[`${base}NoRules`];
      assert.ok(texts[base].startsWith(short));
      assert.notEqual(short, texts[base]);
    }
  for (const text of [de.bwReauthTextNoRules, de.bwReauthTextEnvNoRules])
    assert.doesNotMatch(text, /[–—]|ae|oe|ue/);
});

test("a successful re-login clears the stale failure line of the expired run", async () => {
  const card = make({ rules: [rule], ws: async () => ({ entries: [] }) });
  card._render = () => {};
  const sync = card._syncData();
  sync.result = "Sign-in expired.";
  sync.resultIcon = "<svg></svg>";
  sync.resultQuiet = true;
  sync.bring.email = "cook@example.test";
  sync.bring.password = "pw";
  await card._syncBringConnect();
  assert.equal(sync.bring.error, "");
  assert.equal(sync.result, "");
  assert.equal(sync.resultIcon, "");
  assert.equal(sync.resultQuiet, false);
});

test("the week plan feature shot is produced by the showcase script with a matching manifest", () => {
  const script = readFileSync(
    new URL("../scripts/capture-app-showcase.py", import.meta.url),
    "utf8",
  );
  assert.match(script, /"feature-mealplan": \(FEATURE, "mealplan", None, \("de", "en"\)\)/);
  const manifest = JSON.parse(
    readFileSync(new URL("../demo/showcase/manifest.json", import.meta.url), "utf8"),
  );
  const [top, bottom] = script
    .match(/crop=\((\d+), (\d+)\)/)
    .slice(1)
    .map(Number);
  for (const loc of ["de", "en"]) {
    const entry = manifest[loc]["feature-mealplan"];
    assert.equal(entry.width, 1600);
    assert.equal(entry.height, Math.round(((bottom - top) * 1600) / 960));
  }
});
