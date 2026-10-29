import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const dialogs = readFileSync(new URL("../src/components/dialogs.js", import.meta.url), "utf8");

test("detail step rows keep the toggle in its own button and the text outside any button", () => {
  const start = dialogs.indexOf('<div class="recipe-step-row"');
  const row = dialogs.slice(start, dialogs.indexOf("</div>`;", start));
  assert.match(row, /<button class="step-number step-toggle"[^>]*aria-pressed=/);
  assert.match(row, /<div class="step /);
  assert.doesNotMatch(row, /<button class="step /);
  assert.match(row, /step-text">\$\{linkify\(instructionText\(step\)\)\}/);
});

function click(card, target) {
  const row = { dataset: { action: "step-check", value: "2" } };
  const event = {
    target: {
      closest: (sel) => (sel === "a[href]" ? target : sel === "[data-action]" ? row : null),
    },
    preventDefault() {},
  };
  return card._handleClick(event);
}

test("clicking a link in a step does not toggle it, clicking elsewhere does", async () => {
  const card = makeCard(loadCards(), { hass: { language: "en" } });
  card._render = () => {};
  await click(card, { href: "https://example.com" });
  assert.equal(card._checkedSteps.has(2), false);
  await click(card, null);
  assert.equal(card._checkedSteps.has(2), true);
  await click(card, null);
  assert.equal(card._checkedSteps.has(2), false);
});
