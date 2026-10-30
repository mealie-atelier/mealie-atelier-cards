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
    "assets/mealie-atelier-icon-192.png",
    "_redirects",
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
// The build fails open without Chromium: share images that are neither cached nor renderable are
// skipped with a warning. Tests that need them skip with a clear reason.
const ogRendered = (out) =>
  ["de", "en"].every((locale) => existsSync(join(out, "og", locale, "home.jpg"))) &&
  catalogData.recipes.every((recipe) =>
    ["de", "en"].every((locale) =>
      existsSync(join(out, "og", locale, `${locale === "de" ? recipe.slug : recipe.slugEn}.jpg`)),
    ),
  );
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

test("the timer notification mockup shows the text the Bridge really sends per language", () => {
  // mealie-atelier-bridge alarms.py _TEXTS: German on a German Home Assistant, English otherwise.
  const expected = {
    de: ["Mealie Atelier Bridge · Küchentimer", "Tomatensauce ist fertig!"],
    en: ["Mealie Atelier Bridge · Kitchen timer", "Tomato sauce is ready!"],
  };
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const mockup = html.match(/<div class="notif-phone"[\s\S]*?<\/article>/)?.[0] ?? "";
    assert.doesNotMatch(mockup, /lang="de"/, locale);
    assert.equal(mockup.split(expected[locale][0]).length - 1, 3, locale);
    assert.ok(mockup.includes(expected[locale][1]), locale);
    assert.doesNotMatch(html, /notif-note|notification in German/, locale);
  }
});

test("page copy names the card features and buttons exactly as the card labels them", () => {
  const en = landing(builds.local, "en");
  const de = landing(builds.local, "de");
  for (const wrong of [/Cook ideas/, /Family cooking/, /week plan/i, /AI check/]) {
    assert.doesNotMatch(en, wrong, String(wrong));
  }
  assert.match(en, /Ask Discover for suggestions/);
  assert.match(en, /Open the meal plan and add a dish/);
  assert.match(en, /“Review with AI”/);
  assert.match(de, /„Mit KI prüfen“/);
  assert.doesNotMatch(de, /hake ein,|[Ee]uer |euren |euch /);
  assert.match(de, /hake ab, starte/);
  assert.match(de, /Dein eigenes Kochbuch/);
});

test("long resting recipes include the rest in the total time chip and structured data", () => {
  for (const locale of ["de", "en"]) {
    const html = landing(builds.local, locale);
    const rest = locale === "de" ? "inkl. Ruhezeit" : "incl. resting";
    assert.ok(
      html.includes(`165&nbsp;${locale === "de" ? "Minuten" : "minutes"} ${rest} · 8`),
      locale,
    );
    assert.ok(
      html.includes(`107&nbsp;${locale === "de" ? "Minuten" : "minutes"} ${rest} · 2`),
      locale,
    );
    assert.ok(!/ 45 (Minuten|minutes) · 8/.test(html), locale);
  }
  const dir = join(builds.local, "de", "rezepte");
  const page = readFileSync(join(dir, "zitronen-focaccia-mit-rosmarin", "index.html"), "utf8");
  assert.match(page, /"totalTime":"PT165M"/);
});

test("the live demo counts the rest in its total time, matching the recipe page", () => {
  for (const locale of ["de", "en"]) {
    const data = JSON.parse(read(join(builds.local, "data", `${locale}.json`)));
    const dir = locale === "de" ? "de/rezepte" : "en/recipes";
    for (const [id, minutes] of [
      ["pizza", 107],
      ["focaccia", 165],
    ]) {
      const recipe = data.recipes.find((item) => item.slug.includes(id));
      assert.ok(recipe, `${locale} ${id} in the live demo data`);
      const total = recipe.prepMinutes + recipe.cookMinutes + (recipe.restMinutes ?? 0);
      assert.equal(total, minutes, `${locale} ${id} live demo total`);
      const slug =
        locale === "de" ? recipe.slug : catalogData.recipes.find((r) => r.id === recipe.id).slugEn;
      const page = read(join(builds.local, dir, slug, "index.html"));
      assert.match(page, new RegExp(`"totalTime":"PT${total}M"`), `${locale} ${id} page total`);
    }
  }
  assert.match(read("demo/preview.html"), /item\.restMinutes/);
});

