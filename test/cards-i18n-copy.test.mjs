import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const locale = (name) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8"));
const de = locale("de");
const en = locale("en");

test("the quick access placeholder is short enough for a 390px phone field", () => {
  // About 249px of content width at 16px; the old text measured over 315px.
  assert.equal(de.uiSearchRecipesIngredientsOrViews, "Rezepte, Zutaten …");
  assert.ok(de.uiSearchRecipesIngredientsOrViews.length <= 32);
  assert.ok(en.uiSearchRecipesIngredientsOrViews.length <= 32);
});

test("the family tag names the person and the empty state uses the Cook together wording", () => {
  assert.equal(de.familyHelper, "Kind");
  assert.equal(en.familyHelper, "Child");
  for (const texts of [de, en]) {
    for (const key of ["familyNoMembers", "familyRemoveConfirmBody", "studioSharedFamily"])
      assert.ok(!/famil/i.test(texts[key]), `${key} must not say family`);
  }
  assert.ok(de.familyRemoveConfirmBody.includes("Gemeinsam kochen"));
  assert.ok(en.familyRemoveConfirmBody.includes("Cook together"));
});

test("the Bring! send button names its destination in both languages", () => {
  assert.equal(en["bwSend.one"], "Send 1 item to Bring! now");
  assert.equal(en["bwSend.other"], "Send {count} items to Bring! now");
  assert.ok(de["bwSend.other"].includes("Bring!"));
});

test("German copy uses API-Schlüssel and one name for the Bridge options", () => {
  for (const [key, value] of Object.entries(de)) {
    assert.ok(!/API-Key/.test(value), `${key} must say API-Schlüssel`);
    assert.ok(!/Integrationsoptionen|Mealie-Atelier-Optionen/.test(value), `${key} place name`);
  }
  assert.ok(de.uiUsdaKeyMissingWeb.includes("USDA_FDC_API_KEY"));
  assert.ok(de.nutriUsdaKeyMissingHa.includes("Optionen der Mealie Atelier Bridge"));
  assert.ok(en.nutriUsdaKeyMissingHa.includes("Mealie Atelier Bridge options"));
});

test("the after-add trigger covers every added item", () => {
  assert.equal(de.syncTriggerAfterAdd, "Nachdem Atelier Artikel zur Liste hinzugefügt hat");
  assert.equal(en.syncTriggerAfterAdd, "After Atelier adds items to the list");
});

test("Print Studio, read-only mode, minutes and journal kicker are spelled consistently", () => {
  assert.equal(en.editorPrintStudio, "Print Studio");
  assert.equal(de.readOnly, "Nur-Lesen-Modus");
  assert.ok(de.syncReadOnly.includes("Nur-Lesen-Modus"));
  assert.ok(!JSON.stringify(de).includes("Nur-Lese-Modus"));
  for (const key of ["studioMinutesShort", "uimin", "printDocMinAbbr"])
    assert.equal(de[key], "min");
  assert.ok(!/\bMin\./.test(JSON.stringify(de)));
  assert.equal(de.journalKicker, "KOCHNOTIZEN");
  assert.equal(en.journalKicker, "COOKING NOTES");
});

test("the locked ingredient editor hint names the place and the required rights", () => {
  assert.ok(de.editorIngredientsLocked.includes("Optionen der Mealie Atelier Bridge"));
  assert.ok(de.editorIngredientsLocked.includes("Administratorrechte"));
  assert.ok(en.editorIngredientsLocked.includes("Mealie Atelier Bridge options"));
  assert.ok(en.editorIngredientsLocked.includes("administrator rights"));
});

test("keys requested by other packages exist in both languages", () => {
  const keys = [
    "syncOutcomeSourceMissing",
    "errSyncSourceGone",
    "errSyncSourceChecked",
    "syncAuditOutcomePartial",
    "syncItemUntitled",
    "syncPlatformLocalTodo",
    "syncNeedsWriteWeb",
    "syncTargetListWeb",
    "errEntryNotFound",
    "editorSummaryIngredientsAndSteps.one",
    "editorSummaryIngredientsAndSteps.other",
    "editorSummaryBasicsInstructions",
    "uiOpenQuickActionsNoShortcut",
    "studioVoiceListening",
    "studioReadSpeaking",
    "studioReadStop",
    "errDestinationAuthEnv",
    "syncBringReauthEnv",
    "bwReauthTextEnv",
    "editorDiscardConfirmTitle",
    "editorDiscardConfirmBody",
    "editorDiscardConfirmDiscard",
    "editorDiscardConfirmKeep",
  ];
  for (const key of keys) {
    assert.ok(de[key], `de.${key}`);
    assert.ok(en[key], `en.${key}`);
  }
  for (const key of ["errDestinationAuthEnv", "syncBringReauthEnv", "bwReauthTextEnv"])
    for (const texts of [de, en]) {
      assert.ok(texts[key].includes("BRING_EMAIL") && texts[key].includes("BRING_PASSWORD"));
    }
});

test("new German copy has no dash punctuation and no comma next to und", () => {
  for (const [key, value] of Object.entries(de)) {
    assert.ok(!/[—–]/.test(value), `${key} dash`);
    assert.ok(!/, und\b|\bund,/.test(value), `${key} comma next to und`);
  }
});
