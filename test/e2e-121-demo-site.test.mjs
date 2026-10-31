import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("German token callout uses the neuter pronoun for das Token", () => {
  const source = read("demo/site/sections-routes.mjs");
  assert.match(source, /bekommt es nie zu sehen/);
  assert.doesNotMatch(source, /bekommt ihn nie zu sehen/);
});

test("Bring! showcase browser leaves room for the phone overlay", () => {
  const css = read("demo/live-demo.css");
  const browser = css.match(/\.bring-visual \.browser \{\s*width: (\d+)%/);
  const phone = css.match(/\.bring-visual \.phone \{[^}]*?width: (\d+)%/);
  assert.ok(browser && phone);
  assert.ok(Number(browser[1]) + Number(phone[1]) <= 100, "browser and phone must not overlap");
});

test("Bring! phone stacks below the browser on narrow screens", () => {
  const css = read("demo/live-demo.css");
  const block = css.match(/@media \(max-width: 640px\) \{\s*\.bring-visual \{[\s\S]*?\n\}\n/);
  assert.ok(block, "narrow bring-visual rules missing");
  assert.match(block[0], /\.bring-visual \.phone \{[^}]*position: relative/);
  assert.match(block[0], /\.bring-visual \.browser \{[^}]*width: 100%/);
});

test("web compose comment has no duplicate sync language note and wraps evenly", () => {
  const lines = read("web/compose.yaml").split("\n");
  assert.equal(lines.filter((line) => line.includes("ATELIER_SYNC_LANGUAGE")).length, 1);
  assert.ok(!lines.some((line) => /^\s*# BRING_API_BASE and BRING_API_KEY\s*$/.test(line)));
  assert.ok(
    lines.some((line) => line.includes("# BRING_API_BASE and BRING_API_KEY also come from .env.")),
  );
});
