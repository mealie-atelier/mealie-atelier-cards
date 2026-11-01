import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("card instances expose the declared grid options for Home Assistant", () => {
  const template = read("src/card-core.template.js");
  assert.match(template, /\n {2}getGridOptions\(\) \{/);
  assert.match(
    template,
    /GRID_OPTIONS = Object\.freeze\(\{ columns: 12, rows: 10, min_columns: 4, min_rows: 3 \}\)/,
  );
  const bundle = read("dist/mealie-atelier-cards.js");
  const instance = bundle.match(/\n {2}getGridOptions\(\) \{[^}]*\}/);
  assert.ok(instance, "instance getGridOptions in bundle");
});

test("instance getGridOptions returns the declared object", async () => {
  const bundle = read("dist/mealie-atelier-cards.js");
  const grab = (re) => bundle.match(re)[0];
  const decl = grab(/const GRID_OPTIONS = [^\n]*;/);
  const body = grab(/\n {2}getGridOptions\(\) \{[^\n]*\n[^\n]*\n {2}\}/);
  const Cls = new Function(`${decl}\nreturn class {${body}};`)();
  assert.deepEqual(new Cls().getGridOptions(), {
    columns: 12,
    rows: 10,
    min_columns: 4,
    min_rows: 3,
  });
});

test("serif number displays use lining numerals in the UI face", () => {
  const css = read("src/design-system/polish.css");
  const start = css.indexOf(".atelier .at-numeral.at-numeral,");
  assert.ok(start >= 0);
  const block = css.slice(start, css.indexOf("}", start));
  assert.match(block, /\.studio-head h2\[data-book-selected-count\]/);
  assert.doesNotMatch(block, /cook-timer-header/);
  assert.match(block, /font-family: var\(--ds-font-ui\)/);
  assert.match(block, /lining-nums tabular-nums/);
  assert.match(
    read("src/components/nutrition-journal.js"),
    /<strong class="at-numeral">\$\{matched\}/,
  );
  assert.match(
    read("src/components/nutrition-journal.js"),
    /<strong class="at-numeral">\$\{report/,
  );
  assert.match(read("src/components/views.js"), /<b class="at-numeral">\$\{day\.getDate\(\)\}/);
});
