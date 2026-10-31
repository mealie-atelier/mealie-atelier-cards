import assert from "node:assert/strict";
import test from "node:test";
import { loadCards, makeCard } from "./support/card-harness.mjs";

function keyEvent(key, target = {}) {
  const event = {
    key,
    target,
    defaultPrevented: false,
    composedPath: () => [target],
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
}

function cookCard() {
  const card = makeCard(loadCards());
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    recipeInstructions: ["Mix", "Whisk", "Bake"].map((text) => ({ text })),
  };
  card._studio = { family: { session: { id: "s1", slug: "pancakes" } } };
  card._modal = "cook";
  card._cookIndex = 0;
  card._render = () => {};
  const syncs = [];
  card._studioSyncStep = async (id, step) => syncs.push([id, step]);
  const scrolls = { ".modal": { scrollTop: 300 }, ".cook-content": { scrollTop: 200 } };
  let bar = 0;
  card.shadowRoot.querySelector = (selector) => scrolls[selector] || null;
  card._watchModalBar = () => bar++;
  return { card, syncs, scrolls, bar: () => bar };
}

test("ArrowRight writes the step to the shared session and resets scroll", async () => {
  const { card, syncs, scrolls, bar } = cookCard();
  const ev = keyEvent("ArrowRight");
  card._handleKeyDown(ev);
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(ev.defaultPrevented);
  assert.equal(card._cookIndex, 1);
  assert.deepEqual(syncs, [["s1", 1]]);
  assert.equal(scrolls[".modal"].scrollTop, 0);
  assert.equal(scrolls[".cook-content"].scrollTop, 0);
  assert.equal(bar(), 1);
});

test("ArrowLeft at the first step does nothing and ArrowLeft elsewhere syncs", async () => {
  const { card, syncs } = cookCard();
  card._handleKeyDown(keyEvent("ArrowLeft"));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(syncs.length, 0);
  card._cookIndex = 2;
  card._handleKeyDown(keyEvent("ArrowLeft"));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(syncs, [["s1", 1]]);
});

test("a touch swipe syncs the step and resets scroll", async () => {
  const { card, syncs, scrolls } = cookCard();
  card._cookGesture = { x: 200, y: 10 };
  card._handlePointerUp({ pointerType: "touch", clientX: 100, clientY: 10 });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(card._cookIndex, 1);
  assert.deepEqual(syncs, [["s1", 1]]);
  assert.equal(scrolls[".modal"].scrollTop, 0);
});

test("quick actions label drops the shortcut on touch-only devices", () => {
  const cards = loadCards({
    globals: {
      window: {
        matchMedia: (q) => ({ matches: q.includes("pointer: coarse"), addEventListener() {} }),
      },
    },
  });
  const card = makeCard(cards);
  const html = card._topbar();
  assert.doesNotMatch(html, /class="shortcut"/);
  assert.doesNotMatch(html, /Ctrl\+K|⌘K/);
  const desktop = makeCard(loadCards())._topbar();
  assert.match(desktop, /class="shortcut"/);
});

test("the read-only notice is not shown when no status entry resolved", () => {
  const render = (entries) => {
    const cards = loadCards();
    const card = makeCard(cards);
    card._status = { entries };
    card._body = () => "";
    card._render();
    return cards.document.markup;
  };
  assert.doesNotMatch(render([]), /readOnlyHint|Read-only|class="notice is-spaced/);
  assert.match(render([{ entry_id: "e1", can_write: false }]), /Read-only/i);
});

function editCard(dirty) {
  const card = makeCard(loadCards());
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    description: "",
    recipeServings: 2,
    recipeInstructions: [{ text: "Mix" }],
  };
  card._modal = "edit";
  card._render = () => {};
  const fields = {
    name: { value: dirty ? "Waffles" : "Pancakes" },
    description: { value: "" },
    servings: { value: "2" },
  };
  const form = {
    querySelector: (s) => fields[/name="(\w+)"/.exec(s)?.[1]],
    querySelectorAll: () => [{ value: "Mix" }],
  };
  card.shadowRoot.querySelector = (s) => (s === 'form[data-form="edit"]' ? form : null);
  const asked = [];
  let answer = false;
  card._atelierDialog = async (opts) => {
    asked.push(opts);
    return answer;
  };
  return { card, asked, answer: (v) => (answer = v) };
}

