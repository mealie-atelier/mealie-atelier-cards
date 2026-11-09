import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const bundle = readFileSync(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");
const cards = loadCards();
const newCard = (permissions) =>
  makeCard(cards, { hass: { language: "en", callWS: async () => ({}) }, permissions });

function recipe(extra = {}) {
  return {
    slug: "soup",
    name: "Soup",
    description: "A warm bowl for cold days.",
    imageUrl: "/api/mealie_atelier/image/soup",
    recipeServings: 2,
    recipeIngredient: [{ display: "1 potato" }],
    recipeInstructions: [{ text: "Stir." }],
    nutrition: { calories: "612", proteinContent: "20" },
    ...extra,
  };
}

function paper(design = {}, kind = "recipe", shopping) {
  const card = makeCard(loadCards(), { hass: { language: "en", callWS: async () => ({}) } });
  card._render = () => {};
  card._detail = recipe();
  card._printKind = kind;
  card._modal = "print";
  card._activeList = "l1";
  card._data = {
    recipes: { items: [] },
    mealplan: [],
    shopping: shopping || { lists: [{ id: "l1", name: "Market" }], items: [] },
  };
  for (const [field, value] of Object.entries(design)) card._setDesign(field, value);
  const html = card._modalHtml();
  return html.slice(html.indexOf('class="print-paper'));
}

test("the print preview follows the chosen style", () => {
  assert.match(
    paper({ print_style: "editorial" }),
    /^class="print-paper style-editorial kind-recipe/,
  );
  assert.match(paper({ print_style: "compact" }), /^class="print-paper style-compact kind-recipe/);
  assert.match(paper({ print_style: "minimal" }), /^class="print-paper style-minimal kind-recipe/);
});

test("the print preview shows the photo only when asked and never in the minimal style", () => {
  assert.doesNotMatch(paper({ print_style: "editorial", print_image: false }), /paper-photo/);
  assert.match(paper({ print_style: "editorial", print_image: true }), /paper-photo/);
  assert.doesNotMatch(paper({ print_style: "minimal", print_image: true }), /paper-photo/);
});

test("the print preview follows nutrition, checkboxes and notes", () => {
  assert.doesNotMatch(paper({ print_nutrition: false }), /paper-nutrition/);
  assert.match(paper({ print_nutrition: true }), /paper-nutrition[\s\S]*612/);
  assert.match(paper({ print_checkboxes: true }), /paper-tick/);
  assert.doesNotMatch(paper({ print_checkboxes: false }), /paper-tick/);
  assert.match(paper({ print_notes: true }), /paper-notes/);
  assert.doesNotMatch(paper({ print_notes: false }), /paper-notes/);
});

test("the shopping preview hides completed items unless they are requested", () => {
  const shopping = {
    lists: [{ id: "l1", name: "Market" }],
    items: [
      {
        id: "1",
        display: "Open item",
        checked: false,
        shopping_list_id: "l1",
        shoppingListId: "l1",
      },
      {
        id: "2",
        display: "Done item",
        checked: true,
        shopping_list_id: "l1",
        shoppingListId: "l1",
      },
    ],
  };
  assert.doesNotMatch(paper({ print_completed: false }, "shopping", shopping), /Done item/);
  assert.match(paper({ print_completed: true }, "shopping", shopping), /Done item/);
});

test("the print windows work under the app CSP: no inline handlers, wired toolbar", async () => {
  let written = "";
  const clicks = {};
  let closed = 0;
  const popup = {
    document: {
      write: (html) => (written = html),
      open() {},
      close() {},
      getElementById: (id) => ({
        addEventListener: (type, handler) => {
          clicks[id] = handler;
        },
      }),
    },
    focus() {},
    print() {},
    close: () => {
      closed += 1;
    },
  };
  const card = makeCard(loadCards({ window: { open: () => popup } }));
  card._fullCatalog = [
    { slug: "a", name: "A", recipeInstructions: [{ text: "Stir." }], recipeIngredient: [] },
  ];
  card._bookSelected = new Set(["a"]);
  await card._studioPrintBook({ title: "T", subtitle: "S", photos: false });
  assert.doesNotMatch(written, /\sonclick=/);
  assert.match(written, /id="print-now"/);
  assert.match(written, /id="close-print"/);
  clicks["close-print"]();
  assert.equal(closed, 1, "the close button really closes the window");
});

test("dialog heads carry no decorative round icons", () => {
  assert.doesNotMatch(bundle, /editor-stamp/);
});

test("the recipe source shows the host, the full address stays in the link", () => {
  const card = newCard();
  card._detail = recipe({ orgURL: "https://www.example.org/very/long/recipe-path?x=1" });
  card._modal = "recipe";
  card._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  const link = card._modalHtml().match(/<a class="recipe-source-link"[^>]*>([^<]*)/);
  assert.ok(link, "source link is rendered");
  assert.equal(link[1].trim(), "example.org");
  assert.match(link[0], /href="https:\/\/www\.example\.org\/very\/long\/recipe-path\?x=1"/);
});

test("the recipe dialog separates main actions from quiet text actions", () => {
  const card = newCard({ can_write: true, can_manage: true });
  card._detail = recipe();
  card._modal = "recipe";
  card._data = { recipes: { items: [] }, mealplan: [], shopping: { lists: [], items: [] } };
  const html = card._modalHtml();
  const main = html.slice(
    html.indexOf("recipe-actions-main"),
    html.indexOf('class="text-actions"'),
  );
  const quiet = html.slice(html.indexOf('class="text-actions"'));
  for (const action of ["cook-start", "recipe-to-list-form", "plan-form"]) {
    assert.ok(main.includes(`data-action="${action}"`), action);
  }
  for (const action of ["nutrition-open", "journal-open", "print-recipe", "edit-form"]) {
    assert.match(quiet, new RegExp(`class="text-action"[^>]*data-action="${action}"`), action);
    assert.ok(!main.includes(`data-action="${action}"`), action);
  }
});

test("the Kochinspo cookbook step loads and shows the cookbooks by itself", async () => {
  const requests = [];
  const card = makeCard(loadCards(), {
    hass: {
      language: "en",
      callService: async () => ({}),
      callWS: async (message) => {
        requests.push(message);
        return {
          cookbooks: [
            {
              id: "b1",
              name: "Soups",
              slug: "soups",
              queryFilter: {
                parts: [{ attributeName: "tags.id", relationalOperator: "IN", value: ["t1"] }],
              },
            },
          ],
        };
      },
    },
  });
  card._render = () => {};
  card._studio = { revision: 0, journal: {}, profile: {}, family: { members: [] }, pantry: [] };
  card._discoverResults = false;
  card._discoverDraft = {
    step: 1,
    mealStyle: "any",
    cookbooks: [],
    people: 2,
    maxMinutes: 40,
    usePantry: true,
    exclude: [],
  };
  assert.doesNotMatch(card._studioDiscover(), />Soups</);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 1, "metadata is requested once");
  assert.match(card._studioDiscover(), />Soups</);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 1, "known cookbooks are not requested again");
});
