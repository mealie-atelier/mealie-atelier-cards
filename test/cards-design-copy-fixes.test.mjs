import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const refinement = read("../src/design-system/control-refinement.css");

function rule(css, selector) {
  const start = css.lastIndexOf(`${selector} {`);
  assert.ok(start >= 0, `missing rule ${selector}`);
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
});

test("the dialog close button is sticky so it stays reachable", () => {
  assert.match(rule(refinement, ".atelier .modal > .modal-close"), /position:\s*sticky/);
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
