import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// The published showcase images themselves: sizes, formats and presence. How they are captured is not part of
// this repository; these checks only look at the files the product page ships.
const root = new URL("../", import.meta.url);
const dir = new URL("demo/showcase/", root);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));

test("hero images stay within their byte budget and are lossy WebP at the size the manifest lists", () => {
  const budget = {
    "hero-tablet-cook": { 800: 52, 1200: 100, 1600: 163 },
    "hero-phone-shopping": { 400: 24, 700: 40, 1179: 70 },
  };
  for (const locale of ["de", "en"]) {
    for (const name of Object.keys(budget)) {
      const entry = manifest[locale][name];
      assert.deepEqual(
        entry.widths.map(String),
        Object.keys(budget[name]),
        `${locale}/${name} widths`,
      );
      for (const width of entry.widths) {
        const file = readFileSync(new URL(`${locale}/${name}-${width}.webp`, dir));
        assert.ok(
          file.length <= budget[name][width] * 1000,
          `${locale}/${name}-${width} is ${file.length} bytes`,
        );
        if (width === entry.widths.at(-1)) {
          // Lossy WebP: "VP8 " chunk, frame header after 3 tag bytes, 14 bit width and height.
          assert.equal(file.toString("latin1", 12, 16), "VP8 ");
          const w = file.readUInt16LE(26) & 0x3fff;
          const h = file.readUInt16LE(28) & 0x3fff;
          assert.equal(w, width, `${locale}/${name} width`);
          // The manifest holds the size of the full capture, the file keeps its aspect ratio.
          assert.ok(
            Math.abs(h / w - entry.height / entry.width) < 0.002,
            `${locale}/${name} aspect`,
          );
        }
      }
    }
  }
});

test("the showcase images with a visible version exist in both languages and sizes and are listed in the manifest", () => {
  for (const name of ["app-desktop-mealplan", "app-desktop-shopping", "ha-integration"]) {
    for (const locale of ["de", "en"]) {
      const entry = manifest[locale]?.[name];
      assert.ok(entry, `${locale}/${name} is missing in demo/showcase/manifest.json`);
      for (const width of entry.widths) {
        assert.ok(
          existsSync(new URL(`${locale}/${name}-${width}.webp`, dir)),
          `${locale}/${name}-${width}.webp`,
        );
        assert.ok(
          existsSync(new URL(`demo/public-site/showcase/${locale}/${name}-${width}.webp`, root)) ||
            !existsSync(new URL("demo/public-site/", root)),
          `${locale}/${name}-${width}.webp is missing in the generated demo/public-site (run npm run build:demo)`,
        );
      }
    }
  }
});

test("the week plan feature shot is listed at its full 1600 px width in both languages", () => {
  for (const locale of ["de", "en"]) {
    const entry = manifest[locale]["feature-mealplan"];
    assert.equal(entry.width, 1600, `${locale} feature-mealplan width`);
    assert.ok(entry.height > 0, `${locale} feature-mealplan height`);
  }
});
