import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getInstallContext, getInstallCopy } from "../public/pwa-install.js";

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
  assert.equal(manifest.background_color, "#14201A");
  assert.equal(manifest.theme_color, "#14201A");
  assert.doesNotMatch(JSON.stringify(manifest) + html, /#302632/i);
  assert.doesNotMatch(manifest.name, /[—–]/);
});
