import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { loadCards, makeCard } from "./support/card-harness.mjs";

const css = (file) =>
  readFileSync(new URL(`../src/design-system/${file}`, import.meta.url), "utf8");

// Bug 2: the cooking progress bar ran under the close button.
test("the counter and the progress bar end a fixed gap before the close button at every padding", () => {
  const polish = css("polish.css");
  const clear = polish.match(
    /\.cook-content \{\s*--cook-close-clear: max\(0px, calc\((\d+)px \+ var\(--cook-close-size\) \+ (\d+)px - var\(--cook-pad-x\)\)\);/,
  );
  assert.ok(clear, "the free space is computed from the close button and the content padding");
  assert.equal(clear[1], "20", "button inset from the dialog edge");
  assert.equal(clear[2], "12", "gap between bar and button");
  assert.match(polish, /\.cook-topline \{\s*padding-inline-end: var\(--cook-close-clear\);/);
  assert.match(polish, /\.cook-track \{\s*margin-inline-end: var\(--cook-close-clear\);/);
  assert.match(polish, /\.modal:has\(\.cook-layout\) \{\s*--cook-close-size: 48px;/);
  assert.match(
    polish,
    /max-width: 420px\) \{\s*\.atelier \.modal:has\(\.cook-layout\) \{\s*--cook-close-size: 44px;/,
  );
});

test("every padding rule of the cooking content publishes its inline padding", () => {
  for (const file of readdirSync(new URL("../src/design-system/", import.meta.url))) {
    if (!file.endsWith(".css")) continue;
    for (const rule of css(file).matchAll(/\.cook-content \{([^}]*)\}/g)) {
      const body = rule[1];
      const padding = body.match(/(?:^|\s)padding:\s*([^;]+);/);
      if (!padding) continue;
      assert.match(body, /--cook-pad-x: [^;]+;/, `${file} sets --cook-pad-x with its padding`);
      assert.match(padding[1], /var\(--cook-pad-x\)/, `${file} pads with --cook-pad-x`);
    }
  }
});

// Bug 4: starting a timer must not move the view.
test("the timer list sits under the start form so a new timer never pushes the button", () => {
  const dialogs = readFileSync(new URL("../src/components/dialogs.js", import.meta.url), "utf8");
  const compose = dialogs.indexOf('class="cook-timer-compose"');
  const list = dialogs.indexOf('class="cook-timers"');
  const live = dialogs.indexOf("data-timer-announce");
  assert.ok(compose > 0 && list > compose, "start form comes before the timer list");
  assert.ok(
    live > 0 && live < compose,
    "the live region is part of the dialog and exists beforehand",
  );
});

test("starting a timer never scrolls or moves focus and announces it in the dialog live region", async () => {
  const cards = loadCards({ globals: { crypto: { randomUUID: () => "id-1" } } });
  const card = makeCard(cards);
  const calls = [];
  card._modal = "cook";
  card._render = () => {};
  card._flash = (text) => calls.push(["flash", text]);
  const live = { textContent: "stale" };
  const input = { value: "5", focus: () => calls.push(["focus"]) };
  const label = { value: "Pasta" };
  const spy = new Proxy({}, { get: (_, name) => () => calls.push([String(name)]) });
  card.shadowRoot.querySelector = (s) =>
    s === "[data-timer-minutes]"
      ? input
      : s === "[data-timer-label]"
        ? label
        : s === "[data-timer-announce]"
          ? live
          : spy;
  const button = { dataset: { action: "timer-start" }, disabled: false, closest: () => button };
  await card._handleClick({ target: { closest: () => button }, preventDefault() {} });
  assert.equal(card._timers.length, 1);
  assert.deepEqual(calls, [], "no scroll, no focus move, no toast hidden behind the dialog");
  assert.equal(live.textContent, "", "the region is emptied first so the same text is read again");
  assert.match(card._timerAnnouncement, /Pasta/);
  assert.match(card._timerAnnouncement, /5/);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(live.textContent, card._timerAnnouncement);
  const source = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  const handler = source.slice(
    source.indexOf('if (action === "timer-start")'),
    source.indexOf('if (action === "timer-preset")'),
  );
  assert.doesNotMatch(handler, /scrollIntoView|scrollTo|\.focus\(\)/);
});

// Bug 3: the phone tab rail.
function railWith({ left = 12, right = 378, scrollLeft = 0, tabs, scrollWidth = 700 }) {
  const rail = {
    scrollLeft,
    scrollWidth,
    clientWidth: right - left,
    attrs: {},
    style: {
      v: {},
      setProperty(k, v) {
        this.v[k] = v;
      },
      getPropertyValue(k) {
        return this.v[k] || "";
      },
    },
    toggleAttribute(name, on) {
      if (on) this.attrs[name] = true;
      else delete this.attrs[name];
    },
    getBoundingClientRect: () => ({ left, right, width: right - left }),
    querySelectorAll: () =>
      tabs.map((t) => ({
        getBoundingClientRect: () => ({
          left: t[0] - rail.scrollLeft + left,
          right: t[1] - rail.scrollLeft + left,
        }),
      })),
    querySelector: () => ({
      getBoundingClientRect: () => ({
        left: tabs[tabs.active][0] - rail.scrollLeft + left,
        right: tabs[tabs.active][1] - rail.scrollLeft + left,
      }),
    }),
  };
  return rail;
}
function railCard(rail) {
  const cards = loadCards();
  const card = makeCard(cards);
  const root = card.shadowRoot;
  const query = root.querySelector;
  root.querySelector = (selector) => (selector === ".sidebar .nav" ? rail : query(selector));
  return card;
}

test("an active tab that is cut off becomes the first whole tab, not the centre of the rail", () => {
  const tabs = [
    [0, 80],
    [86, 160],
    [166, 250],
    [256, 330],
    [336, 430],
    [436, 520],
    [526, 700],
  ];
  tabs.active = 4;
  const rail = railWith({ tabs, scrollWidth: 700 });
  railCard(rail)._revealActiveNav();
  // The tab starts at the scroll padding (12px) from the rail edge: nothing cut at the left.
  assert.equal(rail.scrollLeft, 336 - 12);
});

test("a fully visible active tab leaves the rail where the user put it", () => {
  const tabs = [
    [0, 80],
    [86, 160],
    [166, 250],
    [256, 330],
  ];
  tabs.active = 1;
  const rail = railWith({ tabs, scrollWidth: 700, scrollLeft: 0 });
  railCard(rail)._revealActiveNav();
  assert.equal(rail.scrollLeft, 0);
});

test("edge fade hints only appear on a side that has more tabs", () => {
  const tabs = [
    [0, 80],
    [86, 160],
  ];
  tabs.active = 0;
  const few = railWith({ tabs, scrollWidth: 366 });
  railCard(few)._syncNavHints(few);
  assert.deepEqual(few.attrs, {});
  const many = railWith({ tabs, scrollWidth: 700, scrollLeft: 100 });
  railCard(many)._syncNavHints(many);
  assert.deepEqual(Object.keys(many.attrs).sort(), ["data-more-end", "data-more-start"]);
  const end = railWith({ tabs, scrollWidth: 700, scrollLeft: 334 });
  railCard(end)._syncNavHints(end);
  assert.deepEqual(Object.keys(end.attrs), ["data-more-start"]);
});

test("the rail ends on a whole tab: trailing space makes the last position a tab start", () => {
  const tabs = [
    [0, 80],
    [86, 160],
    [166, 250],
    [256, 330],
    [336, 430],
    [436, 520],
    [526, 700],
  ];
  tabs.active = 6;
  const rail = railWith({ tabs, scrollWidth: 700 });
  railCard(rail)._syncNavHints(rail);
  // Natural end scroll is 334; the first tab start at or after it is 336 - 12 = 324 (< 334), so
  // the next one, 436 - 12 = 424, becomes the end and needs 90px of space after the last tab.
  assert.equal(rail.style.v["--nav-end-pad"], "90px");
});

test("the phone rail snaps to tab starts and fades only where tabs wait", () => {
  const corners = css("corners.css");
  assert.match(corners, /scroll-snap-type: x mandatory;\s*scroll-padding-inline: 12px;/);
  assert.match(corners, /\.nav > button \{\s*scroll-snap-align: start;/);
  assert.match(corners, /\.nav \{[^}]*mask-image: none;/);
  assert.match(corners, /\.nav\[data-more-start\] \{/);
  assert.match(corners, /\.nav\[data-more-end\] \{/);
});

test("a re-render keeps the trailing rail space so a rail resting at its end is not clamped", () => {
  const tabs = [[0, 80]];
  tabs.active = 0;
  const rail = railWith({ tabs });
  railCard(rail)._keepNavEndPad("90px");
  assert.equal(rail.style.v["--nav-end-pad"], "90px");
  const source = readFileSync(new URL("../src/card-core.template.js", import.meta.url), "utf8");
  const render = source.slice(source.indexOf("  _render() {"));
  assert.match(render, /if \(navEndPad\) this\._keepNavEndPad\(navEndPad\);/);
  assert.ok(
    render.indexOf("this._keepNavEndPad(navEndPad)") <
      render.indexOf("for (const snap of scrolls)"),
    "the pad is back before the scroll positions are restored",
  );
});

test("the add rule button of the shopping sync keeps a gap to the card below it", () => {
  const css = readFileSync(
    new URL("../src/design-system/shopping-sync.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /\.atelier \.sync-panel \.form-actions \+ \.editor-card \{\s*margin-block-start: var\(--ds-space-3\);/,
  );
});

test("check rows in a sync fieldset use the fieldset gap only", () => {
  const css = readFileSync(
    new URL("../src/design-system/shopping-sync.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.atelier \.sync-fieldset > \.editor-check \{\s*margin-block-end: 0;/);
});

test("the end fade of the phone rail starts where the last whole tab ends", () => {
  const tabs = [
    [0, 80],
    [86, 160],
    [166, 250],
    [256, 330],
    [336, 430],
    [436, 520],
  ];
  tabs.active = 0;
  // Rail is 366px wide: the tab at 336..430 straddles the end, so the fade covers 330..366 (36px) and the
  // straddling tab shows only inside it, never as a half label in the opaque part.
  const cut = railWith({ tabs, scrollWidth: 700 });
  railCard(cut)._syncNavHints(cut);
  assert.equal(cut.style.v["--nav-fade"], "36px");
  // A last whole tab that ends inside the default fade keeps the 12px fade.
  const flush = railWith({ tabs: [...tabs.slice(0, 3), [256, 360], [366, 460]], scrollWidth: 700 });
  flush.attrs = {};
  railCard(flush)._syncNavHints(flush);
  assert.equal(flush.style.v["--nav-fade"], "12px");
  // A tab that does not fit before the end leaves the whole space after the last whole tab to the fade.
  const wide = railWith({
    tabs: [
      [0, 80],
      [86, 160],
      [166, 200],
      [206, 600],
    ],
    scrollWidth: 700,
  });
  railCard(wide)._syncNavHints(wide);
  assert.equal(wide.style.v["--nav-fade"], "166px");
  // Resting at the end there is no fade to move.
  const end = railWith({ tabs, scrollWidth: 700, scrollLeft: 334 });
  railCard(end)._syncNavHints(end);
  assert.equal(end.style.v["--nav-fade"], "12px");
});

test("the end fade of the phone rail follows --nav-fade and falls back to the 12px fade", () => {
  const corners = css("corners.css");
  const stops =
    corners.match(/#000 calc\(100% - var\(--nav-fade, 12px\)\),\s*transparent 100%/g) ?? [];
  // end only and start plus end, each in the prefixed and the plain mask property
  assert.equal(stops.length, 4);
  assert.doesNotMatch(corners, /nav-cut/);
});

// Cooking dialog: the Back and Next bar is pinned, so content must never end under it.
test("the cooking scrollers keep scroll padding for the pinned bar and never centre past the top", () => {
  const refinement = css("control-refinement.css");
  assert.match(
    refinement,
    /\.modal:has\(\.cook-layout\),\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-content \{\s*scroll-padding-bottom: var\(--cook-bar-clearance, 180px\);/,
  );
  assert.match(
    refinement,
    /\.modal\.large:has\(\.cook-layout\) \.cook-content \{[^}]*justify-content: flex-start;\s*justify-content: safe center;/,
  );
});

test("a control that takes focus under the pinned cooking bar is scrolled up until it clears the bar", () => {
  const scroller = {
    parentElement: null,
    overflowY: "auto",
    scrollTop: 0,
    scrollHeight: 1200,
    clientHeight: 600,
  };
  const control = (top, bottom, parent = scroller) => ({
    parentElement: parent,
    getBoundingClientRect: () => ({ top, bottom, height: bottom - top }),
  });
  const bar = {
    getBoundingClientRect: () => ({ top: 700, bottom: 772 }),
    contains: (node) => node === inBar,
  };
  const inBar = control(710, 750);
  const card = makeCard(
    loadCards({
      globals: { getComputedStyle: (node) => ({ overflowY: node.overflowY ?? "visible" }) },
    }),
  );
  card.shadowRoot.querySelector = (selector) => (selector === ".modal .cook-actions" ? bar : null);
  {
    // 30px of the control sit under the bar: the column moves those 30px plus an 8px margin.
    card._keepFocusClearOfCookBar(control(690, 730));
    assert.equal(scroller.scrollTop, 38);
    // A control above the bar, one inside the bar and one that is not rendered do not move the column.
    card._keepFocusClearOfCookBar(control(600, 650));
    card._keepFocusClearOfCookBar(inBar);
    card._keepFocusClearOfCookBar(control(0, 0));
    assert.equal(scroller.scrollTop, 38);
  }
});
