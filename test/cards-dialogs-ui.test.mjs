import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const bundle = readFileSync(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");

function card() {
  const c = makeCard(loadCards());
  c._render = () => {};
  return c;
}

test("meal plan print preview lists each day with its own dishes and empty writing rows", () => {
  const c = card();
  c._modal = "print";
  c._printKind = "mealplan";
  c._weekStart = new Date(2026, 9, 26);
  c._data.mealplan = [
    { date: "2026-10-27", entryType: "dinner", title: "Kürbissuppe" },
    { date: "2026-10-26", entryType: "dinner", title: "Gnocchi" },
    { date: "2026-10-27", entryType: "lunch", title: "Penne" },
  ];
  const html = c._modalHtml();
  const days = [...html.matchAll(/paper-day-row"><b>([^<]*)<\/b> ([^<]*)</g)];
  assert.equal(days.length, 7);
  assert.match(days[0][2], /^Gnocchi$/);
  assert.match(days[1][2], /^(Kürbissuppe, Penne|Penne, Kürbissuppe)$/);
  assert.equal(days[2][2], "");
  assert.equal((html.match(/paper-write-row/g) || []).length, 7);
  assert.doesNotMatch(html, /<b>1\.<\/b>/);
});

test("cooking timer fields are 16px so iOS does not zoom on focus", () => {
  const rule = bundle.match(/\.atelier \.cook-timer-fields input \{([^}]*)\}/)[1];
  assert.match(rule, /font-size:\s*16px\s*!important/);
});

test("narrow step editor stacks the buttons under the text box", () => {
  assert.match(
    bundle,
    /@container atelier-card \(max-width: 480px\) \{\s*\.atelier \.editor-steps \.editor-step \{\s*grid-template-columns: 23px minmax\(0, 1fr\);/,
  );
  assert.match(bundle, /\.editor-steps \.editor-step \.step-buttons \{\s*grid-column: 2;/);
});

test("Get ingredients actions keep their labels on one line and wrap as a row", () => {
  assert.match(
    bundle,
    /\[data-form="recipe-to-list"\] \.form-actions \.btn \{\s*white-space: nowrap;/,
  );
  assert.match(bundle, /\[data-form="recipe-to-list"\] \.form-actions \{\s*flex-wrap: wrap;/);
});

test("the cooking badge drops a shared timer once it has finished", () => {
  const c = card();
  const badge = { textContent: "" };
  c._modal = "cook";
  c._detail = { slug: "pancakes" };
  c._timers = [];
  c._studio = {
    family: {
      members: [],
      session: {
        slug: "pancakes",
        timers: [{ id: "t1", name: "Pan", deadline: Date.now() + 60000 }],
      },
    },
    journal: {},
  };
  c.shadowRoot.querySelector = (q) => (q === ".cook-timer-count" ? badge : null);
  c._tickTimers();
  assert.equal(badge.textContent, "1 active");
  c._studio.family.session.timers[0].deadline = Date.now() - 1;
  c._tickTimers();
  assert.equal(badge.textContent, "0 active");
});
