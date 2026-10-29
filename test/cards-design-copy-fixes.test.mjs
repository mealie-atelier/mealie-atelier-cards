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
    "errTimerDispatched",
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
