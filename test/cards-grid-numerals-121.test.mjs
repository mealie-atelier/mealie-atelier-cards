import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("card instances expose the declared grid options for Home Assistant", () => {
  const template = read("src/card-core.template.js");
  assert.match(template, /\n {2}getGridOptions\(\) \{/);
  assert.match(
    template,
    /GRID_OPTIONS = Object\.freeze\(\{ columns: 12, rows: "auto", min_columns: 4 \}\)/,
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
    rows: "auto",
    min_columns: 4,
  });
});

test("serif number displays use lining numerals in the UI face", () => {
  const css = read("src/design-system/polish.css");
  const start = css.indexOf(".atelier .at-numeral.at-numeral,");
  assert.ok(start >= 0);
  const block = css.slice(start, css.indexOf("}", start));
  assert.doesNotMatch(block, /data-book-selected-count/, "only the count, not the whole heading");
  assert.match(block, /\.detail-cols \.step-number\.step-toggle\.at-numeral/);
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
  assert.match(read("src/components/dialogs.js"), /class="step-number step-toggle at-numeral"/);
  assert.match(read("src/card-core.template.js"), /<span class="step-count at-numeral">/);
});

test("the cookbook heading wraps only its count in the numeral face", () => {
  const source = read("src/studio-ui.js");
  const body = source.match(/\n {2}_bookCountHtml\(count\) \{\n([\s\S]*?)\n {2}\},/);
  assert.ok(body, "_bookCountHtml helper");
  const esc = (value) => String(value).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const helper = new Function("esc", `return function (count) {${body[1]}}`)(esc);
  const html = helper.call({ tp: (_key, n) => `${n} Rezepte ausgewählt` }, 0);
  assert.equal(html, '<span class="at-numeral">0</span> Rezepte ausgewählt');
  assert.match(
    source,
    /<h2 data-book-selected-count>\$\{this\._bookCountHtml\(selected\.size\)\}<\/h2>/,
  );
  assert.match(source, /count\.innerHTML = this\._bookCountHtml\(this\._bookSelected\.size\)/);
});
