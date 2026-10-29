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
