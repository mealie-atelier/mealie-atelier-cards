import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const locale = (name) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8"));
const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("setConfig rejects an unknown mode, theme and non-positive columns with a clear message", () => {
  const card = makeCard(loadCards());
  assert.throws(
    () => card.setConfig({ type: "custom:mealie-atelier-card", mode: "bogus" }),
    /Invalid option mode: 'bogus'\. Allowed: dashboard, .*recipes/,
  );
  assert.throws(
    () => card.setConfig({ type: "custom:mealie-atelier-card", theme: "purple" }),
    /Invalid option theme: 'purple'\. Allowed: auto, light, dark/,
  );
  for (const columns of [-3, 0, 1.5, "abc"])
    assert.throws(
      () => card.setConfig({ type: "custom:mealie-atelier-card", columns }),
      /Invalid option columns/,
    );
  card.setConfig({
    type: "custom:mealie-atelier-card",
    mode: "recipes",
    theme: "dark",
    columns: 4,
  });
  assert.equal(card._view, "recipes");
});
