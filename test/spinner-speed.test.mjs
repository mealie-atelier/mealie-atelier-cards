import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const dir = new URL("../src/design-system/", import.meta.url);
const spinners = readdirSync(dir)
  .filter((name) => name.endsWith(".css"))
  .flatMap((name) =>
    [
      ...readFileSync(new URL(name, dir), "utf8").matchAll(/animation:\s*([\w-]*spin)\s+([^;]+);/g),
    ].map((match) => ({ name, spin: match[1], timing: match[2] })),
  );

test("every endless spinner turns at the calm loading speed, never at a transition speed", () => {
  assert.deepEqual(spinners.map((s) => s.spin).sort(), ["bw-spin", "command-spin", "setup-spin"]);
  for (const { name, spin, timing } of spinners) {
    assert.match(timing, /^var\(--ds-motion-loading\)/, `${name}: ${spin}`);
    assert.match(timing, /infinite/, `${name}: ${spin}`);
  }
});