test("Escape on a dirty editor asks before discarding", async () => {
  const { card, asked, answer } = editCard(true);
  card._handleKeyDown(keyEvent("Escape"));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(asked.length, 1);
  assert.equal(card._modal, "edit");
  answer(true);
  await card._handleClick({
    target: { closest: () => ({ dataset: { action: "close-modal" } }) },
    preventDefault() {},
  });
  assert.equal(asked.length, 2);
  assert.equal(card._modal, null);
});

test("a clean editor closes without a prompt", async () => {
  const { card, asked } = editCard(false);
  card._handleKeyDown(keyEvent("Escape"));
  assert.equal(asked.length, 0);
  assert.equal(card._modal, null);
});

test("the backdrop click on a dirty editor keeps it open when the user cancels", async () => {
  const { card, asked } = editCard(true);
  const el = { dataset: { action: "backdrop" } };
  await card._handleClick({
    target: Object.assign(el, { closest: () => el }),
    preventDefault() {},
  });
  assert.equal(asked.length, 1);
  assert.equal(card._modal, "edit");
});

test("recipe update omits servings when the field is empty or zero", async () => {
  for (const [servings, expected] of [
    ["", undefined],
    ["0", undefined],
    ["4", 4],
  ]) {
    const cards = loadCards({
      globals: {
        FormData: class {
          constructor(form) {
            this.values = form.values;
          }
          entries() {
            return Object.entries(this.values)[Symbol.iterator]();
          }
        },
      },
    });
    const card = makeCard(cards);
    card._detail = { slug: "pancakes", name: "Pancakes" };
    const calls = [];
    card._mutate = async (action, payload) => (calls.push([action, payload]), true);
    card._render = () => {};
    const form = {
      dataset: { form: "edit" },
      values: { name: "Pancakes", description: "", servings },
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    await card._handleSubmit({
      target: { closest: () => form },
      preventDefault() {},
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1].servings, expected);
    assert.equal("servings" in calls[0][1], expected !== undefined);
  }
});

test("step textareas grow to their content on input", () => {
  const card = makeCard(loadCards());
  card._render = () => {};
  const ta = {
    style: { height: "" },
    scrollHeight: 92,
    matches: (s) => s === "[data-step-text]",
    hasAttribute: () => false,
    dataset: {},
    closest: () => null,
  };
  card._handleInput({ target: ta });
  assert.equal(ta.style.height, "92px");
});

test("edit form does not pre-fill servings for a recipe without servings", () => {
  for (const [servings, expected] of [
    [0, ""],
    [undefined, ""],
    [4, "4"],
  ]) {
    const card = makeCard(loadCards());
    card._detail = {
      slug: "pancakes",
      name: "Pancakes",
      recipeServings: servings,
      recipeInstructions: [],
    };
    card._modal = "edit";
    const html = card._modalHtml();
    const input = /<input[^>]*name="servings"[^>]*>/.exec(html)?.[0] || "";
    assert.match(input, new RegExp(`value="${expected}"`));
    assert.doesNotMatch(input, /\brequired\b/);
  }
});

test("editor is not dirty when a recipe without servings is left untouched", () => {
  const { card, asked } = editCard(false);
  card._detail.recipeServings = 0;
  card.shadowRoot.querySelector = (s) =>
    s === 'form[data-form="edit"]'
      ? {
          querySelector: (q) =>
            ({ name: { value: "Pancakes" }, description: { value: "" }, servings: { value: "" } })[
              /name="(\w+)"/.exec(q)?.[1]
            ],
          querySelectorAll: () => [{ value: "Mix" }],
        }
      : null;
  assert.equal(card._editDraftDirty(), false);
  card._requestCloseModal();
  assert.equal(asked.length, 0);
});

test("discard dialog labels both buttons", async () => {
  const { card, asked } = editCard(true);
  await card._requestCloseModal();
  assert.equal(asked[0].cancelLabel, card.t("editorDiscardConfirmKeep"));
});
