import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/design-system/recipe-picker.css", import.meta.url),
  "utf8",
);
const rule = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `missing rule ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};

const meta = {
  categories: [
    { slug: "dinner", name: "Dinner" },
    { slug: "lunch", name: "Lunch" },
  ],
  tags: [],
};
const state = (categories = []) => ({
  id: "p",
  native: false,
  meta,
  panels: { category: false, tag: false },
  filters: { categories, tags: [], favorites: false, order: "name" },
});

// The picker is a bundle mixin that relies on shared helpers, so evaluate the source module with stand-ins.
const source = readFileSync(new URL("../src/components/recipe-picker.js", import.meta.url), "utf8");
const methods = new Function(
  "esc",
  "asArray",
  `${source.replace("export const", "const")}\nreturn recipePickerMethods;`,
)(
  (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"),
  (value) => (Array.isArray(value) ? value : []),
);

function card(language) {
  const strings = JSON.parse(
    readFileSync(new URL(`../src/i18n/${language}.json`, import.meta.url), "utf8"),
  );
  return Object.assign(Object.create(methods), {
    t: (key, values = {}) => strings[key].replace(/\{(\w+)\}/g, (_, name) => String(values[name])),
  });
}

test("filter group is a labelled field with a filled control, value and chevron", () => {
  const html = card("en")._pickerFilterGroup(state(), "category", "Category", meta.categories);
  assert.match(
    html,
    /class="field picker-filter"><span id="p-category-label">Category<\/span><button/,
  );
  assert.match(html, /aria-labelledby="p-category-label p-category-value"/);
  assert.match(html, /data-picker-count="category">All<\/span>/);
  assert.match(html, /class="picker-chevron"/);
  assert.match(html, /aria-expanded="false"/);
});

test("control shows All, the single name or a count, in both languages", () => {
  const en = card("en");
  const de = card("de");
  assert.equal(en._pickerFilterSummary(state(), "category"), "All");
  assert.equal(de._pickerFilterSummary(state(), "category"), "Alle");
  assert.equal(en._pickerFilterSummary(state(["lunch"]), "category"), "Lunch");
  assert.equal(en._pickerFilterSummary(state(["lunch", "dinner"]), "category"), "2 selected");
  assert.equal(de._pickerFilterSummary(state(["lunch", "dinner"]), "category"), "2 ausgewählt");
});

test("options expand inside the sheet scroll instead of scrolling on their own", () => {
  const body = rule(".atelier .picker-options");
  assert.doesNotMatch(body, /max-height/);
  assert.doesNotMatch(body, /overflow/);
});

test("the chevron rotates when the panel is open", () => {
  assert.match(
    rule('.atelier .picker-disclosure[aria-expanded="true"] .picker-chevron'),
    /rotate\(-135deg\)/,
  );
});

test("option rows reach 44px on coarse pointers", () => {
  assert.match(
    css,
    /@media \(pointer: coarse\) \{\s*\.atelier \.picker-options label \{\s*min-height: 44px;/,
  );
});

// Cascade: resolve the winning rule per property for the value span and the option-name span, using every
// stylesheet that targets spans inside a field (specificity as classes, then elements, later source wins).
const sheet = (name) =>
  readFileSync(new URL(`../src/design-system/${name}.css`, import.meta.url), "utf8");
const sheets = ["foundation", "editorial", "recipe-picker"]
  .map(sheet)
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const specificity = (selector) => [
  (selector.match(/\.[\w-]+|\[[^\]]+\]/g) || []).length,
  (selector.replace(/\.[\w-]+|\[[^\]]+\]/g, "").match(/(^|[\s>])[a-z][\w-]*/g) || []).length,
];
function winner(chain, property) {
  // chain: the selectors' target element described by its class list; rules matched by a tiny matcher.
  let best = null;
  let order = 0;
  for (const m of sheets.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
    const decl = new RegExp(`(?:^|;|\\s)${property}:\\s*([^;]+)`).exec(m[2]);
    if (!decl) continue;
    for (const selector of m[1].split(",").map((x) => x.trim())) {
      if (!chain(selector)) continue;
      const [a, b] = specificity(selector);
      order += 1;
      if (!best || a > best.a || (a === best.a && b >= best.b))
        best = { a, b, value: decl[1].trim() };
    }
  }
  return best?.value;
}
// A selector matches when its last compound is satisfied by the element and each ancestor part appears in the
// given ancestor class list in order.
const matches = (compound, el) =>
  compound.match(/^([a-z][\w-]*)?((?:\.[\w-]+)*)$/) &&
  (!RegExp.$1 || RegExp.$1 === el.tag) &&
  RegExp.$2
    .split(".")
    .filter(Boolean)
    .every((c) => el.classes.includes(c));
// Descendant-only selectors; anything with pseudo-classes, attributes or other combinators is skipped.
// The last compound must match the element, earlier ones the ancestors in order.
const matcher = (self, ancestors) => (selector) => {
  if (/[:\[>+~*]/.test(selector)) return false;
  const parts = selector.split(/\s+/);
  if (!matches(parts.pop(), self)) return false;
  let at = 0;
  for (const part of parts) {
    const hit = ancestors.findIndex((a, i) => i >= at && matches(part, a));
    if (hit === -1) return false;
    at = hit + 1;
  }
  return true;
};
const ancestors = [
  { tag: "div", classes: ["atelier"] },
  { tag: "section", classes: ["editor-card"] },
  { tag: "div", classes: ["field", "picker-filter"] },
];
test("value span wins the cascade inside .editor-card .field like the select", () => {
  const value = { tag: "span", classes: ["picker-disclosure-value"] };
  const inside = [...ancestors, { tag: "button", classes: ["picker-disclosure"] }];
  assert.equal(winner(matcher(value, inside), "color"), "var(--at-ink)");
  assert.equal(winner(matcher(value, inside), "font-size"), "13px");
  assert.equal(winner(matcher(value, inside), "font-weight"), "400");
  assert.equal(winner(matcher(value, inside), "text-transform"), "none");
  assert.equal(winner(matcher(value, inside), "letter-spacing"), "normal");
});

test("option names win the cascade inside .editor-card .field", () => {
  const name = { tag: "span", classes: [] };
  const inside = [
    ...ancestors,
    { tag: "div", classes: ["picker-options"] },
    { tag: "label", classes: [] },
  ];
  assert.equal(winner(matcher(name, inside), "color"), "var(--at-ink)");
  assert.equal(winner(matcher(name, inside), "font-size"), "13px");
  assert.equal(winner(matcher(name, inside), "text-transform"), "none");
  assert.equal(winner(matcher(name, inside), "letter-spacing"), "normal");
});

test("the control button is regular weight, not the field's bold", () => {
  assert.match(rule(".atelier .picker-disclosure"), /font-weight: 400/);
});
