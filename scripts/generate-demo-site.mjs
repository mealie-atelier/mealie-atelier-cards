import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const cardsRoot = join(scriptDirectory, "..");
const demoRoot = join(cardsRoot, "demo");
const siteRoot = process.env.ATELIER_DEMO_OUT_DIR || join(demoRoot, "public-site");
const catalog = JSON.parse(await readFile(join(demoRoot, "data/recipes.json"), "utf8"));
const faviconAsset = "mealie-atelier-icon-192.png";
const template = await readFile(join(demoRoot, "preview.html"), "utf8");
const styles = join(demoRoot, "live-demo.css");
const searchModule = join(demoRoot, "recipe-search.js");
const bundle = join(cardsRoot, "dist/mealie-atelier-cards.js");
const localeIds = ["de", "en"];
const deploymentBase = resolveDeploymentBase(process.argv.slice(2));

function resolveDeploymentBase(args) {
  const argument = args.find((item) => item.startsWith("--base-url="))?.slice(11);
  const value = argument || process.env.ATELIER_DEMO_BASE_URL || "";
  if (!value) return "";
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.search || url.hash) {
    throw new Error("--base-url must be an absolute HTTP(S) URL without a query or fragment");
  }
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Demo catalog validation failed: ${message}`);
}

function validateCatalog() {
  const rows = catalog?.recipes;
  assert(Array.isArray(rows) && rows.length === 10, "expected exactly ten recipes");
  assert(new Set(rows.map((row) => row.id)).size === 10, "recipe IDs must be unique");
  assert(new Set(rows.map((row) => row.slug)).size === 10, "recipe slugs must be unique");
  for (const recipe of rows) {
    assert(/^[a-z0-9-]+$/.test(recipe.slug), `${recipe.id} has an unsafe slug`);
    assert(recipe.servings > 0, `${recipe.id} needs a serving count`);
    assert(recipe.prepMinutes >= 0 && recipe.cookMinutes >= 0, `${recipe.id} needs valid times`);
    assert(Array.isArray(recipe.tags) && recipe.tags.length, `${recipe.id} needs searchable tags`);
    assert(
      recipe.image?.url && new URL(recipe.image.url).hostname === "images.unsplash.com",
      `${recipe.id} needs a direct Unsplash CDN image`,
    );
    assert(
      recipe.image?.sourceUrl && new URL(recipe.image.sourceUrl).hostname === "unsplash.com",
      `${recipe.id} needs a photo source link`,
    );
    assert(
      recipe.image?.photographer && recipe.image?.photographerUrl,
      `${recipe.id} needs photographer attribution`,
    );
    for (const locale of localeIds) {
      assert(recipe.title?.[locale], `${recipe.id} is missing its ${locale} title`);
      assert(recipe.description?.[locale], `${recipe.id} is missing its ${locale} description`);
      assert(
        recipe.category?.[locale] && recipe.cuisine?.[locale],
        `${recipe.id} is missing ${locale} taxonomy`,
      );
      assert(recipe.image.alt?.[locale], `${recipe.id} is missing ${locale} image alt text`);
      assert(recipe.ingredients?.[locale]?.length >= 3, `${recipe.id} needs ${locale} ingredients`);
      assert(recipe.steps?.[locale]?.length >= 3, `${recipe.id} needs ${locale} cooking steps`);
      for (const step of recipe.steps[locale]) {
        assert(
          step.title && step.summary && step.text,
          `${recipe.id} has an incomplete ${locale} step`,
        );
      }
    }
  }
}

const copy = {
  de: {
    title: "Mealie Atelier – Das interaktive Küchenatelier",
    description:
      "Entdecke zehn vollständige Rezepte und erlebe, wie Mealie Atelier Suche, Planung, Einkauf und Kochen zu einem ruhigen Küchenflow verbindet.",
    eyebrow: "Zehn Rezepte. Ein kompletter Küchenflow.",
    heroTitle: "Gute Rezepte. Mehr Ruhe beim Kochen.",
    heroCopy:
      "Stöbere in echten, zweisprachigen Rezepten, plane die Woche, suche nach Zutaten und koche Schritt für Schritt – in einer interaktiven Demo des Mealie Ateliers.",
    localTitle: "Deine Demo bleibt deine.",
    localCopy:
      "Änderungen gelten nur in diesem Browser-Tab. Sie werden nicht an Mealie oder Home Assistant gesendet.",
    localNotice:
      "Demo-Modus: Suche, Haken, Planung und Timer verwenden Beispieldaten nur im Arbeitsspeicher dieses Tabs.",
    directoryTitle: "Zehn Rezepte zum Entdecken",
    directoryCopy:
      "Jedes Rezept enthält Mengen, Portionen, Zeitangaben und verständliche Kochschritte. Öffne einen Eintrag, um Zutaten und Zubereitung auch ohne die interaktive Demo zu lesen.",
    recipeIngredients: "Zutaten",
    recipeSteps: "Zubereitung",
    minutes: "Minuten",
    servings: "Portionen",
    photographer: "Foto von",
    unsplash: "Fotos von Unsplash, mit Credits zu den Fotograf:innen.",
    docs: "Dokumentation auf Alles Automatisch",
    backToDemo: "Interaktive Demo öffnen",
    recipeLabel: "Rezept",
    language: "Sprache wählen",
    notFound: "Rezept nicht gefunden",
  },
  en: {
    title: "Mealie Atelier – The interactive kitchen studio",
    description:
      "Explore ten complete recipes and see how Mealie Atelier brings search, planning, shopping and cooking into one calm kitchen flow.",
    eyebrow: "Ten recipes. One complete kitchen flow.",
    heroTitle: "Good recipes. A calmer way to cook.",
    heroCopy:
      "Explore real bilingual recipes, plan the week, search by ingredient and cook step by step in this interactive Mealie Atelier demo.",
    localTitle: "Your demo stays yours.",
    localCopy:
      "Changes only apply in this browser tab. Nothing is sent to Mealie or Home Assistant.",
    localNotice:
      "Demo mode: search, checkboxes, planning and timers use sample data in this tab's memory only.",
    directoryTitle: "Ten recipes to explore",
    directoryCopy:
      "Every recipe includes quantities, servings, timings and clear cooking steps. Open an entry to read its ingredients and method without using the interactive demo.",
    recipeIngredients: "Ingredients",
    recipeSteps: "Method",
    minutes: "minutes",
    servings: "servings",
    photographer: "Photo by",
    unsplash: "Photography by Unsplash contributors, with credit to each photographer.",
    docs: "Mealie Atelier documentation",
    backToDemo: "Open the interactive demo",
    recipeLabel: "Recipe",
    language: "Choose language",
    notFound: "Recipe not found",
  },
};

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function isoDuration(minutes) {
  return `PT${Math.max(0, Math.round(minutes))}M`;
}

function localizedData(locale) {
  const secondaryLocale = locale === "de" ? "en" : "de";
  return {
    schemaVersion: catalog.schemaVersion,
    locale,
    recipes: catalog.recipes.map((recipe) => ({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title[locale],
      description: recipe.description[locale],
      searchTerms: [
        recipe.title[secondaryLocale],
        recipe.description[secondaryLocale],
        recipe.category[secondaryLocale],
        recipe.cuisine[secondaryLocale],
        ...recipe.ingredients[secondaryLocale],
        ...recipe.steps[secondaryLocale].flatMap((step) => [step.title, step.summary, step.text]),
      ],
      category: recipe.category[locale],
      cuisine: recipe.cuisine[locale],
      tags: recipe.tags,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      ingredients: recipe.ingredients[locale],
      steps: recipe.steps[locale],
      image: {
        url: recipe.image.url,
        alt: recipe.image.alt[locale],
        photographer: recipe.image.photographer,
        photographerUrl: recipe.image.photographerUrl,
        sourceUrl: recipe.image.sourceUrl,
      },
    })),
  };
}

function recipeStructuredData(recipe, locale, url) {
  return {
    "@type": "Recipe",
    "@id": url ? `${url}#recipe` : undefined,
    url: url || undefined,
    name: recipe.title[locale],
    description: recipe.description[locale],
    image: [recipe.image.url],
    author: { "@type": "Organization", name: "Mealie Atelier Test Kitchen" },
    recipeCategory: recipe.category[locale],
    recipeCuisine: recipe.cuisine[locale],
    keywords: recipe.tags.join(", "),
    recipeYield: `${recipe.servings} ${copy[locale].servings}`,
    prepTime: isoDuration(recipe.prepMinutes),
    cookTime: isoDuration(recipe.cookMinutes),
    totalTime: isoDuration(recipe.prepMinutes + recipe.cookMinutes),
    recipeIngredient: recipe.ingredients[locale],
    recipeInstructions: recipe.steps[locale].map((step) => ({
      "@type": "HowToStep",
      name: step.title,
      text: step.text,
    })),
    inLanguage: locale,
  };
}

