import assert from "node:assert/strict";
import test from "node:test";
import { bringWizardMethods } from "../src/components/bring-wizard.js";

// The sources are concatenated into one bundle, so these helpers are globals there.
globalThis.icon = () => "";
globalThis.esc = (value) => String(value ?? "");

function render(bring, again) {
  const host = {
    ...bringWizardMethods,
    _syncData: () => ({ bring }),
    _syncCaps: () => ({ bringEmail: "me@example.com", bringEnv: true }),
    t: (key) => key,
  };
  return host._bwLoginFormHtml({ again });
}
const input = (html, name) => html.match(new RegExp(`<input [^>]*name="${name}"[^>]*>`))[0];
const refused = { email: "", password: "x", error: "Wrong", errorKind: "credentials" };

test("a refused password marks only the password when the e-mail is locked", () => {
  const html = render(refused, true);
  const email = input(html, "username");
  assert.match(email, /readonly/);
  assert.doesNotMatch(email, /aria-invalid/);
  assert.doesNotMatch(email, /aria-describedby/);
  const password = input(html, "password");
  assert.match(password, /aria-invalid="true"/);
  assert.match(password, /aria-describedby="bw-login-error"/);
});

test("a refused login marks both fields when the e-mail is editable", () => {
  const html = render({ ...refused, email: "a@b.c" }, false);
  assert.match(input(html, "username"), /aria-invalid="true"/);
  assert.match(input(html, "password"), /aria-invalid="true"/);
});
