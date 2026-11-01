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

function fakeEl(extra = {}) {
  const attrs = {};
  return {
    attrs,
    disabled: false,
    children: [],
    setAttribute: (k, v) => (attrs[k] = String(v)),
    getAttribute: (k) => attrs[k] ?? null,
    removeAttribute: (k) => delete attrs[k],
    ...extra,
  };
}

async function submit(values, detail) {
  const doc = { createElement: () => fakeEl({ dataset: {}, textContent: "" }) };
  const card = makeCard(loadCards({ globals: { FormData: FakeFormData, document: doc } }));
  card._detail = detail;
  const sent = [];
  const flashes = [];
  card._mutate = async (action, payload) => {
    sent.push({ action, payload });
    return true;
  };
  card._flash = (text) => flashes.push(text);
  const label = fakeEl({ note: null });
  const input = fakeEl({
    closest: () => label,
    insertAdjacentElement: (_w, el) => (label.note = el),
    scrollIntoView() {
      input.scrolled = true;
    },
    focus() {
      input.focused = true;
    },
  });
  label.querySelector = () => label.note;
  const form = {
    dataset: { form: "edit" },
    querySelectorAll: () => [],
    querySelector: (sel) => (sel.includes("servings") ? input : fakeEl()),
  };
  formValues = values;
  await card._handleSubmit({ target: { closest: () => form }, preventDefault() {} });
  return { sent, flashes, input, label, card };
}

const detail = { slug: "r", name: "R", recipeServings: 2 };

test("invalid servings show an inline error, focus the field and send nothing", async () => {
  for (const bad of ["0", "-1", "101"]) {
    const { sent, flashes, input, label } = await submit(
      { name: "R", description: "", servings: bad },
      detail,
    );
    assert.equal(sent.length, 0);
    assert.equal(flashes.length, 0, "no toast, a toast re-renders and drops the typed value");
    assert.equal(input.getAttribute("aria-invalid"), "true");
    assert.equal(input.focused, true);
    assert.equal(input.scrolled, true);
    assert.match(label.note.textContent, /\S/);
  }
});

test("an emptied servings field with a saved value is refused inline", async () => {
  const { sent, input } = await submit({ name: "R", description: "", servings: "" }, detail);
  assert.equal(sent.length, 0);
  assert.equal(input.getAttribute("aria-invalid"), "true");
});

test("an empty servings field saves when the recipe has no servings", async () => {
  const { sent } = await submit(
    { name: "R", description: "", servings: "" },
    { slug: "r", name: "R" },
  );
  assert.equal(sent.length, 1);
  assert.equal("servings" in sent[0].payload, false);
});

test("typing in the servings field clears the inline error", async () => {
  const { card, input, label } = await submit(
    { name: "R", description: "", servings: "0" },
    detail,
  );
  let removed = false;
  label.note.remove = () => (removed = true);
  label.querySelector = () => label.note;
  input.matches = (s) => s.includes("servings");
  card._clearServingsError(input);
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(removed, true);
});

test("light scheme defines a darker negative token and the inline error uses it", () => {
  const controls = readFileSync(
    new URL("../src/design-system/controls.css", import.meta.url),
    "utf8",
  );
  const light = controls.match(/\.atelier\.light \{([^}]*)\}/)[1];
  const hex = light.match(/--ds-negative:\s*#([0-9a-f]{6})/i)[1];
  const lum = (h) =>
    [0, 2, 4]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  // Lightest light panel surface in use is about #e2e2da; white inputs are lighter still.
  const ratio = (lum("e2e2da") + 0.05) / (lum(hex) + 0.05);
  assert.ok(ratio >= 4.5, `contrast ${ratio.toFixed(2)}`);
  const components = readFileSync(
    new URL("../src/design-system/components.css", import.meta.url),
    "utf8",
  );
  assert.match(components, /\.field-error[^{]*\{[^}]*var\(--ds-negative\)/);
});
