import {
  access,
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rmdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { OG_HEIGHT, OG_WIDTH, landingHtml, recipeHtml, renderOgImages } from "./og-images.mjs";
import { fileURLToPath } from "node:url";
import {
  brandMark,
  escapeHtml,
  iconLinks,
  renderSiteFooter,
  renderSiteHeader,
  translator,
} from "../demo/site/chrome.mjs";
import { creditRow, photo, photoCaption } from "../demo/site/media.mjs";
import { demoClose, renderIntro } from "../demo/site/sections-intro.mjs";
import { renderClosing, renderDirectory, renderRoutes } from "../demo/site/sections-routes.mjs";
import { renderStory } from "../demo/site/sections-story.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const cardsRoot = join(scriptDirectory, "..");
const demoRoot = join(cardsRoot, "demo");
const siteRoot = process.env.ATELIER_DEMO_OUT_DIR || join(demoRoot, "public-site");
const catalog = JSON.parse(await readFile(join(demoRoot, "data/recipes.json"), "utf8"));
const brandAssets = ["favicon.svg", "favicon.ico", "apple-touch-icon.png"];
const template = await readFile(join(demoRoot, "preview.html"), "utf8");
const styles = join(demoRoot, "live-demo.css");
const siteScript = join(demoRoot, "site.js");
const showcase = JSON.parse(await readFile(join(demoRoot, "showcase/manifest.json"), "utf8"));
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

const ogLocales = { de: "de_DE", en: "en_US" };
const ogTaglines = {
  de: {
    tagline: "Eine ruhige Küche für dein <em>Mealie</em>.",
    sub: "Woche planen, einkaufen, Schritt für Schritt kochen.",
    chips: ["Kostenlos", "Open Source", "Live-Demo"],
    crops: [489, 490],
  },
  en: {
    tagline: "A calm kitchen for your <em>Mealie</em>.",
    sub: "Plan the week, shop, cook step by step.",
    chips: ["Free", "Open source", "Live demo"],
    crops: [462, 490],
  },
};

function ogPath(locale, recipe) {
  const name = !recipe ? "home" : locale === "de" ? recipe.slug : recipe.slugEn;
  return `og/${locale}/${name}.jpg`;
}

function ogAlt(locale, recipe) {
  if (recipe) {
    return locale === "de"
      ? `${recipe.title.de}: Rezeptfoto mit dem Logo von Mealie Atelier`
      : `${recipe.title.en}: recipe photo with the Mealie Atelier logo`;
  }
  return locale === "de"
    ? "Mealie Atelier: eine ruhige Küche für dein Mealie, mit Wochenplan und Kochmodus auf dem Smartphone"
    : "Mealie Atelier: a calm kitchen for your Mealie, with the meal plan and cooking mode on a phone";
}

// Meta tags for the share image of a page. Local builds fall back to a relative URL.
function ogImageMeta(locale, recipe, prefix) {
  const url = escapeHtml(`${deploymentBase || prefix}${ogPath(locale, recipe)}`);
  const alt = escapeHtml(ogAlt(locale, recipe));
  const other = locale === "de" ? "en" : "de";
  return [
    `<meta property="og:image" content="${url}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:width" content="${OG_WIDTH}">`,
    `<meta property="og:image:height" content="${OG_HEIGHT}">`,
    `<meta property="og:image:alt" content="${alt}">`,
    `<meta property="og:locale" content="${ogLocales[locale]}">`,
    `<meta property="og:locale:alternate" content="${ogLocales[other]}">`,
    `<meta name="twitter:image" content="${url}">`,
    `<meta name="twitter:image:alt" content="${alt}">`,
  ].join("");
}

async function buildOgImages() {
  const fileUrl = (path) => `file://${path}`;
  const font = join(demoRoot, "og/BricolageGrotesque.ttf");
  const mark = join(cardsRoot, "demo/site/week-dial-mark.svg");
  const jobs = [];
  for (const locale of localeIds) {
    const shots = ["app-phone-recipe-720", "app-phone-shopping-720"].map((name) =>
      join(demoRoot, `showcase/${locale}/${name}.webp`),
    );
    const words = ogTaglines[locale];
    jobs.push({
      output: ogPath(locale, null),
      inputs: [font, mark, ...shots],
      html: landingHtml({
        locale,
        ...words,
        font: fileUrl(font),
        mark: fileUrl(mark),
        shots: shots.map(fileUrl),
      }),
    });
    for (const recipe of catalog.recipes) {
      const image = join(demoRoot, "photos", photoName(recipe));
      jobs.push({
        output: ogPath(locale, recipe),
        inputs: [font, mark, image],
        html: recipeHtml({
          locale,
          title: recipe.title[locale],
          kicker: recipe.category[locale],
          foot: ogTaglines[locale].chips.join(" · "),
          photo: fileUrl(image),
          font: fileUrl(font),
          mark: fileUrl(mark),
        }),
      });
    }
  }
  return renderOgImages(jobs, join(demoRoot, ".og-cache"));
}

// Photos are self-hosted: the catalog names a local file relative to recipes.json.
function photoName(recipe) {
  return basename(recipe.image.file);
}

function photoUrl(recipe, prefix) {
  return `${deploymentBase || prefix}photos/${photoName(recipe)}`;
}

async function validateCatalog() {
  const rows = catalog?.recipes;
  assert(Array.isArray(rows) && rows.length === 10, "expected exactly ten recipes");
  assert(new Set(rows.map((row) => row.id)).size === 10, "recipe IDs must be unique");
  assert(new Set(rows.map((row) => row.slug)).size === 10, "recipe slugs must be unique");
  assert(new Set(rows.map((row) => row.slugEn)).size === 10, "English recipe slugs must be unique");
  for (const recipe of rows) {
    assert(/^[a-z0-9-]+$/.test(recipe.slug), `${recipe.id} has an unsafe slug`);
    assert(/^[a-z0-9-]+$/.test(recipe.slugEn ?? ""), `${recipe.id} needs a safe English slug`);
    assert(recipe.servings > 0, `${recipe.id} needs a serving count`);
    assert(recipe.prepMinutes >= 0 && recipe.cookMinutes >= 0, `${recipe.id} needs valid times`);
    assert((recipe.restMinutes ?? 0) >= 0, `${recipe.id} needs a valid rest time`);
    assert(Array.isArray(recipe.tags) && recipe.tags.length, `${recipe.id} needs searchable tags`);
    assert(
      /^\.\.\/photos\/[a-z0-9-]+\.webp$/.test(recipe.image?.file ?? "") && !recipe.image.url,
      `${recipe.id} needs a self-hosted photo under demo/photos`,
    );
    await access(join(demoRoot, "photos", photoName(recipe))).catch(() =>
      assert(false, `${recipe.id} photo file is missing`),
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
    title: "Mealie Atelier: die ruhige Küche für dein Mealie, mit oder ohne Home Assistant",
    description:
      "Mealie Atelier macht aus deinem selbst gehosteten Mealie eine schöne Küche: Woche planen, einkaufen, Schritt für Schritt kochen. Kostenlos, Open Source, mit Live-Demo.",
    directoryTitle: "Zehn Rezepte zum Entdecken",
    recipeIngredients: "Zutaten",
    recipeSteps: "Zubereitung",
    minutes: "Minuten",
    withRest: "inkl. Ruhezeit",
    prep: "Vorbereitung",
    cooking: "Kochen",
    rest: "Ruhezeit",
    total: "Gesamt",
    servings: "Portionen",
    appDescription:
      "Eine ruhige Küchenoberfläche für Mealie: Wochenplan, Einkaufsliste, Kochmodus und Vorräte, als Karten für Home Assistant oder als eigenständige Web-App.",
    backToDemo: "Zur Live-Demo",
    recipeLabel: "Rezept",
    openRecipe: "Rezeptseite öffnen",
    tryInDemo: "Dieses Rezept in der Live-Demo kochen",
    tryButton: "Jetzt kochen",
    otherLanguage: "This recipe in English",
  },
  en: {
    title: "Mealie Atelier: a calm kitchen for your Mealie, with or without Home Assistant",
    description:
      "Mealie Atelier turns your self-hosted Mealie into a beautiful kitchen: plan the week, shop, cook step by step. Free, open source, with a live demo.",
    directoryTitle: "Ten recipes to explore",
    recipeIngredients: "Ingredients",
    recipeSteps: "Method",
    minutes: "minutes",
    withRest: "incl. resting",
    prep: "prep",
    cooking: "cooking",
    rest: "resting",
    total: "total",
    servings: "servings",
    appDescription:
      "A calm kitchen interface for Mealie: meal plan, shopping list, cooking mode and pantry, as cards for Home Assistant or as a standalone web app.",
    backToDemo: "Go to the live demo",
    recipeLabel: "Recipe",
    openRecipe: "Open the recipe page",
    tryInDemo: "Cook this recipe in the live demo",
    tryButton: "Cook it now",
    otherLanguage: "Dieses Rezept auf Deutsch",
  },
};

function applicationJsonLd(locale, pageUrl) {
  return safeJson({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mealie Atelier",
    description: copy[locale].appDescription,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Home Assistant, Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    url: pageUrl || undefined,
    inLanguage: locale,
    author: { "@type": "Person", name: "Daniel Boberg", url: "https://alles-automatisch.de" },
  });
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Total time includes dough rests (restMinutes), otherwise bread and pizza would claim to be done
// long before their own steps allow.
function totalMinutes(recipe) {
  return recipe.prepMinutes + recipe.cookMinutes + (recipe.restMinutes ?? 0);
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
        file: `../photos/${photoName(recipe)}`,
        alt: recipe.image.alt[locale],
        photographer: recipe.image.photographer,
        photographerUrl: recipe.image.photographerUrl,
        sourceUrl: recipe.image.sourceUrl,
      },
    })),
  };
}

