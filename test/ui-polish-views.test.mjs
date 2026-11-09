import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const core = read("../src/studio-core.js");
const views = read("../src/components/views.js");
const dialogs = read("../src/components/dialogs.js");
const studioUi = read("../src/studio-ui.js");
const template = read("../src/card-core.template.js");
const de = JSON.parse(read("../src/i18n/de.json"));
const en = JSON.parse(read("../src/i18n/en.json"));
const Studio = runInNewContext(core + "\nAtelierStudio", { Date, Intl, Number, Math, String });

test("the shopping progress pill is only rendered for a non-empty list", () => {
  assert.match(
    views,
    /\$\{filtered\.length \? `<span class="pill">\$\{done\}\/\$\{filtered\.length\}/,
  );
});

test("the recipe dialog omits the clock and yield pills when they have no value", () => {
  assert.doesNotMatch(dialogs, /\|\| "—"/);
  assert.match(dialogs, /\$\{clockTime \? `<span class="pill">\$\{icon\("clock"/);
  assert.match(dialogs, /\$\{scaledYield \? `<span class="pill">/);
});

test("a yield text without a serving count uses a neutral icon", () => {
  assert.match(dialogs, /const yieldIcon = servingBase \? "utensils" : "spark"/);
  assert.match(dialogs, /icon\(yieldIcon, 12\)/);
  assert.equal(
    Studio.recipeServings({ recipeYield: "große Kastenform", recipeYieldQuantity: 1 }),
    null,
  );
  assert.equal(Studio.recipeServings({ recipeYield: "4 Portionen", recipeYieldQuantity: 4 }), 4);
});

test("the recipe check separates a servings text without a number from missing servings", () => {
  const keyFor = (recipe) =>
    Studio.audit({
      name: "x",
      recipeIngredient: [],
      recipeInstructions: [],
      ...recipe,
    }).problems?.find((p) => p.field === "servings")?.key;
  assert.equal(keyFor({ recipeYield: "große Kastenform" }), "studioAuditServingsNoNumber");
  assert.equal(keyFor({ recipeYield: "1 große Kastenform" }), "studioAuditServingsNoNumber");
  assert.equal(keyFor({ recipeYield: "4 Portionen", recipeServings: 4 }), undefined);
  assert.equal(keyFor({}), "studioAuditServingsInvalid");
  assert.equal(de.studioAuditServingsNoNumber, "Portionsangabe ohne Zahl");
  assert.ok(en.studioAuditServingsNoNumber);
});

test("category labels map ß to the capital ẞ before CSS uppercases them", () => {
  assert.equal(Studio.capsLabel("Süßspeise"), "Süẞspeise");
  assert.equal(Studio.capsLabel("Süßspeise").toUpperCase(), "SÜẞSPEISE");
  assert.match(views, /<small>\$\{esc\(AtelierStudio\.capsLabel\(category\)\)\}<\/small>/);
});

test("the family step badge keeps its date together", () => {
  for (const labels of [de, en])
    assert.match(labels.familyStep, /(gestartet|started)\u00a0\{date\}$/);
  assert.doesNotMatch(studioUi, /white-space:nowrap/);
});

test("export button and toast share one term and the export uses an icon that already existed", () => {
  for (const labels of [de, en]) {
    const term = /Atelier-Profil|Atelier profile/;
    assert.match(labels.studioDiagnosticsExport, term);
    assert.match(labels.studioExportDownloaded, term);
  }
  assert.match(studioUi, /data-action="studio-export">\$\{icon\("download", 14\)\}/);
  assert.match(template, /^ {2}download: '/m);
  assert.match(
    template,
    /atelier-credit-footer">[^\n]*atelier-version">Mealie Atelier \$\{VERSION\}/,
  );
});

test("refresh and live-status refresh confirm with a toast", () => {
  assert.match(template, /if \(started && !this\._error\) this\._flash\(this\.t\("refreshed"\)\)/);
  assert.match(
    studioUi,
    /if \(await this\._studioRefresh\(\)\) this\._flash\(this\.t\("studioSynced"\)\)/,
  );
  for (const key of ["refreshed", "studioSynced"]) {
    assert.ok(de[key] && en[key], key);
  }
});

test("clearing the cookbook selection is disabled while nothing is selected", () => {
  assert.match(
    studioUi,
    /data-action="studio-book-clear" \$\{selected\.size \|\| this\._bookPicked\?\.size \? "" : "disabled"\}/,
  );
  assert.match(
    studioUi,
    /if \(!this\._bookSelected\?\.size && !this\._bookPicked\?\.size\) return;/,
  );
  assert.match(
    studioUi,
    /clear\.disabled = !this\._bookSelected\.size && !this\._bookPicked\?\.size/,
  );
});
