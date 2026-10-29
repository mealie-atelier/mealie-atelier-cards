import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { sectionIds } from "../demo/site/chrome.mjs";

const baseUrl = "https://mealie.example.test/";
const links = {
  cards: "https://github.com/mealie-atelier/mealie-atelier-cards",
  bridge: "https://github.com/mealie-atelier/mealie-atelier-bridge",
  guide: "https://alles-automatisch.de/lernen/mealie-atelier",
  setup: "https://alles-automatisch.de/lernen/mealie-atelier-einrichten",
  youtube: "https://www.youtube.com/@alles-automatisch/join",
  kofi: "https://ko-fi.com/allesautomatisch",
};

// Two builds: one relative (as served locally) and one with a deployment base URL.
const builds = {};
function generate(base) {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  execFileSync("node", ["scripts/generate-demo-site.mjs"], {
    env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: base },
    stdio: "pipe",
  });
  return out;
}
before(() => {
  builds.local = generate("");
  builds.deployed = generate(baseUrl);
});
after(() => {
  for (const out of Object.values(builds)) rmSync(out, { recursive: true, force: true });
});

function listFiles(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(path, extension);
    return entry.name.endsWith(extension) ? [path] : [];
  });
}
const read = (path) => readFileSync(path, "utf8");
const landing = (out, locale) => read(join(out, locale, "index.html"));
const contentPages = (out) => listFiles(out, ".html").filter((p) => p !== join(out, "index.html"));
const footerOf = (html) => html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0] ?? "";

test("each demo page is pinned to its own language", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    assert.match(html, new RegExp(`const demoLanguage = "${locale}";`));
    assert.match(html, new RegExp(`<html lang="${locale}">`));
    assert.doesNotMatch(html, /URLSearchParams\(window\.location\.search\)\.get\("lang"\)/);
    assert.doesNotMatch(html, /rel="canonical" href=""/);
  }
});

test("both landing pages carry every product section and the live card", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    for (const id of Object.values(sectionIds[locale])) {
      assert.ok(html.includes(`id="${id}"`), `${locale} is missing section #${id}`);
    }
    assert.equal((html.match(/<mealie-atelier-card>/g) ?? []).length, 1, locale);
    const demo = html.slice(html.indexOf(`id="${sectionIds[locale].demo}"`));
    assert.ok(
      demo.indexOf("<mealie-atelier-card>") < demo.indexOf("</section>"),
      `${locale} live card sits inside the live demo section`,
    );
    assert.match(html, /<div class="ba [^"]*" data-ba/, `${locale} before/after slider`);
    assert.match(html, /<input type="range" min="0" max="100"[^>]*aria-label="[^"]+"/, locale);
    assert.match(html, /<script type="module" src="\.\.\/assets\/site\.js"><\/script>/, locale);
  }
});

test("landing pages state the install route and setup facts correctly", () => {
  const de = landing(builds.local, "de");
  const en = landing(builds.local, "en");
  assert.match(de, /über HACS als benutzerdefiniertes Repository/);
  assert.match(en, /through HACS as a custom repository/);
  for (const html of [de, en]) {
    assert.match(html, /ATELIER_PASSWORD=/);
    assert.match(html, /MEALIE_API_TOKEN=/);
    assert.match(html, /docker compose up -d --build/);
    assert.match(html, /OpenAI/);
    assert.match(html, /Anthropic/);
    assert.doesNotMatch(html, /lernen\/mealie-atelier-ohne-home-assistant/);
    // The listing is submitted, not merged, so nothing may promise it is live today.
    assert.doesNotMatch(html, /jetzt im Marketplace|now in the Marketplace/i);
  }
  // The language feature tile must not talk about colour themes.
  for (const [html, word] of [
    [de, /hell|dunkel/i],
    [en, /light|dark/i],
  ]) {
    const tile = html.match(
      /<article class="tile[^"]*"><span class="ico">.{0,200}?#i-globe[\s\S]*?<\/article>/,
    )?.[0];
    assert.ok(tile, "language tile present");
    assert.doesNotMatch(tile, word);
  }
});

