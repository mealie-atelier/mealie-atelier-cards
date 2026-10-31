import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const card = ({ state = "connected", readOnly = false, rules = [], bring = {} } = {}) => {
  const c = makeCard(loadCards());
  c._status = {
    entries: [
      {
        entry_id: "e1",
        features: { shopping_sync: true, bring_setup: true },
        permissions: {},
        read_only: readOnly,
        bring: { state, account: "cook@example.test", email: "cook@example.test" },
      },
    ],
  };
  c._config = { ...c._config, entry_id: "e1" };
  c._data = { shopping: { lists: [{ id: "l1", name: "Weekly" }] } };
  c._syncData().state = { rules, audit: [] };
  Object.assign(c._syncData().bring, bring);
  c._render = () => {};
  c._bwCanConnect = () => !readOnly;
  return c;
};

test("reauth shows the sign-in error exactly once", () => {
  const c = card({ state: "reauth", bring: { error: "Bring! is down", errorKind: "transient" } });
  const html = c._bwAccountHtml(c._syncCaps());
  assert.equal(html.match(/Bring! is down/g)?.length, 1);
});

test("the unreachable pill uses a warning icon and not the ok style", () => {
  const run = { at: new Date().toISOString(), outcome: "destination_unavailable", count: 0 };
  const down = card({ rules: [{ id: "r1", source_list_id: "l1", last_run: run }] });
  const html = down._bwAccountHtml(down._syncCaps());
  assert.match(html, /Unreachable/);
  assert.doesNotMatch(html, /is-ok/);
  assert.match(html, /bw-pill"><svg[^>]*><path d="m13 2-9 12/);
  const ok = card();
  assert.match(ok._bwAccountHtml(ok._syncCaps()), /bw-account is-ok/);
});

test("read-only mode does not promise a connection", () => {
  const ro = card({ state: "none", readOnly: true });
  const html = ro._syncBringHtml(ro._syncCaps());
  assert.doesNotMatch(html, /only after an administrator connects/);
  assert.match(html, /read-only|Read-only|read only/i);
  const rw = card({ state: "none" });
  assert.match(rw._syncBringHtml(rw._syncCaps()), /only after an administrator connects/);
});

test("a malformed e-mail is refused on the client and keeps the password", async () => {
  const c = card({ state: "none", bring: { email: "not-an-email", password: "secret" } });
  let sent = 0;
  c._ws = async () => {
    sent += 1;
  };
  await c._syncBringConnect();
  const bring = c._syncData().bring;
  assert.equal(sent, 0);
  assert.match(bring.error, /valid e-mail address/);
  assert.equal(bring.password, "secret");
});
