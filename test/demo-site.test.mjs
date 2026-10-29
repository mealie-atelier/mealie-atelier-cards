import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
function generate(base, out = mkdtempSync(join(tmpdir(), "atelier-demo-"))) {
  execFileSync("node", ["scripts/generate-demo-site.mjs"], {
    env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: base },
    stdio: "pipe",
  });
  return out;
}
before(() => {
  // The local build starts in a folder that still holds the page of a removed recipe.
  const stale = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  for (const page of ["de/rezepte/shakshuka-mit-paprika", "en/recipes/shakshuka-with-peppers"]) {
    mkdirSync(join(stale, page), { recursive: true });
    writeFileSync(join(stale, page, "index.html"), "<p>old leaf page</p>");
  }
  // Renamed photos and replaced screenshots must not survive either.
  for (const leftover of [
    "photos/kokos-curry-mit-champignons-und-gruenkohl.webp",
    "showcase/photos/kokos-curry-mit-champignons-und-gruenkohl-800.webp",
    "showcase/de/app-desktop-retired-1600.webp",
  ]) {
    mkdirSync(dirname(join(stale, leftover)), { recursive: true });
    writeFileSync(join(stale, leftover), "old photo");
  }
  builds.local = generate("", stale);
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
  assert.equal(english, 12);
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
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 24);
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
  assert.equal(pages.length, 24);
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
    assert.doesNotMatch(footer, /Unsplash|Foto:|Photo:/, `${page} footer holds no credit lines`);
    const creditsLabel = locale === "de" ? "Bildnachweise" : "Photo credits";
    const creditsHref = locale === "de" ? "bildnachweise/" : "credits/";
    assert.match(
      footer,
      new RegExp(`<a class="foot-credits" href="(?:[^"]*${creditsHref}|\\./)">${creditsLabel}</a>`),
      `${page} footer links the credits list`,
    );
    if (locale === "de") assert.doesNotMatch(footer, /Made with/, page);
    assert.match(html, /<meta name="color-scheme" content="dark light"/, page);
    assert.match(
      html,
      /<meta name="theme-color" content="#0c120f" media="\(prefers-color-scheme: dark\)"/,
      page,
    );
    assert.match(
      html,
      /<meta name="theme-color" content="#f8f3e9" media="\(prefers-color-scheme: light\)"/,
      page,
    );
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
    // Only the two hero shots load eagerly; the directory below the fold stays lazy.
    assert.equal(eager.length, 2, `${locale} eager images`);
    const thumbs = html.match(/<summary><img [^>]*>/g) ?? [];
    assert.equal(thumbs.length, 10);
    for (const thumb of thumbs) assert.match(thumb, /loading="lazy"/);
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

test("photo credits stay quiet: no overlays, one caption per recipe page, one full list", () => {
  const catalog = JSON.parse(read("demo/data/recipes.json"));
  for (const page of listFiles(builds.local, ".html")) {
    const html = read(page);
    assert.doesNotMatch(html, /class="credit"|closing-credit/, `${page} has no credit overlay`);
    const isRecipe = html.includes('<body class="recipe-body">');
    assert.equal(
      html.includes('<p class="photo-caption">'),
      isRecipe,
      `${page} caption only on recipe pages`,
    );
  }
  for (const locale of ["de", "en"]) {
    const home = landing(builds.local, locale);
    assert.doesNotMatch(home, /unsplash\.com/, `${locale} landing page shows no credits`);
    const list = read(
      join(builds.local, locale === "de" ? "de/bildnachweise" : "en/credits", "index.html"),
    );
    for (const recipe of catalog.recipes) {
      assert.ok(
        list.includes(`>${recipe.image.photographer}</a>`),
        `${locale} lists ${recipe.slug}`,
      );
      assert.ok(
        list.includes(`href="${recipe.image.sourceUrl}" target="_blank" rel="noopener noreferrer"`),
      );
    }
    assert.equal((list.match(/<li><img/g) ?? []).length, 10, `${locale} credit rows`);
    assert.match(
      list,
      /href="https:\/\/unsplash\.com\/license" target="_blank" rel="noopener noreferrer"/,
    );
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
      /<figure class="recipe-figure"><img [^>]*fetchpriority="high"[^>]*><figcaption><p class="photo-caption">(?:Foto|Photo)/,
      page,
    );
    const method = html.match(/<section class="recipe-method"[\s\S]*?<\/section>/)[0];
    assert.doesNotMatch(method, /<h2>/, page);
    // The numbered circle is the only step number: headings carry the title alone.
    assert.doesNotMatch(method, /<h3>\d+\. /, page);
    assert.match(method, /<span class="step-no" aria-hidden="true">1<\/span><div><h3>[^<\d]/, page);
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

test("every page carries the Week Dial favicon, touch icon and page-surface theme colour", () => {
  for (const asset of [
    "mealie-atelier-mark.svg",
    "favicon.svg",
    "favicon.ico",
    "apple-touch-icon.png",
  ]) {
    assert.ok(existsSync(join(builds.local, "assets", asset)), asset);
  }
  const touch = readFileSync(join(builds.local, "assets/apple-touch-icon.png"));
  assert.equal(touch.readUInt32BE(16), 180, "touch icon is 180 px wide");
  assert.equal(touch.readUInt32BE(20), 180, "touch icon is 180 px high");
  const css = readFileSync(join(builds.local, "assets/live-demo.css"), "utf8");
  assert.match(css, /\.brand-mark\s*\{[^}]*mealie-atelier-mark\.svg/);
  for (const page of listFiles(builds.local, ".html")) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="[^"]*favicon\.svg"/, page);
    assert.match(html, /<link rel="icon" href="[^"]*favicon\.ico" sizes="32x32"/, page);
    assert.match(html, /<link rel="apple-touch-icon" href="[^"]*apple-touch-icon\.png"/, page);
    assert.match(html, /<meta name="theme-color" content="#0c120f"/, page);
    assert.doesNotMatch(html, /<path d="M6 19c7-1/, page);
  }
});

test("a reused output folder loses the pages of recipes that left the catalog", () => {
  assert.ok(!existsSync(join(builds.local, "de/rezepte/shakshuka-mit-paprika")));
  assert.ok(!existsSync(join(builds.local, "en/recipes/shakshuka-with-peppers")));
  assert.equal(listFiles(join(builds.local, "de/rezepte"), ".html").length, 10);
  assert.equal(listFiles(join(builds.local, "en/recipes"), ".html").length, 10);
  for (const page of contentPages(builds.local)) {
    assert.doesNotMatch(read(page), /old leaf page/, page);
  }
});

test("a reused output folder loses renamed photos and retired screenshots", () => {
  for (const leftover of [
    "photos/kokos-curry-mit-champignons-und-gruenkohl.webp",
    "showcase/photos/kokos-curry-mit-champignons-und-gruenkohl-800.webp",
    "showcase/de/app-desktop-retired-1600.webp",
  ]) {
    assert.ok(!existsSync(join(builds.local, leftover)), leftover);
  }
  assert.ok(existsSync(join(builds.local, "photos/kokos-curry-mit-kartoffeln-und-karotten.webp")));
  assert.ok(existsSync(join(builds.local, "showcase/de/app-desktop-recipes-1600.webp")));
});

test("favicon and page mark come from one family: the plate with the herb leaf", () => {
  for (const file of ["favicon.svg", "mealie-atelier-mark.svg"]) {
    const svg = readFileSync(join(builds.local, "assets", file), "utf8");
    const glyph = svg.match(/class="glyph"[^>]*d="([^"]*)"/)?.[1] ?? "";
    assert.ok(glyph, `${file} carries a glyph`);
    // One leaf is one or two closed shapes; the Cards grid is four squares.
    assert.ok((glyph.match(/Z/g) ?? []).length <= 2, `${file} glyph is the leaf`);
    assert.doesNotMatch(svg, /M5\.4 5L6\.6 5/, `${file} is not the Cards card grid`);
  }
});

const catalogData = JSON.parse(readFileSync("demo/data/recipes.json", "utf8"));

test("English recipe pages use English slugs and the catalog holds real cuisines", () => {
  const english = readdirSync(join(builds.local, "en/recipes")).sort();
  assert.deepEqual(english, catalogData.recipes.map((recipe) => recipe.slugEn).sort());
  for (const recipe of catalogData.recipes) {
    assert.match(recipe.slugEn, /^[a-z0-9-]+$/);
    if (recipe.slugEn !== recipe.slug) {
      assert.ok(!english.includes(recipe.slug), `${recipe.slug} must not leak into en/recipes`);
    }
    assert.doesNotMatch(recipe.cuisine.en, /autumn|season/i, `${recipe.id} cuisine is no season`);
    assert.doesNotMatch(recipe.cuisine.de, /herbst|saison/i, `${recipe.id} cuisine is no season`);
  }
  assert.match(
    landing(builds.local, "en"),
    /href="\.\/recipes\/pumpkin-soup-with-feta-and-pumpkin-seeds\/"/,
  );
});

test("credits pages carry the same social tags as the other pages", () => {
  for (const [build, base] of [
    [builds.deployed, baseUrl],
    [builds.local, ""],
  ]) {
    for (const path of ["de/bildnachweise", "en/credits"]) {
      const html = read(join(build, path, "index.html"));
      assert.match(html, /<meta property="og:image" content="[^"]*photos\/[^"]+\.webp">/, path);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, path);
      assert.match(html, /<meta name="twitter:title" content="[^"]+">/, path);
      assert.match(html, /<meta name="twitter:description" content="[^"]+">/, path);
      assert.match(html, /<meta name="twitter:image" content="[^"]*photos\//, path);
      if (base) {
        assert.ok(html.includes(`<meta property="og:url" content="${base}${path}/">`), path);
        assert.ok(html.includes(`<meta property="og:image" content="${base}photos/`), path);
      }
    }
  }
});