test("the timer notification mockup shows the text the Bridge really sends", () => {
  // mealie-atelier-bridge alarms.py sends this German title and "<label> ist fertig!" only.
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const mockup = html.match(/<div class="notif-phone"[\s\S]*?<\/article>/)?.[0] ?? "";
    assert.match(mockup, /lang="de"/, locale);
    assert.equal(mockup.match(/Mealie Atelier · Küchentimer/g)?.length, 3, locale);
    assert.match(mockup, /Tomatensauce ist fertig!/, locale);
  }
  const en = landing(builds.local, "en");
  assert.doesNotMatch(en, /kitchen timer<\/b>|is done!/);
  assert.match(
    en,
    /<p class="notif-note">The Bridge sends this notification in German for now\.<\/p>/,
  );
  assert.doesNotMatch(landing(builds.local, "de"), /notif-note/);
});

test("English pages do not call the Cards or the Bridge an add-on", () => {
  // In Home Assistant an add-on is a Supervisor app; the Cards are a dashboard resource and the
  // Bridge is an integration.
  for (const page of contentPages(builds.local)) {
    const html = read(page);
    if (!html.includes('<html lang="en">')) continue;
    assert.doesNotMatch(html.replace(/<script[\s\S]*?<\/script>/g, ""), /add-on/i, page);
  }
});

test("English footers group the German-only guides under one note", () => {
  let english = 0;
  for (const page of contentPages(builds.local)) {
    const html = read(page);
    const footer = footerOf(html);
    assert.doesNotMatch(footer, /\(DE\)/, page);
    // Each external arrow sits in a no-wrap span with the last word of its label.
    const arrows = footer.match(/<svg class="i trail"/g)?.length ?? 0;
    assert.ok(arrows >= 6, page);
    assert.equal(
      footer.match(/<span class="nowrap">[^<\s]+<svg class="i trail"/g)?.length,
      arrows,
      page,
    );
    if (!html.includes('<html lang="en">')) continue;
    english += 1;
    assert.match(footer, /<h3>Guides <span class="col-note">in German<\/span><\/h3>/, page);
  }
  assert.equal(english, 11);
});

test("each story scene shows one large device with real content", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const stage = html.match(
      /<div class="stage" aria-hidden="true">[\s\S]*?<div class="stage-dots">/,
    )?.[0];
    assert.ok(stage, `${locale} story stage`);
    const shots = stage.split('<div class="shot ').slice(1);
    assert.equal(shots.length, 7, locale);
    for (const scene of shots) {
      const devices = scene.match(/class="(?:phone|tablet|browser)"/g) ?? [];
      assert.equal(devices.length, 1, `${locale}: one device per scene`);
    }
    for (const name of [
      "app-phone-discover-results",
      "app-phone-pantry-assist",
      "app-phone-family-helper",
    ])
      assert.ok(stage.includes(`showcase/${locale}/${name}-`), `${locale} uses ${name}`);
  }
});

test("the live card has no scroll window of its own and opens on Today", () => {
  const css = read(new URL("../demo/live-demo.css", import.meta.url));
  const rules = css.match(/\.live-frame mealie-atelier-card\s*\{[^}]*\}/g) ?? [];
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    assert.doesNotMatch(rule, /overflow-y:\s*auto/, "no nested scroll area inside the page");
    assert.doesNotMatch(rule, /(?:^|[\s;{])height:/, "the card keeps its natural height");
  }
  for (const locale of ["de", "en"])
    assert.match(
      landing(builds.local, locale),
      /\[data-action="nav"\]\[data-value="today"\]'\);\s*if \(tab\) tab\.click\(\);/,
    );
});

