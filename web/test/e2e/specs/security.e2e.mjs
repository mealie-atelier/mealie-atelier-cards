// Security headers, CSP in a real browser, and refused startup configurations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { baseUrl, ACCOUNTS, basicHeader } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp } from "../lib/browser.mjs";

const state = browserSuite();
const authed = { authorization: basicHeader(ACCOUNTS.shared) };

test("every response carries the hardening headers", async () => {
  for (const path of ["/", "/api/health", "/manifest.webmanifest", "/nope"]) {
    const response = await fetch(`${baseUrl}${path}`, { headers: authed });
    const csp = response.headers.get("content-security-policy");
    assert.match(csp, /default-src 'self'/, path);
    assert.match(csp, /script-src 'self' 'unsafe-hashes' 'sha256-/, path);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/, path);
    assert.match(csp, /frame-ancestors 'none'/, path);
    assert.match(csp, /object-src 'none'/, path);
    assert.match(response.headers.get("permissions-policy"), /camera=\(\)/, path);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer", path);
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin", path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    assert.equal(response.headers.get("x-frame-options"), "DENY", path);
  }
  const index = await fetch(`${baseUrl}/`, { headers: authed });
  assert.equal(index.headers.get("cache-control"), "private, max-age=3600");
  const api = await fetch(`${baseUrl}/api/health`, { headers: authed });
  assert.equal(api.headers.get("cache-control"), "no-store");
});

test("the CSP blocks inline script injection and the app still runs under it", async () => {
  const context = await openContext(state.browser, { who: "shared" });
  try {
    const page = await openApp(context, baseUrl);
    // The browser reports a blocked script through an event; wait for that event, not for time.
    const outcome = await page.evaluate(
      () =>
        new Promise((resolve) => {
          document.addEventListener(
            "securitypolicyviolation",
            (e) => resolve({ directive: e.violatedDirective, injected: window.__injected }),
            { once: true },
          );
          window.__injected = false;
          const script = document.createElement("script");
          script.textContent = "window.__injected = true";
          document.body.append(script);
        }),
    );
    assert.equal(outcome.injected, false, "the injected script never ran");
    assert.match(outcome.directive, /^script-src/);
    // A reachable listener on another origin: without the CSP the request would arrive and resolve.
    let hits = 0;
    const outside = createServer((req, res) => {
      hits += 1;
      res.setHeader("access-control-allow-origin", "*");
      res.end("reachable");
    });
    await new Promise((resolve) => outside.listen(0, "127.0.0.1", resolve));
    try {
      const target = `http://localhost:${outside.address().port}/`;
      assert.equal(
        await (await fetch(target)).text(),
        "reachable",
        "the control listener is reachable",
      );
      hits = 0;
      const external = await page.evaluate(
        (url) =>
          new Promise((resolve) => {
            document.addEventListener(
              "securitypolicyviolation",
              (e) => resolve({ directive: e.violatedDirective, outcome: "blocked" }),
              { once: true },
            );
            fetch(url, { mode: "no-cors" }).then(
              () => resolve({ outcome: "allowed" }),
              () => {},
            );
          }),
        target,
      );
      assert.equal(external.outcome, "blocked");
      assert.match(external.directive, /^(connect-src|default-src)/);
      assert.equal(hits, 0, "the outbound request never left the browser");
    } finally {
      await new Promise((resolve) => outside.close(resolve));
    }
    assert.deepEqual(
      page.problems.filter((p) => !/Content Security Policy|Failed to load resource/.test(p)),
      [],
    );
  } finally {
    await context.close();
  }
});

test("the app never embeds the Mealie token or the shared password in served files", async () => {
  const { mealieToken } = await import("../lib/config.mjs");
  for (const path of ["/", "/mealie-atelier-cards.js", "/offline-client.js", "/sw.js"]) {
    const text = await (await fetch(`${baseUrl}${path}`, { headers: authed })).text();
    assert.ok(!text.includes(mealieToken), path);
    assert.ok(!text.includes(ACCOUNTS.shared.password), path);
  }
  const status = JSON.stringify(
    await (
      await fetch(`${baseUrl}/api/bridge`, {
        method: "POST",
        headers: { ...authed, "content-type": "application/json", "x-atelier-request": "1" },
        body: JSON.stringify({ type: "mealie_atelier/status" }),
      })
    ).json(),
  );
  assert.ok(!status.includes(mealieToken));
});

test("recipe asset proxy rejects invalid paths", async () => {
  const response = await fetch(`${baseUrl}/api/recipe-asset/only-one-segment`, {
    headers: authed,
  });
  assert.equal(response.status, 400);
  const image = await fetch(`${baseUrl}/api/image/${"x".repeat(200)}`, { headers: authed });
  assert.equal(image.status, 400);
});