test("support tiles appear once per page, in the same footer on every page type", () => {
  for (const locale of ["de", "en"]) {
    const home = landing(builds.local, locale);
    assert.equal((home.match(/ko-fi\.com\/allesautomatisch/g) ?? []).length, 1, locale);
    assert.match(footerOf(home), /class="foot-support"/, `${locale} landing footer`);
    assert.doesNotMatch(home, /class="support[ "]/, `${locale} landing closing holds no tiles`);
    const recipePage = listFiles(join(builds.local, locale), ".html").find((page) =>
      read(page).includes('<body class="recipe-body">'),
    );
    assert.match(footerOf(read(recipePage)), /class="foot-support"/, `${locale} recipe footer`);
  }
});

test("footer legal line keeps the disclaimer in its own balanced block", () => {
  for (const page of contentPages(builds.local)) {
    const footer = footerOf(read(page));
    assert.match(
      footer,
      /<div class="legal"><p>© 2026 Mealie Atelier · [^<]+<a [^>]*>[^<]+<\/a><\/p><p class="disclaimer">/,
      page,
    );
  }
});

test("page CSS keeps the footer wordmark off the rule and the metric grid dividers whole", () => {
  const css = readFileSync(join(builds.local, "assets/live-demo.css"), "utf8");
  const wordmark = css.match(/\.wordmark\s*\{[^}]*\}/)[0];
  assert.doesNotMatch(wordmark, /margin:[^;]*-\d/, "wordmark margin must not be negative");
  assert.match(wordmark, /margin:\s*0 0 clamp\(/);
  assert.match(css, /\.recipe-metrics div:nth-child\(even\)\s*\{[^}]*border-left:/);
  assert.match(css, /\.term pre\s*\{[^}]*white-space:\s*pre;/);
  assert.match(css, /\.ba-labels\s*\{/);
  for (const locale of ["de", "en"]) {
    const home = landing(builds.local, locale);
    assert.match(home, /<div class="ba-labels rv"><button class="tag l"/, locale);
    assert.doesNotMatch(
      home,
      /<div class="ba [^"]*" data-ba[\s\S]*?class="tag /,
      `${locale} no tag inside the frame`,
    );
  }
});

