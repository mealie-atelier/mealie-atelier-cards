import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const dir = new URL("../src/design-system/", import.meta.url);

test("no screen text is set below 11 px, only the scaled print preview may be", () => {
  const tooSmall = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".css"))) {
    const css = readFileSync(new URL(name, dir), "utf8");
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const size = match[2].match(/font-size:\s*(\d+(?:\.\d+)?)px/);
      if (size && Number(size[1]) < 11 && !match[1].includes("print-paper")) {
        tooSmall.push(`${name}: ${match[1].trim()} ${size[1]}px`);
      }
    }
  }
  assert.deepEqual(tooSmall, []);
});
