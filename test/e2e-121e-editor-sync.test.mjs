import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

let formValues = {};
class FakeFormData {
  entries() {
    return Object.entries(formValues);
  }
}
const LONG = `${"Donaudampfschifffahrts".repeat(6)}kapitän`.padEnd(140, "x");

async function submitEdit(values) {
  const card = makeCard(loadCards({ globals: { FormData: FakeFormData } }));
  card._detail = { slug: "long", name: LONG };
  const sent = [];
  const flashes = [];
  card._mutate = async (action, payload) => {
    sent.push({ action, payload });
    return true;
  };
  card._flash = (text) => flashes.push(text);
  const form = {
    dataset: { form: "edit" },
    querySelectorAll: () => [],
    querySelector: () => ({ disabled: false }),
  };
  formValues = values;
  await card._handleSubmit({ target: { closest: () => form }, preventDefault() {} });
  return { sent, flashes };
}

test("an unchanged 140 character name is not sent when only servings change", async () => {
  assert.equal(LONG.length, 140);
  const { sent } = await submitEdit({ name: LONG, description: "", servings: "2.5" });
  assert.equal(sent.length, 1);
  assert.equal("name" in sent[0].payload, false);
  assert.equal(sent[0].payload.servings, 2.5);
});

test("a changed name over 120 characters is refused instead of cut", async () => {
  const { sent, flashes } = await submitEdit({ name: `${LONG}x`, description: "", servings: "2" });
  assert.equal(sent.length, 0);
  assert.match(flashes[0], /at most 120/);
});

test("a changed name within 120 characters is sent", async () => {
  const { sent } = await submitEdit({ name: "Short", description: "", servings: "2" });
  assert.equal(sent[0].payload.name, "Short");
});

test("the photo button shows a plus when there is no photo and a pencil with one", () => {
  const src = readFileSync(new URL("../src/components/recipe-editor.js", import.meta.url), "utf8");
  assert.match(src, /icon\(image \? "edit" : "plus", 15\)/);
});
