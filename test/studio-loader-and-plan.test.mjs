import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const css = readFileSync(
  new URL("../src/design-system/control-refinement.css", import.meta.url),
  "utf8",
);
const polish = readFileSync(new URL("../src/design-system/polish.css", import.meta.url), "utf8");

const newCard = () => {
  const card = makeCard(loadCards(), {
    hass: { language: "en", callWS: async () => ({}), callService: async () => ({}) },
  });
  card._studio = { revision: 0, journal: {}, profile: {}, family: { members: [] }, pantry: [] };
  card._discoverDraft = {
    step: 3,
    mealStyle: "any",
    cookbooks: [],
    people: 2,
    maxMinutes: 40,
    usePantry: true,
    exclude: [],
  };
  return card;
};
const candidate = (slug) => ({
  slug,
  name: slug,
  recipe: { slug, name: slug, imageUrl: `/api/mealie_atelier/image/${slug}` },
  timeLabel: "32 min",
  servings: 4,
  people: 2,
  reasons: [{ key: "studioReasonWithinBudget", values: { minutes: 32 } }],
});
const rule = (source, selector) => {
  const at = source.indexOf(`${selector} {`);
  assert.notEqual(at, -1, `missing rule ${selector}`);
  return source.slice(at, source.indexOf("}", at));
};

test("while the collection loads the kitchen scene replaces the banner and the view", () => {
  const card = newCard();
  card._catalogLoading = true;
  card._catalogProgress = { loaded: 120, total: 307 };
  const html = card._studioShell("Title", "Lead", '<p id="wizard">step</p>');
  assert.match(html, /class="studio-loader"/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /120/);
  assert.doesNotMatch(html, /id="wizard"/);
  assert.doesNotMatch(html, /studio-warning/);
});

test("without a running load the view is shown and no scene", () => {
  const html = newCard()._studioShell("Title", "Lead", '<p id="wizard">step</p>');
  assert.match(html, /id="wizard"/);
  assert.doesNotMatch(html, /studio-loader/);
});

test("the wizard does not flash between the end of the catalog load and the results", () => {
  const card = newCard();
  card._discoverSearching = true;
  assert.doesNotMatch(card._studioShell("Title", "Lead", '<p id="wizard">step</p>'), /id="wizard"/);
});

test("the bar spends a tenth on the list and the rest on the details", () => {
  const card = newCard();
  card._catalogProgress = { loaded: 100, total: 200 };
  assert.equal(card._studioLoaderState().percent, 5);
  card._catalogProgress = { loaded: 100, total: 100, details: 50 };
  assert.equal(card._studioLoaderState().percent, 55);
});

test("a progress batch updates bar and line in place without a render", () => {
  const card = newCard();
  let renders = 0;
  card._render = () => renders++;
  const status = { textContent: "" };
  const props = {};
  const attrs = {};
  const track = {
    setAttribute: (k, v) => (attrs[k] = v),
    style: { setProperty: (k, v) => (props[k] = v) },
  };
  const loader = { querySelector: (s) => (s === ".studio-loader-status" ? status : track) };
  card.shadowRoot = { querySelector: (s) => (s === ".studio-loader" ? loader : null) };
  card._catalogProgress = { loaded: 100, total: 100, details: 50 };
  card._paintCatalogProgress();
  assert.equal(renders, 0);
  assert.match(status.textContent, /50/);
  assert.equal(attrs["aria-valuenow"], "55");
  assert.equal(props["--done"], "0.55");
});

test("a progress batch renders when no scene is on screen yet", () => {
  const card = newCard();
  let renders = 0;
  card._render = () => renders++;
  card.shadowRoot = { querySelector: () => null };
  card._paintCatalogProgress();
  assert.equal(renders, 1);
});