function recipePath(locale, recipe) {
  return locale === "de" ? `de/rezepte/${recipe.slug}/` : `en/recipes/${recipe.slug}/`;
}

function renderRecipeDirectory(locale) {
  const words = copy[locale];
  return catalog.recipes
    .map((recipe) => {
      const url = locale === "de" ? `./rezepte/${recipe.slug}/` : `./recipes/${recipe.slug}/`;
      const ingredientRows = recipe.ingredients[locale]
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      const stepRows = recipe.steps[locale]
        .map(
          (step) => `<li><strong>${escapeHtml(step.title)}.</strong> ${escapeHtml(step.text)}</li>`,
        )
        .join("");
      const time = recipe.prepMinutes + recipe.cookMinutes;
      return `<article class="demo-recipe"><details><summary><img src="${escapeHtml(recipe.image.url)}" alt="${escapeHtml(recipe.image.alt[locale])}" loading="lazy" decoding="async" width="640" height="600"><span class="demo-recipe-summary-copy"><span class="demo-recipe-meta">${time} ${words.minutes} · ${recipe.servings} ${words.servings}</span><h3>${escapeHtml(recipe.title[locale])}</h3><span class="demo-recipe-meta">${escapeHtml(recipe.category[locale])}</span></span></summary><div class="demo-recipe-body"><p>${escapeHtml(recipe.description[locale])}</p><h4>${words.recipeIngredients}</h4><ul>${ingredientRows}</ul><h4>${words.recipeSteps}</h4><ol>${stepRows}</ol><p class="demo-credit">${words.photographer} <a href="${escapeHtml(recipe.image.photographerUrl)}" rel="noopener noreferrer">${escapeHtml(recipe.image.photographer)}</a> · <a href="${escapeHtml(recipe.image.sourceUrl)}" rel="noopener noreferrer">Unsplash</a> · <a href="${escapeHtml(url)}">${words.recipeLabel}</a></p></div></details></article>`;
    })
    .join("\n");
}