const tagLabels = {
  vegetarian: { de: "vegetarisch", en: "vegetarian" },
  vegan: { de: "vegan", en: "vegan" },
  quick: { de: "schnell", en: "quick" },
  "one-pan": { de: "eine Pfanne", en: "one-pan" },
  "family-friendly": { de: "familienfreundlich", en: "family-friendly" },
  "make-ahead": { de: "vorbereiten", en: "make-ahead" },
  "freezer-friendly": { de: "einfrierbar", en: "freezer-friendly" },
  "dairy-free": { de: "milchfrei", en: "dairy-free" },
};

function tagLabel(tag, locale) {
  const label = tagLabels[tag]?.[locale];
  assert(label, `tag "${tag}" needs a ${locale} label`);
  return label;
}

function recipeStructuredData(recipe, locale, url, prefix) {
  return {
    "@type": "Recipe",
    "@id": url ? `${url}#recipe` : undefined,
    url: url || undefined,
    name: recipe.title[locale],
    description: recipe.description[locale],
    image: [photoUrl(recipe, prefix)],
    author: { "@type": "Organization", name: "Mealie Atelier Test Kitchen" },
    recipeCategory: recipe.category[locale],
    recipeCuisine: recipe.cuisine[locale],
    keywords: recipe.tags.map((tag) => tagLabel(tag, locale)).join(", "),
    recipeYield: `${recipe.servings} ${copy[locale].servings}`,
    prepTime: isoDuration(recipe.prepMinutes),
    cookTime: isoDuration(recipe.cookMinutes),
    totalTime: isoDuration(totalMinutes(recipe)),
    recipeIngredient: recipe.ingredients[locale],
    recipeInstructions: recipe.steps[locale].map((step) => ({
      "@type": "HowToStep",
      name: step.title,
      text: step.text,
    })),
    inLanguage: locale,
  };
}