test("English recipe pages use English slugs, the sitemap lists them and no _redirects file is written", () => {
  for (const recipe of catalogData.recipes) {
    assert.ok(
      existsSync(join(builds.deployed, "en/recipes", recipe.slugEn, "index.html")),
      recipe.slugEn,
    );
    assert.ok(
      existsSync(join(builds.deployed, "de/rezepte", recipe.slug, "index.html")),
      recipe.slug,
    );
  }
  const moved = catalogData.recipes.filter((recipe) => recipe.slug !== recipe.slugEn);
  const sitemap = read(join(builds.deployed, "sitemap.xml"));
  for (const recipe of moved) {
    assert.ok(sitemap.includes(`${baseUrl}en/recipes/${recipe.slugEn}/`), recipe.slugEn);
    assert.ok(!sitemap.includes(`${baseUrl}en/recipes/${recipe.slug}/`), recipe.slug);
  }
  assert.ok(!existsSync(join(builds.deployed, "_redirects")));
  assert.ok(!existsSync(join(builds.local, "_redirects")));
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
    assert.match(footer, /<h2>Guides <span class="col-note">in German<\/span><\/h2>/, page);
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
    if (ogRendered(builds.deployed)) {
      assert.ok(
        html.includes(`<meta property="og:image" content="${baseUrl}og/${locale}/home.jpg">`),
        `${locale} og:image must be absolute and self-hosted`,
      );
    }
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
    assert.match(html, /<meta name="color-scheme" content="dark"/, page);
    assert.match(html, /<meta name="theme-color" content="#0c120f"/, page);
    assert.doesNotMatch(html, /theme-color"[^>]*media=/, page);
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
      if (!ogRendered(out) && /(^|\/)og\/(de|en)\//.test(path)) continue; // no Chromium, see ogRendered
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
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?>/, page);
    if (ogRendered(builds.deployed)) {
      assert.match(
        html,
        /<meta name="twitter:image" content="https:\/\/mealie\.example\.test\/og\/(de|en)\/[^"]+\.jpg">/,
        page,
      );
    }
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
      const withImages = ogRendered(build);
      if (withImages) {
        assert.match(
          html,
          /<meta property="og:image" content="[^"]*og\/(de|en)\/home\.jpg">/,
          path,
        );
      }
      assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?>/, path);
      assert.match(html, /<meta name="twitter:title" content="[^"]+">/, path);
      assert.match(html, /<meta name="twitter:description" content="[^"]+">/, path);
      if (withImages) {
        assert.match(
          html,
          /<meta name="twitter:image" content="[^"]*og\/(de|en)\/home\.jpg">/,
          path,
        );
      }
      if (base) {
        assert.ok(html.includes(`<meta property="og:url" content="${base}${path}/">`), path);
        if (withImages)
          assert.ok(html.includes(`<meta property="og:image" content="${base}og/`), path);
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

test("the product page and the live demo are dark only", () => {
  const css = readFileSync(join(builds.local, "assets/live-demo.css"), "utf8");
  assert.match(css, /color-scheme:\s*dark/);
  assert.doesNotMatch(css, /prefers-color-scheme\s*:\s*light/);
  assert.doesNotMatch(css, /color-scheme:\s*light/);
  assert.ok(!existsSync(join(builds.local, "assets/mealie-atelier-mark-light.svg")));
  assert.ok(!existsSync("demo/site/week-dial-mark-light.svg"));
  for (const page of listFiles(builds.local, ".html")) {
    const html = read(page);
    assert.doesNotMatch(html, /prefers-color-scheme\s*:\s*light/, page);
    assert.doesNotMatch(html, /name="color-scheme" content="[^"]*light/, page);
    assert.doesNotMatch(html, /mark-light/, page);
  }
  const preview = readFileSync("demo/preview.html", "utf8");
  assert.doesNotMatch(preview, /prefers-color-scheme\s*:\s*light/);
  assert.match(preview, /theme: "dark"/, "live demo card config forces the dark theme");
  assert.match(preview, /themes: \{ darkMode: true \}/, "live demo hass reports dark mode");
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
  assert.match(metrics, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
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

// Reads the pixel size from the first start-of-frame marker of a JPEG.
function jpegSize(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    assert.equal(bytes[offset], 0xff, "JPEG marker expected");
    const marker = bytes[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  throw new Error("no JPEG frame header found");
}

function pagesBelow(root) {
  const pages = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (["assets", "showcase", "photos", "data", "og"].includes(entry.name)) continue;
      pages.push(...pagesBelow(path));
    } else if (entry.name === "index.html") pages.push(path);
  }
  return pages;
}

// Every page, the bare domain redirect included, must point its share image at a real JPEG of
// 1200x630 pixels under 300 KB that the build wrote. Crawlers such as Twitter/X ignore a meta refresh,
// so the root page needs the full card itself.
// Without Chromium and with an empty cache no share image exists. The build must still succeed and
// must not advertise image URLs it does not ship (they would 404 on the deployed site).
test("a build without Chromium and without cached share images emits no dead og:image or twitter:image", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-noog-"));
  const cache = mkdtempSync(join(tmpdir(), "atelier-og-empty-"));
  try {
    const env = { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: baseUrl };
    env.ATELIER_DEMO_OG_CACHE = cache;
    env.CHROME_BIN = "/nonexistent/chrome";
    env.HOME = "/nonexistent-home";
    delete env.ATELIER_DEMO_REQUIRE_OG;
    execFileSync("node", ["scripts/generate-demo-site.mjs"], { env, stdio: "pipe" });
    const pages = pagesBelow(out);
    assert.ok(pages.length >= 25, "pages were still generated");
    for (const page of pages) {
      const html = read(page);
      assert.doesNotMatch(html, /og:image|twitter:image/, `${page} advertises no missing image`);
    }
    assert.equal(existsSync(join(out, "og")) ? listFiles(join(out, "og"), ".jpg").length : 0, 0);
    assert.throws(
      () =>
        execFileSync("node", ["scripts/generate-demo-site.mjs"], {
          env: { ...env, ATELIER_DEMO_REQUIRE_OG: "1" },
          stdio: "pipe",
        }),
      "ATELIER_DEMO_REQUIRE_OG=1 turns the missing images into an error",
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
    rmSync(cache, { recursive: true, force: true });
  }
});

test("every generated page has og:image and twitter:image pointing at an existing 1200x630 JPEG", (t) => {
  if (!ogRendered(builds.local) || !ogRendered(builds.deployed)) {
    return t.skip("share images were not rendered: no headless Chromium and an empty OG cache");
  }
  for (const [build, base] of [
    [builds.deployed, baseUrl],
    [builds.local, ""],
  ]) {
    const pages = pagesBelow(build);
    assert.ok(pages.includes(join(build, "index.html")), "the root redirect page is covered");
    assert.ok(
      pages.length >= 1 + 2 + 2 + 20,
      "root, landing, credits and recipe pages are covered",
    );
    for (const page of pages) {
      const html = read(page);
      const og = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];
      const twitter = html.match(/<meta name="twitter:image" content="([^"]+)">/)?.[1];
      assert.ok(og, `${page} has og:image`);
      assert.equal(twitter, og, `${page} twitter:image matches og:image`);
      if (base) assert.ok(og.startsWith(`${base}og/`), `${page} og:image is absolute`);
      const file = base ? join(build, og.slice(base.length)) : join(dirname(page), og);
      assert.ok(existsSync(file), `${page} og:image target exists: ${file}`);
      const bytes = readFileSync(file);
      assert.ok(bytes.length < 300 * 1024, `${file} stays under 300 KB`);
      assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `${file} is a JPEG`);
      assert.deepEqual(jpegSize(bytes), { width: 1200, height: 630 }, `${file} is 1200x630`);
      assert.match(html, /<meta property="og:image:width" content="1200">/, page);
      assert.match(html, /<meta property="og:image:height" content="630">/, page);
      assert.match(html, /<meta property="og:image:alt" content="[^"]{10,}">/, page);
      assert.match(html, /<meta property="og:title" content="[^"]{5,}"\s*\/?>/, page);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?>/, page);
      assert.match(html, /<meta name="twitter:image:alt" content="[^"]{10,}">/, page);
      const locale = html.match(/<html lang="(de|en)"/)[1];
      const own = locale === "de" ? "de_DE" : "en_US";
      const other = locale === "de" ? "en_US" : "de_DE";
      assert.ok(html.includes(`<meta property="og:locale" content="${own}">`), page);
      assert.ok(html.includes(`<meta property="og:locale:alternate" content="${other}">`), page);
    }
  }
});

