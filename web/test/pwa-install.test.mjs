import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getInstallContext, getInstallCopy, initPwaInstall } from "../public/pwa-install.js";

test("PWA install context recognizes iPhone, iPadOS and installed mode", () => {
  assert.equal(
    getInstallContext({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })
      .isAppleMobile,
    true,
  );
  assert.equal(getInstallContext({ platform: "MacIntel", maxTouchPoints: 5 }).isAppleMobile, true);
  assert.equal(getInstallContext({}, { matchMedia: () => ({ matches: true }) }).isStandalone, true);
});

test("install guidance is localized and uses the iOS share-sheet path", () => {
  const iosCopy = getInstallCopy("de-DE", { isIOSBrowserWithoutPrompt: true });
  assert.match(iosCopy.steps[0], /Safari/);
  assert.match(iosCopy.steps[1], /Teilen/);
  assert.match(getInstallCopy("en-US", {}).title, /kitchen studio/i);
});

test("web manifest includes installable and maskable raster icons", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/manifest.webmanifest", import.meta.url)),
  );
  const pngIcons = manifest.icons.filter((icon) => icon.type === "image/png");
  assert.ok(pngIcons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(pngIcons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  for (const icon of pngIcons) {
    const bytes = await readFile(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), Number.parseInt(icon.sizes, 10));
  }

  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /rel="manifest"[^>]+crossorigin="use-credentials"/);
  assert.match(html, /pwa-install\.js/);
  assert.match(html, /mealie-atelier-theme-change/);
  assert.match(html, /mealie-atelier-motion-change/);
  assert.match(html, /mealie-atelier-language-change/);
  assert.match(html, /syncShellTheme\(card\._design\.theme\)/);
  assert.match(html, /syncShellLanguage\(card\._language\)/);
  assert.match(html, /id="foot-copy"/);
  assert.match(html, /getElementById\("foot-copy"\)/);
  assert.match(html, /PRIVATES KÜCHENSTUDIO/);
  const install = await readFile(new URL("../public/pwa-install.js", import.meta.url), "utf8");
  assert.match(install, /refresh\(nextLanguage = language\)/);
  const styles = await readFile(new URL("../public/pwa-install.css", import.meta.url), "utf8");
  assert.match(styles, /@starting-style/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("every icon path in the manifest and index.html exists and is served by server.mjs", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/manifest.webmanifest", import.meta.url)),
  );
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const server = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const linked = [...html.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g)].map(
    (m) => m[0].match(/href="([^"]+)"/)[1],
  );
  assert.ok(linked.length >= 3);
  const paths = new Set([...manifest.icons.map((icon) => icon.src), ...linked]);
  for (const path of paths) {
    await readFile(new URL(`../public${path}`, import.meta.url));
    assert.ok(server.includes(`"${path}": [`), `server.mjs does not serve ${path}`);
  }
  for (const entry of sw.match(/new Set\(\[([\s\S]*?)\]\)/)[1].match(/"\/[^"]*"/g)) {
    const path = JSON.parse(entry);
    if (path === "/") continue;
    assert.ok(server.includes(`"${path}": [`), `server.mjs does not serve ${path}`);
  }
  // The shell paints #101613 first (dark default), so theme and splash colour match it.
  const css = await readFile(new URL("../public/shell.css", import.meta.url), "utf8");
  const dark = css.match(/--shell-page:\s*(#[0-9a-f]{6})/i)[1];
  assert.equal(dark.toLowerCase(), "#101613");
  assert.equal(manifest.background_color.toLowerCase(), dark.toLowerCase());
  assert.equal(manifest.theme_color.toLowerCase(), dark.toLowerCase());
  assert.match(html, new RegExp(`<meta name="theme-color" content="${dark}"`, "i"));
  assert.match(html, new RegExp(`normalizedTheme === "light" \\? "#f4f1eb" : "${dark}"`, "i"));
  assert.match(html, /href="\/favicon\.ico"[^>]*sizes="16x16 32x32 48x48"/);
  assert.doesNotMatch(html, /<title>[^<]*[—–]/);
  assert.doesNotMatch(JSON.stringify(manifest) + html, /#302632/i);
  assert.doesNotMatch(manifest.name, /[—–]/);
});

test("the notification badge is a monochrome 96 px PNG that is served and precached", async () => {
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const server = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  assert.match(sw, /badge: "\/badge-96\.png"/);
  assert.ok(sw.match(/new Set\(\[([\s\S]*?)\]\)/)[1].includes('"/badge-96.png"'));
  assert.ok(server.includes('"/badge-96.png": ["badge-96.png", "image/png"]'));
  const png = await readFile(new URL("../public/badge-96.png", import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
  assert.equal(png[25], 6, "RGBA colour type, so Android can use the alpha channel");
});

test("install dialog localizes the later button, avoids the outdated iOS claim and em dashes", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /data-install-later/);
  const install = await readFile(new URL("../public/pwa-install.js", import.meta.url), "utf8");
  assert.match(install, /later: dialog\.querySelector\("\[data-install-later\]"\)/);
  for (const language of ["de", "en"]) {
    const copy = getInstallCopy(language, { isIOSBrowserWithoutPrompt: true });
    assert.doesNotMatch(copy.steps[0], /meist nicht|usually cannot/);
    assert.match(copy.steps[0], /16\.4/);
  }
  const manifest = await readFile(
    new URL("../public/manifest.webmanifest", import.meta.url),
    "utf8",
  );
  for (const text of [html, manifest]) assert.doesNotMatch(text, /[\u2013\u2014]|\\u2014/);
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.theme_color, "#101613");
  assert.equal(parsed.background_color, "#101613");
  const icon = await readFile(new URL("../public/icon.svg", import.meta.url));
  assert.ok(icon.length < 20000, "favicon stays small");
  assert.doesNotMatch(html, /beautiful recipes/);
  const css = await readFile(new URL("../public/pwa-install.css", import.meta.url), "utf8");
  assert.match(css, /min-height: 44px/);
});

