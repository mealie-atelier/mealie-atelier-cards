import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) =>
  readFileSync(new URL(`../src/design-system/${name}.css`, import.meta.url), "utf8");

// Returns the declaration body of the first `selector {` rule that follows `after` (or the file start).
const rule = (css, selector, after = "") => {
  const from = after ? css.indexOf(after) : 0;
  assert.notEqual(from, -1, `missing anchor ${after}`);
  const at = css.indexOf(`${selector} {`, from);
  assert.notEqual(at, -1, `missing rule ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};
const fontSize = (body) => Number(/font-size: ([\d.]+)px/.exec(body)?.[1]);

test("wide phones (421 to 480 px) shift the hero plate like the 390 layout", () => {
  const css = read("adaptive");
  const anchor = "@container atelier-card (min-width: 421px) and (max-width: 480px)";
  assert.match(rule(css, ".atelier .hero .hero-art", anchor), /right: -95px/);
  assert.match(rule(css, ".atelier .hero .hero-copy", anchor), /max-width: 95%/);
});

test("small labels are at least 11 px in every layer", () => {
  const checks = [
    ["foundation", ".atelier .tile-body small"],
    ["foundation", ".atelier .pill"],
    ["foundation", ".atelier .day-meal small"],
    ["foundation", ".atelier .eyebrow"],
    ["editorial", ".atelier .eyebrow"],
    ["editorial", ".atelier .photo-index"],
    ["editorial", ".atelier .tile-body small"],
    ["editorial", ".atelier .pill"],
    ["polish", ".atelier .tile-body small"],
    ["motion", ".at-premium-dialog .eyebrow"],
  ];
  for (const [file, selector] of checks) {
    assert.ok(fontSize(rule(read(file), selector)) >= 11, `${file} ${selector}`);
  }
  for (const [file, anchor] of [
    ["adaptive", "@container atelier-card (max-width: 700px)"],
    ["editorial", "@media (max-width: 700px)"],
    ["polish", "@container atelier-card (max-width: 640px)"],
  ]) {
    const css = read(file);
    const from = css.indexOf(anchor);
    const at = css.indexOf("  .atelier .tile-body small {", from);
    if (at === -1) continue;
    assert.ok(fontSize(css.slice(at, css.indexOf("}", at))) >= 11, `${file} narrow tile label`);
  }
  const polish = read("polish");
  assert.ok(fontSize(rule(polish, "  .atelier .eyebrow")) >= 11, "polish narrow eyebrow");
});

test("tile titles allow three lines everywhere and break long words", () => {
  const body = rule(read("foundation"), ".atelier .tile-body h3");
  assert.match(body, /-webkit-line-clamp: 3/);
  assert.match(body, /overflow-wrap: anywhere/);
  assert.match(body, /hyphens: auto/);
});

test("the credit footer takes over once the nav collapses at 920 px", () => {
  const css = read("layout");
  const body = rule(
    css,
    "  .atelier .main > .atelier-credit-footer",
    "@container atelier-card (max-width: 920px)",
  );
  assert.match(body, /display: flex/);
  const polish = read("polish");
  const hide = polish.indexOf("@container atelier-card (max-width: 920px)");
  assert.ok(
    polish.indexOf(".atelier .sidebar-footer", hide) > hide,
    "the sidebar footer is hidden at the same width",
  );
});

test("sidebar nav entries stay on one line", () => {
  const body = rule(read("polish"), ".atelier .nav button");
  assert.match(body, /white-space: nowrap/);
});

test("the command palette keyboard hints are hidden on touch phones", () => {
  const css = read("motion");
  const at = css.indexOf("@media (hover: none) and (pointer: coarse)");
  assert.notEqual(at, -1);
  assert.match(
    rule(css, "  .atelier .command-footer", "@media (hover: none) and (pointer: coarse)"),
    /display: none/,
  );
});

test("coarse pointers get a 44 px hit area on small controls", () => {
  const controls = read("controls");
  const at = controls.indexOf("@media (pointer: coarse)");
  assert.notEqual(at, -1);
  const pseudo = rule(
    controls,
    '  .atelier input[type="checkbox"]::before',
    "@media (pointer: coarse)",
  );
  assert.match(pseudo, /inset: calc\(\(var\(--ds-check-size\) - var\(--ds-check-target\)\) \/ 2\)/);
  const polish = read("polish");
  const remove = rule(polish, "  .atelier .day-meal-remove::after", "@media (pointer: coarse)");
  assert.match(remove, /inset: calc\(\(24px - var\(--ds-check-target\)\) \/ 2\)/);
  assert.match(controls, /--ds-check-target: 44px/);
});

test("the family step badge uses a radius token that suits wrapped text", () => {
  assert.match(
    rule(read("kitchen"), ".atelier .studio-step-badge"),
    /border-radius: var\(--ds-radius-sm\)/,
  );
});

test("recipe dialog text actions form an even two column grid on narrow cards", () => {
  const css = read("control-refinement");
  const anchor = "@container atelier-card (max-width: 560px)";
  const grid = rule(css, "  .atelier .text-actions", anchor);
  assert.match(grid, /display: grid/);
  assert.match(grid, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(
    rule(css, "  .atelier .text-actions > .text-action:last-child:nth-child(odd)", anchor),
    /grid-column: 1 \/ -1/,
  );
});
