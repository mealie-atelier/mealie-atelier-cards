import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const rule = {
  id: "r1",
  source_list_id: "l1",
  activated: true,
  last_run: { at: new Date().toISOString(), outcome: "destination_auth", count: 0 },
};
const ruleHtml = (fromEnv) => {
  const c = makeCard(loadCards());
  c._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: { can_admin: true },
        bring: { state: "reauth", from_env: fromEnv },
      },
    ],
  };
  c._config = { ...c._config, entry_id: "e1" };
  c._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  c._syncData().state = { rules: [rule], audit: [] };
  c._render = () => {};
  return c._syncRuleHtml(rule, c._syncCaps());
};

test("env mode names the server .env and never points at a sign-in form above", () => {
  const html = ruleHtml(true);
  assert.match(html, /BRING_EMAIL and BRING_PASSWORD/);
  assert.doesNotMatch(html, /Sign in again above/);
});

test("non-env mode keeps the sign in again above advice", () => {
  const html = ruleHtml(false);
  assert.match(html, /Sign in again above/);
  assert.doesNotMatch(html, /BRING_EMAIL/);
});

test("bwPreviewEmpty has no comma splice in either language", () => {
  for (const lang of ["en", "de"]) {
    const text = JSON.parse(
      readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url)),
    ).bwPreviewEmpty;
    assert.doesNotMatch(text, /, (new items|neue Artikel)/);
    assert.match(text, /\. (New items follow|Neue Artikel folgen)/);
  }
});