test("landing pages carry the links, social tags and JSON-LD", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.deployed, locale);
    for (const link of Object.values(links)) {
      assert.ok(html.includes(`href="${link}"`), `${locale} is missing ${link}`);
    }
    assert.match(html, /<meta name="description" content="[^"]{40,}"/);
    assert.match(html, /<meta property="og:title" content="[^"]+"/);
    assert.match(html, /<meta property="og:description" content="[^"]+"/);
    assert.ok(
      html.includes(`<meta property="og:image" content="${baseUrl}photos/`),
      `${locale} og:image must be absolute and self-hosted`,
    );
    assert.ok(html.includes(`<meta property="og:url" content="${baseUrl}${locale}/"`));
    assert.ok(html.includes(`<link rel="canonical" href="${baseUrl}${locale}/"`));
    assert.ok(html.includes(`hreflang="x-default" href="${baseUrl}de/"`));
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const data = blocks.map((block) => JSON.parse(block[1]));
    const app = data.find((d) => d["@type"] === "SoftwareApplication");
    assert.ok(app, `${locale} is missing SoftwareApplication JSON-LD`);
    assert.equal(app.name, "Mealie Atelier");
    assert.equal(app.operatingSystem, "Home Assistant, Web");
    assert.equal(app.offers.price, "0");
    assert.equal(app.url, `${baseUrl}${locale}/`);
    assert.equal(app.author.name, "Daniel Boberg");
    const list = data.find((d) => d["@type"] === "ItemList");
    assert.equal(list?.itemListElement.length, 10, `${locale} recipe ItemList`);
  }
  assert.match(
    read(join(builds.deployed, "index.html")),
    /<meta name="description" content="[^"]{40,}"/,
  );
  const sitemap = read(join(builds.deployed, "sitemap.xml"));
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 22);
  assert.match(
    read(join(builds.deployed, "robots.txt")),
    /Sitemap: https:\/\/mealie\.example\.test\/sitemap\.xml/,
  );
});

test("every page shares the designed footer in its own language without photo credits", () => {
  const made = {
    de: /Mit <span class="heart"[^>]*>♥<\/span> gemacht von/,
    en: /Made with <span class="heart"[^>]*>♥<\/span> by/,
  };
  const pages = contentPages(builds.local);
  assert.equal(pages.length, 22);
  for (const page of pages) {
    const html = read(page);
    const locale = html.match(/<html lang="(de|en)">/)[1];
    const footer = footerOf(html);
    assert.ok(footer, `${page} has the site footer`);
    assert.match(footer, made[locale], `${page} footer language`);
    assert.match(footer, /href="https:\/\/alles-automatisch\.de\/"[^>]*>Daniel<\/a>/, page);
    assert.match(footer, /class="brand"/, page);
    assert.match(footer, /hreflang="de"[^>]*>.*?DE/, `${page} language switch`);
    assert.match(footer, /hreflang="en"[^>]*>.*?EN/, `${page} language switch`);
    const ids = sectionIds[locale];
    assert.ok(footer.includes(`#${ids.homeAssistant}"`), `${page} links the HA route`);
    assert.ok(footer.includes(`#${ids.webApp}"`), `${page} links the web app route`);
    for (const link of [
      links.cards,
      links.bridge,
      links.guide,
      links.setup,
      links.youtube,
      links.kofi,
    ]) {
      assert.ok(footer.includes(`href="${link}"`), `${page} footer lacks ${link}`);
    }
    assert.doesNotMatch(
      footer,
      /Unsplash|Foto|Photo:/i,
      `${page} footer must not carry photo credits`,
    );
    if (locale === "de") assert.doesNotMatch(footer, /Made with/, page);
    assert.match(html, /<meta name="color-scheme" content="dark"/, page);
    assert.match(html, /<meta name="theme-color" content="#0c120f"/, page);
  }
});

test("shipped pages use only self-hosted images and never point at a local host", () => {
  const files = [
    ...listFiles(builds.local, ".html"),
    ...listFiles(builds.local, ".css"),
    ...listFiles(builds.local, ".js"),
    ...listFiles(builds.local, ".json"),
  ];
  for (const file of files) {
    const text = read(file);
    assert.doesNotMatch(text, /images\.unsplash\.com/, file);
    assert.doesNotMatch(text, /localhost|127\.0\.0\.1/, file);
  }
});