function renderIndexPage(locale) {
  const words = copy[locale];
  const pageUrl = deploymentBase ? `${deploymentBase}${locale}/` : "";
  const deUrl = deploymentBase ? `${deploymentBase}de/` : locale === "de" ? "./" : "../de/";
  const enUrl = deploymentBase ? `${deploymentBase}en/` : locale === "en" ? "./" : "../en/";
  const recipeItems = catalog.recipes.map((recipe, index) => {
    const path = recipePath(locale, recipe);
    const url = deploymentBase ? `${deploymentBase}${path}` : "";
    return {
      "@type": "ListItem",
      position: index + 1,
      url: url || undefined,
      item: recipeStructuredData(recipe, locale, url),
    };
  });
  const jsonLd = safeJson({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: words.directoryTitle,
    numberOfItems: catalog.recipes.length,
    itemListElement: recipeItems,
  });
  const replacements = {
    __SEO_TITLE__: words.title,
    __SEO_DESCRIPTION__: words.description,
    __OG_IMAGE__: catalog.recipes[0].image.url,
    __CANONICAL_URL__: pageUrl,
    __GERMAN_URL__: deUrl,
    __ENGLISH_URL__: enUrl,
    __LANGUAGE_LABEL__: words.language,
    __HERO_EYEBROW__: words.eyebrow,
    __HERO_TITLE__: words.heroTitle,
    __HERO_COPY__: words.heroCopy,
    __LOCAL_TITLE__: words.localTitle,
    __LOCAL_COPY__: words.localCopy,
    __LOCAL_NOTICE__: words.localNotice,
    __DIRECTORY_TITLE__: words.directoryTitle,
    __DIRECTORY_COPY__: words.directoryCopy,
    __SEO_RECIPE_DIRECTORY__: renderRecipeDirectory(locale),
    __UNSPLASH_COPY__: words.unsplash,
    __DOCS_LINK__: words.docs,
    __DEMO_HOME__: pageUrl || "../",
    __JSON_LD__: jsonLd,
  };
  let html = replaceRequired(template, /<html lang="de">/, `<html lang="${locale}">`);
  html = html.replaceAll("__FAVICON__", `../assets/${faviconAsset}`);
  html = replaceRequired(html, /href="\.\/live-demo\.css"/, 'href="../assets/live-demo.css"');
  html = replaceRequired(
    html,
    /import "\.\.\/dist\/mealie-atelier-cards\.js";/,
    'import "../assets/mealie-atelier-cards.js";',
  );
  html = replaceRequired(
    html,
    /import \{ searchDemoRecipes \} from "\.\/recipe-search\.js";/,
    'import { searchDemoRecipes } from "../assets/recipe-search.js";',
  );
  html = replaceRequired(
    html,
    /fetch\("\.\/data\/recipes\.json"\)/,
    `fetch("../data/${locale}.json")`,
  );
  // Formatters may wrap this declaration, so whitespace between tokens is flexible.
  html = replaceRequired(
    html,
    /const demoLanguage =\s*new URLSearchParams\(window\.location\.search\)\.get\("lang"\) === "en" \? "en" : "de";/,
    `const demoLanguage = "${locale}";`,
  );
  for (const [token, value] of Object.entries(replacements)) {
    if (token === "__SEO_RECIPE_DIRECTORY__" || token === "__JSON_LD__") continue;
    html = html.replaceAll(token, escapeHtml(value));
  }
  html = html.replaceAll("__SEO_RECIPE_DIRECTORY__", replacements.__SEO_RECIPE_DIRECTORY__);
  html = html.replaceAll("__JSON_LD__", jsonLd);
  if (!pageUrl) html = html.replace(/\s*<link rel="canonical" href=""\s*\/?>/, "");
  html = html.replaceAll('aria-current="page"', "");
  html = html.replace(`data-language="${locale}"`, `data-language="${locale}" aria-current="page"`);
  return html;
}

