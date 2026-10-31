import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();

const wizardCard = ({ state = "connected", rules = [], audit = [] } = {}) => {
  const card = makeCard(loadCards());
  card._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: {},
        bring: { state, account: "cook@example.test" },
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
  card._render = () => {};
  card._bwCanConnect = () => true;
  return card;
};

test("recomputing on step 3 hides a list that got a rule after the wizard opened", () => {
  const card = wizardCard({ state: "none" });
  card._bwOpen();
  const w = card._bwData();
  assert.deepEqual(
    w.free.map((l) => l.id),
    ["l1", "l2"],
  );
  assert.equal(w.mealieList, "l1");
  card._syncData().state = { rules: [{ id: "r1", source_list_id: "l1" }] };
  card._bwGo(3);
  assert.deepEqual(
    w.free.map((l) => l.id),
    ["l2"],
  );
  assert.equal(w.mealieList, "l2");
  assert.doesNotMatch(card._bwHtml(), /value="l1"/);
});

test("a still free Mealie list choice is kept when the free lists are recomputed", () => {
  const card = wizardCard({ state: "none" });
  card._bwOpen();
  const w = card._bwData();
  w.mealieList = "l2";
  card._bwGo(3);
  assert.equal(w.mealieList, "l2");
});

test("the account's last delivery ignores a run that sent nothing", () => {
  const sent = { at: minutesAgo(8), outcome: "sent", count: 3 };
  const empty = { at: minutesAgo(0), outcome: "nothing_to_send", count: 0 };
  const rule = { id: "r1", source_list_id: "l1", last_run: empty };
  const card = wizardCard({ rules: [rule], audit: [empty, sent] });
  const html = card._bwAccountHtml(card._syncCaps());
  assert.match(html, /8 minutes ago|vor 8 Minuten/);
  assert.doesNotMatch(html, /just now|gerade eben/i);
  const none = wizardCard({ rules: [{ ...rule, last_run: empty }], audit: [empty] });
  assert.match(none._bwAccountHtml(none._syncCaps()), /None yet/);
});

test("wizard preview rows show the Bring! title unchanged and fill a blank title", () => {
  const card = wizardCard();
  card._bwOpen();
  const w = card._bwData();
  w.step = 4;
  w.preview = {
    lines: [
      { title: "Pfeffer (2)", action: "send" },
      { title: "  ", action: "send" },
    ],
  };
  const html = card._bwHtml();
  assert.match(html, /<strong>Pfeffer \(2\)<\/strong>/);
  assert.doesNotMatch(html, /2 × Pfeffer/);
  assert.match(html, /<strong>Item without text<\/strong>/);
});

test("an empty wizard preview shows one text, not two", () => {
  const card = wizardCard();
  card._bwOpen();
  const w = card._bwData();
  w.step = 4;
  w.preview = { lines: [] };
  const html = card._bwHtml();
  assert.doesNotMatch(html, /Nothing is sent yet/);
  assert.match(html, /has no open items/);
  assert.equal(html.match(/class="bw-text"/g)?.length || 0, 0);
});

test("adding a rule to a connected account is titled for that and has no sign-in step", () => {
  const card = wizardCard();
  card._bwOpen();
  let html = card._bwHtml();
  assert.match(html, /<h2 id="sync-title">Add a sync rule<\/h2>/);
  assert.doesNotMatch(html, /bw-progress/);
  const fresh = wizardCard({ state: "none" });
  fresh._bwOpen();
  html = fresh._bwHtml();
  assert.match(html, /<h2 id="sync-title">Connect to Bring!<\/h2>/);
  assert.match(html, /bw-progress/);
});

test("a plain Bring! outage shows a neutral unreachable state, not the attention badge", () => {
  const run = { at: minutesAgo(1), outcome: "destination_unavailable", count: 0 };
  const card = wizardCard({ rules: [{ id: "r1", source_list_id: "l1", last_run: run }] });
  const html = card._bwAccountHtml(card._syncCaps());
  assert.match(html, /Unreachable/);
  assert.doesNotMatch(html, /Needs a look/);
  assert.match(html, /bw-account is-ok/);
  const failed = wizardCard({
    rules: [{ id: "r1", source_list_id: "l1", last_run: { ...run, outcome: "failed" } }],
  });
  assert.match(failed._bwAccountHtml(failed._syncCaps()), /Needs a look/);
});
