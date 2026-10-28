import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../src/i18n/", import.meta.url));
const locales = Object.fromEntries(
  readdirSync(source)
    .filter((name) => name.endsWith(".json"))
    .map((name) => [
      name.replace(/\.json$/, ""),
      JSON.parse(readFileSync(join(source, name), "utf8")),
    ]),
);

test("all locale resources implement the same complete translation-key contract", () => {
  assert.ok(locales.en, "English is the canonical locale");
  assert.ok(locales.de, "German locale is shipped");
  const keys = Object.keys(locales.en).sort();
  for (const [locale, resource] of Object.entries(locales))
    assert.deepEqual(Object.keys(resource).sort(), keys, `${locale} keys`);
  for (const [locale, resource] of Object.entries(locales))
    for (const [key, value] of Object.entries(resource)) {
      assert.equal(typeof value, "string", `${locale}.${key} must be a string`);
      assert.ok(value.trim(), `${locale}.${key} must not be empty`);
    }
  const placeholders = (value) =>
    [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(([, name]) => name).sort();
  for (const key of keys)
    assert.deepEqual(
      placeholders(locales.de[key]),
      placeholders(locales.en[key]),
      `${key} placeholders`,
    );
});

test("shared resolver honors explicit languages, host/browser detection and English fallback", () => {
  const resolver = readFileSync(join(source, "resolver.js"), "utf8");
  const run = new Function(
    "LABELS",
    `${resolver}; return {resolveLanguage,translateLabel,translatePluralLabel};`,
  )(locales);
  assert.equal(run.resolveLanguage("de", "en", "en"), "de");
  assert.equal(run.resolveLanguage("auto", "de-DE", "en-US"), "de");
  assert.equal(run.resolveLanguage("auto", undefined, "en-GB"), "en");
  assert.equal(run.resolveLanguage("auto", "fr-FR", "fr-FR"), "en");
  assert.equal(run.resolveLanguage("auto", "de-AT", "fr-FR"), "de");
  assert.equal(run.resolveLanguage("de-AT", "en-US", "en-US"), "de");
  assert.equal(run.translateLabel("de", "languageName"), "Deutsch");
  assert.equal(run.translateLabel("fr", "languageName"), "English");
  assert.equal(run.translateLabel("en", "missingKey"), "missingKey");
  assert.equal(run.translatePluralLabel("de", "uiServing", 1), "Portion");
  assert.equal(run.translatePluralLabel("de", "uiServing", 2), "Portionen");
  assert.equal(run.translatePluralLabel("en", "uiServing", 1), "serving");
  assert.equal(run.translatePluralLabel("en", "uiServing", 2), "servings");
});

test("cards expose an immediate language override in Design Studio and use the shared resources", () => {
  const template = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  const dialogs = readFileSync(new URL("../src/components/dialogs.js", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../src/components/editor.js", import.meta.url), "utf8");
  const compiled = readFileSync(
    new URL("../dist/mealie-atelier-cards.js", import.meta.url),
    "utf8",
  );
  const builder = readFileSync(
    new URL("../scripts/build-design-system.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    template,
    /resolveLanguage\(preferred,\s*this\._hass\?\.language,\s*navigator\.language\)/,
  );
  assert.ok(dialogs.includes('data-input="language"'));
  assert.match(dialogs, /Object\.keys\(\s*LABELS,?\s*\)\s*\.map\(/);
  assert.match(editor, /Object\.keys\(LABELS\)\.map\(/);
  assert.ok(compiled.includes("function translateLabel(locale, key, values = {})"));
  assert.ok(compiled.includes('"languageAuto":"Automatic"'));
  assert.ok(builder.replace(/\s+/g, "").includes('readdirSync(resolve(folder,"src/i18n"))'));
  assert.ok(builder.replace(/\s+/g, "").includes('if(!localeFiles.includes("en"))'));
});

test("Atelier Studio translation calls resolve in every shipped locale", () => {
  const views = readFileSync(new URL("../src/studio-ui.js", import.meta.url), "utf8");
  const referenced = [...views.matchAll(/this\.t\(["']([^"']+)["']/g)].map(([, key]) => key);
  assert.ok(referenced.length > 0);
  for (const [locale, resource] of Object.entries(locales))
    for (const key of referenced) {
      assert.ok(key in resource, `${locale}.${key} is referenced by Atelier Studio but missing`);
    }
});

test("card editor and shared dialogs/views/print use keys present in every locale", () => {
  const files = [
    "card-core.template.js",
    "components/editor.js",
    "components/dialogs.js",
    "components/views.js",
    "components/print-actions.js",
    "components/nutrition-journal.js",
  ];
  for (const file of files) {
    const sourceText = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    const referenced = [...sourceText.matchAll(/(this\.t|this\.tp|tr)\('([^']+)'/g)].map(
      ([, method, key]) => [method, key],
    );
    for (const [locale, resource] of Object.entries(locales))
      for (const [method, key] of referenced) {
        if (method === "this.tp") {
          const categories = new Set(
            [0, 1, 2, 3, 4, 5, 10, 20, 100].map((count) =>
              new Intl.PluralRules(locale).select(count),
            ),
          );
          for (const category of categories)
            assert.ok(
              `${key}.${category}` in resource,
              `${locale}.${key}.${category} plural form is required by ${file}`,
            );
        } else assert.ok(key in resource, `${locale}.${key} is referenced by ${file} but missing`);
      }
  }
  const editor = readFileSync(new URL("../src/components/editor.js", import.meta.url), "utf8");
  assert.doesNotMatch(
    editor,
    /this\._language\s*===\s*'de'\s*\?/,
    "the HA editor must not embed language-specific copy",
  );
  assert.doesNotMatch(
    editor,
    /this\._hass\?\.language\?\.toLowerCase/,
    "preview copy must use the shared locale resolver",
  );
  const core = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  assert.doesNotMatch(
    core.replace(/get _locale\(\) \{[^}]+\}/, ""),
    /this\._language\s*===\s*'de'/,
    "card copy must use shared locale resources",
  );
});

test("family, cookbook, print, device actions, and speech use the shared locale and translated print metadata", () => {
  const views = readFileSync(new URL("../src/studio-ui.js", import.meta.url), "utf8");
  for (const key of [
    "familyTitle",
    "cookbookTitle",
    "studioReadStepLabel",
    "studioAiAuditTitle",
    "studioSessionReplaceTitle",
    "studioWeekConfirmTitle",
  ])
    assert.ok(new RegExp(`this\\.t\\(["']${key}["']`).test(views), `${key} must be translated`);
  assert.match(views, /this\.t\(["']printDocumentTitle["']\)/);
  assert.match(views, /this\.t\(["']printSavePdf["']\)/);
  assert.match(views, /lang="\$\{esc\(this\._locale\s*\|\|\s*["']en["']\)\}"/);
  assert.match(
    views,
    /this\.t\(isGerman\s*\?\s*["']studioSpeechDe["']\s*:\s*["']studioSpeechEn["']\)/,
  );
});

test("print dialog copy comes from shared locale resources instead of inline language branches", () => {
  const dialogs = readFileSync(new URL("../src/components/dialogs.js", import.meta.url), "utf8");
  const printDialog = dialogs.slice(
    dialogs.indexOf('if (this._modal === "print")'),
    dialogs.indexOf('if (this._modal === "settings")'),
  );
  assert.doesNotMatch(printDialog, /this\._language|\ben\s*\?/);
  for (const key of [
    "uiPrintHeroTitle",
    "uiPrintHeroDescription",
    "uiPrintStyle",
    "uiPrintEditorial",
    "uiPrintEditorialDescription",
    "uiPrintCompact",
    "uiPrintCompactDescription",
    "uiPrintInkSaver",
    "uiPrintInkSaverDescription",
    "uiPrintDetails",
    "uiPrintIncludePhoto",
    "uiPrintIncludeNutrition",
    "uiPrintIncludeCompleted",
    "uiPrintIncludeCheckboxes",
    "uiPrintIncludeNotes",
    "uiPrintOpenPreview",
    "uiPrintGuide",
    "uiPrintPaperPreview",
    "uiYourRecipe",
    "uiPrintPreviewDescription",
    "uiPrintIngredientsItems",
    "uiPrintPreparationNotes",
    "uiPrintDesignedForPaper",
  ]) {
    assert.match(
      printDialog,
      new RegExp(`this\\.t\\([\"']${key}[\"']\\)`),
      `${key} must be used by the print dialog`,
    );
    for (const [locale, resource] of Object.entries(locales))
      assert.ok(key in resource, `${locale}.${key} is required by the print dialog`);
  }
});

test("dialog section labels use shared locale resources", () => {
  const dialogs = readFileSync(new URL("../src/components/dialogs.js", import.meta.url), "utf8");
  for (const key of [
    "dialogWeeklyMenu",
    "dialogYourMenu",
    "dialogPlanned",
    "dialogNewRecipe",
    "dialogRecipeTitle",
    "dialogSource",
    "dialogRecipeStudio",
    "dialogBasics",
    "dialogStepByStep",
  ]) {
    assert.ok(dialogs.includes(`this.t("${key}")`), `${key} must be used in dialog markup`);
    for (const [locale, resource] of Object.entries(locales))
      assert.ok(key in resource, `${locale}.${key} must be translated`);
  }
  assert.doesNotMatch(
    dialogs,
    /01 \/ (DEIN MENÜ|REZEPTTITEL|QUELLE)|02 \/ GEPLANT|03 \/ SCHRITT FÜR SCHRITT|REZEPTSTUDIO/,
  );
});

test("print document copy uses the same expandable locale resources as the card", () => {
  const printDocument = readFileSync(
    new URL("../src/components/print-document.js", import.meta.url),
    "utf8",
  );
  const printActions = readFileSync(
    new URL("../src/components/print-actions.js", import.meta.url),
    "utf8",
  );
  assert.match(printActions, /translate:\s*\(key, values\) => this\.t\(key, values\)/);
  assert.match(printDocument, /const t = \(key, values\) =>/);
  assert.doesNotMatch(printDocument, /const german\s*=|german\s*\?/);
  for (const key of [
    "printDocRecipe",
    "printDocShoppingList",
    "printDocWeeklyPlan",
    "printDocMinAbbr",
    "printDocNutritionCaution",
    "printDocCalories",
    "printDocProtein",
    "printDocCarbs",
    "printDocFat",
    "printDocFiber",
    "printDocSugar",
  ])
    for (const [locale, resource] of Object.entries(locales))
      assert.ok(key in resource, `${locale}.${key} must be translated`);
});

test("studio core emits translation keys instead of user-visible copy", () => {
  const core = readFileSync(new URL("../src/studio-core.js", import.meta.url), "utf8");
  const keys = [...core.matchAll(/["'](studio[A-Z][A-Za-z0-9]+)["']/g)].map(([, key]) => key);
  assert.ok(keys.length >= 25, "reason, audit and swap keys are referenced");
  for (const [locale, resource] of Object.entries(locales))
    for (const key of keys) assert.ok(key in resource, `${locale}.${key} is used by studio-core`);
  assert.doesNotMatch(core, /message:\s*[`"']/, "audit problems carry keys, not sentences");
});

test("no German or English user-facing literals remain outside the locale tables", () => {
  const files = [
    "studio-core.js",
    "studio-ui.js",
    "card-core.template.js",
    "components/views.js",
    "components/dialogs.js",
    "components/nutrition-journal.js",
  ];
  const forbidden = [
    "Zutaten mengenmäßig gedeckt",
    "Vorrat noch nicht geprüft",
    "Familienfreundlich markiert",
    "gemeinsame Zutaten",
    "Portionen für zwei Mahlzeiten",
    "Reste: ",
    "Keine geplanten Gerichte",
    "Bitte erst in Mealie",
    "Im Atelier gespeichert",
    "Stored only on this device",
    "Saved in your Atelier profile",
    "Kühlregal",
    "Textvorschlag",
    "EXPERIMENTELL",
    "Kitchen navigation",
    'placeholder="z. B.',
    '|| "Item"',
    '|| "Mealie recipe"',
    "Home Assistant connection is not ready",
    "Unexpected AI suggestion count",
    '"Fehler"',
  ];
  for (const file of files) {
    const text = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    for (const needle of forbidden)
      assert.ok(!text.includes(needle), `${file} must not hardcode ${JSON.stringify(needle)}`);
  }
});

test("new notices resolve in every locale with matching placeholders", () => {
  for (const key of [
    "uiProviderResultsTruncated",
    "uiKeepScreenAwake",
    "uiMutationFailed",
    "studioRecipeFetchFailed",
  ])
    for (const [locale, resource] of Object.entries(locales))
      assert.ok(resource[key], `${locale}.${key}`);
});

test("shopping sync keys from the contract exist in English and German with real umlauts", () => {
  const required = [
    "syncTitle",
    "syncOpen",
    "syncBadgeIssues",
    "syncSetup",
    "syncSource",
    "syncDestination",
    "syncSupportsNotes",
    "syncModeCopy",
    "syncModeCopyHint",
    "syncModeMove",
    "syncModeMoveHint",
    "syncTriggerAfterAdd",
    "syncTriggerWatch",
    "syncTriggerWatchHint",
    "syncDebounce",
    "syncPollMinutes",
    "syncDuplicates",
    "syncDuplicateSkipExact",
    "syncDuplicateMerge",
    "syncDuplicateNone",
    "syncPreview",
    "syncPreviewEmpty",
    "syncActionSend",
    "syncActionSkipDuplicate",
    "syncActionMerge",
    "syncActionSkipEmpty",
    "syncConfirmSend",
    "syncSaveOnly",
    "syncStateActive",
    "syncStatePaused",
    "syncStateNotActivated",
    "syncRunNow",
    "syncPause",
    "syncResume",
    "syncRetryFailed",
    "syncReview",
    "syncDismiss",
    "syncResend",
    "syncDelete",
    "syncDeleteConfirm",
    "syncLastRun",
    "syncOutcomeSent",
    "syncOutcomePartial",
    "syncOutcomeFailed",
    "syncOutcomeDestinationUnavailable",
    "syncOutcomeSourceUnavailable",
    "syncOutcomeNothing",
    "syncOutcomeReconciled",
    "syncErrorDestinationUnavailable",
    "syncNeedsWrite",
    "syncStandaloneExplain",
    "errSyncRuleNotFound",
    "errSyncDestinationUnsupported",
    "errSyncSourceTaken",
    "errSyncTooManyRules",
    "errSyncNotActivated",
    "errSyncNotSupported",
    ...[
      "pending",
      "sending",
      "sent",
      "source_completed",
      "failed",
      "needs_reconciliation",
      "changed_after_send",
      "removed_after_send",
    ].map((state) => `syncRecordState_${state}`),
  ];
  const plural = ["syncConfirmSend", "syncErrorDestinationUnavailable"];
  const pluralKeys = [
    ...plural,
    "syncReconcileHint",
    "syncAuditEntry",
    "syncPending",
    "syncPreviewTotal",
    "syncTriggerWatchHint",
  ];
  for (const locale of ["en", "de"])
    for (const key of required)
      if (pluralKeys.includes(key)) {
        assert.ok(locales[locale][`${key}.one`], `${locale}.${key}.one`);
        assert.ok(locales[locale][`${key}.other`], `${locale}.${key}.other`);
      } else assert.ok(locales[locale][key], `${locale}.${key}`);
  const german = Object.entries(locales.de).filter(([key]) => /^(sync|errSync)/.test(key));
  for (const [key, value] of german) {
    assert.doesNotMatch(value, /[—–]/, `${key} must not use dash punctuation`);
  }
  assert.match(locales.de.syncBadgeIssues, /prüfen/);
});
