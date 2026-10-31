import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const css = readFileSync(new URL("../src/design-system/mobile-forms.css", import.meta.url), "utf8");
const bundle = readFileSync(new URL("../dist/mealie-atelier-cards.js", import.meta.url), "utf8");
const rule = (selector) => {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start));
};

test("the mobile form styles ship in the bundle", () => {
  assert.ok(bundle.includes("Native form controls under iOS Safari"));
});

test("date and time inputs own their box instead of the iOS chrome", () => {
  const block = rule('input:is([type="date"]');
  assert.match(block, /-webkit-appearance: none;/);
  assert.match(block, /display: block;/);
  assert.match(block, /min-width: 0;/);
  assert.match(block, /max-width: 100%;/);
  assert.match(block, /height: var\(--ds-control-height\);/);
  assert.match(block, /line-height: 1\.4;/);
  assert.match(block, /text-align: start;/);
  for (const type of ["time", "datetime-local", "month", "week"])
    assert.ok(css.includes(`[type="${type}"]`), type);
});

test("the iOS date value is aligned to the start, not centred", () => {
  assert.match(rule("input::-webkit-date-and-time-value"), /text-align: start;/);
});

test("selects in a form fill their field and the picker filters stack at one width", () => {
  assert.match(rule(".atelier .field > :is(input, select, textarea)"), /width: 100%;/);
  const row = rule(".atelier .picker-filter-row {");
  assert.match(row, /display: grid;/);
  assert.match(row, /grid-template-columns: minmax\(0, 1fr\);/);
});

test("the favorites check row has the height and radius of the fields around it", () => {
  const block = rule(".atelier .editor-card .editor-check");
  assert.match(block, /min-block-size: var\(--ds-control-height\);/);
  assert.match(block, /padding: var\(--ds-space-3\) var\(--ds-control-padding-x\);/);
  assert.match(block, /border-radius: var\(--ds-control-radius\);/);
  assert.match(block, /border: 1px solid var\(--ds-border\);/);
});

test("the form kicker keeps air above the first label", () => {
  assert.match(rule(".atelier .editor-card > .eyebrow"), /margin-bottom: var\(--ds-space-4\);/);
});

test("the dialog header names the dialog instead of staying an empty band", () => {
  const card = makeCard(loadCards());
  card._modal = "create";
  const html = card._modalHtml();
  const title = card.t("create");
  assert.ok(html.includes(`<div class="modal-bar-title" aria-hidden="true">${title}</div>`), html);
  assert.match(html, /role="dialog"[^>]*tabindex="-1"/);
  assert.match(rule(".atelier .modal > .modal-bar-title {\n  --at-bar-size"), /position: sticky;/);
});

