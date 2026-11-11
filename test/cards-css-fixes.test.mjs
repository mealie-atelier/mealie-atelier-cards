import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = (name) =>
  readFileSync(new URL(`../src/design-system/${name}.css`, import.meta.url), "utf8");
const rule = (text, selector) => {
  const start = text.indexOf(`${selector} {`);
  assert.ok(start >= 0, `rule not found: ${selector}`);
  return text.slice(start, text.indexOf("}", start));
};
const tokens = css("tokens");
const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const token = (block, name) => block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6});`))[1];

test("search input draws no ring of its own inside the search pill", () => {
  const polish = css("polish");
  const block = rule(
    polish,
    `.atelier .search input:not([type="checkbox"]):not([type="radio"]):focus,\n.atelier .search input:not([type="checkbox"]):not([type="radio"]):focus-visible,\n.atelier .command-search input:not([type="checkbox"]):not([type="radio"]):focus-visible`,
  );
  assert.match(block, /outline:\s*0/);
  assert.match(block, /box-shadow:\s*none/);
  // The override must come after the generic input ring so equal or lower specificity cannot win.
  assert.ok(
    polish.indexOf('.atelier .search input:not([type="checkbox"]):not([type="radio"]):focus,') >
      polish.indexOf("outline: 2px solid var(--ds-brand)"),
  );
});

test("the error notice wraps, keeps words whole and puts the setup hint on its own row", () => {
  assert.match(rule(css("foundation"), ".atelier .notice"), /flex-wrap:\s*wrap/);
  const span = rule(css("components"), ".atelier .notice > span");
  assert.match(span, /flex:\s*1 1 200px/);
  assert.match(span, /overflow-wrap:\s*break-word/);
  assert.match(rule(css("components"), ".atelier .notice > .setup-hint"), /flex:\s*1 1 100%/);
});

test("error text is readable in both themes and the notice link uses the card palette", () => {
  const foundation = css("foundation");
  assert.match(rule(foundation, ".atelier .notice.error"), /color:\s*var\(--at-danger\)/);
  const dark = tokens.match(/\n\.atelier \{([^}]*)\}/)[1];
  const light = tokens.match(/\.atelier\.light\s*\{([^}]*)\}/)[1];
  assert.ok(contrast(token(light, "--at-danger"), token(light, "--at-panel")) >= 4.5);
  assert.ok(contrast(token(dark, "--at-danger"), token(dark, "--at-panel")) >= 4.5);
  const link = rule(foundation, ".atelier .notice a");
  assert.match(link, /color:\s*var\(--at-accent\)/);
  assert.match(link, /text-decoration:\s*underline/);
  assert.match(rule(foundation, ".atelier .notice a:visited"), /color:\s*var\(--at-accent\)/);
});

test("the toast is fixed to the viewport because the card clips its overflow", () => {
  const toast = rule(css("foundation"), ".atelier .toast");
  assert.match(toast, /position:\s*fixed/);
  assert.doesNotMatch(toast, /position:\s*sticky/);
  assert.match(toast, /z-index:\s*90/);
});

test("on laptop heights the cooking layout shrinks to the dialog so the action bar is never clipped", () => {
  const refinement = css("control-refinement");
  const start = refinement.indexOf(
    "@media (orientation: landscape) and (min-height: 701px) and (max-height: 1000px) {",
  );
  assert.ok(start >= 0, "laptop media query exists");
  const block = refinement.slice(start, refinement.indexOf("\n}\n", start));
  assert.match(block, /> \.cook-layout \{[^}]*flex:\s*1 1 auto/);
  assert.match(block, /grid-template-rows:\s*minmax\(0, 1fr\)/);
});

test("on narrow cards the cooking bar is one compact row on a solid ground", () => {
  const refinement = css("control-refinement");
  const start = refinement.indexOf(
    "@container atelier-card (max-width: 420px) {\n  .atelier .modal:has(.cook-layout) .cook-actions {",
  );
  assert.ok(start >= 0, "narrow cooking bar rule exists");
  const block = refinement.slice(start, refinement.indexOf("\n}\n", start));
  assert.match(block, /display:\s*grid/);
  assert.match(block, /grid-template-columns:\s*auto auto minmax\(max-content, 1fr\)/);
  assert.match(block, /background:\s*var\(--at-surface\)/);
  assert.match(block, /\.btn\.primary \{\s*grid-column:\s*auto/);
});

test("edit dialog save bar is flush with the dialog edges and square at the bottom", () => {
  const polish = css("polish");
  const flush = polish.slice(polish.indexOf("--editor-inline: clamp"));
  const vars = flush.slice(flush.indexOf("--editor-inline"), flush.indexOf("}"));
  assert.match(vars, /--editor-inline:\s*clamp\(24px, 3\.1cqi, 45px\)/);
  assert.match(vars, /padding-inline:\s*var\(--editor-inline\)/);
  assert.match(
    flush,
    /@container atelier-card \(max-width: 460px\) \{\s*\.atelier \.modal-content\.atelier-editor \{\s*--editor-inline: 19px;/,
  );
  const footer = rule(flush, ".atelier .modal-content.atelier-editor .editor-footer");
  assert.match(footer, /margin-inline:\s*calc\(-1 \* var\(--editor-inline\)\)/);
  assert.match(footer, /padding-inline:\s*var\(--editor-inline\)/);
  // The dialog's own overflow clip rounds the corners, so the bar must not carry a radius of its own.
  assert.match(footer, /border-radius:\s*0;/);
});

test("cook step eyebrow hyphenates a long word like the heading below it", () => {
  const block = rule(css("editorial"), ".atelier .cook-step-section");
  assert.match(block, /hyphens:\s*auto;/);
  assert.match(block, /overflow-wrap:\s*break-word;/);
});

test("the sidebar identity subtitle never wraps, so English and German align", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../src/design-system/editorial.css", import.meta.url), "utf8");
  const block = css.match(/\.atelier \.identity span \{[^}]*\}/)?.[0] || "";
  assert.match(block, /white-space:\s*nowrap/);
});

test("status notices above the page share the content column of topbar and page", () => {
  // The read-only and error notices sit directly in .main; without the column limit they ran
  // past the topbar and the page on wide screens.
  const layout = rule(
    css("layout"),
    ".atelier .topbar,\n.atelier .view-stage,\n.atelier .main > .notice",
  );
  assert.match(layout, /max-width:\s*var\(--ds-content-max\)/);
  assert.match(layout, /margin-inline:\s*auto/);
  const polish = rule(
    css("polish"),
    ".atelier .topbar,\n.atelier .view-stage,\n.atelier .main > .notice",
  );
  assert.match(polish, /max-width:\s*1216px/);
});
