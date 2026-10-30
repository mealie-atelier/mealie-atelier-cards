import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const locales = Object.fromEntries(
  ["de", "en"].map((l) => [
    l,
    JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), "utf8")),
  ]),
);
// Every code the Bridge can emit (strings.json translation keys). Kept explicit because the Bridge repo is separate.
const BRIDGE_CODES = [
  "invalid_request",
  "not_configured",
  "timer_not_found",
  "timer_not_permitted",
  "timer_exists",
  "too_many_timers",
  "invalid_timer",
  "usda_key_invalid",
  "usda_rate_limited",
  "ai_not_configured",
  "read_only",
  "shopping_item_not_found",
];
const camel = (code) => "err" + code.replace(/(?:^|_)([a-z0-9])/g, (_, c) => c.toUpperCase());

function setup(language = "en") {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
  card._render = () => {};
  return { cards, card };
}

test("every Bridge error code has a German and an English err key that the card resolves", () => {
  for (const [language, strings] of Object.entries(locales)) {
    const { card } = setup(language);
    for (const code of BRIDGE_CODES) {
      assert.ok(strings[camel(code)], `${language} ${camel(code)}`);
      assert.equal(card._errorText({ code, message: "raw" }), strings[camel(code)], code);
    }
  }
});

test("the web app store reports the timer error codes", async () => {
  const src = readFileSync(new URL("../web/alarm-store.mjs", import.meta.url), "utf8");
  for (const code of [
    "timer_not_found",
    "timer_not_permitted",
    "timer_exists",
    "too_many_timers",
    "invalid_timer",
  ])
    assert.ok(src.includes(`"${code}"`), code);
});

test("the AI review is hidden when the status says no key is set and shown otherwise", () => {
  const { card } = setup();
  card._detail = { slug: "s", name: "S", recipeInstructions: [{ text: "a" }] };
  card._hass.callWS = async () => ({});
  card._providerActive = "bridge";
  for (const [entry, shown] of [
    [{ entry_id: "e", ai_enabled: false, ai_provider: "none" }, false],
    [{ entry_id: "e", ai_enabled: true, ai_provider: "openai" }, true],
    [{ entry_id: "e" }, true],
  ]) {
    card._status = { entries: [entry] };
    card._modal = "recipe";
    assert.equal(
      card._modalHtml().includes('data-action="studio-ai-audit"'),
      shown,
      JSON.stringify(entry),
    );
  }
});

async function runAudit(entry, language) {
  const { card } = setup(language);
  card._detail = { slug: "s", name: "S" };
  card._status = { entries: [entry] };
  const dialogs = [],
    calls = [];
  card._atelierDialog = async (opts) => (dialogs.push(opts), true);
  card._flash = () => {};
  card._ws = async (op, payload) => (calls.push([op, payload]), { issues: [], disclaimer: "" });
  const button = { dataset: { action: "studio-ai-audit" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  return { dialogs, calls };
}

test("the consent dialog names the real provider and the audit sends the card language", async () => {
  for (const [provider, name] of [
    ["openai", "OpenAI"],
    ["anthropic", "Anthropic"],
  ]) {
    const { dialogs, calls } = await runAudit(
      { entry_id: "e", ai_enabled: true, ai_provider: provider },
      "de",
    );
    assert.ok(dialogs[0].body.includes(name), dialogs[0].body);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), [
      "studio_ai_audit",
      { slug: "s", language: "de" },
    ]);
  }
  const { dialogs, calls } = await runAudit({ entry_id: "e", ai_enabled: true }, "en");
  assert.match(dialogs[0].body, /your configured AI provider/);
  assert.equal(calls[0][1].language, "en");
});

test("the ingredient substitute request sends the card language", async () => {
  const { card } = setup("de");
  card._detail = { slug: "s", name: "S" };
  card._status = { entries: [{ entry_id: "e", ai_enabled: true, ai_provider: "openai" }] };
  card._atelierDialog = async () => "Xyzzy";
  const calls = [];
  card._ws = async (op, payload) => (calls.push([op, payload]), { alternatives: [], warning: "w" });
  const button = {
    dataset: { action: "studio-replacement" },
    disabled: false,
    closest: () => button,
  };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(calls[0][0], "studio_substitute");
  assert.equal(calls[0][1].language, "de");
});

test("shopping sync shows the dedicated read-only message even when a write grant exists", () => {
  for (const [language, text] of [
    ["en", /read-only mode/],
    ["de", /Nur-Lesen-Modus/],
  ]) {
    const { card } = setup(language);
    card._status = {
      entries: [
        {
          entry_id: "e",
          read_only: true,
          can_write: true,
          permissions: { can_write: true, can_admin: true },
          features: { shopping_sync: true },
        },
      ],
    };
    assert.equal(card._syncCaps().write, false);
    assert.equal(card._syncCaps().readOnly, true);
    card._syncData().state = { supported: true, rules: [], audit: [] };
    assert.match(card._syncSyncHtml(), text);
  }
});

test("a recipe step keeps its checkbox separate from the text and links URLs safely", () => {
  const { card } = setup();
  card._detail = {
    slug: "s",
    name: "S",
    recipeInstructions: [
      { summary: "Prep", text: "Watch https://example.org/v?a=1&b=2 now" },
      { text: "Plain" },
    ],
  };
  card._checkedSteps = new Set([0]);
  card._modal = "recipe";
  const html = card._modalHtml();
  const row = html.match(/<div class="step active"[^>]*>.*?<\/span><\/div>/s)[0];
  assert.doesNotMatch(
    row,
    /<button[^>]*>(?:(?!<\/button>).)*step-text/s,
    "text is not inside a button",
  );
  assert.match(
    row,
    /<button class="step-number step-toggle" type="button" data-action="step-check" data-value="0" aria-pressed="true" aria-label="Step 1">01<\/button><span class="step-copy">/,
  );
  assert.match(
    row,
    /<a href="https:\/\/example\.org\/v\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">/,
  );
  assert.match(html, /aria-pressed="false" aria-label="Step 2"/);
  assert.ok(
    row.indexOf("step-number") < row.indexOf("step-copy"),
    "toggle comes first in reading order",
  );
});

test("toggling a step checkbox flips its state", async () => {
  const { card } = setup();
  const button = {
    dataset: { action: "step-check", value: "1" },
    disabled: false,
    closest: () => button,
  };
  const target = { closest: (selector) => (selector === "a[href]" ? null : button) };
  await card._handleClick({ target, preventDefault() {} });
  assert.ok(card._checkedSteps.has(1));
  await card._handleClick({ target, preventDefault() {} });
  assert.ok(!card._checkedSteps.has(1));
});
