import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("count strings pick the singular form for exactly one item in German and English", () => {
  const cards = loadCards();
  const de = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  const en = makeCard(cards, { hass: { language: "en", callWS: async () => ({}) } });
  assert.equal(de.tp("studioDiscoverMoreIdeas", 1), "1 weitere Idee");
  assert.equal(de.tp("studioDiscoverMoreIdeas", 2), "2 weitere Ideen");
  assert.equal(de.tp("studioReasonAmountsUnclear", 1), "Bei 1 Zutat ist die Menge unklar");
  assert.equal(de.tp("cookbookSelected", 1), "1 Rezept ausgewählt");
  assert.equal(de.tp("studioShoppingSuccess", 1), "1 Eintrag übernommen.");
  assert.equal(de.tp("studioDiagnosticsFailed", 1), "1 Verbindungstest fehlgeschlagen.");
  assert.equal(en.tp("studioDiscoverMoreIdeas", 1), "1 more idea");
  assert.equal(en.tp("studioReasonAmountsUnclear", 1), "Amount unclear for 1 ingredient");
  assert.equal(en.tp("studioReasonAmountsUnclear", 3), "Amount unclear for 3 ingredients");
  assert.equal(en.tp("studioWeekSuccess", 1), "1 meal added.");
  assert.equal(en.tp("editorServingsPreview", 1), "Preview for 1 serving");
});

test("the pantry reason for unclear amounts is flagged for plural resolution", () => {
  const ui = read("../src/studio-ui.js");
  assert.match(ui, /r\.plural \? this\.tp\(r\.key, r\.values\.count, r\.values\)/);
  assert.match(read("../src/studio-core.js"), /studioReasonAmountsUnclear[^}]*\}, plural: true/);
});

