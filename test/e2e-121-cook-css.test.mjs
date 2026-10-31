import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bundle = readFileSync(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");
const css = bundle.slice(bundle.indexOf("const STYLE = `<style>"), bundle.indexOf("</style>`;"));

/** Every declaration block whose selector list ends with the given selector, in source order. */
function rules(selector) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selectors = m[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(",")
      .map((s) => s.trim());
    if (selectors.includes(selector)) out.push(m[2]);
  }
  return out;
}

test("editor footer is flush with the dialog bottom and never offset below it", () => {
  const all = rules(".atelier .editor-footer");
  assert.ok(all.length >= 5);
  for (const body of all) {
    assert.doesNotMatch(body, /bottom:\s*-\d/);
    assert.doesNotMatch(body, /margin:\s*0\s+-\d+px\s+-\d+px/);
  }
  assert.ok(all.some((b) => /bottom:\s*0;/.test(b)));
  assert.ok(all.some((b) => /border-radius:\s*0 0 23px 23px/.test(b)));
  assert.ok(
    rules(".atelier .modal-content.atelier-editor:has(.editor-footer)").some((b) =>
      /padding-bottom:\s*0/.test(b),
    ),
  );
});

test("long step headings are not overridden by the short portrait heading size", () => {
  assert.equal(rules(".atelier .modal:has(.cook-layout) .cook-stage h2").length, 0);
  assert.ok(
    rules(".atelier .modal:has(.cook-layout) .cook-stage h2:not(.cook-stage--long)").length > 0,
  );
});

test("close clearance is zero in the stacked layout and restored beside the step column", () => {
  const sel = ".atelier .modal:has(.cook-layout) .cook-content";
  assert.match(css, /--cook-close-clear:\s*var\(--cook-close-reserve\)/);
  const stacked = css.match(
    /@container atelier-card \(max-width: 760px\) \{\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-content \{\s*--cook-close-clear:\s*0px;/,
  );
  assert.ok(stacked, "stacked container rule sets the clearance to 0");
  const short = css.match(
    /@media \(orientation: landscape\) and \(max-height: 700px\) \{\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-content \{\s*--cook-close-clear:\s*var\(--cook-close-reserve\)/,
  );
  assert.ok(short, "short landscape keeps the clearance");
  assert.ok(sel);
});

test("short screens leave a 14px gap under the keep-awake row", () => {
  const stage = rules(".atelier .modal:has(.cook-layout) .cook-stage");
  assert.ok(stage.filter((b) => /padding-top:\s*14px/.test(b)).length >= 2);
  assert.ok(stage.every((b) => !/padding-top:\s*8px/.test(b)));
  assert.match(
    css,
    /@media \(orientation: landscape\) and \(max-height: 900px\) \{\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-stage \{\s*padding-top:\s*14px/,
    "720px high landscape viewports get the gap",
  );
});

test("a finished shared timer fills its ring after the unknown-progress rule", () => {
  const done = css.indexOf(".atelier .cook-timer-card.is-done .cook-timer-dial {");
  const unknown = css.indexOf(".atelier .cook-timer-card.is-progress-unknown .cook-timer-dial {");
  assert.ok(unknown > 0 && done > unknown);
  assert.match(
    rules(".atelier .cook-timer-card.is-done .cook-timer-dial")[0],
    /background:\s*var\(--ds-brand\)/,
  );
});
