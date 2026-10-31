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
  assert.match(block, /transition: opacity var\(--ds-motion-fast\) linear;/);
  assert.doesNotMatch(css, /animation-timeline|@keyframes at-bar-title/);
  assert.match(rule(".atelier .modal.bar-on > .modal-bar-title"), /opacity: 1;/);
  assert.match(
    rule("@media (prefers-reduced-motion: reduce) {\n  .atelier .modal > .modal-bar-title"),
    /transition: none;/,
  );
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

test("in every stylesheet the strip and its title are hidden under exactly the same conditions", () => {
  const dir = new URL("../src/design-system/", import.meta.url);
  const hides = (body) =>
    /display:\s*none|visibility:\s*hidden|opacity:\s*0(?![.\d])|content:\s*none/.test(body);
  const titleOff = [];
  const stripOff = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
    for (const r of flatRules(readFileSync(new URL(file, dir), "utf8"))) {
      const key = JSON.stringify(r.context);
      for (const selector of r.selector.split(",").map((part) => part.trim())) {
        const onBar = /\.modal-bar-title/.test(selector);
        const onStrip = /\.modal-close::before/.test(selector);
        if (!hides(r.body) || (!onBar && !onStrip)) continue;
        // Anything that is not scoped to the closed state (.bar-on adds the opacity) must hide both together.
        const base = /^\.atelier \.modal > \.modal-(bar-title|close::before)$/.test(selector);
        const entry = `${key}|${r.body.includes("opacity") ? "fade" : "gone"}|${base}`;
        (onBar ? titleOff : stripOff).push(entry);
        assert.ok(
          base,
          `${file}: "${selector}" hides the ${onBar ? "title" : "strip"} outside the shared base rule`,
        );
      }
    }
  }
  assert.ok(titleOff.length > 0 && stripOff.length > 0);
  assert.deepEqual([...new Set(titleOff)].sort(), [...new Set(stripOff)].sort());
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