test("every image has alt, width and height and only the first screen loads eagerly", () => {
  for (const page of listFiles(builds.local, ".html")) {
    const html = read(page);
    for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
      assert.match(img, /\salt="/, `${page}: ${img}`);
      assert.match(img, /\swidth="\d+"/, `${page}: ${img}`);
      assert.match(img, /\sheight="\d+"/, `${page}: ${img}`);
    }
  }
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const eager = (html.match(/<img\b[^>]*>/g) ?? []).filter((img) => !/loading="lazy"/.test(img));
    // Two hero shots plus the ten directory thumbnails inside their summary rows.
    assert.equal(eager.length, 12, `${locale} eager images`);
    const thumbs = html.match(/<summary><img [^>]*>/g) ?? [];
    assert.equal(thumbs.length, 10);
    for (const thumb of thumbs) assert.doesNotMatch(thumb, /loading="lazy"/);
    assert.match(html, /<img [^>]*srcset="[^"]+ 800w, [^"]+ 1600w"/, `${locale} uses srcset`);
  }
});

test("external links open in a new tab and internal links stay in place", () => {
  for (const page of listFiles(builds.deployed, ".html")) {
    const html = read(page);
    for (const anchor of html.match(/<a\b[^>]*>/g) ?? []) {
      const href = anchor.match(/href="([^"]*)"/)?.[1] ?? "";
      const external = /^https?:/.test(href) && !href.startsWith(baseUrl);
      if (external) {
        assert.match(anchor, /target="_blank"/, `${page}: ${anchor}`);
        assert.match(anchor, /rel="noopener noreferrer"/, `${page}: ${anchor}`);
      } else {
        assert.doesNotMatch(anchor, /target="_blank"/, `${page}: ${anchor}`);
      }
    }
  }
});

test("every asset a page references exists in the generated site", () => {
  const out = builds.local;
  for (const page of listFiles(out, ".html")) {
    const html = read(page);
    const refs = [
      ...[...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) =>
        m[1].split(",").map((part) => part.trim().split(/\s+/)[0]),
      ),
    ].filter((ref) => !/^(https?:|mailto:|#|data:)/.test(ref));
    for (const ref of refs) {
      const path = ref.split("#")[0].split("?")[0];
      if (!path) continue;
      let target = join(dirname(page), path);
      if (path.endsWith("/")) target = join(target, "index.html");
      assert.ok(existsSync(target), `${relative(out, page)} references missing ${ref}`);
    }
  }
  for (const locale of ["de", "en"]) {
    const html = landing(out, locale);
    const fetched = html.match(/fetch\("([^"]+)"\)/)[1];
    assert.ok(existsSync(join(out, locale, fetched)), `${locale} catalog ${fetched}`);
  }
});

test("photo credits sit at their photos and cover every recipe", () => {
  const catalog = JSON.parse(read("demo/data/recipes.json"));
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const directory = html.match(/<div class="recipe-list">[\s\S]*?<\/div><\/div><\/section>/)[0];
    assert.equal((directory.match(/<p class="credit">/g) ?? []).length, 10, locale);
    for (const recipe of catalog.recipes) {
      assert.ok(
        html.includes(`>${recipe.image.photographer}</a>`),
        `${locale} credits ${recipe.slug}`,
      );
    }
  }
});

test("recipe pages share the design, keep h3 step titles and carry SEO tags", () => {
  const pages = listFiles(builds.deployed, ".html").filter((page) =>
    read(page).includes('<body class="recipe-body">'),
  );
  assert.equal(pages.length, 20);
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<header class="top"/, page);
    assert.match(
      html,
      /<figure class="wrap recipe-figure"><img [^>]*fetchpriority="high"[^>]*><figcaption><p class="credit">/,
      page,
    );
    const method = html.match(/<section class="recipe-method"[\s\S]*?<\/section>/)[0];
    assert.doesNotMatch(method, /<h2>/, page);
    assert.match(method, /<h3>1\. /, page);
    assert.match(html, /<h2 id="ingredients-title">/, page);
    assert.match(html, /<h2 id="method-title">/, page);
    assert.match(html, /<meta property="og:site_name" content="Mealie Atelier">/, page);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, page);
    assert.match(
      html,
      /<meta name="twitter:image" content="https:\/\/mealie\.example\.test\/photos\//,
      page,
    );
    const dePath = html.match(/hreflang="de" href="([^"]+)"/)[1];
    assert.ok(html.includes(`hreflang="x-default" href="${dePath}"`), `${page} x-default`);
    assert.match(html, /<link rel="canonical" href="https:\/\/mealie\.example\.test\//, page);
    const recipe = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
    );
    assert.equal(recipe["@type"], "Recipe", page);
  }
});