test("iOS install steps do not tell the user to tap Share twice", () => {
  for (const language of ["de", "en"]) {
    const [first, second] = getInstallCopy(language, { isIOSBrowserWithoutPrompt: true }).steps;
    assert.doesNotMatch(first, /Teilen|Share/);
    assert.match(second, /Teilen|Share/);
  }
});

test("rendering the install dialog fills the localized later button", () => {
  const node = () => ({
    textContent: "",
    hidden: false,
    attrs: {},
    setAttribute(key, value) {
      this.attrs[key] = value;
    },
    hasAttribute(key) {
      return Boolean(this.flags?.includes(key));
    },
    addEventListener() {},
    replaceChildren() {},
  });
  const later = node();
  later.flags = ["data-install-close", "data-install-later"];
  const closeIcon = node();
  closeIcon.flags = ["data-install-close"];
  const trigger = { ...node(), querySelector: () => node() };
  const dialog = {
    ...node(),
    showModal() {},
    querySelector: (selector) => (selector === "[data-install-later]" ? later : node()),
    querySelectorAll: (selector) => (selector === "[data-install-close]" ? [closeIcon, later] : []),
  };
  const documentRef = {
    querySelector: (selector) => (selector === "#pwa-install-trigger" ? trigger : dialog),
    createElement: node,
    documentElement: { lang: "de" },
  };
  const windowRef = { addEventListener() {}, removeEventListener() {} };
  const handle = initPwaInstall({
    documentRef,
    navigatorRef: { language: "en-US", userAgent: "" },
    windowRef,
  });
  assert.equal(later.textContent, "Later");
  handle.refresh("de");
  assert.equal(later.textContent, "Später");
  assert.equal(closeIcon.attrs["aria-label"], "Schließen");
  assert.equal(later.attrs["aria-label"], undefined);
});

test("the shell follows the live system colour scheme, including the theme colour", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /theme: "auto"/, "the shell starts in automatic theme mode");
  assert.match(
    html,
    /matchMedia\("\(prefers-color-scheme: light\)"\)\.addEventListener\("change", \(\) => \{\s*if \(card\._design\.theme !== "auto"\) return;\s*syncShellTheme\("auto"\);\s*card\._render\(\);/,
  );
  // The first paint already follows the saved choice or the system scheme.
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /<script>[\s\S]*prefers-color-scheme: light[\s\S]*"#f4f1eb"/);
});
