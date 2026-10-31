import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the sync dialog columns do not stretch, so an error cannot push the other input down", () => {
  assert.match(
    read("src/design-system/shopping-sync.css"),
    /\.atelier \.sync-panel \.editor-columns \{\s*align-items:\s*start;/,
  );
});

test("the three dashboard section links are text plus arrow", () => {
  const views = read("src/components/views.js");
  const line = views
    .split("\n")
    .find((l) => l.includes('data-value="shopping"') && l.includes("<h2>"));
  assert.ok(line, "shopping section line");
  assert.doesNotMatch(line, /icon-only|aria-label|title=/);
  assert.match(line, /\$\{esc\(this\.t\("shopping"\)\)\} \$\{icon\("arrow", 14\)\}/);
});

function reauthCard(env) {
  const card = makeCard(loadCards(), { hass: { language: "en" } });
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
  card._syncData().state = { rules: [], audit: [] };
  return card;
}

test("env mode reauth shows the .env instruction and no sign-in form", () => {
  for (const env of [true, false]) {
    const card = reauthCard(env);
    const html = card._bwAccountHtml(card._syncCaps());
    assert.equal(html.includes('data-form="bring-login"'), !env, `env=${env}`);
    assert.ok(html.includes("bw-text"), `env=${env}`);
    assert.equal(html.includes('data-action="sync-bring-disconnect-ask"'), !env);
  }
});