test("German share image alt texts on every recipe page keep the brand name after the preposition", (t) => {
  if (!ogRendered(builds.local)) {
    t.skip("share images were not rendered (no Chromium and no populated og cache)");
    return;
  }
  const catalog = JSON.parse(read(new URL("../demo/data/recipes.json", import.meta.url)));
  assert.equal(catalog.recipes.length, 10);
  for (const recipe of catalog.recipes) {
    const html = read(join(builds.local, `de/rezepte/${recipe.slug}/index.html`));
    assert.doesNotMatch(html, /Mealie Atelier Logo/, recipe.slug);
    assert.ok(
      html.includes(`content="${recipe.title.de}: Rezeptfoto mit dem Logo von Mealie Atelier"`),
      `${recipe.slug} og:image:alt`,
    );
  }
});

test("landing share image templates keep both screens whole, date free, and the recipe edge clean", async () => {
  const { landingHtml, recipeHtml, OG_HEIGHT } = await import("../scripts/og-images.mjs");
  const job = {
    locale: "en",
    tagline: "x",
    sub: "x",
    chips: ["a"],
    shots: ["file:///recipe.webp", "file:///shopping.webp"],
    crops: [462, 490],
    mark: "file:///m.svg",
    font: "file:///f.ttf",
  };
  const html = landingHtml(job);
  for (const [name, crop] of [
    ["a", 462],
    ["b", 490],
  ]) {
    const top = Number(new RegExp(`\\.${name} \\{[^}]*top: (\\d+)px`).exec(html)[1]);
    assert.ok(top + crop <= OG_HEIGHT - 16, `phone ${name} ends inside the frame`);
  }
  const source = read(new URL("../scripts/generate-demo-site.mjs", import.meta.url));
  const og = source.slice(source.indexOf("async function buildOgImages"));
  assert.doesNotMatch(
    og.slice(0, 600),
    /app-phone-today|mealplan/,
    "share image screens show no date",
  );
  const recipe = recipeHtml({
    ...job,
    title: "t",
    kicker: "k",
    foot: "f",
    photo: "file:///p.webp",
  });
  assert.doesNotMatch(recipe, /linear-gradient/, "no gradient seam over the photo");
});