// English pages use an English slug (slugEn) so the URL reads like the title; the photo and the
// internal id keep the German slug.
function recipePath(locale, recipe) {
  return locale === "de" ? `de/rezepte/${recipe.slug}/` : `en/recipes/${recipe.slugEn}/`;
}

function creditsPath(locale) {
  return locale === "de" ? "de/bildnachweise/" : "en/credits/";
}

// Thumbnails sit near the bottom of the page and load lazily; the browser picks the 360 px file.
function renderRecipeDirectory(ctx) {
  const words = copy[ctx.locale];
  return catalog.recipes
    .map((recipe) => {
      const url = ctx.recipeUrl(recipe);
      const ingredientRows = recipe.ingredients[ctx.locale]
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      const stepRows = recipe.steps[ctx.locale]
        .map(
          (step) => `<li><strong>${escapeHtml(step.title)}.</strong> ${escapeHtml(step.text)}</li>`,
        )
        .join("");
      const time = totalMinutes(recipe);
      const restNote = recipe.restMinutes ? ` ${words.withRest}` : "";
      const thumb = photo(ctx, recipe, "112px", { className: "thumb" });
      return `<article class="recipe-item"><details><summary>${thumb}<span class="recipe-item-copy"><span class="meta">${time}&nbsp;${words.minutes}${restNote} · ${recipe.servings}&nbsp;${words.servings}</span><h3>${escapeHtml(recipe.title[ctx.locale])}</h3><span class="meta">${escapeHtml(recipe.category[ctx.locale])}</span></span><span class="chev" aria-hidden="true"></span></summary><div class="recipe-item-body"><p>${escapeHtml(recipe.description[ctx.locale])}</p><div class="recipe-item-cols"><div><h4>${words.recipeIngredients}</h4><ul>${ingredientRows}</ul></div><div><h4>${words.recipeSteps}</h4><ol>${stepRows}</ol></div></div><div class="recipe-item-foot"><a class="textlink" href="${escapeHtml(url)}">${words.openRecipe}<svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></a></div></div></details></article>`;
    })
    .join("");
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
      item: recipeStructuredData(recipe, locale, url, "../"),
    };
  });
  const jsonLd = safeJson({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: words.directoryTitle,
    numberOfItems: catalog.recipes.length,
    itemListElement: recipeItems,
  });
  const ctx = {
    locale,
    root: "../",
    manifest: showcase,
    recipes: catalog.recipes,
    recipeUrl: (recipe) =>
      locale === "de" ? `./rezepte/${recipe.slug}/` : `./recipes/${recipe.slugEn}/`,
    home: { de: deUrl, en: enUrl },
    alternate: { de: deUrl, en: enUrl },
    creditsUrl: locale === "de" ? "./bildnachweise/" : "./credits/",
    onLanding: true,
  };
  const replacements = {
    __SEO_TITLE__: words.title,
    __SEO_DESCRIPTION__: words.description,
    __OG_IMAGE_META__: ogImageMeta(locale, null, "../"),
    __CANONICAL_URL__: pageUrl,
    __GERMAN_URL__: deUrl,
    __ENGLISH_URL__: enUrl,
    __JSON_LD__: jsonLd,
    __APP_JSON_LD__: applicationJsonLd(locale, pageUrl),
    __OG_URL_META__: pageUrl ? `<meta property="og:url" content="${escapeHtml(pageUrl)}" />` : "",
    __SITE_HEADER__: renderSiteHeader(ctx),
    __SECTIONS_BEFORE_DEMO__: renderIntro(ctx),
    __SECTIONS_AFTER_DEMO__:
      demoClose() +
      renderStory(ctx) +
      renderRoutes(ctx) +
      renderDirectory(ctx, renderRecipeDirectory(ctx)) +
      renderClosing(ctx),
    __SITE_FOOTER__: renderSiteFooter(ctx),
  };
  const rawTokens = new Set([
    "__JSON_LD__",
    "__APP_JSON_LD__",
    "__OG_URL_META__",
    "__OG_IMAGE_META__",
    "__SITE_HEADER__",
    "__SECTIONS_BEFORE_DEMO__",
    "__SECTIONS_AFTER_DEMO__",
    "__SITE_FOOTER__",
  ]);
  let html = replaceRequired(template, /<html lang="de">/, `<html lang="${locale}">`);
  html = html.replace("__ICON_LINKS__", () => iconLinks("../assets/"));
  html = replaceRequired(html, /href="\.\/live-demo\.css"/, 'href="../assets/live-demo.css"');
  html = replaceRequired(html, /src="\.\/site\.js"/, 'src="../assets/site.js"');
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
    html = html.replaceAll(token, () => (rawTokens.has(token) ? value : escapeHtml(value)));
  }
  if (!pageUrl) html = html.replace(/\s*<link rel="canonical" href=""\s*\/?>/, "");
  return html;
}

