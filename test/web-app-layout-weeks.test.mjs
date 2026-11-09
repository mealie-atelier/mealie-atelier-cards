import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function plan(config = {}) {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card.setConfig({ type: "custom:mealie-atelier-card", mode: "dashboard", ...config });
  card._data = {
    recipes: { total: 0, items: [] },
    mealplan: [],
    shopping: { items: [], lists: [] },
  };
  return card;
}

test("the seven-day dashboard plan shows three weeks and asks for all 21 days", async () => {
  const card = plan({ week_days: 7 });
  card._weekStart = new Date(2030, 0, 7);
  assert.equal(card._planRows(), 3);
  assert.equal(card._planDayCount(), 21);
  assert.equal((card._weekStack().match(/class="week-row"/g) || []).length, 3);
  assert.match(card._weekStack(), /data-date="2030-01-27"/);
  const asked = [];
  card._ws = async (cmd, payload) => {
    asked.push({ cmd, payload });
    return [];
  };
  await card._loadMealplan();
  assert.deepEqual(JSON.parse(JSON.stringify(asked[0])), {
    cmd: "mealplan",
    payload: { start: "2030-01-07", end: "2030-01-27" },
  });
});

test("a plan with another length or a single card keeps one row", () => {
  assert.equal(plan({ week_days: 5 })._planRows(), 1);
  assert.equal(plan({ week_days: 7, mode: "mealplan" })._planRows(), 1);
  const card = plan({ week_days: 5 });
  card._weekStart = new Date(2030, 0, 7);
  assert.doesNotMatch(card._weekStack(), /week-stack/);
});

test("the month label covers the whole visible range", () => {
  const card = plan({ week_days: 7 });
  card._weekStart = new Date(2030, 0, 21);
  assert.match(card._planMonthLabel(), /Januar.*Februar 2030/);
  card._weekStart = new Date(2030, 0, 1);
  assert.equal(card._planMonthLabel(), "Januar 2030");
});

test("the rows are named after the week they show", () => {
  const card = plan({ week_days: 7 });
  card._weekStart = card._weekStartFor?.(new Date()) ?? card._weekStart;
  const html = card._weekStack();
  assert.match(html, /Diese Woche/);
  assert.match(html, /Nächste Woche/);
});

test("the footer and status slots exist only in the web app", () => {
  const core = file("src/card-core.template.js");
  assert.match(
    core,
    /const webAppSlot = \(name\) =>\s*this\.hasAttribute\?\.\("data-web-app"\) \? `<slot name="\$\{name\}"><\/slot>` : "";/,
  );
  assert.match(core, /<main class="main">\$\{webAppSlot\("status"\)\}/);
  assert.match(core, /\$\{webAppSlot\("foot"\)\}/);
  assert.match(file("web/public/offline-client.js"), /panel\.slot = "status";/);
});

test("the web app keeps the sidebar in view and may not clip it with overflow hidden", () => {
  const css = file("src/design-system/layout.css");
  const host = css.match(/:host\(\[data-web-app\]\) \.atelier \{([^}]*)\}/)[1];
  assert.match(host, /overflow:\s*clip/);
  assert.match(
    css,
    /@container atelier-card \(min-width: 921px\) \{\s*:host\(\[data-web-app\]\) \.atelier \.shell:not\(\.single\) > \.sidebar \{[^}]*position:\s*sticky[^}]*height:\s*100dvh/,
  );
  const shell = file("web/public/index.html");
  assert.match(
    shell,
    /<mealie-atelier-card data-web-app>[\s\S]*slot="foot"[\s\S]*<\/mealie-atelier-card>/,
  );
});

test("a stacked week stays seven columns against the twelve-column tablet rule", () => {
  const css = file("src/design-system/layout.css");
  assert.match(
    css,
    /\.week-stack \.week-grid:has\(> \.day:nth-child\(7\):last-child\) \{\s*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    css,
    /\.week-stack\s+\.week-grid:has\(> \.day:nth-child\(7\):last-child\)\s*> \.day:nth-child\(n\) \{\s*grid-column: auto;/,
  );
});