test("every photo master matches its manifest size and the skillet eggs master is a native crop", () => {
  const manifest = JSON.parse(read(new URL("../demo/showcase/manifest.json", import.meta.url)));
  for (const [name, entry] of Object.entries(manifest.photos)) {
    const file = join(builds.local, `photos/${name}.webp`);
    assert.equal(webpWidth(file), entry.width, `${name} master width matches the manifest`);
  }
  // The source photo is 3456x4320 and the dish fills about 2100 px of it, so a 2100 px master is
  // a 1:1 crop. A smaller manifest or a stretched one would mean upscaled pixels.
  assert.equal(manifest.photos["pfannen-eier-mit-tomaten-und-basilikum"].width, 2100);
});

test("the share images and the page sources follow the Herb palette without a purple cast", () => {
  const sources = [
    ["demo/live-demo.css", readFileSync("demo/live-demo.css", "utf8")],
    ["scripts/og-images.mjs", readFileSync("scripts/og-images.mjs", "utf8")],
    ["scripts/generate-demo-site.mjs", readFileSync("scripts/generate-demo-site.mjs", "utf8")],
    ["demo/preview.html", readFileSync("demo/preview.html", "utf8")],
  ];
  for (const [name, text] of sources) {
    for (const m of text.matchAll(/#([0-9a-f]{6})\b|rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/gi)) {
      const [r, g, b] = m[1]
        ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
        : [+m[2], +m[3], +m[4]];
      assert.ok(
        !(r > g && b > g),
        `${name}: ${m[0]} leans plum or magenta (red and blue above green)`,
      );
    }
  }
  assert.doesNotMatch(
    readFileSync("scripts/og-images.mjs", "utf8"),
    /#e0784c|184,\s*83,\s*46/,
    "paprika is reserved for today",
  );
});

test("recipe hero sizes hint matches the side by side layout and metrics columns are even", () => {
  const html = readFileSync(
    join(builds.local, "en/recipes/gnocchi-alla-sorrentina/index.html"),
    "utf8",
  );
  const hero = html.match(/<img[^>]*class="recipe-photo"[^>]*>/)[0];
  assert.match(
    hero,
    /sizes="\(max-width: 899px\) min\(94vw, 520px\), \(max-width: 1250px\) 36vw, 481px"/,
  );
  const css = readFileSync(join(builds.local, "assets/live-demo.css"), "utf8");
  assert.match(css, /\.recipe-metrics \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("a retired brand file in a reused output folder does not ship", () => {
  assert.equal(existsSync(join(builds.local, "assets/mealie-atelier-icon-192.png")), false);
  assert.equal(existsSync(join(builds.local, "assets/apple-touch-icon.png")), true);
});

test("English recipe metric labels all start with a capital", () => {
  const html = readFileSync(
    join(builds.local, "en/recipes/gnocchi-alla-sorrentina/index.html"),
    "utf8",
  );
  const labels = [...html.matchAll(/<div><b>[^<]*<\/b><span>([^<]*)<\/span><\/div>/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(labels, ["Prep", "Cooking", "Servings", "Cuisine"]);
});

test("the root redirect stub is canonicalised to the German page and stays out of the hreflang set", () => {
  const deployed = read(join(builds.deployed, "index.html"));
  assert.ok(deployed.includes(`<link rel="canonical" href="${baseUrl}de/">`));
  assert.ok(!deployed.includes("hreflang"), "stub must not declare a one-sided hreflang set");
  const local = read(join(builds.local, "index.html"));
  assert.ok(!local.includes("hreflang") && !local.includes('rel="canonical"'));
});

test("German structured data carries German keywords and English data keeps English ones", () => {
  const keywordsOf = (html) =>
    [...html.matchAll(/"keywords":"([^"]*)"/g)].map((m) => m[1]).join(", ");
  const english = /vegetarian|one-pan|quick|family-friendly|make-ahead|freezer-friendly|dairy-free/;
  for (const out of Object.values(builds)) {
    const dePages = [
      join(out, "de", "index.html"),
      ...listFiles(join(out, "de", "rezepte"), ".html"),
    ];
    for (const page of dePages) {
      const keywords = keywordsOf(read(page));
      assert.ok(keywords, page);
      assert.ok(!english.test(keywords), `${page}: ${keywords}`);
    }
    assert.match(keywordsOf(read(join(out, "en", "index.html"))), /family-friendly/);
  }
});

test("OG recipe titles keep compound words whole instead of breaking at the hyphen", async () => {
  const { recipeHtml } = await import("../scripts/og-images.mjs");
  const html = recipeHtml({
    locale: "de",
    title: "Zitronen-Focaccia mit Rosmarin",
    kicker: "Backen",
    foot: "x",
    photo: "file:///p.webp",
    font: "file:///f.ttf",
    mark: "file:///m.svg",
  });
  assert.match(
    html,
    /<span class="nb">Zitronen-Focaccia<\/span> <span class="nb">mit Rosmarin<\/span>/,
  );
  assert.match(
    recipeHtml({
      locale: "de",
      title: "Kokos-Curry mit Kartoffeln und Karotten",
      kicker: "k",
      foot: "x",
      photo: "file:///p.webp",
      font: "file:///f.ttf",
      mark: "file:///m.svg",
    }),
    /<span class="nb">mit Kartoffeln<\/span> <span class="nb">und Karotten<\/span>/,
  );
  assert.match(html, /\.nb \{ white-space: nowrap; \}/);
  assert.match(html, /fontSize/);
});

test("OG source screenshots show no dialog close button and the German shopping bar has three tabs", (t) => {
  // Only a missing Pillow skips. A missing screenshot or a probe error must fail the test.
  try {
    execFileSync("python3", ["-I", "-c", "import PIL.Image"], { stdio: "pipe" });
  } catch {
    return t.skip("python3 with Pillow is not installed");
  }
  const probe = `
from PIL import Image
def px(path, box):
    im = Image.open(path).convert("RGB")
    k = im.width / 720
    x0, y0, x1, y1 = [int(v * k) for v in box]
    data = im.crop((x0, y0, x1, y1)).tobytes()
    return list(zip(data[0::3], data[1::3], data[2::3]))
dark = lambda path: sum(1 for r, g, b in px(path, (580, 56, 665, 143)) if max(r, g, b) < 80)
bright = lambda path, box: sum(1 for r, g, b in px(path, box) if r + g + b > 450)
for loc in ("de", "en"):
    for size in (360, 720):
        print("x", loc, size, dark("demo/showcase/%s/app-phone-recipe-%d.webp" % (loc, size)))
print("tab", bright("demo/showcase/de/app-phone-shopping-720.webp", (420, 85, 640, 110)))
`;
  const out = execFileSync("python3", ["-I", "-W", "error", "-c", probe], { encoding: "utf8" });
  for (const line of out.trim().split("\n")) {
    const [kind, ...rest] = line.split(" ");
    const count = Number(rest.at(-1));
    if (kind === "x") assert.ok(count < 20, `close button remnant in ${rest.join(" ")}`);
    else assert.ok(count > 300, "third German tab label is missing from the shopping screen");
  }
});

test("footer columns use h2 so the credits page never skips a heading level", () => {
  for (const page of contentPages(builds.local)) {
    const levels = [...read(page).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    levels.reduce((previous, level) => {
      assert.ok(level <= previous + 1, `${page} jumps from h${previous} to h${level}`);
      return level;
    }, 0);
  }
});

test("the three language switches have distinct landmark names on every page", () => {
  for (const page of contentPages(builds.local)) {
    const names = [
      ...read(page).matchAll(/<nav class="lang-switch[^"]*" aria-label="([^"]+)"/g),
    ].map((m) => m[1]);
    assert.equal(names.length, 3, page);
    assert.equal(new Set(names).size, 3, `${page} reuses a landmark name: ${names}`);
  }
});

test("every recipe page sends its own recipe slug to the live demo and the demo reads it", () => {
  const catalog = JSON.parse(read("demo/data/recipes.json")).recipes;
  for (const recipe of catalog) {
    for (const [locale, name] of [
      ["de", `de/rezepte/${recipe.slug}`],
      ["en", `en/recipes/${recipe.slugEn}`],
    ]) {
      const html = read(join(builds.local, name, "index.html"));
      const cta = html.slice(html.indexOf('class="wrap recipe-cta"'));
      assert.match(
        cta,
        new RegExp(
          `class="btn btn-primary" href="[^"]*/${locale}/\\?recipe=${recipe.slug}#live-demo"`,
        ),
        `${name} must link to its own recipe in the demo`,
      );
    }
  }
  const preview = read("demo/preview.html");
  assert.match(preview, /get\("recipe"\)/);
  assert.match(preview, /_openRecipe\(wantedSlug\)/);
  assert.match(preview, /data-action="cook-start"/);
});

test("recipe pages show rest time and total so they agree with the landing and JSON-LD", () => {
  const catalog = JSON.parse(read("demo/data/recipes.json")).recipes;
  const resting = catalog.filter((recipe) => recipe.restMinutes);
  assert.ok(resting.length >= 2);
  for (const recipe of resting) {
    const total = recipe.prepMinutes + recipe.cookMinutes + recipe.restMinutes;
    for (const [locale, name, rest, sum] of [
      ["de", `de/rezepte/${recipe.slug}`, "Ruhezeit", "Gesamt"],
      ["en", `en/recipes/${recipe.slugEn}`, "Resting", "Total"],
    ]) {
      const html = read(join(builds.local, name, "index.html"));
      const metrics = html.match(/<div class="recipe-metrics">[\s\S]*?<\/header>/)[0];
      assert.match(
        metrics,
        new RegExp(`<b>${recipe.restMinutes} [^<]+</b><span>${rest}</span>`),
        name,
      );
      assert.match(metrics, new RegExp(`<b>${total} [^<]+</b><span>${sum}</span>`), name);
      assert.ok(html.includes(`"totalTime":"PT${total}M"`), `${locale} JSON-LD total`);
    }
  }
});

test("every salt or pepper a recipe step calls for is on its ingredient list", () => {
  const catalog = JSON.parse(read("demo/data/recipes.json")).recipes;
  for (const recipe of catalog) {
    for (const [locale, salt, pepper] of [
      ["de", /Salz(?!wasser)|salzen/, /Pfeffer/],
      ["en", /\bsalt\b(?!ed)/i, /pepper/i],
    ]) {
      const steps = recipe.steps[locale].map((step) => step.text).join(" ");
      const list = recipe.ingredients[locale].join(" ");
      if (salt.test(steps.replace(/Meersalz/g, "")))
        assert.match(list, salt, `${recipe.slug} ${locale} salt`);
      if (pepper.test(steps)) assert.match(list, pepper, `${recipe.slug} ${locale} pepper`);
    }
  }
});

test("German landing copy uses idiomatic words for tap areas and nominal Abhaken", () => {
  const html = landing(builds.local, "de");
  assert.doesNotMatch(html, /große Ziele|Große Ziele/);
  assert.match(html, /Große Tippflächen für nasse Finger/);
  assert.match(html, /große Tippflächen am Küchentablet/);
  assert.match(html, /Daumen und Abhaken auch ohne Netz/);
});

test("the open mobile drawer makes the page inert and traps Tab inside the header", () => {
  const script = readFileSync("demo/site.js", "utf8");
  assert.match(script, /part\.inert = open/);
  assert.match(script, /event\.key !== "Tab"/);
  assert.match(script, /last\.focus\(\)/);
  assert.match(script, /first\.focus\(\)/);
});

test("story steps are never dimmed with opacity (contrast stays AA)", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../demo/live-demo.css", import.meta.url), "utf8");
  const block = css.match(/\n\.step \{[^}]*\}/)[0];
  assert.doesNotMatch(block, /opacity/);
});

test("recipe metric values never split a word mid-word (no overflow-wrap anywhere)", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../demo/live-demo.css", import.meta.url), "utf8");
  const blocks = css.match(/\.recipe-metrics b \{[^}]*\}/g);
  assert.ok(blocks.length >= 2);
  for (const block of blocks) assert.doesNotMatch(block, /overflow-wrap:\s*anywhere/);
});

test("every page links a web app manifest", () => {
  const manifest = JSON.parse(readFileSync(join(builds.local, "assets/site.webmanifest"), "utf8"));
  assert.deepEqual(
    manifest.icons.map((icon) => icon.purpose),
    ["any", "any", "maskable"],
  );
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(builds.local, "assets", icon.src)), icon.src);
  }
  for (const page of ["de/index.html", "en/index.html", "de/bildnachweise/index.html"]) {
    const file = join(builds.local, page);
    if (existsSync(file)) {
      assert.match(
        readFileSync(file, "utf8"),
        /<link rel="manifest" href="[^"]*site\.webmanifest">/,
        page,
      );
    }
  }
  const recipe = readdirSync(join(builds.local, "de/rezepte"))[0];
  assert.match(
    readFileSync(join(builds.local, "de/rezepte", recipe, "index.html"), "utf8"),
    /<link rel="manifest"/,
  );
});