// A template anchor that no longer matches would silently ship a broken page.
function replaceRequired(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Demo template anchor not found: ${pattern}`);
  return html.replace(pattern, () => replacement);
}

function renderRecipePage(locale, recipe) {
  const words = copy[locale];
  const t = translator(locale);
  const path = recipePath(locale, recipe);
  const pageUrl = deploymentBase ? `${deploymentBase}${path}` : "";
  const counterpartLocale = locale === "de" ? "en" : "de";
  const localUrl = (target) =>
    deploymentBase ? `${deploymentBase}${target}` : `../../../${target}`;
  const counterpartUrl = localUrl(recipePath(counterpartLocale, recipe));
  const demoHome = { de: localUrl("de/"), en: localUrl("en/") };
  const recipeUrls = {
    de: localUrl(recipePath("de", recipe)),
    en: localUrl(recipePath("en", recipe)),
  };
  if (!deploymentBase) recipeUrls[locale] = "./";
  const ctx = {
    locale,
    root: "../../../",
    manifest: showcase,
    recipes: catalog.recipes,
    home: demoHome,
    alternate: recipeUrls,
    creditsUrl: localUrl(creditsPath(locale)),
    onLanding: false,
  };
  const canonical = pageUrl ? `<link rel="canonical" href="${escapeHtml(pageUrl)}">` : "";
  const image = photo(
    ctx,
    recipe,
    "(max-width: 899px) min(94vw, 520px), (max-width: 1250px) 36vw, 481px",
    {
      eager: true,
      priority: true,
      className: "recipe-photo",
    },
  );
  const ingredients = recipe.ingredients[locale]
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const steps = recipe.steps[locale]
    .map(
      (step, index) =>
        `<li><span class="step-no" aria-hidden="true">${index + 1}</span><div><h3>${escapeHtml(step.title)}</h3><p class="step-summary">${escapeHtml(step.summary)}</p><p>${escapeHtml(step.text)}</p></div></li>`,
    )
    .join("");
  const structured = safeJson({
    "@context": "https://schema.org",
    ...recipeStructuredData(recipe, locale, pageUrl, "../../../"),
  });
  // A zero time means the step does not exist for this recipe, so it is left out.
  const metrics = [
    recipe.prepMinutes ? [`${recipe.prepMinutes} ${words.minutes}`, capitalize(words.prep)] : null,
    recipe.cookMinutes
      ? [`${recipe.cookMinutes} ${words.minutes}`, capitalize(words.cooking)]
      : null,
    // Dough rests are part of the facts so the page agrees with the total on the landing and in JSON-LD.
    recipe.restMinutes ? [`${recipe.restMinutes} ${words.minutes}`, capitalize(words.rest)] : null,
    recipe.restMinutes
      ? [`${totalMinutes(recipe)} ${words.minutes}`, capitalize(words.total)]
      : null,
    [`${recipe.servings}`, capitalize(words.servings)],
    [escapeHtml(recipe.cuisine[locale]), t("Küche", "Cuisine")],
  ]
    .filter(Boolean)
    .map(([value, label]) => `<div><b>${value}</b><span>${label}</span></div>`)
    .join("");
  const hreflang = (code, href) =>
    `<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}">`;
  const absolute = {
    de: deploymentBase ? recipeUrls.de : locale === "de" ? "./" : counterpartUrl,
    en: deploymentBase ? recipeUrls.en : locale === "en" ? "./" : counterpartUrl,
  };
  const title = `${escapeHtml(recipe.title[locale])} · Mealie Atelier`;
  const description = escapeHtml(recipe.description[locale]);
  const ogImage = ogImageMeta(locale, recipe, "../../../");
  const recipeOgUrl = pageUrl ? `<meta property="og:url" content="${escapeHtml(pageUrl)}">` : "";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${description}"><meta name="theme-color" content="#f2e9d8" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0c120f" media="(prefers-color-scheme: dark)"><meta name="color-scheme" content="dark light"><meta property="og:type" content="article"><meta property="og:site_name" content="Mealie Atelier"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}">${ogImage}${recipeOgUrl}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">${iconLinks("../../../assets/")}${canonical}${hreflang("de", absolute.de)}${hreflang("en", absolute.en)}${hreflang("x-default", absolute.de)}<link rel="stylesheet" href="../../../assets/live-demo.css"><title>${title}</title><script type="application/ld+json">${structured}</script></head><body class="recipe-body">${renderSiteHeader(ctx)}<main id="main" class="recipe-page"><article><div class="wrap"><nav class="crumbs" aria-label="${t("Brotkrümel", "Breadcrumb")}"><a href="${escapeHtml(demoHome[locale])}">Mealie Atelier</a><span aria-hidden="true">/</span><a href="${escapeHtml(`${demoHome[locale]}#${locale === "de" ? "rezepte" : "recipes"}`)}">${t("Rezepte", "Recipes")}</a></nav></div><div class="wrap recipe-hero"><header class="recipe-head"><p class="kicker"><span class="dot"></span>${words.recipeLabel} · ${escapeHtml(recipe.category[locale])}</p><h1>${escapeHtml(recipe.title[locale])}</h1><p class="lead">${description}</p><div class="recipe-metrics">${metrics}</div></header><figure class="recipe-figure">${image}<figcaption>${photoCaption(ctx, recipe)}</figcaption></figure></div><div class="wrap recipe-grid"><section class="recipe-ingredients" aria-labelledby="ingredients-title"><h2 id="ingredients-title">${words.recipeIngredients}</h2><p class="meta">${recipe.servings} ${words.servings}</p><ul>${ingredients}</ul></section><section class="recipe-method" aria-labelledby="method-title"><h2 id="method-title">${words.recipeSteps}</h2><ol>${steps}</ol></section></div><aside class="wrap recipe-cta"><div class="recipe-cta-inner">${brandMark()}<div><h2>${words.tryInDemo}</h2><p>${t("Kochmodus mit Timer, Wochenplan und Einkaufsliste: alles in der echten Karte, direkt im Browser.", "Cooking mode with timers, meal plan and shopping list: all in the real card, right in your browser.")}</p></div><div class="btn-row"><a class="btn btn-primary" href="${escapeHtml(`${demoHome[locale]}?recipe=${encodeURIComponent(recipe.slug)}#live-demo`)}">${words.tryButton}</a><a class="btn btn-ghost" href="${escapeHtml(counterpartUrl)}" hreflang="${counterpartLocale}" lang="${counterpartLocale}">${words.otherLanguage}</a></div></div></aside></article></main>${renderSiteFooter(ctx)}<script type="module" src="../../../assets/site.js"></script></body></html>`;
}

