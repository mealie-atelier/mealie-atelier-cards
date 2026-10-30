import test from "node:test";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

test("resetting the design tells the host page which theme, motion and language came back", async () => {
  const cards = loadCards({ navigator: { language: "en-US" } });
  const card = makeCard(cards);
  const events = [];
  card.dispatchEvent = (event) => events.push(event);
  card._local = { theme: "light", motion: "off", language: "de" };
  const el = { dataset: { action: "reset-design" }, disabled: false, closest: () => el };
  await card._handleClick({ target: el });
  const detail = (type) => events.find((e) => e.type === type)?.detail;
  assert.equal(detail("mealie-atelier-theme-change")?.theme, "auto", "the shell resolves it");
  assert.equal(detail("mealie-atelier-motion-change")?.motion, "expressive");
  assert.equal(detail("mealie-atelier-language-change")?.language, "en");
});