test("demo mock responses are localized and free of dash punctuation", () => {
  const preview = read("demo/preview.html");
  for (const bad of ["DEMO – kein", "– Demo-", "DEMODATEN –", "USDA Live-Treffer"])
    assert.ok(!preview.includes(bad), `preview.html must not contain "${bad}"`);
  for (const german of [
    'issue: "Demo: Unklare Einheit"',
    'disclaimer: "',
    'source: "FIKTIVE',
    'note: "Demo-KI',
    'name: "Hafercuisine',
  ])
    assert.ok(!preview.includes(german), `${german} must go through tr()`);
  assert.match(preview, /DEMO: No real AI call\./);
});

test("ham and mushroom pizza does not halve already halved mushrooms again", () => {
  const recipe = JSON.parse(read("demo/data/recipes.json")).recipes.find(
    (r) => r.id === "ham-mushroom-pizza",
  );
  assert.ok(recipe);
  const text = JSON.stringify(recipe);
  assert.ok(!/Champignons halbieren/.test(text));
  assert.ok(!/halve the mushrooms/.test(text));
});

test("landing copy keeps counts honest, English footer heading in sentence case and one spelling variant", () => {
  const de = readFileSync(join(builds.local, "de/index.html"), "utf8");
  const en = readFileSync(join(builds.local, "en/index.html"), "utf8");
  for (const html of [de, en]) {
    assert.doesNotMatch(html, /Zehn Ansichten|Ten views/);
    assert.doesNotMatch(html, /(Rollen|roles) pro Person|roles per person/);
  }
  assert.match(en, /<h2>Open source<\/h2>/);
  assert.doesNotMatch(en, /<h2>Open Source<\/h2>/);
  assert.match(de, /<h2>Open Source<\/h2>/);
  for (const page of [en, readFileSync(join(builds.local, "en/credits/index.html"), "utf8")]) {
    assert.doesNotMatch(page, /favourite|trolley|chilli|colour|licence|catalogue/i);
  }
  const catalogJson = readFileSync("demo/data/recipes.json", "utf8");
  assert.doesNotMatch(catalogJson, /chilli|favourite/i);
});
