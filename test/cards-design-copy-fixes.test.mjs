import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const refinement = read("../src/design-system/control-refinement.css");

function rule(css, selector) {
  const start = css.lastIndexOf(`\n${selector} {`) + 1;
  assert.ok(start > 0, `missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

test("timer names wrap at words and clamp instead of splitting mid-word", () => {
  const strong = rule(refinement, ".atelier .cook-timer-copy strong");
  assert.match(strong, /overflow-wrap:\s*break-word/);
  assert.match(strong, /-webkit-line-clamp:\s*2/);
  assert.match(rule(refinement, ".atelier .cook-timers"), /minmax\(min\(100%,\s*280px\)/);
});

test("cooking step text wraps long words inside the stage", () => {
  const stage = rule(
    refinement,
    ".atelier .modal:has(.cook-layout) .cook-stage :is(h2, p, .cook-step-detail)",
  );
  assert.match(stage, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(stage, /max-width/, "the reading-measure caps of the stage stay in force");
  assert.match(rule(refinement, ".atelier .cook-stage"), /min-width:\s*0/);
});

test("cooking navigation is sticky at every size", () => {
  const actions = rule(refinement, ".atelier .modal:has(.cook-layout) .cook-actions");
  assert.match(actions, /position:\s*sticky/);
  assert.match(actions, /bottom:\s*0/);
  assert.doesNotMatch(actions, /order:/);
  assert.doesNotMatch(refinement, /\.cook-utility \{\s*order:/);
});

test("timer names carry the full label as a title", () => {
  assert.match(read("../src/components/dialogs.js"), /<strong title="\$\{esc\(timer\.label\)\}">/);
});

test("the sticky close button stays inset and nets zero height", () => {
  const close = rule(refinement, ".atelier .modal > .modal-close");
  assert.match(close, /top:\s*20px/);
  assert.match(close, /margin:\s*20px 20px calc\(-20px - var\(--at-close-size\)\) auto/);
  assert.match(
    refinement,
    /max-width: 420px\) \{\s*\.atelier \.modal > \.modal-close \{\s*--at-close-size: 44px/,
  );
});

test("landscape recipe dialogs keep the close button out of the grid flow", () => {
  const polish = read("../src/design-system/polish.css");
  const matches = polish.match(
    /\.modal\.large:has\(> \.modal-hero\) > \.modal-close \{[^}]*position:\s*absolute[^}]*\}/g,
  );
  assert.equal(matches?.length, 2);
});

test("the dialog close button is sticky so it stays reachable", () => {
  assert.match(rule(refinement, ".atelier .modal > .modal-close"), /position:\s*sticky/);
});

test("a scroll-driven header strip keeps content from being cut by the sticky close button", () => {
  const strip = rule(refinement, ".atelier .modal > .modal-close::before");
  assert.match(strip, /position:\s*absolute/);
  assert.match(strip, /z-index:\s*-1/);
  assert.match(strip, /background:\s*var\(--at-surface\)/);
  assert.match(strip, /opacity:\s*0/);
  assert.match(refinement, /animation-timeline:\s*scroll\(nearest block\)/);
  assert.match(refinement, /@keyframes at-close-strip \{\s*to \{\s*opacity: 1/);
  assert.match(
    refinement,
    /max-height: 700px\) \{\s*\.atelier \.modal\.large:has\(> \.modal-hero\) > \.modal-close::before \{\s*display: none/,
  );
});

test("the HA scene hint names the Cooking light button, not cooking start", () => {
  for (const [lang, word] of [
    ["de", "Kochlicht"],
    ["en", "Cooking light"],
  ]) {
    const t = JSON.parse(read(`../src/i18n/${lang}.json`));
    assert.ok(t.editorOnlyTriggeredWhenYouTapTheCookingCockpitButton.includes(word), lang);
  }
});

test("click and tap wording is device neutral", () => {
  for (const lang of ["de", "en"]) {
    const t = JSON.parse(read(`../src/i18n/${lang}.json`));
    for (const key of [
      "studioGroceryPreview",
      "editorPickAStartingPointEveryOtherViewStaysOneTapAway",
      "editorOnlyTriggeredWhenYouTapTheCookingCockpitButton",
    ]) {
      assert.doesNotMatch(t[key], /\b(klick|click|tap)\b/i, `${lang}:${key}`);
    }
  }
  const en = JSON.parse(read("../src/i18n/en.json"));
  assert.match(
    en.editorDashboardModeContainsTheCompleteKitchenDeviceSpecificChangesAreAvailableHereInTheDesignStudio,
    /“Overview”/,
  );
});

test("cooking mode renders the studio tools and the configured light button inside the timer section", () => {
  const cards = loadCards();
  const card = makeCard(cards, {
    hass: { language: "en", callWS: async () => ({}), callService: async () => ({}) },
  });
  card._config = { ...card._config, cooking_scene: "scene.kitchen_light" };
  card._detail = {
    slug: "soup",
    name: "Soup",
    recipeInstructions: [{ text: "Chop." }],
    recipeIngredient: [],
  };
  card._modal = "cook";
  const html = card._modalHtml();
  assert.match(html, /<section class="cook-utility"[^>]*><div class="studio-cook-tools">/);
  assert.match(html, /data-action="studio-ha-scene"/);
  assert.match(html, /data-action="studio-read-step"/);
});

const i18n = (lang) => JSON.parse(read(`../src/i18n/${lang}.json`));

test("bridge error codes for timers, protected values and USDA have card texts in both languages", () => {
  const keys = [
    "errInvalidTimer",
    "errTimerExists",
    "errTooManyTimers",
    "errTimerNotFound",
    "errTimerNotPermitted",
    "errExistingValuesProtected",
    "errUsdaKeyInvalid",
    "errUsdaRateLimited",
  ];
  for (const lang of ["de", "en"])
    for (const key of keys) assert.ok(i18n(lang)[key], `${lang} ${key}`);
});

test("copy uses one term per setting, one Bridge name and the neuter Token", () => {
  const de = i18n("de");
  assert.equal(de.editorComfortable, de.comfortable);
  assert.equal(de.editorMotionTransitions, de.uiMotionTransitions);
  assert.equal(de.editorFoodPhotographyCrop, de.uiPhotoCrop);
  assert.doesNotMatch(JSON.stringify(de), /Mealie-Atelier-Bridge|den Zugriffstoken/);
  assert.match(de.errMealieAuth, /das API-Token/);
  assert.match(de.uiNoWriteGrant, /Home-Assistant-Nutzer/);
  assert.equal(i18n("en").editorFoodPhotographyCrop, i18n("en").uiPhotoCrop);
});

test("every language names the Bridge in full and labels density once", () => {
  for (const lang of ["de", "en"]) {
    const dict = i18n(lang);
    assert.equal(dict.editorDensity, dict.density, `${lang} density`);
    for (const [key, value] of Object.entries(dict))
      assert.doesNotMatch(
        value.replace(/Mealie Atelier Bridge/g, ""),
        /Atelier[- ]Bridge/,
        `${lang} ${key}`,
      );
  }
});

test("timer and nutrition texts are actionable and use the card's own words", () => {
  for (const lang of ["de", "en"]) {
    const dict = i18n(lang);
    assert.doesNotMatch(dict.errTimerExists, /\bID\b/);
    assert.doesNotMatch(dict.errTooManyTimers, /Lösche|Delete/);
    assert.match(dict.errInvalidTimer, /24/);
    assert.match(dict.errInvalidTimer, /100/);
  }
  assert.match(i18n("de").errTooManyTimers, /Entferne/);
  assert.match(i18n("en").errTooManyTimers, /Remove/);
  assert.doesNotMatch(
    i18n("de").uiNoCompleteNutritionEntriesFoundTryAnotherQuery,
    /^Keine.*\. Anderen/,
  );
  assert.match(i18n("de").uiNoCompleteNutritionEntriesFoundTryAnotherQuery, /Versuche/);
});

test("empty Discover title and today heading fit their content", () => {
  assert.equal(i18n("en").tonight, "On the table today");
  for (const lang of ["de", "en"]) assert.notEqual(i18n(lang).studioDiscoverEmptyTitle, "");
  assert.doesNotMatch(i18n("en").studioDiscoverEmptyTitle, /open/i);
  assert.doesNotMatch(i18n("de").studioDiscoverEmptyTitle, /offen/i);
});

test("Discover empty state lays its buttons out in a wrapping row", () => {
  const css = read("../src/design-system/polish.css");
  const box = rule(css, ".atelier .studio-discover-empty");
  assert.match(box, /display:\s*flex/);
  assert.match(box, /flex-wrap:\s*wrap/);
});

test("German copy keeps one address, one term per concept and complete sentences", () => {
  const de = JSON.parse(read("../src/i18n/de.json"));
  const en = JSON.parse(read("../src/i18n/en.json"));
  for (const [key, value] of Object.entries(de))
    assert.doesNotMatch(value, /\b(euch|euer\w*|eure\w*|ihr)\b/i, `${key} uses the du-form`);
  assert.match(de["studioDiscoverRecipeBase.other"], /^Rezeptbasis: /);
  assert.match(de.studioCatalogTotal, /Rezepte\.$/);
  assert.match(en.studioCatalogTotal, /recipes\.$/);
  assert.equal(de.studioLunch, de.lunch);
  assert.equal(de.studioDinner, de.dinner);
  assert.doesNotMatch(de["studioWeekConfirmBody.other"], /Termine/);
  assert.equal(de.studioAuditTitle, de.studioRecipeAuditTitle);
  assert.equal(de.studioAuditNone, de.studioRecipeAuditNone);
  assert.equal(en.studioAuditTitle, en.studioRecipeAuditTitle);
  assert.equal(en.studioAuditNone, en.studioRecipeAuditNone);
  assert.equal(de.studioAICheck, "Mit KI prüfen");
  assert.doesNotMatch(de.studioDeviceInvalid, /Entity/);
  assert.doesNotMatch(de.editorRunSetupWizard, /Wizard/);
  assert.match(de.uiUsdaKeyMissingWeb, /^USDA-API-Key/);
  assert.match(de.uiFoodsMatched, /zugeordnet/);
  for (const key of [
    "uieGLemonPastaWithSpinach",
    "uieGWeeklyGroceries",
    "uiSearchConversionExample",
  ])
    assert.match(de[key], /^z\. B\. /, key);
});

test("copy uses one spelling per concept in both locales", () => {
  const en = i18n("en");
  const de = i18n("de");
  assert.doesNotMatch(en.editorQuantityInvalid, /1,5/);
  assert.match(de.editorQuantityInvalid, /1,5; 1 1\/2/);
  assert.doesNotMatch(JSON.stringify(en), /Favourites|cancelled|Tick off|popups|per 100g/);
  assert.doesNotMatch(JSON.stringify(en), / …/, "English ellipsis has no leading space");
  assert.doesNotMatch(JSON.stringify(de), /[^\s"“„]…/, "German ellipsis has a leading space");
  assert.equal(de.studioPopupBlocked, de.uiAllowPopupsToOpenThePrintPreview);
  for (const key of ["syncNoRules", "syncStandaloneExplain"]) {
    assert.match(en[key], /Bring!/);
    assert.match(de[key], /Bring!/);
  }
  assert.match(de.studioDiscoverQuestion1, /Lieblingskochbücher/);
  assert.match(en.studioDiscoverQuestion1, /cookbooks/);
  assert.match(de.studioDiagnosticsEmpty, /Verbindungsprobleme/);
  assert.match(de.studioSwapQuark, /^Pflanzliche/);
  assert.match(de.studioSwapFlour, /^Anderes/);
  assert.match(en.uiPrintGuide, /new window/);
  const serialComma = Object.entries(en).filter(([, v]) => /\w, [^,.]+, and \w/.test(v));
  assert.deepEqual(serialComma, [], "English lists use no serial comma");
  assert.match(en.editorOnlyTriggeredWhenYouTapTheCookingCockpitButton, /Cooking light/);
});

test("the short landscape cooking bar stays one row of three", () => {
  const polish = read("../src/design-system/polish.css");
  const sticky = polish.slice(
    polish.indexOf("@media (orientation: landscape) and (max-height: 700px) {"),
  );
  assert.match(
    sticky.slice(0, sticky.indexOf("@media (orientation: portrait)")),
    /\.cook-actions \.btn\.primary \{\s*grid-column:\s*auto/,
  );
});

test("the short landscape cooking bar keeps its labels on one line so the row stays level", () => {
  const polish = read("../src/design-system/polish.css");
  const start = polish.indexOf("@media (orientation: landscape) and (max-height: 700px) {");
  const block = polish.slice(start, polish.indexOf("@media (orientation: portrait)", start));
  assert.match(block, /\.cook-actions \.btn \{[^}]*white-space:\s*nowrap/);
  // Content-sized flex items cannot be forced wider than the bar by max-content grid minimums.
  assert.doesNotMatch(block, /minmax\(max-content/);
  assert.match(block, /\.cook-actions \{\s*display:\s*flex;\s*gap:\s*6px/);
  assert.match(block, /\.cook-actions \.btn \{[^}]*flex:\s*1 1 auto/);
});

test("every accent coloured text uses the AA contrast token on light surfaces", () => {
  const sheets = [
    "foundation",
    "editorial",
    "kitchen",
    "motion",
    "adaptive",
    "layout",
    "components",
    "polish",
    "control-refinement",
  ].map((name) => [name, read(`../src/design-system/${name}.css`)]);
  for (const [name, css] of sheets)
    assert.doesNotMatch(css, /^\s*color:\s*var\(--ds-brand\);/m, `${name}.css has raw brand text`);
  const tokens = read("../src/design-system/tokens.css");
  assert.match(rule(tokens, ".atelier"), /--ds-brand-text:\s*var\(--ds-brand\)/);
  assert.match(rule(tokens, ".atelier.light"), /--ds-brand-text:\s*color-mix/);
  assert.match(
    rule(read("../src/design-system/motion.css"), ".at-premium-dialog .eyebrow"),
    /color:\s*var\(--ds-brand-text,/,
  );
});

test("the cooking dialog is a fixed-height flex column with the action bar on its bottom edge", () => {
  const modal = rule(refinement, ".atelier .modal.large:has(.cook-layout)");
  assert.match(modal, /display:\s*flex/);
  assert.match(modal, /flex-direction:\s*column/);
  assert.match(modal, /height:\s*min\(90dvh,\s*940px\)/);
  assert.match(
    rule(refinement, ".atelier .modal.large:has(.cook-layout) > .cook-layout"),
    /flex:\s*1 0 auto/,
  );
  const actions = rule(refinement, ".atelier .modal:has(.cook-layout) .cook-actions");
  assert.match(actions, /margin-block:\s*auto 0/);
  assert.match(actions, /position:\s*sticky/);
  assert.match(
    refinement,
    /\.cook-content > \*,\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-controls > \* \{\s*order: 0;/,
    "earlier breakpoint orders are reset so the bar is last in every layout",
  );
});

test("long German words hyphenate only when the word is at least 12 letters long", () => {
  const polish = read("../src/design-system/polish.css");
  assert.match(rule(polish, ".atelier .day-meal-name"), /hyphenate-limit-chars:\s*12 5 5;/);
});

test("the cards UI always names the Mealie Atelier Bridge in full", () => {
  const strings = {
    de: JSON.parse(read("../src/i18n/de.json")),
    en: JSON.parse(read("../src/i18n/en.json")),
  };
  for (const [locale, table] of Object.entries(strings))
    for (const [key, value] of Object.entries(table)) {
      if (typeof value !== "string") continue;
      const bare = value.replace(/Mealie Atelier Bridge/g, "");
      assert.doesNotMatch(bare, /\bBridge\b|Bridge-/, `${locale}.${key} shortens the Bridge name`);
    }
});

test("docs and README spell web app in lower case within a sentence and name the full Bridge", () => {
  for (const file of [
    "../README.md",
    "../docs/ARCHITECTURE.md",
    "../docs/DESIGN_SYSTEM.md",
    "../docs/FAQ.md",
    "../docs/MARKETPLACE.md",
    "../docs/REPOSITORY_MAP.md",
    "../web/.env.example",
  ]) {
    const text = read(file);
    assert.doesNotMatch(text, /[a-z,] Web app\b/, `${file} capitalises web app mid-sentence`);
    assert.doesNotMatch(text, /Web companion|web companion/, `${file} says companion`);
    assert.doesNotMatch(text, /(?<!Mealie )Atelier Bridge/, `${file} shortens the Bridge name`);
  }
});

test("the premium dialog copies the accent text token it renders its eyebrow with", () => {
  const source = read("../src/studio-ui.js");
  const list = source.slice(source.indexOf("_atelierDialog("));
  const tokens = list.slice(list.indexOf("for (const token of ["), list.indexOf("]) {"));
  assert.match(tokens, /"--ds-brand-text"/);
});

test("the cooking action bar is the last child of the cook content", () => {
  const source = read("../src/components/dialogs.js");
  const footnote = source.indexOf('<p class="cook-footnote">');
  const actions = source.indexOf('<div class="cook-actions">');
  assert.ok(footnote > 0 && actions > footnote, "footnote renders before the sticky action bar");
});

test("the cook content has no bottom padding so the sticky bar stays on the dialog edge", () => {
  assert.match(
    rule(refinement, ".atelier .modal.large:has(.cook-layout) .cook-content"),
    /padding-bottom:\s*0;/,
  );
});

test("the display font token reuses the single --at-serif stack", async () => {
  const { readFile } = await import("node:fs/promises");
  const tokens = await readFile(
    new URL("../src/design-system/tokens.css", import.meta.url),
    "utf8",
  );
  assert.match(tokens, /--ds-font-display:\s*var\(--at-serif\);/);
  assert.doesNotMatch(tokens, /Times New Roman/);
});

test("English strings use the typographic apostrophe only", () => {
  const strings = JSON.parse(read("../src/i18n/en.json"));
  const straight = Object.entries(strings).filter(([, value]) => /\w'\w/.test(String(value)));
  assert.deepEqual(
    straight.map(([key]) => key),
    [],
  );
});

test("the cancel wording matches the card's Remove action and the dead dispatched text is gone", () => {
  assert.match(i18n("de").errTimerNotPermitted, /entfernen/);
  assert.match(i18n("en").errTimerNotPermitted, /remove/);
  assert.match(i18n("de").uiTimerStopError, /entfernt/);
  assert.match(i18n("en").uiTimerStopError, /remove/);
  for (const lang of ["de", "en"]) {
    assert.doesNotMatch(i18n(lang).uiTimerStopError, /stopp/i);
    assert.doesNotMatch(i18n(lang).errTimerNotPermitted, /abbrechen|cancel/);
    assert.equal(i18n(lang).errTimerDispatched, undefined);
  }
});

test("nutrition save and calculate show the translated text for a Bridge error code", async () => {
  for (const [language, action, expected] of [
    ["en", "nutri-save", /Existing values are protected/],
    ["de", "nutri-calc", /Vorhandene Werte sind geschützt/],
  ]) {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._render = () => {};
    Object.defineProperty(card, "_permissions", { get: () => ({ can_manage: true }) });
    card._nutrition = {
      busy: false,
      rows: [],
      replaceExisting: false,
      preview: { slug: "s", hash: "h" },
    };
    card._ws = async () => {
      throw Object.assign(new Error("raw bridge message"), { code: "existing_values_protected" });
    };
    const el = { dataset: { action, value: "" }, disabled: false, closest: () => el };
    await card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
    assert.match(card._nutrition.notice, expected, `${language} ${action}`);
    assert.doesNotMatch(card._nutrition.notice, /raw bridge/);
  }
});

test("nutrition keeps the specific reason for a bare invalid_request and translates the web app codes", async () => {
  for (const [language, code, message, expected] of [
    ["de", "invalid_request", "Recipe must have a valid serving count", /^Recipe must have/],
    ["en", "invalid_request", "Recipe must have a valid serving count", /^Recipe must have/],
    ["de", "recipe_servings_invalid", "raw", /Portionsangabe/],
    ["en", "recipe_servings_invalid", "raw", /no valid serving count/],
    ["de", "usda_food_incomplete", "raw", /Nährwertangaben/],
    ["en", "usda_food_incomplete", "raw", /missing essential nutrition data/],
  ]) {
    const cards = loadCards();
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._render = () => {};
    Object.defineProperty(card, "_permissions", { get: () => ({ can_manage: true }) });
    card._nutrition = {
      busy: false,
      rows: [],
      replaceExisting: false,
      preview: { slug: "s", hash: "h" },
    };
    card._ws = async () => {
      throw Object.assign(new Error(message), { code });
    };
    const el = { dataset: { action: "nutri-calc", value: "" }, disabled: false, closest: () => el };
    await card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
    assert.match(card._nutrition.notice, expected, `${language} ${code}`);
    assert.doesNotMatch(card._nutrition.notice, /ungültig\. Prüfe|not valid\. Check/);
  }
});

test("merged i18n wording stays consistent between German and English", () => {
  assert.match(i18n("en").errMealieAuth, /API token/);
  assert.doesNotMatch(i18n("en").errMealieAuth, /access token/);
  // The same code arrives from the Home Assistant Bridge, so no web-only env var may be named.
  for (const lang of ["de", "en"])
    assert.doesNotMatch(
      i18n(lang).errMealieAuth,
      /MEALIE_API_TOKEN|server config|Konfiguration des Servers/i,
    );
  assert.equal(i18n("de").editorDeepGreenWarmLightEditorial, "Tiefgrün · warmes Licht · großzügig");
});

test("Discover recipe base copy keeps the colon in German like English", () => {
  const de = JSON.parse(readFileSync(new URL("../src/i18n/de.json", import.meta.url), "utf8"));
  const en = JSON.parse(readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8"));
  assert.equal(de["studioDiscoverRecipeBase.one"], "Rezeptbasis: 1 Portion");
  assert.equal(de["studioDiscoverRecipeBase.other"], "Rezeptbasis: {servings} Portionen");
  for (const key of ["studioDiscoverRecipeBase.one", "studioDiscoverRecipeBase.other"]) {
    assert.equal(de[key].includes(":"), en[key].includes(":"), key);
  }
});