test("the scene stands still when the visitor asks for less motion", () => {
  const at = css.indexOf("@media (prefers-reduced-motion: reduce)", css.indexOf("studio-loader"));
  assert.notEqual(at, -1);
  assert.match(
    css.slice(at, css.indexOf("}", at)),
    /\.studio-loader-scene \*[^{]*\{\s*animation: none !important/,
  );
});

test("the hero animates only when results first appear, not on every render", () => {
  assert.doesNotMatch(rule(polish, ".atelier .studio-discover-hero"), /animation:/);
  assert.match(rule(polish, ".atelier .studio-discover-hero.is-entering"), /animation:/);
});

test("Another idea swaps once, keeps the hero height and leaves later renders still", async () => {
  const card = newCard();
  card._discoverResults = true;
  card._discoverCandidates = [candidate("soup"), candidate("stew")];
  card._discoverSelected = "soup";
  const seen = [];
  card._render = () => seen.push(card._studioDiscover());
  card.shadowRoot = {
    querySelector: (s) =>
      s === ".studio-discover-hero" ? { getBoundingClientRect: () => ({ height: 412.2 }) } : null,
  };
  await card._handleClick({
    target: {
      closest: () => ({ dataset: { action: "studio-discover-next-idea" }, disabled: false }),
    },
    composedPath: () => [],
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(card._discoverSelected, "stew");
  assert.equal(seen.length, 1);
  assert.match(seen[0], /studio-discover-hero is-swapping"/);
  assert.match(seen[0], /min-height:413px/);
  assert.doesNotMatch(card._studioDiscover(), /is-swapping/);
});

const click = (card, action) =>
  card._handleClick({
    target: { closest: () => ({ dataset: { action }, disabled: false }) },
    composedPath: () => [],
    preventDefault() {},
    stopPropagation() {},
  });

test("new results enter once and forget the height of the last search", async () => {
  const card = newCard();
  card._fullCatalog = [{ slug: "soup", name: "Soup", recipeIngredient: [] }];
  card._discoverHeroHeight = 900;
  const seen = [];
  card._render = () => seen.push(card._discoverHeroMotion);
  card._revealDiscover = () => {};
  await click(card, "studio-discover-next");
  assert.ok(seen.includes("entering"));
  assert.equal(card._discoverHeroHeight, 0);
  assert.equal(card._discoverHeroMotion, "");
});

test("a failed catalog load brings the wizard back", async () => {
  const card = newCard();
  let renders = 0;
  let during;
  card._render = () => renders++;
  card._studioCatalog = async () => {
    during = card._discoverSearching;
    throw new Error("offline");
  };
  await click(card, "studio-discover-next").catch(() => {});
  assert.equal(during, true);
  assert.equal(card._discoverSearching, false);
  assert.ok(renders >= 1);
});

test("the week proposal shows the photo of each recipe", () => {
  const card = newCard();
  card._discoverResults = true;
  card._discoverCandidates = [candidate("stew")];
  card._discoverSelected = "stew";
  card._fullCatalog = [{ slug: "soup", name: "Soup", imageUrl: "/api/mealie_atelier/image/soup" }];
  card._weekProposal = [
    { date: "2026-11-09", meal_type: "dinner", slug: "soup", name: "Soup", reasons: ["Quick"] },
  ];
  const row = card._studioDiscover().split('class="studio-plan-row"')[1];
  assert.match(
    row.split('class="studio-plan-copy"')[0],
    /src="\/api\/mealie_atelier\/image\/soup"/,
  );
});

test("a day card has room to lift inside the week scroller", () => {
  const lastAt = css.lastIndexOf(".atelier .week-grid {");
  const block = css.slice(lastAt, css.indexOf("}", lastAt));
  assert.match(block, /padding-block-start: var\(--ds-space-1\)/);
  assert.match(block, /margin-block-start: calc\(var\(--ds-space-1\) \* -1\)/);
});

test("the Design Studio ends in one row of reset and done", () => {
  const card = newCard();
  card._modal = "settings";
  const html = card._modalHtml();
  const row = html.slice(html.indexOf('class="form-actions design-actions"'));
  assert.match(row.split("</div>")[0], /reset-design[\s\S]*close-modal/);
});

const designFiles = [
  "foundation",
  "editorial",
  "kitchen",
  "motion",
  "adaptive",
  "tokens",
  "layout",
  "components",
  "controls",
  "polish",
  "control-refinement",
  "editor",
];
const hoverMoves = () =>
  designFiles.flatMap((name) => {
    const source = readFileSync(
      new URL(`../src/design-system/${name}.css`, import.meta.url),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(
        ([, selector, body]) => selector.includes(":hover") && /transform:\s*translate/.test(body),
      )
      .map(([, selector]) => selector.replace(/\s+/g, " ").trim());
  });

test("no control moves away from the pointer on hover", () => {
  const controls = hoverMoves().filter((selector) =>
    /\.btn|icon-btn|button|swatch|command-item|editor-primary/.test(selector),
  );
  assert.deepEqual(controls, []);
});

test("every lifted card bridges the gap it leaves under the pointer", () => {
  const bridge = css.slice(css.lastIndexOf("A lifted card leaves"));
  const lifted = hoverMoves().filter((selector) => !/img|tile-open|setup-preset/.test(selector));
  assert.ok(lifted.length >= 3);
  for (const name of [
    ".recipe-tile",
    ".week-grid > .day",
    ".studio-discover-alt",
    ".detail-cols .step",
  ]) {
    assert.ok(
      lifted.some((selector) => selector.includes(name)),
      `${name} is no longer lifted`,
    );
    assert.ok(bridge.includes(`${name}:hover::after`), `${name} has no bridge`);
  }
  assert.match(bridge, /inset-block-end: calc\(var\(--hover-lift\) \* -1\)/);
});

test("icon and label sit on one centre line inside a pill", () => {
  const block = rule(css, ".atelier .pill:has(> svg)");
  assert.match(block, /display: inline-flex/);
  assert.match(block, /align-items: center/);
});

test("every Kochinspo idea takes the same room on a wide card", () => {
  assert.match(
    css,
    /min-width: 761px\) \{\s*\.atelier \.studio-discover-hero \{\s*min-height: 400px/,
  );
  assert.match(
    rule(css, ".atelier .studio-discover-hero-copy :is(h2, h3)"),
    /-webkit-line-clamp: 3/,
  );
});

test("the search, the labelled cookbook field and the button sit on one line", () => {
  const picker = readFileSync(
    new URL("../src/design-system/recipe-picker.css", import.meta.url),
    "utf8",
  );
  assert.match(
    rule(picker, ".atelier .recipe-tools:has(.recipe-book-filter)"),
    /align-items: flex-end/,
  );
});

test("the cookbook panel is anchored on a wide card and a bottom sheet on a narrow one", () => {
  const picker = readFileSync(
    new URL("../src/design-system/recipe-picker.css", import.meta.url),
    "utf8",
  );
  assert.match(rule(picker, ".atelier .book-panel"), /position: absolute/);
  const narrow = picker.match(
    /@container atelier-card \(max-width: 520px\) \{[^@]*?\.atelier \.book-sheet[\s\S]*?\n\}/,
  );
  assert.ok(narrow, "a narrow container rule styles the sheet");
  assert.match(narrow[0], /\.atelier \.book-sheet \{[^}]*position: fixed/);
  assert.match(narrow[0], /\.atelier \.book-panel \{[^}]*position: static/);
  assert.match(narrow[0], /\.atelier \.recipe-book-filter \{[^}]*grid-column: 1 \/ -1/);
  assert.match(rule(picker, ".atelier .recipe-book-filter .book-value"), /text-overflow: ellipsis/);
});

test("a card in the web app shell never asks for Home Assistant, a card in Home Assistant may", async () => {
  const card = makeCard(loadCards(), { hass: undefined });
  card._hass = undefined;
  card.hasAttribute = (name) => name === "data-web-app";
  assert.equal(card._isWebApp, true);
  await assert.rejects(card._ws("status"), (error) => {
    assert.doesNotMatch(error.message, /Home Assistant/);
    return true;
  });
  card.hasAttribute = () => false;
  assert.equal(card._isWebApp, false);
  await assert.rejects(card._ws("status"), /Home Assistant/);
});
