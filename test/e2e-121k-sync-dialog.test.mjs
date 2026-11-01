import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));

const rule = () => ({
  id: "r1",
  revision: 1,
  name: "Weekly → Einkauf",
  source_list_id: "l1",
  source_list_name: "Weekly",
  destination_entity_id: "todo.bring",
  mode: "copy",
  activated: true,
  paused: false,
  last_run: {
    at: new Date().toISOString(),
    trigger: "manual",
    outcome: "destination_auth",
    count: 0,
  },
  counts: { pending: 2, failed: 0, needs_reconciliation: 0 },
  destination: {
    entity_id: "todo.bring",
    name: "Einkauf",
    platform: "bring",
    available: false,
    reason: "auth",
  },
});

function make({ bring = true, admin = true, env = false, state = "reauth", rules = [] } = {}) {
  const card = makeCard(loadCards(), { hass: { language: "en" } });
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: bring },
        permissions: { can_admin: admin, can_write: true },
        bring: { state, account: "cook@example.test", from_env: env },
      },
    ],
  };
  card._config = { ...card._config, entry_id: "e1" };
  card._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  card._syncData().state = { rules, audit: [] };
  card._ws = async () => ({});
  return card;
}

const lines = (n) => Array.from({ length: n }, (_, i) => ({ title: `Item ${i}`, action: "send" }));

test("preview total omits the batch sentence when everything is shown", async () => {
  for (const [bring, allKey, batchKey] of [
    [false, "syncPreviewTotalAll", "syncPreviewTotal"],
    [true, "syncPreviewTotalBringAll", "syncPreviewTotalBring"],
  ])
    for (const [total, shown, key] of [
      [1, 1, `${allKey}`],
      [3, 3, `${allKey}`],
      [7, 3, `${batchKey}`],
    ]) {
      const card = make({ bring, state: "connected" });
      await card._syncSetupOpen("");
      card._modal = "sync-setup";
      card._syncData().setup.preview = {
        total_candidates: total,
        lines: lines(shown),
        sample: null,
      };
      const html = card._syncSetupHtml();
      const expected = card.tp(key, total, { total, shown });
      assert.ok(
        html.includes(expected.replace(/&/g, "&amp;")),
        `${bring} ${total}/${shown}: ${expected}`,
      );
      if (key === allKey) assert.doesNotMatch(html, /first (batch|delivery)/);
      else assert.match(html, /first (batch|delivery)/);
    }
  assert.equal(en["syncPreviewTotalAll.other"], "{total} open items in the source list.");
  assert.equal(de["syncPreviewTotalBringAll.other"], "{total} offene Artikel in der Mealie-Liste.");
  assert.equal(de["syncPreviewTotalAll.one"], "1 offener Artikel in der Quellliste.");
  assert.equal(en["syncPreviewTotalBringAll.one"], "1 open item in the Mealie list.");
});

test("env mode never opens the Bring! sign-in step for an unconnected account", () => {
  for (const state of ["reauth", "none", ""]) {
    const card = make({ env: true, state });
    card._modal = "sync";
    card._bwOpen();
    assert.equal(card._modal, "sync-info");
    assert.ok(!card._syncData().wizard || card._syncData().wizard.step !== 1);
    assert.ok(card._syncInfoHtml().includes(en.bwSessionExpiredEnv.replace(/&/g, "&amp;")));
  }
  const ok = make({ env: true, state: "connected" });
  ok._bwOpen();
  assert.equal(ok._modal, "sync-wizard");
  const plain = make({ env: false, state: "reauth" });
  plain._bwOpen();
  assert.equal(plain._modal, "sync-wizard");
  assert.equal(plain._syncData().wizard.step, 1);
});

test("expired session banner text follows role and env mode", () => {
  const cases = [
    [true, false, "bwSessionExpired"],
    [false, false, "bwSessionExpiredAskAdmin"],
    [true, true, "bwSessionExpiredEnv"],
    [false, true, "bwSessionExpiredEnvAskAdmin"],
  ];
  for (const [admin, env, key] of cases) {
    const card = make({ admin, env, state: "reauth", rules: [rule()] });
    card._modal = "sync";
    const html = card._syncSyncHtml();
    const want = card.t(key).replace(/&/g, "&amp;");
    assert.ok(html.includes(want), key);
    for (const other of cases.map((c) => c[2]).filter((k) => k !== key))
      assert.ok(!html.includes(card.t(other)), `${key} must not show ${other}`);
  }
  assert.doesNotMatch(en.bwSessionExpiredAskAdmin, /above/);
  assert.match(de.bwSessionExpiredAskAdmin, /Administrator/);
  assert.match(de.bwSessionExpiredEnvAskAdmin, /Administrator/);
});
