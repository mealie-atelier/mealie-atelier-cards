import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const forms = readFileSync(
  new URL("../src/design-system/mobile-forms.css", import.meta.url),
  "utf8",
);

test("cooking mode photo caption balances its line breaks", () => {
  const rule = forms.match(/\.atelier \.modal \.cook-visual \.cook-brand \{[^}]*\}/)[0];
  assert.match(rule, /text-wrap:\s*balance/);
});

test("cooking mode photo title keeps a 6px top inset in the 56px phone band", () => {
  const css = readFileSync(
    new URL("../src/design-system/control-refinement.css", import.meta.url),
    "utf8",
  );
  const band = css.indexOf("height: 56px;");
  assert.ok(band > 0, "56px band rule exists");
  const rule = css
    .slice(band)
    .match(/\.modal\.large:has\(\.cook-layout\) \.cook-visual \.cook-brand \{([^}]*)\}/);
  assert.ok(rule, "title rule sits in the short phone block");
  assert.match(rule[1], /bottom:\s*6px/);
  assert.ok(css.slice(band).indexOf(rule[0]) < 900, "rule belongs to the same block as the band");
});