test("the page ships a dark and a light scheme that follow the system setting", () => {
  const css = readFileSync(join(builds.local, "assets/live-demo.css"), "utf8");
  assert.match(css, /@media \(prefers-color-scheme: light\)/);
  assert.match(css, /color-scheme:\s*dark/);
  assert.match(css, /color-scheme:\s*light/);
  for (const page of contentPages(builds.local)) {
    assert.match(read(page), /<meta name="color-scheme" content="dark light"/, page);
  }
});

test("the recipe hero shows the whole photo instead of cropping it to a fixed ratio", () => {
  const css = readFileSync(join(builds.local, "assets/live-demo.css"), "utf8");
  const rule = css.match(/\.recipe-photo\s*\{[^}]*\}/)[0];
  assert.doesNotMatch(rule, /aspect-ratio|object-fit/, "a fixed ratio would cut plate rims");
  assert.match(rule, /height:\s*auto/);
  for (const page of listFiles(builds.local, ".html")) {
    const html = read(page);
    if (!html.includes('<body class="recipe-body">')) continue;
    assert.match(html, /<div class="wrap recipe-hero"><header class="recipe-head">/, page);
  }
});

test("recipe photos carry no clutter claims in their alt text", () => {
  const catalog = JSON.parse(read(new URL("../demo/data/recipes.json", import.meta.url)));
  const alts = catalog.recipes.map((recipe) => `${recipe.image.alt.de} ${recipe.image.alt.en}`);
  assert.doesNotMatch(
    alts.join("\n"),
    /Beere am|red berry|Knäckebrot|crispbread|Frühlingszwiebelring|sliced spring onion/,
  );
});

