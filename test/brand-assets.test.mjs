import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const size = (name) => {
  const png = readFileSync(new URL(`../brand/${name}`, import.meta.url));
  assert.equal(png.toString("latin1", 1, 4), "PNG", name);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

test("the repository ships the same brand images as the Bridge, in the sizes Home Assistant expects", () => {
  for (const prefix of ["", "dark_"]) {
    assert.deepEqual(size(`${prefix}icon.png`), [256, 256]);
    assert.deepEqual(size(`${prefix}icon@2x.png`), [512, 512]);
    assert.deepEqual(size(`${prefix}logo.png`), [648, 128]);
    assert.deepEqual(size(`${prefix}logo@2x.png`), [1296, 256]);
  }
});