test("the header strip is a two state switch with no scroll-linked alpha", () => {
  const block = rule(".atelier .modal > .modal-bar-title {\n  --at-bar-size");
  assert.match(block, /opacity: 0;/);
  assert.doesNotMatch(block, /transition/);
  assert.doesNotMatch(css, /animation-timeline|@keyframes at-bar-title/);
  assert.match(rule(".atelier .modal.bar-on > .modal-bar-title"), /opacity: 1;/);
  const refinement = readFileSync(
    new URL("../src/design-system/control-refinement.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(refinement, /animation-timeline|at-close-strip/);
  assert.match(refinement, /\.atelier \.modal\.bar-on > \.modal-close::before \{\s*opacity: 1;/);
});

test("the favorites hint sits close under its check row", () => {
  assert.match(rule(".atelier .picker-filters > .picker-hint"), /margin-top: calc\(6px - 15px\);/);
});

function watchedModal({ strip = {}, headingText = " Gericht einplanen " } = {}) {
  const observers = [];
  const classes = new Set();
  const stripEl = { textContent: "Wochenplan", offsetHeight: 48, ...strip };
  const heading = { textContent: headingText };
  const modal = {
    classList: {
      toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
    },
    listeners: new Map(),
    addEventListener: (type, fn) => {
      if (!modal.listeners.has(type)) modal.listeners.set(type, new Set());
      modal.listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => modal.listeners.get(type)?.delete(fn),
    fire: (type) => {
      for (const fn of [...(modal.listeners.get(type) || [])]) fn();
    },
    fireAnimationEnd: () => modal.fire("animationend"),
    querySelector: (sel) =>
      sel === ":scope > .modal-bar-title" ? stripEl : sel === "h2" ? heading : null,
  };
  class IO {
    constructor(cb, opts) {
      this.cb = cb;
      this.opts = opts;
      this.disconnected = false;
      observers.push(this);
    }
    observe(el) {
      this.target = el;
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  const card = makeCard(loadCards({ globals: { IntersectionObserver: IO } }));
  card.shadowRoot.querySelector = (sel) => (sel === ".modal" ? modal : null);
  return { card, observers, classes, stripEl, heading };
}

test("the strip shows the dialog heading text and switches in one step when the heading is under it", () => {
  const { card, observers, classes, stripEl, heading } = watchedModal();
  card._watchModalBar();
  assert.equal(stripEl.textContent, "Gericht einplanen");
  const [io] = observers;
  assert.equal(io.target, heading);
  assert.equal(io.opts.rootMargin, "-68px 0px 0px 0px");
  const rootBounds = { top: 100 };
  io.cb([{ isIntersecting: false, boundingClientRect: { bottom: 150 }, rootBounds }]);
  assert.equal(classes.has("bar-on"), true);
  io.cb([{ isIntersecting: true, boundingClientRect: { bottom: 200 }, rootBounds }]);
  assert.equal(classes.has("bar-on"), false);
  // Heading below the fold (not intersecting, but not scrolled past): strip stays off.
  io.cb([{ isIntersecting: false, boundingClientRect: { bottom: 900 }, rootBounds }]);
  assert.equal(classes.has("bar-on"), false);
});

test("a new render replaces the heading observer", () => {
  const { card, observers } = watchedModal();
  card._watchModalBar();
  card._watchModalBar();
  assert.equal(observers[0].disconnected, true);
  assert.equal(observers.length, 2);
});

test("the strip is decided synchronously from the layout, so a stale on state is cleared at scroll 0", () => {
  const { card, classes, heading, stripEl } = watchedModal();
  const modalEl = card.shadowRoot.querySelector(".modal");
  modalEl.scrollTop = 0;
  // Offsets are untransformed layout values: heading spans 36..65 inside the dialog, the strip edge is at 68.
  heading.offsetParent = modalEl;
  heading.offsetTop = 36;
  heading.offsetHeight = 29;
  stripEl.offsetHeight = 44;
  classes.add("bar-on");
  card._watchModalBar();
  assert.equal(classes.has("bar-on"), false);
  // Scrolled by 20: the heading bottom is at 45, under the strip edge of 64.
  modalEl.scrollTop = 20;
  card._watchModalBar();
  assert.equal(classes.has("bar-on"), true);
  // Back at the top, the entrance animation ending re-evaluates.
  modalEl.scrollTop = 0;
  modalEl.fireAnimationEnd();
  assert.equal(classes.has("bar-on"), false);
});

test("the strip and its title are never split: no dialog hides the strip behind the title", () => {
  const wizard = readFileSync(
    new URL("../src/design-system/bring-wizard.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(wizard, /sync-modal > \.modal-close::before \{\s*display: none/);
});

test("watching the same dialog element again (cook steps patch it in place) keeps one animationend and one scroll listener", () => {
  const { card } = watchedModal();
  const modalEl = card.shadowRoot.querySelector(".modal");
  for (let step = 0; step < 5; step += 1) card._watchModalBar();
  assert.equal(modalEl.listeners.get("animationend").size, 1);
  assert.equal(modalEl.listeners.get("scroll").size, 1);
  card._unwatchModalBar();
  assert.equal(modalEl.listeners.get("animationend").size, 0);
  assert.equal(modalEl.listeners.get("scroll").size, 0);
});

/** Splits a stylesheet into rules with the chain of enclosing at-rule preludes. */
function flatRules(css) {
  const out = [];
  const walk = (text, context) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth) {
        if (text[j] === "{") depth += 1;
        if (text[j] === "}") depth -= 1;
        j += 1;
      }
      const body = text.slice(open + 1, j - 1);
      if (prelude.startsWith("@")) walk(body, [...context, prelude.replace(/\s+/g, " ")]);
      else out.push({ selector: prelude.replace(/\s+/g, " "), body, context });
      i = j;
    }
  };
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ""), []);
  return out;
}

/** Declarations that make an element invisible, transparent, empty or inert, whatever property carries them. */
function defeats(body, { paint = true } = {}) {
  const out = [];
  for (const [, prop, rawValue] of body.matchAll(/([a-z-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)) {
    const value = rawValue.replace(/\s*!important/, "").trim();
    const zero = /^0(?:px|em|rem|%)?$/.test(value);
    const transparent =
      /^(transparent|none|rgba?\([^)]*,\s*0(?:\.0+)?\s*\)|#[0-9a-f]{6}00|#[0-9a-f]{3}0)$/i;
    if (
      (prop === "display" && value === "none") ||
      (prop === "visibility" && /^(hidden|collapse)$/.test(value)) ||
      (prop === "opacity" && Number(value) < 1) ||
      (paint && /^(background|background-color|color)$/.test(prop) && transparent.test(value)) ||
      (paint && /^(background|background-image)$/.test(prop) && value === "none") ||
      (/^(height|max-height|width|max-width|font-size|line-height)$/.test(prop) && zero) ||
      (prop === "content" && value === "none") ||
      (prop === "clip-path" && value !== "none") ||
      (prop === "clip" && value !== "auto") ||
      (prop === "transform" && /scale\(0\)|translate/.test(value)) ||
      (prop === "filter" && /opacity\(|brightness\(0/.test(value)) ||
      (prop === "transition" && value !== "none") ||
      (prop === "transition-property" && value !== "none")
    )
      out.push(`${prop}: ${value}`);
  }
  return out;
}

test("nothing but the shared base rules (and the short landscape pair) can make the strip or its title invisible", () => {
  const dir = new URL("../src/design-system/", import.meta.url);
  const BASE = {
    title: ".atelier .modal > .modal-bar-title",
    strip: ".atelier .modal > .modal-close::before",
  };
  const landscape = "@media (orientation: landscape) and (max-height: 500px)";
  const found = { title: [], strip: [], close: [] };
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
    for (const r of flatRules(readFileSync(new URL(file, dir), "utf8"))) {
      for (const selector of r.selector.split(",").map((part) => part.trim())) {
        const kind = /\.modal-bar-title/.test(selector)
          ? "title"
          : /\.modal-close::before/.test(selector)
            ? "strip"
            : /\.modal-close(?![\w-])(?!::before)/.test(selector) &&
                !/:(hover|active|focus)/.test(selector)
              ? "close"
              : null;
        if (!kind) continue;
        for (const declaration of defeats(r.body, { paint: kind !== "close" })) {
          const context = r.context.join(" | ");
          const allowed =
            (kind !== "close" && selector === BASE[kind] && context === "") ||
            (kind !== "close" && selector === BASE[kind] && context === landscape);
          // The base opacity: 0 is the closed state; .bar-on turns it on. Any other rule must not defeat anything.
          assert.ok(
            allowed,
            `${file}: "${selector}" (${context || "no at-rule"}) declares "${declaration}"`,
          );
          found[kind].push(`${context}|${declaration.replace(/:.*/, "")}`);
        }
      }
    }
  }
  assert.deepEqual(found.close, [], "the close button is never hidden or made inert by a rule");
  // Both elements switch off together: the same properties kind under the same conditions.
  const key = (list) =>
    [...new Set(list.map((entry) => entry.replace(/\|(opacity|display)$/, "|off")))].sort();
  assert.deepEqual(key(found.title), key(found.strip));
});

test("only the known rules place the strip, its title and the close button, so they scroll and stack together", () => {
  const dir = new URL("../src/design-system/", import.meta.url);
  const PLACEMENT =
    /^(position|z-index|top|right|bottom|left|inset(-[a-z]+)?|float|isolation|contain|will-change|mix-blend-mode|translate|rotate|scale|zoom)$/;
  // The wide hero layout in short landscape windows: the dialog itself does not scroll there, the content column does.
  const heroLandscape = (context) =>
    context.length === 1 &&
    /^@media \(orientation: landscape\) and \((min|max)-height: \d+px\)/.test(context[0]);
  const allowed = new Map([
    [
      "control-refinement.css|.atelier .modal > .modal-close|",
      { position: "sticky", top: "20px", right: "auto" },
    ],
    [
      "control-refinement.css|.atelier .modal > .modal-close::before|",
      { position: "absolute", "z-index": "-1", top: "calc(-20px - 1px)", right: "-20px" },
    ],
    [
      "control-refinement.css|.atelier .modal > .modal-close::after|",
      { position: "absolute", "z-index": "-1", inset: "-1px" },
    ],
    [
      "mobile-forms.css|.atelier .modal > .modal-bar-title|",
      { position: "sticky", top: "20px", "z-index": "5" },
    ],
    ["editorial.css|.atelier .modal .modal-close|", { "z-index": "5", right: "20px", top: "20px" }],
    [
      "foundation.css|.atelier .modal-close|",
      { position: "absolute", right: "18px", top: "18px", "z-index": "2" },
    ],
    ["motion.css|.atelier .modal-close|", { "z-index": "5" }],
  ]);
  const seen = new Set();
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
    for (const r of flatRules(readFileSync(new URL(file, dir), "utf8"))) {
      for (const selector of r.selector.split(",").map((part) => part.trim())) {
        if (!/\.modal-bar-title|\.modal-close(?![\w-])/.test(selector)) continue;
        const placed = [...r.body.matchAll(/([a-z-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)]
          .filter(([, prop]) => PLACEMENT.test(prop))
          .map(([, prop, value]) => [prop, value.replace(/\s*!important/, "")]);
        if (!placed.length) continue;
        if (/\.modal-hero/.test(selector) && heroLandscape(r.context)) continue;
        const key = `${file}|${selector}|${r.context.join(" | ")}`;
        const expected = allowed.get(key);
        assert.ok(
          expected,
          `${key} places the strip, title or close button: ${JSON.stringify(placed)}`,
        );
        for (const [prop, value] of placed) assert.equal(value, expected[prop], `${key}: ${prop}`);
        seen.add(key);
      }
    }
  }
  assert.deepEqual([...seen].sort(), [...allowed.keys()].sort());
});

test("the strip is opaque and sized when on, the title is readable, and neither has a transition", () => {
  const dir = new URL("../src/design-system/", import.meta.url);
  const rules = readdirSync(dir)
    .filter((name) => name.endsWith(".css"))
    .flatMap((file) => flatRules(readFileSync(new URL(file, dir), "utf8")));
  const merged = (selector, context = []) =>
    rules
      .filter(
        (r) =>
          r.selector
            .split(",")
            .map((part) => part.trim())
            .includes(selector) && JSON.stringify(r.context) === JSON.stringify(context),
      )
      .map((r) => r.body)
      .join(";");
  const strip = merged(".atelier .modal > .modal-close::before");
  assert.match(strip, /background:\s*var\(--at-surface\)/);
  assert.match(strip, /height:\s*calc\(var\(--at-close-size\) \+ 33px\)/);
  assert.match(strip, /opacity:\s*0/);
  const title = merged(".atelier .modal > .modal-bar-title");
  assert.match(title, /color:\s*var\(--at-ink\)/);
  assert.match(title, /height:\s*var\(--at-bar-size\)/);
  for (const body of [strip, title]) assert.doesNotMatch(body, /transition/);
  // No stylesheet rule changes the transition of the title or strip in any state.
  for (const r of rules)
    if (/\.modal-bar-title|\.modal-close::before/.test(r.selector))
      assert.doesNotMatch(r.body, /transition/, r.selector);
});

test("the shared close strip is switched on by .bar-on in the same rule family as the title", () => {
  const dir = new URL("../src/design-system/", import.meta.url);
  const on = { title: 0, strip: 0 };
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
    for (const r of flatRules(readFileSync(new URL(file, dir), "utf8"))) {
      if (
        /^\.atelier \.modal\.bar-on > \.modal-bar-title$/.test(r.selector) &&
        /opacity:\s*1/.test(r.body)
      )
        on.title += 1;
      if (
        /^\.atelier \.modal\.bar-on > \.modal-close::before$/.test(r.selector) &&
        /opacity:\s*1/.test(r.body)
      )
        on.strip += 1;
    }
  }
  assert.deepEqual(on, { title: 1, strip: 1 });
});

test("scrolling decides the strip even when the observer never fires (heading already inside the strip band)", () => {
  const { card, classes, heading, stripEl, observers } = watchedModal();
  const modalEl = card.shadowRoot.querySelector(".modal");
  // Phone: the heading spans 36..65 and the strip edge is at 64, so it never crosses the observed edge again.
  heading.offsetParent = modalEl;
  heading.offsetTop = 36;
  heading.offsetHeight = 29;
  stripEl.offsetHeight = 44;
  modalEl.scrollTop = 0;
  card._watchModalBar();
  assert.equal(classes.has("bar-on"), false);
  assert.equal(observers.length, 1);
  modalEl.scrollTop = 120;
  modalEl.fire("scroll");
  assert.equal(classes.has("bar-on"), true);
  modalEl.scrollTop = 0;
  modalEl.fire("scroll");
  assert.equal(classes.has("bar-on"), false);
});

test("a different dialog opens at scroll 0, the same dialog keeps its scroll on a re-render", () => {
  const { card } = watchedModal();
  const writes = [];
  const modal = card.shadowRoot.querySelector(".modal");
  modal.querySelector = () => null;
  modal.classList.contains = () => false;
  Object.defineProperty(modal, "scrollTop", {
    get: () => 300,
    set: (value) => writes.push(value),
  });
  card._modal = "recipe";
  card._lastRenderedModal = "recipe";
  card._lastRenderedView = card._view;
  card._render();
  assert.deepEqual(writes, [300]);
  writes.length = 0;
  card._modal = "plan";
  card._render();
  assert.deepEqual(writes, []);
});

test("only a dialog's title block reserves room for the close button, not every heading", () => {
  const rule = css.match(
    /\.atelier\s+\.modal\s+:is\(([\s\S]*?)\)\s*\{[^}]*padding-inline-end:\s*var\(--at-close-reserve\)/,
  );
  assert.ok(rule, "the reserve rule exists");
  const targets = rule[1].replace(/\s+/g, " ");
  for (const wanted of [
    ".modal-content > :is(h1, h2, .eyebrow)",
    ".bw-panel > .bw-head > .bw-title",
  ])
    assert.ok(targets.includes(wanted), wanted);
  // The editor lead keeps 64px clear itself, so its title block takes only the rest of the reserve, never all of it.
  assert.ok(!targets.includes(".editor-lead"), "the editor lead is not reserved twice");
  assert.match(
    css,
    /\.atelier \.modal \.editor-lead > div > :is\(h2, \.eyebrow\) \{[^}]*padding-inline-end:\s*max\(0px, var\(--at-close-reserve\) - 64px\)/,
  );
  // Not the broad selector that also reached cook steps, card headings and the centred Bring! done screen.
  assert.doesNotMatch(css, /\.atelier \.modal :is\(h1, h2, h3, h4, \.eyebrow\)/);
});

test("a scrolling cook step column starts at its top edge instead of being centred", () => {
  const polish = readFileSync(new URL("../src/design-system/polish.css", import.meta.url), "utf8");
  const blocks = polish
    .split(/\n(?=@media)/)
    .filter(
      (b) => /overflow-y:\s*auto/.test(b) && /\.cook-content\s*\{[^}]*overflow-y:\s*auto/.test(b),
    );
  assert.ok(
    blocks.length >= 2,
    "the 701-1000px landscape and the tall portrait cook layouts scroll their column",
  );
  for (const block of blocks.filter((b) =>
    /min-height: 701px\) and \(max-height: 1000px|min-width: 761px\) and \(min-height: 681px/.test(
      b,
    ),
  ))
    assert.match(
      block.match(/\.cook-content\s*\{[^}]*overflow-y:\s*auto[^}]*\}/)[0],
      /justify-content:\s*flex-start/,
    );
});
