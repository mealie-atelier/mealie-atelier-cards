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
  assert.equal(de.tp("studioReasonAmountsUnclear", 1), "1 Menge unklar");
  assert.equal(de.tp("cookbookSelected", 1), "1 Rezept ausgewählt");
  assert.equal(de.tp("studioShoppingSuccess", 1), "1 Eintrag übernommen.");
  assert.equal(de.tp("studioDiagnosticsFailed", 1), "1 Verbindungstest fehlgeschlagen.");
  assert.equal(en.tp("studioDiscoverMoreIdeas", 1), "1 more idea");
  assert.equal(en.tp("studioReasonAmountsUnclear", 1), "1 amount unclear");
  assert.equal(en.tp("studioReasonAmountsUnclear", 3), "3 amounts unclear");
  assert.equal(en.tp("studioWeekSuccess", 1), "1 meal added.");
  assert.equal(en.tp("editorServingsPreview", 1), "Preview for 1 serving");
});

test("the pantry reason for unclear amounts is flagged for plural resolution", () => {
  const ui = read("../src/studio-ui.js");
  assert.match(ui, /r\.plural \? this\.tp\(r\.key, r\.values\.count, r\.values\)/);
  assert.match(read("../src/studio-core.js"), /studioReasonAmountsUnclear[^}]*\}, plural: true/);
});

test("accent swatches get a translated colour name as accessible name", () => {
  const cards = loadCards();
  const card = makeCard(cards, { hass: { language: "de", callWS: async () => ({}) } });
  card._modal = "settings";
  const html = card._modalHtml();
  assert.match(html, /aria-label="Akzentfarbe: Salbeigrün"/);
  assert.doesNotMatch(html, /aria-label="Accent color/);
});

test("disabled primary buttons keep the muted disabled text colour", () => {
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

test("eyebrows are uppercased by CSS and use a readable light-theme text colour", () => {
  assert.match(
    read("../src/design-system/polish.css"),
    /\.atelier \.eyebrow \{[^}]*text-transform: uppercase;[^}]*--ds-brand-text/,
  );
  // No later rule may paint light-theme eyebrows with the low-contrast brand colour again.
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
