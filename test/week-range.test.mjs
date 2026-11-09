import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const source = readFileSync(new URL("../src/week-range.js", import.meta.url), "utf8");
const W = runInNewContext(source + "\nAtelierWeek", { Date, Number, Math, Array });
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sundayOfThisWeek = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
};
// 2026-11-11 is a Wednesday.
const wed = new Date(2026, 10, 11);

test("range start follows the configured mode", () => {
  assert.equal(ymd(W.rangeStart(wed, "monday")), "2026-11-09");
  assert.equal(ymd(W.rangeStart(wed, "sunday")), "2026-11-08");
  assert.equal(ymd(W.rangeStart(wed, "today")), "2026-11-11");
  assert.equal(ymd(W.rangeStart(wed, "bogus")), "2026-11-09");
  assert.equal(ymd(W.rangeStart(new Date(2026, 10, 8), "monday")), "2026-11-02");
  assert.equal(ymd(W.rangeStart(new Date(2026, 10, 8), "sunday")), "2026-11-08");
});

test("range end and navigation move by the number of days", () => {
  const start = new Date(2026, 10, 9);
  assert.equal(ymd(W.rangeEnd(start, 7)), "2026-11-15");
  assert.equal(ymd(W.rangeEnd(start, 1)), "2026-11-09");
  assert.equal(ymd(W.rangeEnd(start, 14)), "2026-11-22");
  assert.equal(ymd(W.shiftRange(start, 3, 1)), "2026-11-12");
  assert.equal(ymd(W.shiftRange(start, 3, -1)), "2026-11-06");
  assert.equal(ymd(W.shiftRange(start, 14, 1)), "2026-11-23");
});

test("day counts are clamped to 1 through 14 and default to 7", () => {
  assert.equal(W.normalizeDays(undefined), 7);
  assert.equal(W.normalizeDays(""), 7);
  assert.equal(W.normalizeDays("abc"), 7);
  assert.equal(W.normalizeDays(0), 1);
  assert.equal(W.normalizeDays(-4), 1);
  assert.equal(W.normalizeDays(99), 14);
  assert.equal(W.normalizeDays("5"), 5);
  assert.equal(W.normalizeDays(3.9), 3);
});

test("entry types keep known values only and an empty list means all", () => {
  assert.deepEqual(Array.from(W.normalizeTypes(["dinner", "pizza", "dinner", "lunch"])), [
    "dinner",
    "lunch",
  ]);
  assert.deepEqual(Array.from(W.normalizeTypes("dinner")), []);
  const entries = [{ entryType: "dinner" }, { entryType: "lunch" }, { entryType: "snack" }];
  assert.equal(W.filterEntries(entries, []).length, 3);
  assert.equal(W.filterEntries(entries, undefined).length, 3);
  assert.deepEqual(
    W.filterEntries(entries, ["dinner", "snack"]).map((e) => e.entryType),
    ["dinner", "snack"],
  );
  assert.equal(W.filterEntries(null, ["dinner"]).length, 0);
});

test("setConfig normalizes the range options and keeps today's defaults", () => {
  const cards = loadCards();
  const card = makeCard(cards, {});
  assert.equal(card._config.week_start, "monday");
  assert.equal(card._config.week_days, 7);
  assert.deepEqual(Array.from(card._config.entry_types), []);
  card.setConfig({ type: "x", week_days: 40, week_start: "nope", entry_types: ["dinner", "x"] });
  assert.equal(card._config.week_days, 14);
  assert.equal(card._config.week_start, "monday");
  assert.deepEqual(Array.from(card._config.entry_types), ["dinner"]);
});

