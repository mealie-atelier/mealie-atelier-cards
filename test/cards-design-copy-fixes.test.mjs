import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
