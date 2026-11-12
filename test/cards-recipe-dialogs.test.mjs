import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const cards = loadCards();
const card = (language = "de", permissions) =>
  makeCard(cards, { hass: { language, callWS: async () => ({}) }, permissions });

function detail(extra = {}) {
  return {
    slug: "x",
    name: "Test",
    recipeServings: 0,
    recipeIngredient: [],
    recipeInstructions: [{ text: "Do it" }],
    ...extra,
  };
}
function open(c, modal, recipe) {
  c._detail = recipe;
  c._modal = modal;
  c._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  return c._modalHtml();
}

test("steps render safe inline Markdown without double-linking", () => {
  const html = open(
    card("en"),
    "recipe",
    detail({
      recipeInstructions: [
        {
          text: "**Add a link** and *soft* and _soft2_ [My Link](https://demo.mealie.io) <b>x</b>",
        },
        { text: "see https://example.com/a_b_c now [bad](javascript:alert(1))" },
      ],
    }),
  );
  assert.match(html, /<strong>Add a link<\/strong>/);
  assert.match(html, /<em>soft<\/em>/);
  assert.match(html, /<em>soft2<\/em>/);
  assert.match(
    html,
    /<a href="https:\/\/demo\.mealie\.io" target="_blank" rel="noopener noreferrer">My Link<\/a>/,
  );
  assert.equal((html.match(/href="https:\/\/demo\.mealie\.io"/g) || []).length, 1);
  assert.doesNotMatch(html, /\*\*/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /href="https:\/\/example\.com\/a_b_c"/);
});