test("the week view lays out the configured length and filters entry types", () => {
  const cards = loadCards();
  const card = makeCard(cards, {});
  card.setConfig({ type: "x", week_start: "sunday", week_days: 3, entry_types: ["dinner"] });
  const first = ymd(card._weekStart);
  assert.equal(first, ymd(sundayOfThisWeek()));
  card._data.mealplan = [
    { id: 1, date: first, entryType: "dinner", title: "Soup" },
    { id: 2, date: first, entryType: "lunch", title: "Salad" },
  ];
  const html = card._week();
  assert.equal((html.match(/class="day /g) || []).length, 3);
  assert.match(html, /class="week-grid week-grid-custom"/);
  assert.match(html, /Soup/);
  assert.doesNotMatch(html, /Salad/);
  card.setConfig({ type: "x" });
  assert.equal((card._week().match(/class="day /g) || []).length, 7);
  assert.match(card._week(), /class="week-grid"/);
});

test("navigation moves by the configured number of days and loads that range", async () => {
  const cards = loadCards();
  const calls = [];
  const card = makeCard(cards, {
    hass: { language: "en", callWS: async (msg) => (calls.push(msg), {}) },
  });
  card.setConfig({ type: "x", week_start: "sunday", week_days: 3 });
  const first = card._weekStart;
  assert.equal(ymd(first), ymd(sundayOfThisWeek()));
  const click = (action) =>
    card._handleClick({ target: { closest: () => ({ dataset: { action } }) } });
  await click("week-next");
  assert.equal(
    ymd(card._weekStart),
    ymd(new Date(first.getFullYear(), first.getMonth(), first.getDate() + 3)),
  );
  const range = calls.filter((c) => c.start).pop();
  assert.equal(range.start, ymd(card._weekStart));
  assert.equal(
    range.end,
    ymd(new Date(first.getFullYear(), first.getMonth(), first.getDate() + 5)),
  );
  await click("week-prev");
  await click("week-prev");
  assert.equal(
    ymd(card._weekStart),
    ymd(new Date(first.getFullYear(), first.getMonth(), first.getDate() - 3)),
  );
  await click("week-today");
  assert.equal(ymd(card._weekStart), ymd(first));
});

function makeEditor(config, language = "en") {
  const cards = loadCards();
  const editor = new (cards.registry.get("mealie-atelier-card-editor"))();
  Object.defineProperty(editor, "isConnected", { value: true });
  editor._hass = { language };
  editor._wizardMode = false;
  editor._detectNativeEntries();
  editor.setConfig({ type: "custom:mealie-atelier-card", ...config });
  return editor;
}

test("the visual editor offers the range fields in both languages and stores changes", () => {
  const en = makeEditor({ week_start: "sunday", week_days: 5, entry_types: ["lunch"] });
  const html = en.shadowRoot.innerHTML;
  assert.match(html, /<select id="atelier-week_start"[\s\S]*?<\/select>/);
  assert.match(html, /<option value="sunday"\s+selected\s*>Sunday</);
  assert.match(html, /<option value="5"\s+selected\s*>5</);
  assert.equal((html.match(/data-entry-type="/g) || []).length, 7);
  assert.match(html, /data-entry-type="lunch" checked/);
  assert.match(html, /Meal types/);
  assert.match(makeEditor({}, "de").shadowRoot.innerHTML, /Angezeigte Tage/);
  en.shadowRoot.querySelectorAll = () => [
    { checked: true, dataset: { entryType: "dinner" } },
    { checked: false, dataset: { entryType: "lunch" } },
    { checked: true, dataset: { entryType: "snack" } },
  ];
  en._handleChange({ target: { dataset: { key: "entry_types" }, type: "checkbox" } });
  assert.deepEqual(Array.from(en._emittedConfig().entry_types), ["dinner", "snack"]);
  en._handleChange({ target: { dataset: { key: "week_days" }, value: "10" } });
  assert.equal(en._emittedConfig().week_days, 10);
  en._handleChange({ target: { dataset: { key: "week_days" }, value: "7" } });
  assert.equal("week_days" in en._emittedConfig(), false);
});

test("the print sheet follows the configured length and entry types", () => {
  const written = [];
  const popup = {
    document: { write: (h) => written.push(h), open() {}, close() {}, getElementById: () => null },
    focus() {},
  };
  const cards = loadCards({ window: { open: () => popup } });
  const card = makeCard(cards, {});
  card.setConfig({ type: "x", week_days: 2, entry_types: ["dinner"] });
  const day = ymd(card._weekStart);
  card._data.mealplan = [
    { id: 1, date: day, entryType: "dinner", title: "Soup" },
    { id: 2, date: day, entryType: "lunch", title: "Salad" },
  ];
  card._printKind = "mealplan";
  card._print();
  const html = written.join("");
  assert.equal((html.match(/class="week-day"/g) || []).length, 2);
  assert.match(html, /Soup/);
  assert.doesNotMatch(html, /Salad/);
});
