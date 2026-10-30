// First run, sign-in gate, healthcheck and request hygiene of the primary app.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, ACCOUNTS, basicHeader } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, command } from "../lib/browser.mjs";

const state = browserSuite();

test("healthz answers without credentials for GET and HEAD and reveals nothing", async () => {
  const get = await fetch(`${baseUrl}/healthz`);
  assert.equal(get.status, 200);
  assert.deepEqual(await get.json(), { ok: true });
  const head = await fetch(`${baseUrl}/healthz`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal((await fetch(`${baseUrl}/healthz`, { method: "POST" })).status, 401);
});

test("browsers get a localized sign-in page and API clients get JSON 401", async () => {
  const de = await fetch(`${baseUrl}/`, {
    headers: { accept: "text/html", "accept-language": "de-DE" },
  });
  assert.equal(de.status, 401);
  assert.match(de.headers.get("www-authenticate"), /^Basic realm="Mealie Atelier"/);
  assert.match(await de.text(), /Anmeldung erforderlich/);
  const en = await fetch(`${baseUrl}/`, {
    headers: { accept: "text/html", "accept-language": "en-US" },
  });
  assert.match(await en.text(), /Sign-in required/);
  const api = await fetch(`${baseUrl}/api/health`);
  assert.equal(api.status, 401);
  assert.match(api.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await api.json(), { error: "Sign in to Mealie Atelier" });
});

test("a headless browser without credentials sees the sign-in page, not the app", async () => {
  const context = await openContext(state.browser, { who: null, locale: "en-US" });
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`);
    await page.getByText("Sign-in required").waitFor();
    assert.equal(await page.locator("mealie-atelier-card").count(), 0);
  } finally {
    await context.close();
  }
});

test("first run: a signed-in browser loads the dashboard with the seeded kitchen", async () => {
  const context = await openContext(state.browser, { who: "shared", locale: "de-DE" });
  try {
    const page = await openApp(context, baseUrl);
    await page.getByText("Zitronen-Nudeln").first().waitFor();
    assert.equal(await page.title(), "Mealie Atelier · Dein Küchenstudio");
    assert.deepEqual(page.problems, []);
    const status = await command(baseUrl, ACCOUNTS.shared, "status");
    assert.equal(status.status, 200);
    const entry = status.body.entries[0];
    assert.equal(entry.connected, true);
    assert.equal(entry.read_only, false);
    assert.equal(entry.features.shopping_sync, false);
    assert.equal(entry.ai_enabled, false);
  } finally {
    await context.close();
  }
});

test("a wrong password is refused with 401 and the correct one still signs in afterwards", async () => {
  const wrong = await fetch(`${baseUrl}/api/health`, {
    headers: { authorization: basicHeader({ name: "atelier", password: "not-the-password-0" }) },
  });
  assert.equal(wrong.status, 401);
  const right = await fetch(`${baseUrl}/api/health`, {
    headers: { authorization: basicHeader(ACCOUNTS.shared) },
  });
  assert.equal(right.status, 200);
  assert.equal((await right.json()).ok, true);
});

test("the bridge needs the CSRF header and unknown paths answer JSON 404", async () => {
  const noHeader = await fetch(`${baseUrl}/api/bridge`, {
    method: "POST",
    headers: { authorization: basicHeader(ACCOUNTS.shared), "content-type": "application/json" },
    body: JSON.stringify({ type: "mealie_atelier/status" }),
  });
  assert.equal(noHeader.status, 403);
  const missing = await fetch(`${baseUrl}/nope`, {
    headers: { authorization: basicHeader(ACCOUNTS.shared) },
  });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Not found" });
  const unknown = await command(baseUrl, ACCOUNTS.shared, "does_not_exist");
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, "invalid_request");
});

test("shared admin and per-person accounts can all sign in", async () => {
  for (const key of ["shared", "admin", "writer", "reader"]) {
    const response = await command(baseUrl, ACCOUNTS[key], "status");
    assert.equal(response.status, 200, key);
  }
});
