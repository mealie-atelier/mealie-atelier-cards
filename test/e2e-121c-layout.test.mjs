import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `missing rule ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};

test("shopping names hyphenate instead of cutting mid-word", () => {
  const body = rule(read("src/design-system/foundation.css"), ".atelier .shopping-name");
  assert.match(body, /overflow-wrap:\s*break-word/);
  assert.match(body, /hyphens:\s*auto/);
  assert.doesNotMatch(body, /word-break/);
});

test("card root carries the resolved language for hyphenation", () => {
  assert.match(
    read("src/card-core.template.js"),
    /<div lang="\$\{esc\(this\._locale\)\}" class="atelier/,
  );
});

test("step textareas have a field-sizing fallback", () => {
  assert.match(
    rule(read("src/design-system/foundation.css"), ".atelier textarea[data-step-text]"),
    /field-sizing:\s*content/,
  );
});

test("sync preview button has spacing above the result and none extra above itself", () => {
  const css = read("src/design-system/shopping-sync.css");
  assert.match(
    rule(css, ".atelier .sync-panel .editor-card > .form-actions + .sync-preview"),
    /margin-top:\s*var\(--ds-space-3\)/,
  );
  assert.match(
    rule(css, ".atelier .sync-panel .editor-card > .eyebrow + .form-actions"),
    /margin-block-start:\s*0/,
  );
});

test("step autosize re-runs after frame, fonts and dialog resize, and disconnects", async () => {
  const frames = [];
  const observers = [];
  class FakeObserver {
    constructor(fn) {
      this.fn = fn;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  let fontsDone;
  const fonts = { ready: new Promise((r) => (fontsDone = r)) };
  const cards = loadCards({
    document: {
      visibilityState: "visible",
      fonts,
      addEventListener() {},
      removeEventListener() {},
    },
    globals: { requestAnimationFrame: (fn) => frames.push(fn), ResizeObserver: FakeObserver },
  });
  const card = makeCard(cards, { hass: { language: "de" } });
  let runs = 0;
  card._autosizeSteps = () => runs++;
  card._modal = "edit";
  const dialog = {};
  card.shadowRoot.querySelector = (sel) => (sel === ".modal" ? dialog : null);
  card._settleStepSizing();
  assert.equal(frames.length, 1);
  frames[0]();
  assert.equal(runs, 1, "animation frame re-run");
  fontsDone();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(runs, 2, "fonts.ready re-run");
  observers[0].fn();
  assert.equal(runs, 3, "resize re-run");
  card._unwatchStepSizing();
  assert.equal(observers[0].disconnected, true);
});
