// PWA: manifest, icons, service worker, install help, and the opt-in offline shopping queue.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { baseUrl, ACCOUNTS, basicHeader, WEB_DIR } from "../lib/config.mjs";
import { browserSuite } from "../lib/suite.mjs";
import { openContext, openApp, gotoView } from "../lib/browser.mjs";
import { mealie, shoppingItems, uniqueName, eventually } from "../lib/mealie.mjs";

const state = browserSuite();
const authed = { authorization: basicHeader(ACCOUNTS.shared) };
const version = JSON.parse(readFileSync(join(WEB_DIR, "package.json"), "utf8")).version;
const leftovers = [];
after(async () => {
  for (const item of await shoppingItems())
    if (leftovers.includes(item.note))
      await mealie("DELETE", `/api/households/shopping/items/${item.id}`).catch(() => {});
});

test("the manifest describes an installable standalone app and every icon is served", async () => {
  const response = await fetch(`${baseUrl}/manifest.webmanifest`, { headers: authed });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/manifest\+json/);
  const manifest = await response.json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.short_name && manifest.name);
  const purposes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`).sort();
  assert.deepEqual(purposes, ["192x192:any", "512x512:any", "512x512:maskable"]);
  for (const path of [
    ...manifest.icons.map((icon) => icon.src),
    "/apple-touch-icon.png",
    "/favicon.svg",
    "/favicon.ico",
    "/favicon-32.png",
    "/badge-96.png",
    "/icon.svg",
    "/icon-maskable.svg",
  ]) {
    const icon = await fetch(`${baseUrl}${path}`, { headers: authed });
    assert.equal(icon.status, 200, path);
    assert.match(icon.headers.get("content-type"), /^image\//, path);
    assert.ok((await icon.arrayBuffer()).byteLength > 100, path);
  }
});

test("the service worker is registered, active and carries the package version in its cache name", async () => {
  const served = await fetch(`${baseUrl}/sw.js`, { headers: authed });
  assert.equal(served.status, 200);
  assert.match(served.headers.get("content-type"), /javascript/);
  const source = await served.text();
  assert.ok(
    source.includes(`mealie-atelier-shell-v${version}`),
    "cache name uses the package version",
  );
  assert.ok(!source.includes("__ATELIER_VERSION__"), "no placeholder is left");
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    const registration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return { scope: reg.scope, state: reg.active?.state, script: reg.active?.scriptURL };
    });
    assert.equal(registration.scope, `${baseUrl}/`);
    assert.equal(registration.script, `${baseUrl}/sw.js`);
    assert.equal(registration.state, "activated");
    const link = await page.locator('link[rel="manifest"]').getAttribute("href");
    assert.equal(link, "/manifest.webmanifest");
  } finally {
    await context.close();
  }
});

test("the service worker never caches API data or recipe photos", async () => {
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Enable the offline mode, the only feature that makes the worker cache the static shell.
    await page.locator("details.atelier-connectivity > summary").click();
    await page.locator("#a-sync-enable").click();
    await page.locator("dialog.at-premium-dialog button[value=confirm]").click();
    await eventually(
      () => page.evaluate(async () => (await window.AtelierOfflineCore.get("enabled")) === true),
      { label: "offline mode stored" },
    );
    // The worker fills its cache from the fetches of the next page load.
    await page.reload();
    await page.locator(".recipe-tile").first().waitFor();
    await eventually(
      () => page.evaluate(async () => !!(await caches.match("/mealie-atelier-cards.js"))),
      { label: "static shell cached" },
    );
    const cached = await page.evaluate(async () => {
      const urls = [];
      for (const key of await caches.keys())
        for (const request of await (await caches.open(key)).keys())
          urls.push(new URL(request.url).pathname);
      return { keys: await caches.keys(), urls };
    });
    assert.deepEqual(cached.keys, [`mealie-atelier-shell-v${version}`]);
    assert.ok(cached.urls.includes("/mealie-atelier-cards.js"));
    assert.ok(
      cached.urls.every((path) => !path.startsWith("/api/")),
      `cached: ${cached.urls}`,
    );
    // Turning the mode off removes the local copy again.
    await page.locator("details.atelier-connectivity > summary").click();
    await page.locator("#a-sync-enable").click();
    await page.locator("dialog.at-premium-dialog button[value=confirm]").click();
    await eventually(
      () =>
        page.evaluate(
          async () =>
            !(await caches.keys()).length ||
            (await (await caches.open((await caches.keys())[0])).keys()).length === 0,
        ),
      { label: "cache cleared" },
    );
  } finally {
    await context.close();
  }
});

test("offline shopping edits are queued while the network is down and replayed when it returns", async () => {
  const note = uniqueName("Offline-Brot");
  leftovers.push(note);
  const context = await openContext(state.browser);
  try {
    const page = await openApp(context, baseUrl);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.locator("details.atelier-connectivity > summary").click();
    await page.locator("#a-sync-enable").click();
    await page.locator("dialog.at-premium-dialog button[value=confirm]").click();
    await gotoView(page, "Einkaufsliste");
    await page.locator("h1", { hasText: "Alles für den Einkauf" }).waitFor();
    await page.locator('[data-action="shopping-toggle"]').first().waitFor();
    // Let the first snapshot reach local storage before the connection drops.
    await eventually(
      () => page.evaluate(async () => !!(await window.AtelierOfflineCore.get("snapshot"))),
      { label: "local snapshot" },
    );
    await context.setOffline(true);
    await page.waitForFunction(() => !navigator.onLine);
    await page.locator("#a-sync-summary", { hasText: /Offline|offline/ }).waitFor();
    await page.locator('input[name="note"]').fill(note);
    await page.locator('input[name="note"]').press("Enter");
    await page.locator(".shopping-name", { hasText: note }).waitFor();
    assert.ok(
      !(await shoppingItems()).some((item) => item.note === note),
      "nothing reached Mealie while offline",
    );
    await eventually(
      () => page.evaluate(async () => (await window.AtelierOfflineCore.allOps()).length > 0),
      { label: "queued operation" },
    );
    await context.setOffline(false);
    await eventually(async () => (await shoppingItems()).some((item) => item.note === note), {
      timeout: 30000,
      label: "queued item replayed to Mealie",
    });
    await eventually(
      () =>
        page.evaluate(async () =>
          (await window.AtelierOfflineCore.allOps()).every(
            (op) => !["pending", "sending"].includes(op.state),
          ),
        ),
      { label: "queue drained" },
    );
    await page.locator("#a-sync-enable").click();
    await page.locator("dialog.at-premium-dialog button[value=confirm]").click();
  } finally {
    await context.close();
  }
});

test("the install help opens with Add to Home Screen steps on an iPhone", async () => {
  const context = await openContext(state.browser, {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await openApp(context, baseUrl);
    const trigger = page.locator("#pwa-install-trigger");
    await trigger.waitFor({ state: "visible" });
    assert.match(await trigger.innerText(), /App installieren/);
    await trigger.click();
    const dialog = page.locator("#pwa-install-dialog");
    await dialog.waitFor({ state: "visible" });
    assert.match(await dialog.innerText(), /Home-Bildschirm/);
    await page.locator("#pwa-install-dialog [data-install-later]").click();
    await dialog.waitFor({ state: "hidden" });
  } finally {
    await context.close();
  }
});