test("accent swatches get a translated color name as accessible name", () => {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card._modal = "settings";
  const html = card._modalHtml();
  assert.match(html, /aria-label="Akzentfarbe: Salbeigrün"/);
  assert.doesNotMatch(html, /aria-label="Accent color/);
});

test("disabled primary buttons keep the muted disabled text color", () => {
  const css = read("../src/design-system/polish.css").replace(/\s+/g, " ");
  assert.match(css, /\.atelier \.btn\.primary:disabled \{[^}]*color: var\(--ds-muted\);/);
});

test("the web app phone footer has a side gutter", () => {
  const html = read("../web/public/index.html").replace(/\s+/g, " ");
  assert.match(html, /@media \(max-width: 600px\) \{[^@]*\.foot \{[^}]*padding-inline: 20px/);
});

test("the Verwalten view does not repeat the global read-only notice", () => {
  const cards = loadCards();
  const card = makeCard(cards, { permissions: { can_write: false, can_manage: false } });
  assert.equal(card._manage(), "");
  const writer = makeCard(cards, { permissions: { can_write: true, can_manage: false } });
  assert.match(writer._manage(), /class="notice"/);
});

test("design system CSS defines every font token it uses and avoids invalid negative var margins", () => {
  const css = ["tokens", "polish", "foundation", "components", "editorial", "controls", "motion"]
    .map((n) => read(`../src/design-system/${n}.css`))
    .join("\n");
  const defined = new Set([...css.matchAll(/(--ds-font-[a-z]+)\s*:/g)].map((m) => m[1]));
  for (const m of css.matchAll(/var\((--ds-font-[a-z]+)/g)) assert.ok(defined.has(m[1]), m[1]);
  assert.doesNotMatch(css, /-var\(/);
});

test("eyebrows are uppercased by CSS and use a readable light-theme text color", () => {
  assert.match(
    read("../src/design-system/polish.css"),
    /\.atelier \.eyebrow \{[^}]*text-transform: uppercase;[^}]*--ds-brand-text/,
  );
  // No later rule may paint light-theme eyebrows with the low-contrast brand color again.
  const polishCss = read("../src/design-system/polish.css");
  for (const m of polishCss.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
    if (/\.light \.eyebrow\b/.test(m[1]) && /(^|[;\s])color:/.test(m[2])) {
      assert.match(m[2], /color: var\(--ds-brand-text/);
    }
  }
  assert.match(
    read("../src/design-system/tokens.css"),
    /--ds-brand-text: color-mix\(in srgb, var\(--at-accent\) 40%/,
  );
  assert.match(
    read("../src/design-system/foundation.css"),
    /\.hero \.eyebrow \{[^}]*text-transform: uppercase/,
  );
});

test("checked shopping rows keep full opacity, disabled primary buttons stay legible, notice buttons never wrap", () => {
  const foundation = read("../src/design-system/foundation.css");
  assert.doesNotMatch(foundation, /shopping-row\.checked \.shopping-name \{[^}]*opacity/);
  assert.doesNotMatch(
    read("../src/design-system/motion.css"),
    /\.shopping-row\.checked \{\s*opacity/,
  );
  const polish = read("../src/design-system/polish.css");
  // Later top-level rules must not fade disabled buttons again (contrast of the label).
  assert.doesNotMatch(polish, /button:disabled \{[^}]*opacity/);
  assert.match(polish, /\.btn\.primary:disabled \{\s*background:/);
  assert.match(
    read("../src/design-system/components.css"),
    /\.notice > \.btn \{[^}]*white-space: nowrap/,
  );
  assert.match(read("../src/design-system/editorial.css"), /\.photo-index \{[^}]*background: rgba/);
});

test("recipe tiles clamp the placeholder title and keep the meta row clear of the open button", () => {
  assert.match(
    read("../src/design-system/editorial.css"),
    /\.tile-image \.placeholder > span \{[^}]*-webkit-line-clamp: 3;[^}]*overflow: hidden;[^}]*overflow-wrap: anywhere/,
  );
  assert.match(
    read("../src/design-system/editorial.css"),
    /\.tile-image \.placeholder \{[^}]*align-items: center;[^}]*position: absolute;[^}]*inset: 0/,
  );
  const refine = read("../src/design-system/control-refinement.css");
  assert.match(refine, /\.atelier \.tile-meta \{[^}]*flex-wrap: nowrap;[^}]*padding-right: 40px/);
  assert.match(
    read("../src/design-system/editorial.css"),
    /\.tile-image \.placeholder \{[^}]*font-size: clamp\(14px, 4cqw, 18px\)/,
  );
  assert.match(refine, /\.tile-body h3 \{[^}]*-webkit-line-clamp: 3/);
});

test("today meal badges use the same leading column as meal photos", () => {
  const refine = read("../src/design-system/control-refinement.css");
  assert.match(refine, /\.today-meal \.meal-badge \{[^}]*width: 96px;[^}]*aspect-ratio: 4 \/ 3/);
});

test("mealplan toolbar buttons meet the 44px touch target and the tablet week stays readable", () => {
  const adaptive = read("../src/design-system/adaptive.css");
  assert.match(adaptive, /\.toolbar \.btn \{[^}]*min-height: 44px/);
  assert.doesNotMatch(adaptive, /minmax\(93px, 1fr\)/);
  assert.match(adaptive, /repeat\(7, minmax\(140px, 1fr\)\)/);
  assert.match(
    read("../src/design-system/polish.css"),
    /\.day-meal-name \{[^}]*hyphens: auto;[^}]*hyphenate-limit-chars: 12 5 5;[^}]*-webkit-hyphenate-limit-before: 5;[^}]*-webkit-hyphenate-limit-after: 5/,
  );
});

test("narrow cards keep the topbar on one line and fill wrapped action rows evenly", () => {
  const refine = read("../src/design-system/control-refinement.css");
  assert.match(refine, /\.topbar \.toolbar \{[^}]*flex-wrap: nowrap/);
  assert.match(refine, /\.week-grid \.day-head \{[^}]*justify-content: flex-start/);
  assert.match(refine, /\.breadcrumb strong \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis/);
  assert.doesNotMatch(refine, /justify-content: stretch/);
});

test("wrapped shopping actions fill their rows up to tablet width", () => {
  const refine = read("../src/design-system/control-refinement.css");
  assert.match(
    refine,
    /max-width: 760px\) \{\s*\.atelier \.shopping-toolbar \.btn \{[^}]*flex: 1 1 auto/,
  );
});

test("the day strip fades at the end edge and shows the swipe hint up to 1080px", () => {
  const refine = read("../src/design-system/control-refinement.css");
  assert.match(
    refine,
    /max-width: 1080px\) \{\s*\.atelier \.week-grid \{[^}]*mask-image: linear-gradient/,
  );
  assert.match(refine, /max-width: 1080px\)[\s\S]*\.week-swipe-hint \{\s*display: flex/);
});

