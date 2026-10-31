import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("../src/design-system/", import.meta.url);

/** Every declaration block inside a prefers-reduced-motion: reduce media query. */
function reducedBlocks(css) {
  const blocks = [];
  let at = css.indexOf("@media (prefers-reduced-motion: reduce)");
  while (at !== -1) {
    const open = css.indexOf("{", at);
    let depth = 1;
    let i = open + 1;
    while (depth && i < css.length) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    blocks.push(css.slice(open + 1, i - 1));
    at = css.indexOf("@media (prefers-reduced-motion: reduce)", i);
  }
  return blocks;
}

// A 0.01ms transition still runs: its first frame paints the old value, which showed elements at the wrong
// size for a frame when a container query restyled them. Reduced motion must switch transitions off.
test("reduced motion turns transitions off instead of shortening them", () => {
  let universal = 0;
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".css"))) {
    for (const block of reducedBlocks(readFileSync(new URL(name, dir), "utf8"))) {
      assert.doesNotMatch(block, /transition-duration/, `${name} shortens transitions`);
      if (/\.atelier \*(,|\s*\{)/.test(block)) {
        universal++;
        assert.match(block, /transition:\s*none\s*!important/, `${name} lacks transition: none`);
      }
    }
  }
  assert.ok(universal >= 2, "the universal reduced motion rules are found");
});
