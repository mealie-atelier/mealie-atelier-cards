import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** A dashboard card with a little data so the overview tiles render. */
function dashboardCard() {
  const cards = loadCards();
  const card = makeCard(cards);
  card._view = "dashboard";
  card._data = {
    recipes: { total: 10, items: [] },
    mealplan: [{ date: "2030-01-01", entryType: "dinner", title: "Suppe" }],
    shopping: { items: [{ id: "1", checked: false, shoppingListId: "a" }], lists: [] },
  };
  card._render();
  return { cards, card };
}

test("the overview metric tiles are buttons that open the recipes, plan and shopping views", () => {
  const { cards } = dashboardCard();
  for (const view of ["recipes", "mealplan", "shopping"])
    assert.match(
      cards.document.markup,
      new RegExp(
        `<button type="button" class="stat ds-metric is-link" data-action="nav" data-value="${view}" aria-label="[^"]+">`,
      ),
      view,
    );
});

test("a metric tile click navigates to its view", async () => {
  const { cards, card } = dashboardCard();
  assert.match(cards.document.markup, /data-value="shopping" aria-label/);
  await card._handleClick({
    target: { closest: () => ({ dataset: { action: "nav", value: "shopping" } }) },
  });
  assert.equal(card._view, "shopping");
});

test("metric tiles have hover and focus styles in the design system", () => {
  const css = file("src/design-system/polish.css");
  assert.match(css, /\.atelier button\.stat:hover/);
  assert.match(css, /\.atelier button\.stat:focus-visible/);
});

test("a long dish name in the week strip wraps and clamps instead of overflowing", () => {
  const { cards, card } = dashboardCard();
  card._data.mealplan = [
    {
      date: "2030-01-01",
      entryType: "dinner",
      recipe: { name: "Hähnchensuppe mit Gemüse", slug: "x" },
    },
  ];
  card._weekStart = new Date(2030, 0, 1);
  card._view = "mealplan";
  card._render();
  assert.match(
    cards.document.markup,
    /<span class="day-meal-name">Hähnchensuppe mit Gemüse<\/span>/,
  );
  assert.match(cards.document.markup, /<div lang="[A-Za-z-]+" class="atelier /);
  const css = file("src/design-system/polish.css");
  const rule = css.match(/\.atelier \.day-meal-name \{[^}]*\}/)?.[0] || "";
  assert.match(rule, /overflow-wrap: anywhere/);
  assert.match(rule, /hyphens: auto/);
  assert.match(rule, /line-clamp: 3/);
});

test("the corner style drives the main surfaces and keeps the default look at 23px", () => {
  const css = file("src/design-system/corners.css");
  const token = (name) => {
    const [, n] = css.match(new RegExp(`${name}: calc\\(var\\(--at-radius\\) \\* (\\d+) / 23\\)`));
    return Number(n);
  };
  assert.deepEqual(
    ["--at-r-hero", "--at-r-panel", "--at-r-tile", "--at-r-stat", "--at-r-day", "--at-r-field"].map(
      token,
    ),
    [26, 20, 18, 17, 15, 13],
  );
  for (const selector of [
    ".atelier .recipe-tile",
    ".atelier .day",
    ".atelier .modal",
    ".atelier .shopping-card",
    ".atelier .stat",
    ".atelier select",
  ]) {
    const escaped = selector.replace(/[.]/g, "\\.");
    assert.match(
      css,
      new RegExp(`${escaped}[^{]*\\{\\s*border-radius: var\\(--(?:at-radius|at-r-[a-z]+)\\);`),
      selector,
    );
  }
  assert.ok(file("dist/mealie-atelier-cards.js").includes("--at-r-tile"));
});

/** A card whose wizard or form sits at the given viewport offsets. */
function revealCard(box) {
  const scrolled = [];
  const cards = loadCards({ window: { innerHeight: 800 } });
  const card = makeCard(cards);
  const element = {
    getBoundingClientRect: () => box,
    scrollIntoView: (options) => scrolled.push(options),
  };
  card.shadowRoot.querySelector = () => element;
  return { card, element, scrolled };
}

test("editing a pantry row leaves the page still while the form is on screen", () => {
  const visible = revealCard({ top: 120, bottom: 400 });
  visible.card._revealPantryForm(visible.element);
  assert.deepEqual(visible.scrolled, []);
  const partly = revealCard({ top: -100, bottom: 40 });
  partly.card._revealPantryForm(partly.element);
  assert.deepEqual(partly.scrolled, []);
  const hidden = revealCard({ top: -900, bottom: -600 });
  hidden.card._revealPantryForm(hidden.element);
  assert.equal(hidden.scrolled.length, 1);
});

test("the Kochinspo wizard is not nudged by a few pixels when stepping forward", async () => {
  const near = revealCard({ top: 35, bottom: 900 });
  near.card._revealDiscover();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(near.scrolled, []);
  const above = revealCard({ top: -200, bottom: 700 });
  above.card._revealDiscover();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(above.scrolled.length, 1);
});
