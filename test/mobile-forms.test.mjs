import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const css = readFileSync(new URL("../src/design-system/mobile-forms.css", import.meta.url), "utf8");
const bundle = readFileSync(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");
const rule = (selector) => {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start));
};

test("the mobile form styles ship in the bundle", () => {
  assert.ok(bundle.includes("Native form controls under iOS Safari"));
});

test("date and time inputs own their box instead of the iOS chrome", () => {
  const block = rule('input:is([type="date"]');
  assert.match(block, /-webkit-appearance: none;/);
  assert.match(block, /display: block;/);
  assert.match(block, /min-width: 0;/);
  assert.match(block, /max-width: 100%;/);
  assert.match(block, /height: var\(--ds-control-height\);/);
  assert.match(block, /line-height: 1\.4;/);
  assert.match(block, /text-align: start;/);
  for (const type of ["time", "datetime-local", "month", "week"])
    assert.ok(css.includes(`[type="${type}"]`), type);
});

test("the iOS date value is aligned to the start, not centred", () => {
  assert.match(rule("input::-webkit-date-and-time-value"), /text-align: start;/);
});

test("selects in a form fill their field and the picker filters stack at one width", () => {
  assert.match(rule(".atelier .field > :is(input, select, textarea)"), /width: 100%;/);
  const row = rule(".atelier .picker-filter-row {");
  assert.match(row, /display: grid;/);
  assert.match(row, /grid-template-columns: minmax\(0, 1fr\);/);
});

test("the favorites check row has the height and radius of the fields around it", () => {
  const block = rule(".atelier .editor-card .editor-check");
  assert.match(block, /min-block-size: var\(--ds-control-height\);/);
  assert.match(block, /padding: var\(--ds-space-3\) var\(--ds-control-padding-x\);/);
  assert.match(block, /border-radius: var\(--ds-control-radius\);/);
  assert.match(block, /border: 1px solid var\(--ds-border\);/);
});

test("the form kicker keeps air above the first label", () => {
  assert.match(rule(".atelier .editor-card > .eyebrow"), /margin-bottom: var\(--ds-space-4\);/);
});

test("the dialog header names the dialog instead of staying an empty band", () => {
  const card = makeCard(loadCards());
  card._modal = "create";
  const html = card._modalHtml();
  const title = card.t("create");
  assert.ok(html.includes(`<div class="modal-bar-title" aria-hidden="true">${title}</div>`), html);
  assert.match(html, /role="dialog"[^>]*tabindex="-1"/);
  assert.match(
    rule(".atelier .modal > .modal-bar-title {\n    --at-bar-size"),
    /position: sticky;/,
  );
});