test("the skillet eggs recipe promises nothing the photo does not show", () => {
  const catalog = JSON.parse(read(new URL("../demo/data/recipes.json", import.meta.url)));
  const recipe = catalog.recipes.find((item) => item.id === "skillet-eggs");
  assert.doesNotMatch(JSON.stringify(recipe), /Knäckebrot|crispbread|crackers/i);
});

test("the skillet eggs recipe promises nothing the photo does not show", () => {
  const catalog = JSON.parse(read(new URL("../demo/data/recipes.json", import.meta.url)));
  const recipe = catalog.recipes.find((item) => item.id === "skillet-eggs");
  assert.doesNotMatch(JSON.stringify(recipe), /Knäckebrot|crispbread|crackers/i);
});

test("the card hero keeps its eyebrow readable on bright photos", () => {
  const editorial = read(new URL("../src/design-system/editorial.css", import.meta.url));
  const adaptive = read(new URL("../src/design-system/adaptive.css", import.meta.url));
  assert.match(editorial, /\.atelier \.hero \.eyebrow \{\s*text-shadow:/);
  assert.match(adaptive, /rgba\(10, 20, 14, 0\.5\) 100%/, "the phone scrim stays dense at the top");
});

test("recipe metrics stay an even grid at every width and the page offsets match", () => {
  const css = read(new URL("../demo/live-demo.css", import.meta.url));
  const metrics = css.match(/\.recipe-metrics \{[^}]*\}/)[0];
  assert.match(metrics, /display: grid/, "metrics use a grid outside any media query");
  assert.match(metrics, /grid-template-columns: 1fr 1fr/);
  assert.doesNotMatch(css, /\.recipe-metrics div \{[^}]*border-right/, "no trailing divider");
  assert.match(css, /\.credits-page \{[^}]*padding-block: 112px/, "credits offset equals recipe");
  assert.match(css, /\.recipe-page \{\s*padding-top: 112px/);
  const scrim = css.match(/\.closing::before \{[\s\S]*?\n\}/)[0];
  assert.match(scrim, /0\.88\) 55%/, "closing scrim stays dense behind the text column");
});

