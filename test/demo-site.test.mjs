import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("each demo page is pinned to its own language", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: "" },
      stdio: "pipe",
    });
    for (const locale of ["de", "en"]) {
      const html = readFileSync(join(out, locale, "index.html"), "utf8");
      assert.match(html, new RegExp(`const demoLanguage = "${locale}";`));
      assert.match(html, new RegExp(`<html lang="${locale}">`));
      assert.doesNotMatch(html, /URLSearchParams\(window\.location\.search\)\.get\("lang"\)/);
      assert.doesNotMatch(html, /rel="canonical" href=""/);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

const ctaLinks = [
  "https://github.com/mealie-atelier/mealie-atelier-cards",
  "https://github.com/mealie-atelier/mealie-atelier-bridge",
  "https://alles-automatisch.de/lernen/mealie-atelier",
  "https://alles-automatisch.de/lernen/mealie-atelier-einrichten",
  "https://www.youtube.com/@alles-automatisch/join",
  "https://ko-fi.com/allesautomatisch",
];
const baseUrl = "https://mealie.example.test/";

function listHtml(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listHtml(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

test("live demo pages carry the call to action, social tags and JSON-LD", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: baseUrl },
      stdio: "pipe",
    });
    for (const locale of ["de", "en"]) {
      const html = readFileSync(join(out, locale, "index.html"), "utf8");
      const section = html.match(/<section class="demo-cta"[\s\S]*?<\/section>/)?.[0] ?? "";
      for (const link of ctaLinks) {
        assert.ok(section.includes(`href="${link}"`), `${locale} CTA is missing ${link}`);
      }
      assert.match(section, /<a [^>]*target="_blank" rel="noopener noreferrer"/);
      assert.match(html, /<meta name="description" content="[^"]{40,}"/);
      assert.match(html, /<meta property="og:title" content="[^"]+"/);
      assert.match(html, /<meta property="og:description" content="[^"]+"/);
      assert.ok(
        html.includes(`<meta property="og:image" content="${baseUrl}photos/`),
        `${locale} og:image must be absolute and self-hosted`,
      );
      assert.ok(html.includes(`<meta property="og:url" content="${baseUrl}${locale}/"`));
      assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];
      const app = blocks
        .map((block) => JSON.parse(block[1]))
        .find((d) => d["@type"] === "SoftwareApplication");
      assert.ok(app, `${locale} is missing SoftwareApplication JSON-LD`);
      assert.equal(app.name, "Mealie Atelier");
      assert.equal(app.applicationCategory, "LifestyleApplication");
      assert.equal(app.operatingSystem, "Home Assistant, Web");
      assert.equal(app.offers.price, "0");
      assert.equal(app.offers.priceCurrency, "EUR");
      assert.equal(app.url, `${baseUrl}${locale}/`);
      assert.equal(app.author.name, "Daniel Boberg");
      assert.equal(app.author.url, "https://alles-automatisch.de");
    }
    const root = readFileSync(join(out, "index.html"), "utf8");
    assert.match(root, /<meta name="description" content="[^"]{40,}"/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("every page has footer links and no page references Unsplash image hosting", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: "" },
      stdio: "pipe",
    });
    const pages = listHtml(out);
    assert.equal(pages.length, 23);
    for (const page of pages) {
      const html = readFileSync(page, "utf8");
      assert.doesNotMatch(html, /images\.unsplash\.com/, page);
      if (page === join(out, "index.html")) continue;
      const footer = html.match(/<footer class="demo-footer">[\s\S]*?<\/footer>/)?.[0] ?? "";
      for (const link of [ctaLinks[0], ctaLinks[2], ctaLinks[4], ctaLinks[5]]) {
        assert.ok(footer.includes(`href="${link}"`), `${page} footer lacks ${link}`);
      }
      // External links always open in a new tab; links inside the demo stay in place.
      for (const anchor of html.match(/<a [^>]*href="https?:[^"]*"[^>]*>/g) ?? []) {
        if (anchor.includes(baseUrl)) continue;
        assert.match(anchor, /target="_blank"/, `${page}: ${anchor}`);
        assert.match(anchor, /rel="[^"]*noopener/, `${page}: ${anchor}`);
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("footer follows the page locale, carries no photo credit and every photo is credited", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: baseUrl },
      stdio: "pipe",
    });
    const expected = { de: "Mit Liebe gemacht von", en: "Made with love by" };
    for (const page of listHtml(out)) {
      if (page === join(out, "index.html")) continue;
      const html = readFileSync(page, "utf8");
      const locale = html.match(/<html lang="(de|en)">/)[1];
      const footer = html.match(/<footer class="demo-footer">[\s\S]*?<\/footer>/)?.[0] ?? "";
      assert.ok(footer.includes(expected[locale]), `${page} footer language`);
      if (locale === "de") assert.ok(!footer.includes("Made with love"), page);
      assert.doesNotMatch(footer, /Unsplash|Foto/i, `${page} footer must not carry photo credits`);
      assert.match(html, /<meta name="color-scheme" content="dark"/, page);
    }
    for (const locale of ["de", "en"]) {
      const html = readFileSync(join(out, locale, "index.html"), "utf8");
      const credits = html.match(/class="demo-credit"/g) ?? [];
      assert.equal(credits.length, 10, `${locale} catalog credits every photo`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("recipe pages use h3 step titles and carry social and hreflang tags", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: baseUrl },
      stdio: "pipe",
    });
    const pages = listHtml(out).filter((page) =>
      /seo-recipe-body/.test(readFileSync(page, "utf8")),
    );
    assert.equal(pages.length, 20);
    for (const page of pages) {
      const html = readFileSync(page, "utf8");
      const list = html.match(/<ol class="seo-instruction-list">[\s\S]*?<\/ol>/)[0];
      assert.doesNotMatch(list, /<h2/, page);
      assert.match(list, /<h3>1\. /, page);
      assert.equal((html.match(/<h2>/g) ?? []).length, 2, `${page} keeps two h2 sections`);
      assert.match(html, /<meta property="og:site_name" content="Mealie Atelier">/, page);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, page);
      assert.match(html, /<meta name="twitter:title" content="[^"]+">/, page);
      assert.match(html, /<meta name="twitter:description" content="[^"]+">/, page);
      assert.match(
        html,
        /<meta name="twitter:image" content="https:\/\/mealie\.example\.test\/photos\//,
        page,
      );
      const dePath = html.match(/hreflang="de" href="([^"]+)"/)[1];
      assert.ok(html.includes(`hreflang="x-default" href="${dePath}"`), `${page} x-default`);
      assert.match(html, /<link rel="canonical" href="https:\/\/mealie\.example\.test\//, page);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("catalog thumbnails load eagerly so no tile stays empty in captures", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: "" },
      stdio: "pipe",
    });
    const html = readFileSync(join(out, "de", "index.html"), "utf8");
    const thumbs = html.match(/<summary><img [^>]*>/g) ?? [];
    assert.equal(thumbs.length, 10);
    for (const thumb of thumbs) assert.doesNotMatch(thumb, /loading="lazy"/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
