import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("brand credits name the generator and the font licence", () => {
  const credits = readFileSync("brand/CREDITS.md", "utf8");
  assert.match(credits, /brand\/source/);
  assert.match(credits, /SIL Open Font License 1\.1/);
  assert.match(credits, /Bricolage Grotesque/);
  assert.doesNotMatch(credits, /\bgenerated for\b/);
  assert.doesNotMatch(credits, /MIT/);
  assert.match(credits, /do not grant a license to reuse the project identity or artwork/);
});
