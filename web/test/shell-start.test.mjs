import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inlineTouchIcon, staticCacheControl } from "../security.mjs";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const AsyncFunction = (async () => {}).constructor;

const shellScript = () => {
  const body = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  return body
    .replace(
      'import { initPwaInstall } from "/pwa-install.js";',
      'const { initPwaInstall } = await load("/pwa-install.js");',
    )
    .replace(/\bimport\("/g, 'load("');
};

/** Runs the real startup script of index.html against stubbed browser objects. */
function startShell({ offlineModule, register, initPwaInstall = () => ({ refresh() {} }) }) {
  const calls = [];
  const card = {
    _design: { theme: "auto", motion: "expressive" },
    _language: "de",
    _resolvedTheme: () => "dark",
    _render() {},
    setConfig() {},
    addEventListener() {},
  };
  const media = { addEventListener() {} };
  const document = {
    title: "",
    documentElement: { dataset: {}, style: {} },
    getElementById: () => null,
    querySelector: (selector) =>
      selector === "mealie-atelier-card" ? card : { setAttribute() {} },
  };
  const window = { matchMedia: () => media, addEventListener() {} };
  const navigator = {
    language: "de",
    onLine: true,
    serviceWorker: { register, addEventListener() {} },
  };
  const load = async (path) => {
    if (path === "/pwa-install.js") return { initPwaInstall };
    if (path === "/offline-client.js") return offlineModule();
    return {};
  };
  const fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ fromBridge: true }) };
  };
  const run = new AsyncFunction(
    "load",
    "document",
    "window",
    "navigator",
    "self",
    "fetch",
    shellScript(),
  );
  return { card, calls, done: run(load, document, window, navigator, {}, fetch) };
}

const healthyModule = (overrides = {}) => ({
  AtelierOfflineClient: class {
    enabled = false;
    async init() {
      return this;
    }
    getShopping(next) {
      return next();
    }
  },
  AtelierAlarmClient: class {
    async init() {
      return this;
    }
    async refresh() {}
  },
  attachOfflineUi() {},
  reloadAfterReconnect: async () => {},
  OFFLINE_ACTIONS: [],
  ...overrides,
});
const never = () => new Promise(() => {});
const registered = async () => ({ active: null });

const opensTheKitchen = async ({ card, calls }) => {
  for (let waited = 0; !card.hass && waited < 12000; waited += 50)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(card.hass?.atelierOfflineHost, true, "the card must get its web app host");
  assert.deepEqual(await card.hass.callWS({ type: "mealie_atelier/status" }), { fromBridge: true });
  assert.deepEqual(calls, ["/api/bridge"]);
};

test("the web app starts when everything optional works", async () => {
  await opensTheKitchen(
    startShell({ offlineModule: async () => healthyModule(), register: registered }),
  );
});

for (const [name, initPwaInstall] of [
  ["answers without refresh, as the installed home screen app did", () => ({ dispose() {} })],
  [
    "throws on refresh",
    () => ({
      refresh() {
        throw Error("no storage");
      },
    }),
  ],
  [
    "throws while starting",
    () => {
      throw Error("no dialog");
    },
  ],
]) {
  test(`the web app starts when the install prompt ${name}`, async () => {
    await opensTheKitchen(
      startShell({
        offlineModule: async () => healthyModule(),
        register: registered,
        initPwaInstall,
      }),
    );
  });
}

test("the web app starts when the offline module cannot load", async () => {
  await opensTheKitchen(
    startShell({
      offlineModule: async () => {
        throw Error("blocked");
      },
      register: registered,
    }),
  );
});

test("the web app starts when offline storage hangs", async () => {
  await opensTheKitchen(
    startShell({
      offlineModule: async () =>
        healthyModule({
          AtelierOfflineClient: class {
            init = never;
          },
        }),
      register: registered,
    }),
  );
});

test("the web app starts when the alarm check throws", async () => {
  await opensTheKitchen(
    startShell({
      offlineModule: async () =>
        healthyModule({
          AtelierAlarmClient: class {
            async init() {
              throw Error("no storage");
            }
          },
        }),
      register: registered,
    }),
  );
});

test("the web app starts when the service worker registration never settles", async () => {
  await opensTheKitchen(
    startShell({ offlineModule: async () => healthyModule(), register: never }),
  );
});

test("the shell marks the card as web app before any host object exists", () => {
  assert.match(html, /<mealie-atelier-card data-web-app>/);
});

test("the home screen icon travels inside the page", async () => {
  const png = await readFile(new URL("../public/apple-touch-icon.png", import.meta.url));
  const page = inlineTouchIcon(html, png);
  const href = page.match(/<link\s+rel="apple-touch-icon"[^>]*\shref="([^"]*)"/)[1];
  assert.match(href, /^data:image\/png;base64,/);
  assert.deepEqual(Buffer.from(href.split(",")[1], "base64"), png);
  assert.match(page, /sizes="180x180"/);
  assert.equal(page.includes('href="/apple-touch-icon.png"'), false);
  assert.equal(page.length - html.length < png.length * 1.4, true, "only the icon link changes");
});

test("a home screen app never keeps a stale shell, only the versioned bundle and images stay cached", () => {
  for (const file of ["index.html", "pwa-install.js", "offline-client.js", "sw.js", "shell.css"])
    assert.equal(staticCacheControl(file), "no-cache", file);
  assert.equal(staticCacheControl("manifest.webmanifest"), "no-cache");
  for (const file of ["mealie-atelier-cards.js", "apple-touch-icon.png", "favicon.ico"])
    assert.equal(staticCacheControl(file), "private, max-age=3600", file);
});
