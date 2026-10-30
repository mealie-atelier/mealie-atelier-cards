import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/design-system/polish.css", import.meta.url), "utf8");

/** Body of the first @media block whose header starts with the given text. */
function mediaBlock(header) {
  const start = css.indexOf(header);
  assert.ok(start >= 0, `missing ${header}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("unbalanced block");
}

for (const header of [
  "@media (orientation: landscape) and (min-height: 701px) and (max-height: 1000px)",
  "@media (orientation: portrait) and (min-width: 761px) and (min-height: 681px)",
]) {
  test(`cooking controls keep a box where the step column scrolls (${header.slice(7, 40)})`, () => {
    const block = mediaBlock(header);
    const rule = block.replace(/\/\*[\s\S]*?\*\//g, "").match(/\.cook-controls\s*\{[^}]*\}/);
    assert.ok(rule, "controls rule present");
    // Safari does not pin a sticky bar whose parent is display: contents, so the bar would sit below the fold.
    assert.doesNotMatch(rule[0], /display:\s*contents/);
    assert.match(rule[0], /display:\s*flex/);
    // It has to outrank the global display: contents rule in control-refinement.css.
    assert.match(block, /\.modal\.large:has\(\.cook-layout\) \.cook-controls\s*\{/);
  });
}

const refinement = readFileSync(
  new URL("../src/design-system/control-refinement.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

test("a narrow card on a tall tablet keeps its photo band and a real second row for the steps", () => {
  // The viewport rules above collapse the photo to zero height; in a card of at most 760px the band must come back.
  const wrapper = refinement.match(
    /@media \(orientation: landscape\) and \(min-height: 701px\) and \(max-height: 1000px\),\s*\(orientation: portrait\) and \(min-width: 761px\) and \(min-height: 681px\) \{\s*@container atelier-card \(max-width: 760px\) \{([\s\S]*?)\n  \}\n\}/,
  );
  assert.ok(wrapper, "container block inside both viewport ranges");
  const body = wrapper[1];
  assert.match(
    body,
    /\.modal\.large:has\(\.cook-layout\) > \.cook-layout\s*\{[^}]*grid-template-rows:\s*210px minmax\(0, 1fr\)/,
  );
  assert.match(
    body,
    /\.modal:has\(\.cook-layout\) \.cook-visual\s*\{[^}]*height:\s*210px;[^}]*min-height:\s*210px/,
  );
});

test("rows of the scrolling cooking column keep their height instead of overlapping", () => {
  assert.match(
    refinement,
    /\.cook-content > \*,\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-controls > \*\s*\{[^}]*flex-shrink:\s*0/,
  );
});