test("layout regressions: breadcrumb offset, story steps, footer order and note, closing scrim, phone compare", () => {
  const css = read(join(builds.local, "assets/live-demo.css"));
  const js = read(join(builds.local, "assets/site.js"));
  // The breadcrumb sits above the hero grid, so centring the title block cannot move it.
  const hero = css.match(/@media \(min-width: 900px\)\s*\{\s*\.recipe-hero\s*\{[^}]*\}/)[0];
  assert.match(hero, /align-items:\s*center/);
  // Every story step keeps the same height, so the pinned stage and the observer band agree.
  assert.doesNotMatch(css, /\.step:last-child/);
  // The footer keeps one column order and the note shares the heading line.
  assert.doesNotMatch(css, /\.foot-cols\s*>\s*\.foot-col:nth-child\(2\)/);
  assert.doesNotMatch(css, /\.foot-cols[^{]*\{[^}]*order:/);
  assert.doesNotMatch(css.match(/\.foot-col \.col-note\s*\{[^}]*\}/)[0], /display:\s*block/);
  // The tablet footer fills its row, and the scrim covers the closing copy up to tablet width.
  assert.match(
    css,
    /@media \(min-width: 561px\) and \(max-width: 900px\)\s*\{\s*\.foot-brand\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/,
  );
  assert.match(css, /@media \(max-width: 900px\)\s*\{\s*\.closing::before\s*\{/);
  // On phones the compare handle settles on a whole picture instead of cutting text.
  assert.match(js, /matchMedia\("\(max-width: 700px\)"\)/);
  assert.match(js, /classList\.add\("settling"\)/);
  assert.match(css, /\.ba\.settling\s*\{[^}]*transition:\s*--pos/);
});

test("light scheme and facts strip: no highlighter smear on labels, first cell on the content edge", () => {
  const css = read(join(builds.local, "assets/live-demo.css"));
  assert.doesNotMatch(css, /\.fact > span \{[^}]*background/, "a fact label carries no tint");
  assert.match(css, /\.fact:first-child \{[^}]*padding-left: 0/);
  assert.match(css, /\.fact:nth-child\(odd\) \{\s*padding-left: 0/);
});

test("hero: one readable browser, a phone, no tablet, eyebrow breaks only between its phrases", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0];
    assert.doesNotMatch(hero, /class="tablet"/, `${locale} hero keeps no tiny tablet`);
    assert.equal((hero.match(/class="phone"/g) ?? []).length, 1);
    assert.equal((hero.match(/class="browser"/g) ?? []).length, 1);
    assert.doesNotMatch(hero, /class="browser" data-speed/, "the browser does not drift");
    assert.equal((hero.match(/<span class="nw">/g) ?? []).length, 2, "eyebrow has two phrases");
  }
  const css = read(join(builds.local, "assets/live-demo.css"));
  assert.match(css, /\.nw \{\s*white-space: nowrap/);
  assert.match(css, /\.stack \.browser \{[^}]*width: 92%/);
  const js = read(join(builds.local, "assets/site.js"));
  assert.match(js, /Math\.max\(-36, Math\.min\(36, raw\)\)/, "parallax is clamped");
  assert.match(js, /box\.top - current/, "parallax measures without its own offset");
});

test("compare: rest position, labels as toggles and a phone-sized capture pair in both locales", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    assert.match(html, /<input type="range" min="0" max="100" value="46"/);
    assert.match(html, /data-ba-show="before"[^>]*aria-pressed="false"/);
    assert.match(html, /data-ba-show="after"[^>]*aria-pressed="false"/);
    for (const name of [
      "compare-desktop-mealie",
      "compare-desktop-atelier",
      "compare-phone-mealie",
      "compare-phone-atelier",
    ]) {
      assert.ok(
        existsSync(
          join(
            builds.local,
            `showcase/${locale}/${name}-${name.includes("phone") ? 720 : 1600}.webp`,
          ),
        ),
        name,
      );
    }
  }
});