// The one complete credits list, linked from every footer.
function renderCreditsPage(locale) {
  const words = copy[locale];
  const t = translator(locale);
  const path = creditsPath(locale);
  const pageUrl = deploymentBase ? `${deploymentBase}${path}` : "";
  const counterpartLocale = locale === "de" ? "en" : "de";
  const localUrl = (target) => (deploymentBase ? `${deploymentBase}${target}` : `../../${target}`);
  const demoHome = { de: localUrl("de/"), en: localUrl("en/") };
  const pageUrls = { de: localUrl(creditsPath("de")), en: localUrl(creditsPath("en")) };
  if (!deploymentBase) pageUrls[locale] = "./";
  const ctx = {
    locale,
    root: "../../",
    manifest: showcase,
    recipes: catalog.recipes,
    home: demoHome,
    alternate: pageUrls,
    creditsUrl: "./",
    onLanding: false,
  };
  const heading = t("Bildnachweise", "Photo credits");
  const description = t(
    "Alle Fotos auf Mealie Atelier stammen von Unsplash. Hier stehen die Fotografinnen und Fotografen mit Links zu den Originalen.",
    "Every photo on Mealie Atelier comes from Unsplash. Here are the photographers with links to the originals.",
  );
  const title = `${heading} · Mealie Atelier`;
  const ogImage = ogImageMeta(locale, null, "../../");
  const ogUrl = pageUrl ? `<meta property="og:url" content="${escapeHtml(pageUrl)}">` : "";
  const canonical = pageUrl ? `<link rel="canonical" href="${escapeHtml(pageUrl)}">` : "";
  const hreflang = (code, href) =>
    `<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}">`;
  const rows = catalog.recipes
    .map((recipe) => creditRow(ctx, recipe, localUrl(recipePath(locale, recipe))))
    .join("");
  const licenseLink = `<a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">${t("Unsplash-Lizenz", "Unsplash License")}</a>`;
  const lead = t(
    `Alle Rezeptfotos auf dieser Seite stammen von Unsplash und stehen unter der ${licenseLink}. Danke an die Fotografinnen und Fotografen.`,
    `Every recipe photo on this site comes from Unsplash and is used under the ${licenseLink}. Thanks to the photographers.`,
  );
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#f2e9d8" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0c120f" media="(prefers-color-scheme: dark)"><meta name="color-scheme" content="dark light"><meta property="og:type" content="website"><meta property="og:site_name" content="Mealie Atelier"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${ogImage}${ogUrl}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}">${iconLinks("../../assets/")}${canonical}${hreflang("de", pageUrls.de)}${hreflang("en", pageUrls.en)}${hreflang("x-default", pageUrls.de)}<link rel="stylesheet" href="../../assets/live-demo.css"><title>${escapeHtml(title)}</title></head><body class="credits-body">${renderSiteHeader(ctx)}<main id="main" class="credits-page"><div class="wrap"><header class="recipe-head"><nav class="crumbs" aria-label="${t("Brotkrümel", "Breadcrumb")}"><a href="${escapeHtml(demoHome[locale])}">Mealie Atelier</a><span aria-hidden="true">/</span><span aria-current="page">${heading}</span></nav><h1>${heading}</h1><p class="lead">${lead}</p></header><ul class="credit-list">${rows}</ul><p class="credits-switch"><a class="textlink" href="${escapeHtml(pageUrls[counterpartLocale])}" hreflang="${counterpartLocale}" lang="${counterpartLocale}">${t("Photo credits in English", "Bildnachweise auf Deutsch")}</a></p></div></main>${renderSiteFooter(ctx)}<script type="module" src="../../assets/site.js"></script></body></html>`;
}

