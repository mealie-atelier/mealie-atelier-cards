import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const polish = read("src/design-system/polish.css");
const forms = read("src/design-system/mobile-forms.css");
const editorial = read("src/design-system/editorial.css");
const adaptive = read("src/design-system/adaptive.css");
const demo = read("demo/live-demo.css");
const bundle = read("dist/mealie-atelier-cards.js");
const block = (css, selector) => {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `missing ${selector}`);
  return css.slice(start, css.indexOf("}", start));
};

test("the week grid wraps into rows instead of squeezing seven narrow columns", () => {
  const rule = (min) =>
    polish.match(
      new RegExp(
        `@container atelier-card \\(min-width: ${min}px\\) \\{\\s*\\.atelier \\.week-grid \\{([^}]*)\\}`,
      ),
    );
  assert.match(rule(920)?.[1] ?? "", /repeat\(4, minmax\(0, 1fr\)\)/, "4 + 3 rows from 920px");
  assert.match(
    rule(1400)?.[1] ?? "",
    /repeat\(7, minmax\(140px, 1fr\)\)/,
    "seven columns with room",
  );
  assert.match(
    block(polish, ".atelier .shell.single .week-grid {"),
    /repeat\(4, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    polish,
    /min-width: 1100px\) \{\s*\.atelier \.shell\.single \.week-grid \{[^}]*repeat\(7, minmax\(140px/,
  );
  assert.doesNotMatch(polish, /@media \(min-width: 1081px\) \{\s*\.atelier \.week-grid/);
  assert.doesNotMatch(polish, /Tablet week strip/, "no 11px name for seven squeezed columns");
});

test("seven days in the wrapped layout fill both rows on a 12 column grid", () => {
  const seven = ":has(> .day:nth-child(7):last-child)";
  for (const [shell, range] of [
    [".shell:not(.single)", "min-width: 920px\\) and \\(max-width: 1399px"],
    [".shell.single", "min-width: 761px\\) and \\(max-width: 1099px"],
  ]) {
    const esc = shell.replace(/[.()]/g, "\\$&");
    const sevenEsc = seven.replace(/[.()>]/g, "\\$&");
    const open = new RegExp(`@container atelier-card \\(${range}\\) \\{([\\s\\S]*?)\n\\}\n`);
    const body = polish.match(open)?.[1] ?? "";
    assert.match(
      body,
      new RegExp(
        `${esc} \\.week-grid${sevenEsc} \\{\\s*grid-template-columns: repeat\\(12, minmax\\(0, 1fr\\)\\)`,
      ),
    );
    assert.match(body, /nth-child\(-n \+ 4\) \{\s*grid-column: span 3/);
    assert.match(body, /nth-child\(n \+ 5\) \{\s*grid-column: span 4/);
  }
});

test("the week grid rules cannot override the narrow carousel container rules", () => {
  const layout = read("src/design-system/layout.css");
  const narrow = [
    ...layout.matchAll(
      /@container atelier-card \(max-width: (\d+)px\) \{\s*\.atelier \.week-grid \{/g,
    ),
  ];
  assert.ok(narrow.length >= 2, "carousel container rules");
  for (const m of polish.matchAll(
    /@container atelier-card \(min-width: (\d+)px\)[^{]*\{\s*\.atelier (?:\.shell\.single )?\.week-grid \{/g,
  ))
    for (const n of narrow)
      assert.ok(Number(m[1]) > Number(n[1]), `rule ${m[1]} overlaps max-width ${n[1]}`);
  assert.equal(
    bundle.includes("@media (min-width: 1081px) {\n  .atelier .week-grid {"),
    false,
    "no viewport based week grid rule in the bundle",
  );
});

test("week meal names hyphenate properly and dialog titles never split ordinary words", () => {
  const name = block(polish, ".atelier .day-meal-name {");
  assert.match(name, /overflow-wrap: break-word/);
  assert.match(name, /hyphens: auto/);
  for (const selector of [
    ".setup-step-title\n  ) {",
    ".atelier .modal .editor-lead > div > :is(h2, .eyebrow) {",
  ]) {
    const rule = block(forms, selector);
    assert.match(rule, /overflow-wrap: break-word/);
    assert.match(rule, /hyphens: manual/);
    assert.match(rule, /text-wrap: balance/);
  }
});

test("the cooking header title wraps an unbreakable word and clears the close tile", () => {
  const rule = block(forms, ".atelier .modal .cook-visual .cook-brand {");
  assert.match(rule, /overflow-wrap: anywhere/);
  assert.match(rule, /var\(--at-close-reserve\)/);
});

test("the editor context line and its flex parent can shrink and wrap", () => {
  const context = block(polish, ".atelier .editor-context {");
  assert.match(context, /min-width: 0/);
  assert.match(context, /overflow-wrap: anywhere/);
  assert.match(block(polish, ".atelier .editor-lead > div {"), /min-width: 0/);
});

test("short and laptop landscape cooking keep step text clear of the close tile", () => {
  const needle = ".atelier .modal:has(.cook-layout) .cook-stage :is(h2, p, .cook-step-detail) {";
  assert.equal(polish.split(needle).length - 1, 2);
  assert.match(block(polish, needle), /padding-inline-end: var\(--cook-close-clear\)/);
});

test("the nutrition summary title spans the full width on phones", () => {
  for (const css of [editorial, adaptive]) {
    assert.match(
      css,
      /\.nutri-header \{\s*padding: 16px;\s*grid-template-columns: minmax\(0, 1fr\);/,
    );
    assert.match(css, /\.nutri-eyebrow \{[^}]*grid-column: 1 \/ -1;[^}]*grid-row: auto/);
  }
});

test("demo metric values do not auto-hyphenate and the install command shows a scroll fade", () => {
  for (const rule of demo.match(/\.recipe-metrics b \{[^}]*\}/g))
    assert.match(rule, /hyphens: manual/);
  assert.match(demo, /\.term pre \{[^}]*white-space: pre;/);
  assert.match(demo, /\.term pre \{\s*--term-fade: 0px;[^}]*mask-image: linear-gradient\(to right/);
  assert.match(demo, /animation-timeline: scroll\(self inline\)/);
  assert.match(demo, /100% \{\s*--term-fade: 0px/);
});

test("the fixes ship in the bundle", () => {
  assert.ok(bundle.includes(".atelier .modal .cook-visual .cook-brand"));
  assert.ok(bundle.includes("repeat(4, minmax(0, 1fr))"));
});
