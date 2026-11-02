import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));

const iso = (ms) => new Date(Date.now() + ms).toISOString();
const RULE = {
  id: "r1",
  revision: 1,
  name: "Weekly → Einkauf",
  source_list_id: "l1",
  source_list_name: "Weekly",
  destination_entity_id: "bring:a",
  mode: "copy",
  triggers: { after_atelier_add: true, watch: false },
  activated: true,
  paused: false,
  last_run: null,
  counts: { pending: 0, sending: 0, failed: 0, needs_reconciliation: 0 },
  destination: { entity_id: "bring:a", name: "Einkauf", platform: "bring", available: true },
};

function make({ language = "en", bring = true, rules = [RULE], audit = [], ws } = {}) {
  const card = makeCard(loadCards(), { hass: { language } });
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: bring ? { shopping_sync: true, bring_setup: true } : { shopping_sync: true },
        permissions: { can_admin: true, can_write: true },
        can_write: true,
        can_manage: true,
        bring: { state: "connected", account: "cook@example.test" },
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = {
    shopping: {
      lists: [
        { id: "l1", name: "Weekly" },
        { id: "l2", name: "Party" },
      ],
    },
  };
  card._syncData().state = { rules, audit };
  card._ws = ws || (async () => ({}));
  card._render = () => {};
  return card;
}

test("a failed destination load keeps the stored destination and does not claim there are none", async () => {
  for (const [bring, language] of [
    [true, "en"],
    [false, "en"],
    [true, "de"],
  ]) {
    const card = make({
      bring,
      language,
      ws: async (type) => {
        if (type === "sync_destinations") throw new Error("Bring! sign-in expired");
        return {};
      },
    });
    await card._syncSetupOpen("r1");
    const d = card._syncData().setup;
    assert.equal(d.destinationsLoaded, true);
    assert.equal(d.loadFailed, true);
    const html = card._syncSetupHtml();
    const texts = language === "de" ? de : en;
    assert.ok(!html.includes(texts.syncNoDestinations));
    assert.match(html, /<select data-input="sync-destination"/);
    assert.match(html, /<option value="bring:a" selected>Einkauf/);
    const line = bring ? texts.syncDestinationsLoadFailedBring : texts.syncDestinationsLoadFailed;
    assert.ok(html.includes(line.replace("'", "&#39;")), `${language} bring=${bring}`);
  }
});

test("an empty but successful destination load still says no destination exists", async () => {
  const card = make({ ws: async () => ({ entities: [] }) });
  await card._syncSetupOpen("r1");
  const html = card._syncSetupHtml();
  assert.ok(html.includes(en.syncNoDestinations));
  assert.ok(!html.includes(en.syncDestinationsLoadFailedBring));
});

test("the new destination load failure strings follow the German style rules", () => {
  for (const key of ["syncDestinationsLoadFailed", "syncDestinationsLoadFailedBring"]) {
    assert.doesNotMatch(de[key], /[–—]|\bund,|,\s*und\b/);
    assert.ok(en[key].length > 10);
  }
});

test("a stale failure line is cleared once the rule recovered by itself", async () => {
  const recovered = {
    ...RULE,
    last_run: { at: iso(-1000), outcome: "sent", count: 1 },
  };
  const card = make({
    rules: [{ ...RULE, counts: { pending: 1 } }],
    ws: async () => ({ rules: [recovered], audit: [] }),
  });
  const sync = card._syncData();
  card._syncShowResult({ rule_id: "r1", outcome: "destination_unavailable", pending_left: 1 });
  assert.match(sync.result, /unreachable/);
  await card._syncLoad();
  assert.equal(sync.result, "");
  assert.equal(sync.resultIcon, "");
  assert.equal(sync.resultQuiet, false);
});

test("a failure line stays while the rule still has waiting items", async () => {
  const waiting = {
    ...RULE,
    counts: { pending: 1 },
    last_run: { at: iso(-1000), outcome: "sent", count: 1 },
  };
  const card = make({ ws: async () => ({ rules: [waiting], audit: [] }) });
  const sync = card._syncData();
  card._syncShowResult({ rule_id: "r1", outcome: "destination_unavailable", pending_left: 1 });
  await card._syncLoad();
  assert.notEqual(sync.result, "");
});

test("the last healthy run of a retargeted rule ignores audit entries from before the retarget", () => {
  const audit = [{ rule_id: "r1", at: iso(-60000), outcome: "sent", count: 3 }];
  const card = make({ audit });
  assert.equal(card._syncLastHealthyAudit("r1")?.outcome, "sent");
  assert.equal(card._syncLastHealthyAudit("r1", iso(-120000))?.outcome, "sent");
  assert.equal(card._syncLastHealthyAudit("r1", iso(-1000)), null);
});

test("a retargeted rule does not show the old list's last run on its card", () => {
  const audit = [{ rule_id: "r1", at: iso(-60000), outcome: "sent", count: 3 }];
  const stale = make({ audit, rules: [{ ...RULE, retargeted_at: iso(-1000) }] });
  assert.match(stale._syncRuleHtml(stale._syncRules()[0], stale._syncCaps()), /No delivery yet/);
  const fresh = make({ audit, rules: [RULE] });
  assert.doesNotMatch(
    fresh._syncRuleHtml(fresh._syncRules()[0], fresh._syncCaps()),
    /No delivery yet/,
  );
});

test("an auto-named rule is titled from the current route in the UI language", () => {
  const rule = {
    ...RULE,
    name: "Weekly → Old list",
    auto_name: true,
    source_list_name: "Party",
    destination: { ...RULE.destination, name: "Wochenmarkt" },
  };
  const card = make({ rules: [rule] });
  assert.equal(card._syncRuleLabel(rule), "Party → Wochenmarkt");
  const custom = { ...rule, auto_name: false, name: "Mine" };
  assert.equal(card._syncRuleLabel(custom), "Mine");
});

test("a rule without auto_name is auto when its name matches the old default", () => {
  const card = make();
  const builtIn = {
    ...RULE,
    name: "Weekly → Shopping list",
    destination: { entity_id: "todo.sl", name: "Shopping list", platform: "shopping_list" },
  };
  assert.equal(card._syncRuleLabel(builtIn), "Weekly → Shopping list");
  card._hass.language = "de";
  assert.equal(card._syncRuleLabel(builtIn), "Weekly → Einkaufsliste");
  const plain = { ...RULE, name: "Weekly → Einkauf" };
  assert.equal(card._syncRuleAuto(plain, plain.destination, "Einkauf"), true);
  const custom = { ...RULE, name: "Groceries" };
  assert.equal(card._syncRuleAuto(custom, custom.destination, "Einkauf"), false);
  assert.equal(card._syncRuleLabel(custom), "Groceries");
});

test("the edit form leaves the name empty for an auto-named rule and keeps a custom one", async () => {
  const auto = make({ rules: [{ ...RULE, auto_name: true }] });
  await auto._syncSetupOpen("r1");
  assert.equal(auto._syncData().setup.name, "");
  const autoRequest = auto._syncDraftRequest(auto._syncData().setup);
  assert.equal("name" in autoRequest, false);
  assert.equal("auto_name" in autoRequest, false);
  const custom = make({ rules: [{ ...RULE, name: "Groceries", auto_name: false }] });
  await custom._syncSetupOpen("r1");
  assert.equal(custom._syncData().setup.name, "Groceries");
  const customRequest = custom._syncDraftRequest(custom._syncData().setup);
  assert.equal(customRequest.name, "Groceries");
  assert.equal("auto_name" in customRequest, false);
});