test("the week strip hint says scroll, not swipe, so it fits mouse users", () => {
  for (const lang of ["de", "en"]) {
    const text = JSON.parse(read(`../src/i18n/${lang}.json`)).uiSwipeToBrowseAllSevenDays;
    assert.doesNotMatch(text, /wisch|swipe/i);
  }
});

test("recipe tiles render the title placeholder only when images are on, as photo failure fallback", () => {
  const cards = loadCards();
  const card = makeCard(cards, {});
  card._local = { show_images: false };
  card._data = { recipes: { items: [{ slug: "a", name: "Plain Soup" }] } };
  const html = card._recipes(6);
  assert.doesNotMatch(html, /class="placeholder"/);
  assert.equal((html.match(/Plain Soup/g) || []).length, 2);
  card._local = { show_images: true };
  assert.match(card._recipes(6), /class="placeholder"/);
  card._data = {
    recipes: {
      items: [{ slug: "a", name: "Plain Soup", imageUrl: "/api/mealie_atelier/image/a.webp" }],
    },
  };
  // The placeholder stays in the markup so it shows when the photo fails to load;
  // the stylesheet hides it while an image is present.
  assert.match(card._recipes(6), /class="placeholder"/);
  assert.match(
    read("../src/design-system/editorial.css"),
    /\.tile-image:has\(img\) \.placeholder \{\s*display: none;/,
  );
});

test("sidebar brand line, conflict plurals and the audit list are localized and dash free", () => {
  const cards = loadCards();
  const de = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  assert.match(de._nav(), /<span>KÜCHENSTUDIO<\/span>/);
  assert.doesNotMatch(de._nav(), /KITCHEN STUDIO/);
  assert.equal(de.t("offlineConflictOne"), " · 1 Konflikt");
  assert.equal(de.t("offlineConflictCount", { count: 3 }), " · 3 Konflikte");
  assert.equal(de.t("offlineSyncing"), " · wird synchronisiert");
  assert.doesNotMatch(read("../src/studio-ui.js"), /<\/b> – \$\{esc\(x\.suggestion\)\}/);
});

test("touch devices get 44px targets for week buttons, choices and the credit link", () => {
  const css = read("../src/design-system/polish.css").replace(/\s+/g, " ");
  assert.match(
    css,
    /@media \(pointer: coarse\) \{ \.atelier \.toolbar \.btn\.tiny \{ min-block-size: 44px/,
  );
});

test("the cookbook choice min-width reset does not override the 44px touch target", () => {
  const css = read("../src/design-system/polish.css").replace(/\s+/g, " ");
  assert.match(
    css,
    /@media \(pointer: coarse\) \{[^@]*\.atelier \.studio-cookbook-choices \.studio-choice \{ min-inline-size: 44px/,
  );
});

test("the print document brand line is localized", () => {
  for (const [language, line] of [
    ["en", "KITCHEN STUDIO · PRINT EDITION"],
    ["de", "KÜCHENSTUDIO · DRUCKAUSGABE"],
  ]) {
    const written = [];
    const popup = {
      document: {
        write: (html) => written.push(html),
        open() {},
        close() {},
        getElementById: () => null,
      },
      focus() {},
    };
    const cards = loadCards({ window: { open: () => popup } });
    const card = makeCard(cards, { hass: { language, callWS: async () => ({}) } });
    card._data.shopping = { lists: [{ id: "l1", name: "Market" }], items: [] };
    card._activeList = "l1";
    card._printKind = "shopping";
    card._print();
    const html = written.join("");
    assert.match(html, new RegExp(`<span>${line}</span>`), language);
    if (language === "de") assert.doesNotMatch(html, /PRINT EDITION/);
  }
});

test("the phone week toolbar override does not keep buttons below 44px", () => {
  for (const file of ["adaptive.css", "motion.css"]) {
    const css = read(`../src/design-system/${file}`).replace(/\s+/g, " ");
    const rule = css.match(/\[data-view="mealplan"\] \.heading \.toolbar \.btn \{[^}]*\}/);
    assert.ok(rule, file);
    assert.match(rule[0], /min-height: 44px/);
    assert.doesNotMatch(rule[0], /min-height: 4[0-3]px/);
  }
});