function localizedRecipePage(locale, slug) {
  const recipe = catalog.recipes.find((row) => row.slug === slug);
  assert(recipe, `unknown recipe slug ${slug}`);
  return renderRecipePage(locale, recipe);
}

// The bare domain is the URL people share most. Crawlers that ignore meta refresh (Twitter/X and most
// others) read the share card from here, so it carries the full og and twitter set of the German home.
function rootIndex() {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><meta name="description" content="${escapeHtml(copy.de.description)}">${iconLinks("assets/")}<meta name="theme-color" content="#f2e9d8" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0c120f" media="(prefers-color-scheme: dark)"><meta property="og:type" content="website"><meta property="og:site_name" content="Mealie Atelier"><meta property="og:title" content="${escapeHtml(copy.de.title)}"><meta property="og:description" content="${escapeHtml(copy.de.description)}">${ogImageMeta("de", null, "")}${deploymentBase ? `<meta property="og:url" content="${escapeHtml(deploymentBase)}">` : ""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(copy.de.title)}"><meta name="twitter:description" content="${escapeHtml(copy.de.description)}"><title>${copy.de.title}</title>${deploymentBase ? `<link rel="canonical" href="${escapeHtml(`${deploymentBase}de/`)}">` : ""}<meta http-equiv="refresh" content="0;url=de/"></head><body><p>Demo laden: <a href="de/">Deutsch</a> · <a href="en/">English</a></p></body></html>`;
}

// Metric labels read as a set, so every label starts with a capital in both languages.
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Deletes every file below `target` that has no counterpart below `source`.
async function removeStaleFiles(source, target) {
  const entries = await readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    if (entry.isDirectory()) {
      await removeStaleFiles(sourcePath, targetPath);
      continue;
    }
    const exists = await stat(sourcePath).then(
      () => true,
      (error) => {
        if (error.code === "ENOENT") return false;
        throw error;
      },
    );
    if (!exists) await unlink(targetPath);
  }
}

// Deletes files below `directory` that are not in `keep`; a missing directory is fine.
async function removeUnlisted(directory, keep) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await removeUnlisted(path, keep);
    else if (!keep.has(path)) await unlink(path);
  }
}

await validateCatalog();
await mkdir(join(siteRoot, "assets"), { recursive: true });
await mkdir(join(siteRoot, "photos"), { recursive: true });
for (const recipe of catalog.recipes) {
  await copyFile(
    join(demoRoot, "photos", photoName(recipe)),
    join(siteRoot, "photos", photoName(recipe)),
  );
}
await mkdir(join(siteRoot, "data"), { recursive: true });
await copyFile(styles, join(siteRoot, "assets/live-demo.css"));
await copyFile(siteScript, join(siteRoot, "assets/site.js"));
await cp(join(demoRoot, "showcase"), join(siteRoot, "showcase"), { recursive: true });
// Photos and screenshots that left the sources must not linger in a reused output folder.
await removeStaleFiles(join(demoRoot, "photos"), join(siteRoot, "photos"));
await removeStaleFiles(join(demoRoot, "showcase"), join(siteRoot, "showcase"));
await copyFile(searchModule, join(siteRoot, "assets/recipe-search.js"));
await copyFile(bundle, join(siteRoot, "assets/mealie-atelier-cards.js"));
await copyFile(
  join(cardsRoot, "demo/site/week-dial-mark.svg"),
  join(siteRoot, "assets/mealie-atelier-mark.svg"),
);
for (const asset of brandAssets) {
  await copyFile(join(cardsRoot, "demo/site", asset), join(siteRoot, "assets", asset));
}
// Brand files of older builds (for example a retired icon size) must not ship with the site.
await removeUnlisted(
  join(siteRoot, "assets"),
  new Set(
    [
      "live-demo.css",
      "site.js",
      "recipe-search.js",
      "mealie-atelier-cards.js",
      "mealie-atelier-mark.svg",
      ...brandAssets,
    ].map((name) => join(siteRoot, "assets", name)),
  ),
);
await writeFile(join(siteRoot, "index.html"), rootIndex());
const ogImages = await buildOgImages();
for (const [output, bytes] of ogImages) {
  await mkdir(dirname(join(siteRoot, output)), { recursive: true });
  await writeFile(join(siteRoot, output), bytes);
}
await removeUnlisted(
  join(siteRoot, "og"),
  new Set([...ogImages.keys()].map((o) => join(siteRoot, o))),
);

// Pages of recipes that left the catalog must not linger in a reused output folder.
async function removeStaleRecipePages(locale) {
  const parent = join(siteRoot, locale, locale === "de" ? "rezepte" : "recipes");
  const current = new Set(
    catalog.recipes.map((recipe) => (locale === "de" ? recipe.slug : recipe.slugEn)),
  );
  const entries = await readdir(parent, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isDirectory() || current.has(entry.name)) continue;
    const stale = join(parent, entry.name);
    for (const file of await readdir(stale)) await unlink(join(stale, file));
    await rmdir(stale);
  }
}

const sitemapUrls = [];
for (const locale of localeIds) {
  await removeStaleRecipePages(locale);
  const indexPath = join(siteRoot, locale, "index.html");
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(indexPath, renderIndexPage(locale));
  await writeFile(
    join(siteRoot, "data", `${locale}.json`),
    `${JSON.stringify(localizedData(locale), null, 2)}\n`,
  );
  sitemapUrls.push(`${deploymentBase}${locale}/`);
  const creditsTarget = join(siteRoot, creditsPath(locale), "index.html");
  await mkdir(dirname(creditsTarget), { recursive: true });
  await writeFile(creditsTarget, renderCreditsPage(locale));
  if (deploymentBase) sitemapUrls.push(`${deploymentBase}${creditsPath(locale)}`);
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
