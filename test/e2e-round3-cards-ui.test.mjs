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
const familyCard = (extra = {}) => {
  const calls = [];
  const card = makeCard(loadCards({ globals: { FormData: FakeFormData } }), {
    hass: {
      language: "en",
      callWS: async (msg) => {
        calls.push(msg);
        if (extra.fail && msg.action === extra.fail.action) throw extra.fail.error;
        return { revision: 1, journal: {}, family: { members: [], session: null } };
      },
    },
  });
  card._studio = {
    revision: 0,
    journal: {},
    profile: {},
    pantry: [],
    family: {
      members: [{ id: "m1", name: "Mia" }],
      session: {
        id: "s1",
        slug: "",
        step: 0,
        timers: [],
        tasks: [{ id: "t1", text: "Wash herbs", done: true, memberId: "m1" }],
      },
    },
  };
  card._render = () => {};
  card._studioRefresh = async () => {};
  card._recoverPermissions = async () => {};
  return { card, calls };
};
const click = (card, dataset) => {
  const el = { dataset, closest: () => el };
  return card._handleClick({ target: el, preventDefault() {}, stopPropagation() {} });
};

test("a helper task has a remove button that sends session_task with remove", async () => {
  const { card, calls } = familyCard();
  assert.match(card._studioFamily(), /data-action="studio-task-remove" data-id="t1"/);
  await click(card, { action: "studio-task-remove", id: "t1" });
  const sent = calls.find((c) => c.action === "session_task");
  assert.equal(JSON.stringify(sent.payload), '{"session_id":"s1","id":"t1","remove":true}');
});

test("the Bridge refusal to remove a person with tasks is shown as translated text", async () => {
  const error = {
    code: "invalid_request",
    message: "This person still has cooking tasks. Remove or finish the tasks first.",
  };
  const { card } = familyCard({ fail: { action: "family_member", error } });
  await card._studioWrite("family_member", { id: "m1", remove: true });
  assert.equal(card._studioError, "This person still has tasks. Remove their tasks first.");
  const german = makeCard(loadCards(), { hass: { language: "de", callWS: async () => ({}) } });
  assert.match(german._studioErrorText(error), /Diese Person hat noch Aufgaben/);
});

test("the pantry amount accepts fractions such as 0.25 and rejects zero", async () => {
  const { card, calls } = familyCard();
  const form = card._studioPantry();
  const input = form.match(/<input type="number" name="amount"[^>]*>/)[0];
  assert.match(input, /step="any"/);
  assert.match(input, /min="0.01"/);
  let flashed = "";
  card._flash = (text) => (flashed = text);
  const submit = (amount) => {
    formValues = { name: "Rice", amount, unit: "g" };
    const pantryForm = { dataset: { form: "studio-pantry" } };
    return card._handleSubmit({ target: { closest: () => pantryForm }, preventDefault() {} });
  };
  card._studio.pantry = [];
  await submit("0");
  assert.equal(flashed, "Enter an amount greater than 0.");
  assert.equal(calls.filter((c) => c.action === "pantry_put").length, 0);
  await submit("0.25");
  assert.equal(calls.filter((c) => c.action === "pantry_put").length, 1);
});

test("a whitespace-only name is refused with a visible message and no request", async () => {
  const { card, calls } = familyCard();
  let flashed = "";
  let focused = false;
  card._flash = (text) => (flashed = text);
  const blank = { value: "   ", focus: () => (focused = true) };
  const form = {
    dataset: { form: "create" },
    querySelectorAll: () => [blank],
    querySelector: () => ({ disabled: false }),
  };
  formValues = { name: "   " };
  await card._handleSubmit({ target: { closest: () => form }, preventDefault() {} });
  assert.equal(flashed, "Fill in this field.");
  assert.equal(focused, true);
  assert.equal(calls.length, 0);
});

test("a finished timer without a known duration says it is finished, not active", () => {
  const card = makeCard(loadCards());
  card._detail = {
    slug: "r",
    name: "R",
    recipeInstructions: [{ text: "Stir." }],
    recipeIngredient: [],
  };
  card._modal = "cook";
  card._timers = [
    { id: "a", label: "Oven", deadline: 0, done: true },
    { id: "b", label: "Pot", deadline: Date.now() + 60000, done: false },
  ];
  const html = card._modalHtml();
  const cardOf = (id) => html.match(new RegExp(`data-cook-timer="${id}".*?</article>`, "s"))[0];
  assert.match(cardOf("a"), /<small>Timer finished<\/small>/);
  assert.match(cardOf("b"), /<small>Active timer<\/small>/);
});

test("the in-card timer message matches the push and Home Assistant wording", () => {
  const de = makeCard(loadCards(), { hass: { language: "de", callWS: async () => ({}) } });
  const en = makeCard(loadCards());
  assert.equal(de.t("uiTimerDone", { label: "Ofen" }), "Ofen ist fertig!");
  assert.equal(en.t("uiTimerDone", { label: "Oven" }), "Oven is ready!");
});

const css = (name) =>
  readFileSync(new URL(`../src/design-system/${name}.css`, import.meta.url), "utf8");
const locale = (name) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/${name}.json`, import.meta.url), "utf8"));

test("the helper mode has one name per language across button, tag and footnote", () => {
  for (const [language, name] of [
    ["en", "Helper view"],
    ["de", "Helferansicht"],
  ]) {
    const texts = locale(language);
    assert.equal(texts.familyHelperMode, name);
    assert.equal(texts.familyHelper, name);
    assert.ok(texts.familySafety.includes(language === "en" ? name.toLowerCase() : name));
    assert.ok(
      !/child view|Kinderansicht|Helfermodus|Helper mode|Simple helper/.test(JSON.stringify(texts)),
    );
  }
});

test("the browse button of the empty shared cooking card is spaced from the hint", () => {
  const { card } = familyCard();
  card._studio.family.session = null;
  assert.match(
    card._studioFamily(),
    /<\/p><div class="studio-actions studio-actions--after-text"><button class="btn primary" data-action="nav" data-value="recipes">/,
  );
  assert.match(
    css("kitchen"),
    /\.studio-actions--after-text\s*\{\s*margin-top: var\(--ds-space-4\);/,
  );
});

test("the quick-actions empty notice is hidden while recipe hits are shown", () => {
  const { card } = familyCard();
  const notice = { hidden: null, toggleAttribute: (name, on) => (notice.hidden = on) };
  const live = { setAttribute() {}, innerHTML: "" };
  card.shadowRoot.querySelector = (selector) =>
    selector === ".command-empty" ? notice : selector === "[data-command-live]" ? live : null;
  card._commandTotal = 3;
  card._commandPaint("<p>hits</p>");
  assert.equal(notice.hidden, true);
  card._commandTotal = 0;
  card._commandPaint("");
  assert.equal(notice.hidden, false);
  assert.match(css("motion"), /\.command-empty\[hidden\]\s*\{\s*display: none;/);
});

test("the search clear button is drawn in the Atelier color instead of browser blue", () => {
  assert.match(
    css("motion"),
    /\.command-search, \.search\) input\[type="search"\]::-webkit-search-cancel-button\s*\{[^}]*appearance: none;[^}]*var\(--ds-brand-text/s,
  );
});