// A template anchor that no longer matches would silently ship a broken page.
function replaceRequired(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Demo template anchor not found: ${pattern}`);
  return html.replace(pattern, () => replacement);
}

function renderRecipePage(locale, recipe) {
  const words = copy[locale];
  const path = recipePath(locale, recipe);
  const pageUrl = deploymentBase ? `${deploymentBase}${path}` : "";
  const counterpartLocale = locale === "de" ? "en" : "de";
  const counterpartPath = recipePath(counterpartLocale, recipe);
  const counterpartUrl = deploymentBase
    ? `${deploymentBase}${counterpartPath}`
    : `../../../${counterpartPath}`;
  const currentDemoUrl = deploymentBase ? `${deploymentBase}${locale}/` : `../../../${locale}/`;
  const canonical = pageUrl ? `<link rel="canonical" href="${escapeHtml(pageUrl)}">` : "";
  const image = `<img class="seo-recipe-image" src="${escapeHtml(recipe.image.url)}" alt="${escapeHtml(recipe.image.alt[locale])}" width="1200" height="800" fetchpriority="high">`;
  const ingredients = recipe.ingredients[locale]
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const steps = recipe.steps[locale]
    .map(
      (step, index) =>
        `<li><h2>${index + 1}. ${escapeHtml(step.title)}</h2><p class="seo-step-summary">${escapeHtml(step.summary)}</p><p>${escapeHtml(step.text)}</p></li>`,
    )
    .join("");
  const structured = safeJson({
    "@context": "https://schema.org",
    ...recipeStructuredData(recipe, locale, pageUrl),
  });
  const metricLabel = `${recipe.prepMinutes} ${words.minutes} prep · ${recipe.cookMinutes} ${words.minutes} cooking · ${recipe.servings} ${words.servings}`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(recipe.description[locale])}"><meta name="theme-color" content="#f4f1eb"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(recipe.title[locale])} · Mealie Atelier"><meta property="og:description" content="${escapeHtml(recipe.description[locale])}"><meta property="og:image" content="${escapeHtml(recipe.image.url)}"><link rel="icon" type="image/png" href="../../../assets/${faviconAsset}">${canonical}<link rel="alternate" hreflang="de" href="${escapeHtml(deploymentBase ? `${deploymentBase}${recipePath("de", recipe)}` : counterpartLocale === "de" ? counterpartUrl : currentDemoUrl)}"><link rel="alternate" hreflang="en" href="${escapeHtml(deploymentBase ? `${deploymentBase}${recipePath("en", recipe)}` : counterpartLocale === "en" ? counterpartUrl : currentDemoUrl)}"><link rel="stylesheet" href="../../../assets/live-demo.css"><title>${escapeHtml(recipe.title[locale])} · Mealie Atelier</title><script type="application/ld+json">${structured}</script></head><body class="seo-recipe-body"><main class="seo-recipe-page"><header class="demo-header"><a class="demo-brand" href="${escapeHtml(currentDemoUrl)}"><span class="demo-brand-mark" aria-hidden="true">M</span><span>Mealie Atelier</span></a><a class="seo-back-link" href="${escapeHtml(currentDemoUrl)}">${words.backToDemo}</a></header><article><p class="demo-eyebrow">${words.recipeLabel} · ${escapeHtml(recipe.category[locale])}</p><h1>${escapeHtml(recipe.title[locale])}</h1><p class="seo-recipe-description">${escapeHtml(recipe.description[locale])}</p><p class="seo-recipe-meta">${escapeHtml(metricLabel)}</p>${image}<p class="demo-credit">${words.photographer} <a href="${escapeHtml(recipe.image.photographerUrl)}" rel="noopener noreferrer">${escapeHtml(recipe.image.photographer)}</a> · <a href="${escapeHtml(recipe.image.sourceUrl)}" rel="noopener noreferrer">Unsplash</a></p><section><h2>${words.recipeIngredients}</h2><p>${recipe.servings} ${words.servings}</p><ul class="seo-ingredient-list">${ingredients}</ul></section><section><h2>${words.recipeSteps}</h2><ol class="seo-instruction-list">${steps}</ol></section><p><a class="seo-back-link" href="${escapeHtml(counterpartUrl)}">${counterpartLocale.toUpperCase()}</a></p></article><footer class="demo-footer"><span>Made with love by <a href="https://alles-automatisch.de/">Daniel</a></span><a href="https://alles-automatisch.de/">${words.docs}</a></footer></main></body></html>`;
}

