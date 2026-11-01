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