test("cooking mode lists the ingredients Mealie links to the current step", () => {
  const c = card("de");
  const recipe = detail({
    recipeIngredient: [
      { referenceId: "r1", quantity: 200, unit: { name: "g" }, food: { name: "Mehl" }, note: "" },
      { referenceId: "r2", quantity: 2, food: { name: "Ei" }, note: "" },
      { referenceId: "r3", quantity: 1, food: { name: "Zwiebel" }, note: "" },
    ],
    recipeInstructions: [
      { text: "Verrühren", ingredientReferences: [{ referenceId: "r2" }, { referenceId: "r1" }] },
      { text: "Ruhen lassen", ingredientReferences: [] },
    ],
  });
  c._cookIndex = 0;
  const first = open(c, "cook", recipe);
  const list = first.match(/<ul class="cook-step-ingredients"[^>]*>(.*?)<\/ul>/)?.[1] || "";
  const items = [...list.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
  // Recipe order, not reference order, and only the linked ones.
  assert.equal(items.length, 2);
  assert.match(items[0], /Mehl/);
  assert.match(items[1], /Ei/);
  assert.doesNotMatch(list, /Zwiebel/);
  c._cookIndex = 1;
  assert.doesNotMatch(open(c, "cook", recipe), /cook-step-ingredients/);
  // Untouched for recipes without links.
  c._cookIndex = 0;
  assert.doesNotMatch(open(c, "cook", detail()), /cook-step-ingredients/);
});

test("cook heading renders Markdown and long untitled steps get the long class", () => {
  const c = card("en");
  c._cookIndex = 0;
  const short = open(c, "cook", detail({ recipeInstructions: [{ text: "**Stir** well" }] }));
  assert.match(short, /<h2><strong>Stir<\/strong> well<\/h2>/);
  const long = open(c, "cook", detail({ recipeInstructions: [{ text: "word ".repeat(40) }] }));
  assert.match(long, /<h2 class="cook-stage--long">/);
  const veryLong = open(c, "cook", detail({ recipeInstructions: [{ text: "word ".repeat(70) }] }));
  assert.match(veryLong, /<h2 class="cook-stage--long cook-stage--xlong">/);
  const titled = open(
    c,
    "cook",
    detail({ recipeInstructions: [{ summary: "Sum", text: "word ".repeat(40) }] }),
  );
  assert.match(titled, /<h2>Sum<\/h2><p class="cook-step-detail">/);
});

test("edit form leaves servings empty for a recipe without servings", () => {
  const c = card("de");
  const html = open(c, "edit", detail({ recipeServings: 0 }));
  const input = html.match(/<input[^>]*name="servings"[^>]*>/)[0];
  assert.doesNotMatch(input, /value="2"/);
  assert.match(input, /value=""/);
  assert.doesNotMatch(input, /required/);
  assert.match(input, /step="any"/);
  assert.match(input, /max="100"/);
});

test("edit form footer has no card wrapper and the photo section has no 00 prefix or repeated heading", () => {
  const html = open(card("de"), "edit", detail());
  assert.doesNotMatch(html, /editor-card--steps/);
  assert.match(html, /<\/section>\s*<div class="editor-footer">/);
  assert.doesNotMatch(html, /00 \//);
  assert.equal((html.match(/>Foto</g) || []).length, 1);
});

test("print preview cuts steps at a word and marks the cut", () => {
  const c = card("en");
  c._printKind = "recipe";
  const text = "Mix the flour with a very long description of kneading and resting ".repeat(4);
  const html = open(c, "print", detail({ recipeInstructions: [{ text }, { text: "Short step" }] }));
  const row = html.match(/<b>1\.<\/b> ([^<]*)</)[1];
  assert.ok(row.endsWith("…"));
  assert.ok(row.length <= 111);
  assert.match(row.slice(0, -1), /\w$/);
  assert.ok(text.startsWith(row.slice(0, -1)) && /\s/.test(text[row.length - 1]));
  assert.match(html, /<b>2\.<\/b> Short step</);
  assert.match(html, /eyebrow print-section-heading">01 \//);
});

test("theme tabs carry no icons on any option", () => {
  const html = open(card("de"), "settings", detail());
  const group = html.match(/data-field="theme"[\s\S]*?<\/div>/)[0];
  assert.doesNotMatch(group, /<svg/);
});

test("history summaries are localized for restore, step photo and combined kinds", () => {
  const c = card("de");
  assert.equal(
    c._editorHistorySummary({
      kind: "restore",
      ingredient_count: 7,
      step_count: 4,
      summary: "7 ingredients, 4 steps",
    }),
    "7 Zutaten, 4 Schritte",
  );
  assert.equal(
    c._editorHistorySummary({ kind: "step_image", step_count: 1, summary: "1 steps" }),
    "1 Schritt",
  );
  assert.equal(
    c._editorHistorySummary({ kind: "basics_instructions", step_count: 3 }),
    "3 Schritte",
  );
});

test("a failed shopping load shows a dash on Today, not a count", () => {
  const c = card("de");
  c._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  c._failedParts = new Set(["shopping"]);
  const failed = c._today();
  assert.doesNotMatch(failed, /0 offene Artikel/);
  assert.match(failed, /<h3>—<\/h3>/);
  c._failedParts = new Set();
  assert.match(c._today(), /offene Artikel|Artikel/);
});

test("failed mealplan hides the plus buttons and failed recipes hide New recipe", () => {
  const c = card("de");
  c._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  assert.match(c._week(), /day-add/);
  assert.match(c._recipeTools(), /create-form/);
  c._failedParts = new Set(["mealplan", "recipes"]);
  c._loadFailed = true;
  const week = c._week();
  assert.doesNotMatch(week, /day-add/);
  assert.match(week, /load-failed/);
  assert.doesNotMatch(c._recipeTools(), /create-form/);
  assert.match(c._recipes(), /load-failed/);
});

test("stylesheet defines the long cook heading and print heading classes", () => {
  const css = readFileSync(new URL("../src/design-system/components.css", import.meta.url), "utf8");
  assert.match(css, /\.cook-stage--long\s*\{[^}]*font-size[^}]*hyphens:\s*auto/);
  assert.match(css, /\.cook-stage--xlong\s*\{[^}]*font-size/);
  const corners = readFileSync(
    new URL("../src/design-system/corners.css", import.meta.url),
    "utf8",
  );
  assert.match(corners, /\.cook-stage h2:not\(\.cook-stage--long\)\s*\{/);
  assert.doesNotMatch(
    corners,
    /\.cook-stage h2\s*\{/,
    "no unscoped cook h2 size rule may override the long variants",
  );
  assert.match(css, /\.print-section-heading\s*\{[^}]*margin/);
});

test("edit save omits servings when the field is empty", () => {
  const src = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  assert.match(src, /\.\.\.\(servingsChanged \? \{ servings \} : \{\}\)/);
  assert.doesNotMatch(src, /Math\.round\(Number\(values\.servings\)\)/);
  assert.doesNotMatch(src, /servings: Number\(values\.servings\)/);
});

test("edit form prefills fractional and large servings and keeps the form unblocked", () => {
  const c = card("de");
  for (const n of [2.5, 250]) {
    const html = open(c, "edit", detail({ recipeServings: n }));
    const input = html.match(/<input[^>]*name="servings"[^>]*>/)[0];
    assert.match(input, new RegExp(`value="${n}"`));
    assert.match(input, /step="any"/);
    assert.match(input, /max="100"/);
    assert.doesNotMatch(input, /step="1"/);
  }
});

test("print document and paper preview drop Markdown markers", () => {
  const text = "Add **a link** [My Link](https://demo.mealie.io) and _soft_";
  const c = card("en");
  c._printKind = "recipe";
  const html = open(c, "print", detail({ recipeInstructions: [{ text }] }));
  assert.match(html, /<b>1\.<\/b> Add a link My Link \(https:\/\/demo\.mealie\.io\) and soft</);
  let written = "";
  const popup = {
    document: {
      open() {},
      write: (html) => (written = html),
      close() {},
      getElementById: () => null,
    },
    focus() {},
  };
  const printing = loadCards({ window: { open: () => popup } });
  const p = makeCard(printing, { hass: { language: "en", callWS: async () => ({}) } });
  p._detail = detail({ recipeInstructions: [{ text }] });
  p._printKind = "recipe";
  p._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  p._print();
  assert.match(written, /<p>Add a link My Link \(https:\/\/demo\.mealie\.io\) and soft<\/p>/);
});