function localizedRecipePage(locale, slug) {
  const recipe = catalog.recipes.find((row) => row.slug === slug);
  assert(recipe, `unknown recipe slug ${slug}`);
  return renderRecipePage(locale, recipe);
}

function rootIndex() {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><link rel="icon" type="image/png" href="assets/${faviconAsset}"><title>${copy.de.title}</title><link rel="alternate" hreflang="de" href="de/"><link rel="alternate" hreflang="en" href="en/"><meta http-equiv="refresh" content="0;url=de/"></head><body><p>Demo laden: <a href="de/">Deutsch</a> · <a href="en/">English</a></p></body></html>`;
}

validateCatalog();
await mkdir(join(siteRoot, "assets"), { recursive: true });
await mkdir(join(siteRoot, "data"), { recursive: true });
await copyFile(styles, join(siteRoot, "assets/live-demo.css"));
await copyFile(searchModule, join(siteRoot, "assets/recipe-search.js"));
await copyFile(bundle, join(siteRoot, "assets/mealie-atelier-cards.js"));
await copyFile(join(cardsRoot, "brand/icon-192.png"), join(siteRoot, "assets", faviconAsset));
await writeFile(join(siteRoot, "index.html"), rootIndex());

const sitemapUrls = [];
for (const locale of localeIds) {
  const indexPath = join(siteRoot, locale, "index.html");
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(indexPath, renderIndexPage(locale));
  await writeFile(
    join(siteRoot, "data", `${locale}.json`),
    `${JSON.stringify(localizedData(locale), null, 2)}\n`,
  );
  sitemapUrls.push(`${deploymentBase}${locale}/`);
  for (const recipe of catalog.recipes) {
    const publicPath = recipePath(locale, recipe);
    const target = join(siteRoot, publicPath, "index.html");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, localizedRecipePage(locale, recipe.slug));
    if (deploymentBase) sitemapUrls.push(`${deploymentBase}${publicPath}`);
  }
}

if (deploymentBase) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`).join("")}</urlset>`;
  await writeFile(join(siteRoot, "sitemap.xml"), sitemap);
  await writeFile(
    join(siteRoot, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${deploymentBase}sitemap.xml\n`,
  );
} else {
  await unlink(join(siteRoot, "sitemap.xml")).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await writeFile(join(siteRoot, "robots.txt"), "User-agent: *\nAllow: /\n");
}

console.log(
  `Generated bilingual demo with ${catalog.recipes.length} recipes, 2 live demo pages, and ${catalog.recipes.length * 2} SEO recipe pages.`,
);
console.log(
  deploymentBase
    ? `Canonical URLs and sitemap use ${deploymentBase}`
    : "Set ATELIER_DEMO_BASE_URL to emit canonical URLs and a sitemap.",
);