test("scroll story: step and pinned stage share one height, so the device is level with the step", () => {
  const css = read(join(builds.local, "assets/live-demo.css"));
  assert.match(css.match(/\.step \{[^}]*\}/)[0], /min-height: var\(--step-h\)/);
  const stage = css.match(/\.stage \{[^}]*\}/)[0];
  assert.match(stage, /height: var\(--step-h\)/);
  assert.match(stage, /top: calc\(50vh - var\(--step-h\) \/ 2\)/);
});

test("recipe page: crumbs sit above one centred hero block, no stretched gap", () => {
  const css = read(join(builds.local, "assets/live-demo.css"));
  assert.doesNotMatch(css, /\.recipe-hero \.recipe-metrics \{\s*align-self: end;/);
  assert.match(css, /\.recipe-hero \{[^}]*align-items: center/);
});

test("footer links never wrap on wide screens and route cards pin their buttons to the foot", () => {
  const css = read(join(builds.local, "assets/live-demo.css"));
  assert.match(css, /min-width: 901px\) \{\s*\.foot-col a \{\s*white-space: nowrap/);
  assert.match(css, /\.route \.btn-row \{[^}]*margin-top: auto/);
  assert.match(landing(builds.local, "de"), /Node\.js&nbsp;22/);
});

test("live demo frame shows a placeholder until the card has rendered", () => {
  assert.match(read(join(builds.local, "assets/site.js")), /data-ready/);
  assert.match(
    read(join(builds.local, "assets/live-demo.css")),
    /\.live-frame:not\(\[data-ready\]\) mealie-atelier-card/,
  );
});

test("English route buttons stay short and one note says the guides are German", () => {
  const en = landing(builds.local, "en");
  assert.doesNotMatch(en, /Guide \(German\)/);
  assert.equal((en.match(/Open the guide/g) ?? []).length, 2);
  assert.equal((en.match(/class="guide-note/g) ?? []).length, 1);
  assert.doesNotMatch(landing(builds.local, "de"), /guide-note/);
});

test("pantry quantities keep one line and the cooking dialog closes with a single focus ring", () => {
  const css = readFileSync(new URL("../src/design-system/corners.css", import.meta.url), "utf8");
  assert.match(css, /\.studio-grocery-line > strong \{[^}]*white-space: nowrap/);
  assert.match(css, /\.icon-btn\.modal-close:focus-visible \{[^}]*outline-offset: 0/);
  assert.match(css, /\.icon-btn\.modal-close:focus-visible \{[^}]*border-color: transparent/);
  assert.match(css, /max-height: 800px\)[\s\S]*\.cook-content/);
  const views = readFileSync(new URL("../src/components/views.js", import.meta.url), "utf8");
  assert.match(
    views,
    /recipeImage\(meal\.recipe \|\| \{\}, "", true\)/,
    "today photo loads eagerly",
  );
});

function webpWidth(file) {
  const buf = readFileSync(file);
  if (buf.toString("ascii", 12, 16) === "VP8X") return 1 + buf.readUIntLE(24, 3);
  if (buf.toString("ascii", 12, 16) === "VP8 ") return buf.readUInt16LE(26) & 0x3fff;
  return buf.readUInt16LE(21) & 0x3fff;
}

test("sharp photos: every master is at least 2000 px wide and ships a 1600w variant", () => {
  const manifest = JSON.parse(read(new URL("../demo/showcase/manifest.json", import.meta.url)));
  for (const [name, entry] of Object.entries(manifest.photos)) {
    assert.ok(
      webpWidth(join(builds.local, `photos/${name}.webp`)) >= 2000,
      `${name} master pixel width`,
    );
    assert.ok(entry.widths.includes(1600), `${name} has a 1600w variant`);
    assert.ok(entry.width >= 2000, `${name} manifest width`);
  }
  for (const [name, entry] of Object.entries(manifest.photos)) {
    for (const width of entry.widths) {
      assert.ok(
        existsSync(join(builds.local, `showcase/photos/${name}-${width}.webp`)),
        `${name} ${width}`,
      );
    }
    assert.ok(existsSync(join(builds.local, `photos/${name}.webp`)), name);
  }
  const html = landing(builds.local, "de");
  for (const name of Object.keys(manifest.photos)) {
    if (html.includes(`${name}-800.webp`)) {
      assert.ok(html.includes(`${name}-1600.webp 1600w`), `${name} srcset has 1600w`);
    }
  }
  assert.match(html, /photos\/buttermilch-pancakes-mit-beeren\.webp 2400w/);
});

// Layout needs a real browser engine: find a headless Chromium (CHROME_BIN, PATH or the Playwright
// cache) and skip when none is installed.
function findChrome() {
  const candidates = [process.env.CHROME_BIN];
  const cache = join(process.env.HOME ?? "", "Library/Caches/ms-playwright");
  const linuxCache = join(process.env.HOME ?? "", ".cache/ms-playwright");
  for (const dir of [cache, linuxCache]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir).sort().reverse()) {
      if (!entry.startsWith("chromium_headless_shell-")) continue;
      for (const sub of readdirSync(join(dir, entry))) {
        candidates.push(join(dir, entry, sub, "chrome-headless-shell"));
      }
    }
  }
  return candidates.find((path) => path && existsSync(path));
}

test("rendered at 390 and 768 px the photo grid follows the photo ratios and the quote card hugs its text", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  const dir = mkdtempSync(join(tmpdir(), "atelier-layout-"));
  try {
    const widths = [390, 768];
    const frames = ["de", "en"]
      .flatMap((locale) =>
        widths.map(
          (width) =>
            `<iframe id="${locale}-${width}" src="file://${join(builds.local, locale, "index.html")}" width="${width}" height="800"></iframe>`,
        ),
      )
      .join("");
    writeFileSync(
      join(dir, "harness.html"),
      `<!doctype html><body><pre id="out">pending</pre>${frames}<script>
const result = {};
let pending = 4;
for (const frame of document.querySelectorAll("iframe")) {
  frame.addEventListener("load", () => setTimeout(() => {
    const doc = frame.contentDocument;
    const grid = doc.querySelector(".food-grid");
    const quote = doc.querySelector(".food-quote");
    const box = quote.getBoundingClientRect();
    const lastChild = quote.lastElementChild.getBoundingClientRect();
    result[frame.id] = {
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      ratios: [...grid.querySelectorAll(".dish")].map((el) => {
        const r = el.getBoundingClientRect();
        return r.width / r.height;
      }),
      quoteHeight: box.height,
      emptyBelowQuote: box.bottom - lastChild.bottom,
    };
    if (--pending === 0) document.getElementById("out").textContent = JSON.stringify(result);
  }, 800));
}
</script>`,
    );
    const dom = execFileSync(
      chrome,
      [
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--virtual-time-budget=8000",
        "--window-size=900,900",
        "--dump-dom",
        `file://${join(dir, "harness.html")}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000 },
    );
    const json = dom.match(/<pre id="out">([^<]*)<\/pre>/)?.[1] ?? "";
    assert.notEqual(json, "pending", "the harness never measured the page");
    const measured = JSON.parse(json);
    for (const locale of ["de", "en"]) {
      for (const width of widths) {
        const id = `${locale} ${width}px`;
        const { columns, ratios, quoteHeight, emptyBelowQuote } = measured[`${locale}-${width}`];
        assert.equal(columns, width < 561 ? 1 : 2, `${id} grid columns`);
        assert.equal(ratios.length, 5, `${id} dish count`);
        // The first dish is wide on a tablet (3:2) and every other dish is 4:3.
        ratios.forEach((ratio, index) => {
          const expected = index === 0 && width > 560 ? 3 / 2 : 4 / 3;
          assert.ok(Math.abs(ratio - expected) < 0.02, `${id} dish ${index} ratio ${ratio}`);
        });
        assert.ok(quoteHeight < 200, `${id} quote card is ${quoteHeight}px tall`);
        assert.ok(
          emptyBelowQuote < 40,
          `${id} quote card has ${emptyBelowQuote}px empty below its text`,
        );
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
