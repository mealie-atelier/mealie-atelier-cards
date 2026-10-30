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
