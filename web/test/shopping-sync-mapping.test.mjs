import test from "node:test";
import assert from "node:assert/strict";
import {
  fingerprint,
  formatQuantity,
  mapItem,
  mergeKey,
  normalize,
  planBatch,
} from "../shopping-sync-mapping.mjs";

const GRAM = { id: "u-g", name: "gram", abbreviation: "g", useAbbreviation: true };
const CUP = { id: "u-c", name: "cup", pluralName: "cups", fraction: true };
const potatoes = { id: "f-p", name: "Kartoffeln" };
const line = { decimalComma: true, supportsDescription: true };
const bring = { decimalComma: true, supportsDescription: true, layout: "bring" };

test("linked food with abbreviated unit", () => {
  const item = { quantity: 300, unit: GRAM, food: potatoes };
  assert.deepEqual(mapItem(item, line), { title: "300 g Kartoffeln", description: null });
});

test("a note becomes the description, or lands in the title without description support", () => {
  const item = { quantity: 300, unit: GRAM, food: potatoes, note: "festkochend" };
  assert.deepEqual(mapItem(item, line), { title: "300 g Kartoffeln", description: "festkochend" });
  assert.equal(
    mapItem(item, { ...line, supportsDescription: false }).title,
    "300 g Kartoffeln (festkochend)",
  );
});

test("a note only item uses the note as its name", () => {
  assert.equal(mapItem({ note: "Backpapier" }, line).title, "Backpapier");
});

test("display text is the fallback and empty items map to nothing", () => {
  assert.equal(mapItem({ display: "2 Äpfel" }, line).title, "2 Äpfel");
  assert.equal(mapItem({ display: "  " }, line), null);
  assert.equal(mapItem({}, line), null);
});

test("quantities are formatted without unit conversion", () => {
  assert.equal(formatQuantity(1.5, { fraction: true, decimalComma: false }), "1 1/2");
  assert.equal(formatQuantity(0.25, { fraction: true, decimalComma: true }), "1/4");
  assert.equal(formatQuantity(0.25, { fraction: false, decimalComma: true }), "0,25");
  assert.equal(formatQuantity(300, { fraction: false, decimalComma: false }), "300");
});

test("unit and food plurals follow the quantity", () => {
  const item = { quantity: 2, unit: CUP, food: { name: "Apfel", pluralName: "Äpfel" } };
  assert.equal(mapItem(item, line).title, "2 cups Äpfel");
  assert.equal(mapItem({ ...item, quantity: 1 }, line).title, "1 cup Apfel");
});

test("titles are capped", () => {
  assert.ok(mapItem({ note: "x".repeat(400) }, line).title.length <= 255);
});

test("a Bring item has a name and one detail text with amount, unit and note", () => {
  const item = { quantity: 300, unit: GRAM, food: potatoes, note: "festkochend" };
  assert.deepEqual(mapItem(item, bring), {
    title: "Kartoffeln (300 g, festkochend)",
    description: null,
    name: "Kartoffeln",
    spec: "300 g, festkochend",
  });
  assert.deepEqual(mapItem({ note: "Backpapier" }, bring), {
    title: "Backpapier",
    description: null,
    name: "Backpapier",
    spec: "",
  });
  assert.equal(mapItem({ display: "2 Äpfel" }, bring).name, "2 Äpfel");
});

test("fingerprint is stable and sensitive to every field", () => {
  const base = { id: "1", quantity: 2, unit: GRAM, food: potatoes, note: "a", checked: false };
  assert.equal(
    fingerprint(base),
    fingerprint({ note: "a", food: potatoes, unit: GRAM, quantity: 2, id: "1" }),
  );
  for (const changed of [
    { ...base, quantity: 3 },
    { ...base, note: "b" },
    { ...base, checked: true },
    { ...base, food: { id: "f-x", name: "Mehl" } },
    { ...base, unit: { id: "u-x", name: "kilo" } },
  ])
    assert.notEqual(fingerprint(changed), fingerprint(base));
  assert.equal(fingerprint(base, true), fingerprint({ ...base, checked: true }));
});

test("normalize folds case, spacing, width and decimal commas", () => {
  assert.equal(normalize("  Kartoffeln   FESTKOCHEND "), "kartoffeln festkochend");
  assert.equal(normalize("1,5 l Milch"), "1.5 l milch");
  assert.equal(normalize("Straße"), "strasse");
  assert.equal(normalize("ＡＢＣ"), "abc");
  assert.equal(normalize(null), "");
});

const entries = (...items) => items.map((item, index) => [`k${index}`, item]);
const open = (...titles) =>
  new Map(titles.map((title, index) => [normalize(title), `uid${index}`]));
const plan = (items, options = {}) =>
  planBatch(entries(...items), {
    policy: "skip_exact",
    decimalComma: true,
    supportsDescription: true,
    layout: "bring",
    destinationOpen: new Map(),
    inFlight: new Map(),
    ...options,
  });

test("exact duplicates are skipped but similar lines are sent", () => {
  const lines = plan([{ note: "Milch" }, { note: "Milch fettarm" }, { note: "milch" }], {
    destinationOpen: open("Milch"),
  });
  assert.deepEqual(
    lines.map((x) => x.action),
    ["skip_duplicate", "send", "skip_duplicate"],
  );
  assert.equal(lines[0].duplicate_of, "uid0");
});

test("an in-flight record counts as a duplicate and the none policy sends everything", () => {
  const items = [{ note: "Milch" }, { note: "Milch" }];
  const flight = plan(items, { inFlight: new Map([[normalize("Milch"), "other:key"]]) });
  assert.deepEqual(
    flight.map((x) => [x.action, x.duplicate_of]),
    [
      ["skip_duplicate", "other:key"],
      ["skip_duplicate", "other:key"],
    ],
  );
  assert.deepEqual(
    plan(items, { policy: "none", destinationOpen: open("Milch") }).map((x) => x.action),
    ["send", "send"],
  );
});

test("a repeated line in one batch joins the lead as a member", () => {
  const lines = plan([{ note: "Milch" }, { note: "Milch" }]);
  assert.equal(lines[0].action, "send");
  assert.deepEqual(lines[0].members, ["k1"]);
  assert.equal(lines[1].merged_into, "k0");
});

test("merge adds quantities only for the same food, note and unit", () => {
  const a = { quantity: 200, unit: GRAM, food: potatoes };
  const b = { quantity: 300, unit: GRAM, food: potatoes };
  const lines = plan([a, b, { quantity: 1, unit: CUP, food: potatoes }, { ...b, note: "neu" }], {
    policy: "skip_exact_merge_same_unit",
  });
  assert.deepEqual(
    lines.map((x) => x.action),
    ["send", "merge", "send", "send"],
  );
  assert.equal(lines[0].title, "Kartoffeln (500 g)");
  assert.equal(lines[0].spec, "500 g");
  assert.deepEqual(lines[0].members, ["k1"]);
  assert.equal(mergeKey({ note: "x" }), null);
});

test("lines never merge under plain skip_exact", () => {
  const item = { quantity: 200, unit: GRAM, food: potatoes };
  assert.deepEqual(
    plan([item, { ...item, quantity: 100 }]).map((x) => x.action),
    ["send", "send"],
  );
});
