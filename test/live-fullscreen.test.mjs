import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupLiveFullscreen } from "../demo/live-fullscreen.js";

let out;
before(() => {
  out = mkdtempSync(join(tmpdir(), "atelier-fs-"));
  execFileSync("node", ["scripts/generate-demo-site.mjs"], {
    env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: "" },
    stdio: "pipe",
  });
});
after(() => rmSync(out, { recursive: true, force: true }));

test("both live demo pages carry the labelled fullscreen button inside the frame", () => {
  const words = {
    de: ["Vollbild", "Vollbild beenden", "Live-Demo im Vollbild öffnen"],
    en: ["Fullscreen", "Exit fullscreen", "Open the live demo in fullscreen"],
  };
  for (const locale of ["de", "en"]) {
    const html = readFileSync(join(out, locale, "index.html"), "utf8");
    const frame = html.slice(html.indexOf('<div class="live-frame" id="live-frame">'));
    const button = frame.match(/<button class="live-fs"[^>]*>[\s\S]*?<\/button>/)?.[0];
    assert.ok(button, `${locale} button inside the live frame`);
    assert.ok(frame.indexOf(button) < frame.indexOf("<mealie-atelier-card>"), locale);
    const [enter, exit, aria] = words[locale];
    assert.match(button, /type="button" aria-controls="live-frame"/);
    assert.ok(button.includes(`data-enter-label="${enter}"`), locale);
    assert.ok(button.includes(`data-exit-label="${exit}"`), locale);
    assert.ok(button.includes(`aria-label="${aria}"`), locale);
    assert.ok(button.includes(`data-live-fs-label>${enter}<`), locale);
    assert.equal(
      button.includes("aria-pressed"),
      false,
      `${locale} no pressed state next to a changing name`,
    );
  }
  assert.ok(readFileSync(join(out, "assets/live-fullscreen.js"), "utf8").includes("overlay"));
  assert.match(readFileSync(join(out, "assets/site.js"), "utf8"), /setupLiveFullscreen/);
});

// A tiny DOM: just what the module touches.
function makeEnv({ native, prefixed = false }) {
  const listeners = new Map();
  const on = (target) => (type, fn) => {
    const key = `${target}:${type}`;
    listeners.set(key, [...(listeners.get(key) ?? []), fn]);
  };
  const fire = (target, type, event = {}) =>
    (listeners.get(`${target}:${type}`) ?? []).forEach((fn) => fn(event));
  const attrs = (store) => ({
    setAttribute: (k, v) => store.set(k, String(v)),
    getAttribute: (k) => store.get(k) ?? null,
    removeAttribute: (k) => store.delete(k),
  });
  const frameAttrs = new Map();
  const buttonAttrs = new Map();
  const sibling = { tagName: "HEADER", inert: false };
  const uses = new Map();
  const labelNode = { textContent: "" };
  const useNode = { setAttribute: (k, v) => uses.set(k, v) };
  const doc = {
    documentElement: { classList: new Set() },
    body: { children: [] },
    fullscreenElement: null,
    activeElement: null,
    addEventListener: on("doc"),
  };
  doc.documentElement.classList = {
    add: (c) => doc.documentElement.set.add(c),
    remove: (c) => doc.documentElement.set.delete(c),
  };
  doc.documentElement.set = new Set();
  const main = { tagName: "MAIN", children: [], parentElement: doc.body };
  doc.body.children = [sibling, main];
  const frame = { ...attrs(frameAttrs), tagName: "DIV", parentElement: main, requestCalls: 0 };
  main.children = [frame, { tagName: "P", inert: false }];
  if (native && prefixed) {
    // iPad Safari: only the webkit names exist.
    frame.webkitRequestFullscreen = () => {
      frame.requestCalls++;
      doc.webkitFullscreenElement = frame;
      fire("doc", "webkitfullscreenchange");
    };
    doc.webkitExitFullscreen = () => {
      doc.webkitFullscreenElement = null;
      fire("doc", "webkitfullscreenchange");
    };
    doc.webkitFullscreenEnabled = true;
  } else if (native) {
    frame.requestFullscreen = async () => {
      frame.requestCalls++;
      doc.fullscreenElement = frame;
      fire("doc", "fullscreenchange");
    };
    doc.exitFullscreen = async () => {
      doc.fullscreenElement = null;
      fire("doc", "fullscreenchange");
    };
    doc.fullscreenEnabled = true;
  } else doc.fullscreenEnabled = false;
  const opener = { isConnected: true, focus: () => (doc.activeElement = opener) };
  const button = {
    ...attrs(buttonAttrs),
    dataset: {
      enterLabel: "Vollbild",
      exitLabel: "Vollbild beenden",
      enterAria: "Live-Demo im Vollbild öffnen",
      exitAria: "Vollbild beenden",
      dialogLabel: "Live-Demo im Vollbild",
    },
    querySelector: (s) => (s.includes("label") ? labelNode : useNode),
    addEventListener: on("button"),
    focus: () => (doc.activeElement = button),
  };
  doc.activeElement = opener;
  return {
    doc,
    frame,
    button,
    frameAttrs,
    buttonAttrs,
    labelNode,
    uses,
    sibling,
    main,
    fire,
    opener,
  };
}

test("without element fullscreen (iPhone) the frame becomes a locked overlay and closes with Escape", async () => {
  const e = makeEnv({ native: false });
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card: null, doc: e.doc });
  assert.equal(e.buttonAttrs.get("aria-label"), "Live-Demo im Vollbild öffnen");
  assert.equal(e.buttonAttrs.has("aria-pressed"), false);
  await api.enter();
  assert.equal(api.mode(), "overlay");
  assert.equal(e.frameAttrs.get("data-fullscreen"), "overlay");
  assert.equal(e.frameAttrs.get("role"), "dialog");
  assert.equal(e.frameAttrs.get("aria-modal"), "true");
  assert.equal(e.buttonAttrs.get("aria-label"), "Vollbild beenden");
  assert.equal(e.labelNode.textContent, "Vollbild beenden");
  assert.equal(e.uses.get("href"), "#i-shrink");
  assert.ok(e.doc.documentElement.set.has("live-fs-lock"), "page scroll locked");
  assert.equal(e.sibling.inert, true, "page behind is inert");
  assert.equal(e.main.children[1].inert, true);
  assert.equal(e.doc.activeElement, e.button, "focus moved into the frame");
  let prevented = false;
  e.fire("doc", "keydown", {
    key: "Escape",
    defaultPrevented: false,
    preventDefault: () => (prevented = true),
  });
  await Promise.resolve();
  assert.ok(prevented);
  assert.equal(api.mode(), null);
  assert.equal(e.frameAttrs.has("data-fullscreen"), false);
  assert.equal(e.frameAttrs.has("role"), false);
  assert.equal(e.doc.documentElement.set.has("live-fs-lock"), false);
  assert.equal(e.sibling.inert, false);
  assert.equal(e.doc.activeElement, e.opener, "focus restored to the opener");
  assert.equal(e.uses.get("href"), "#i-expand");
  assert.equal(e.labelNode.textContent, "Vollbild");
});

test("Escape belongs to the card while one of its dialogs is open", async () => {
  const e = makeEnv({ native: false });
  const card = { shadowRoot: { querySelector: () => ({}) } };
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card, doc: e.doc });
  await api.enter();
  e.fire("doc", "keydown", { key: "Escape", defaultPrevented: false, preventDefault() {} });
  assert.equal(api.mode(), "overlay");
});

test("with element fullscreen the button follows fullscreenchange, including the browser's own exit", async () => {
  const e = makeEnv({ native: true });
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card: null, doc: e.doc });
  await api.enter();
  assert.equal(e.frame.requestCalls, 1);
  assert.equal(api.mode(), "native");
  assert.equal(e.frameAttrs.get("data-fullscreen"), "native");
  assert.equal(e.buttonAttrs.get("aria-label"), "Vollbild beenden");
  assert.equal(e.buttonAttrs.has("aria-pressed"), false);
  assert.equal(e.sibling.inert, false, "the Fullscreen API needs no inert page");
  // The user leaves with the browser's Escape: only the change event arrives.
  e.doc.fullscreenElement = null;
  e.fire("doc", "fullscreenchange");
  assert.equal(api.mode(), null);
  assert.equal(e.buttonAttrs.get("aria-label"), "Live-Demo im Vollbild öffnen");
  assert.equal(e.doc.activeElement, e.opener);
});

test("a refused fullscreen request falls back to the overlay", async () => {
  const e = makeEnv({ native: true });
  e.frame.requestFullscreen = async () => {
    throw new Error("denied");
  };
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card: null, doc: e.doc });
  await api.enter();
  assert.equal(api.mode(), "overlay");
});

test("the stylesheet fills the dynamic viewport, respects safe areas and stays dark", () => {
  const css = readFileSync("demo/live-demo.css", "utf8");
  const overlay = css.match(/\.live-frame\[data-fullscreen="overlay"\] \{[^}]*\}/)?.[0] ?? "";
  assert.match(overlay, /position: fixed/);
  assert.match(overlay, /height: 100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /html\.live-fs-lock/);
  assert.match(css, /\.live-frame\[data-fullscreen\] \{[^}]*color-scheme: dark/);
});

test("a card with its own native confirm dialog open keeps Escape, the overlay stays", async () => {
  const e = makeEnv({ native: false });
  // The card's confirm and prompt dialogs are <dialog class="at-premium-dialog"> without a role.
  let dialogOpen = false;
  const card = {
    shadowRoot: {
      querySelector: (selector) =>
        dialogOpen && selector.split(",").some((part) => part.trim() === "dialog[open]")
          ? {}
          : null,
    },
  };
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card, doc: e.doc });
  await api.enter();
  dialogOpen = true;
  let prevented = false;
  e.fire("doc", "keydown", {
    key: "Escape",
    defaultPrevented: false,
    preventDefault: () => (prevented = true),
  });
  assert.equal(prevented, false, "the dialog's own cancel is not suppressed");
  assert.equal(api.mode(), "overlay");
  assert.equal(e.sibling.inert, true);
  dialogOpen = false;
  e.fire("doc", "keydown", { key: "Escape", defaultPrevented: false, preventDefault() {} });
  await Promise.resolve();
  assert.equal(api.mode(), null, "with the dialog closed Escape leaves the overlay");
});

test("with only the webkit prefixed API (iPad Safari) the frame goes fullscreen and follows webkitfullscreenchange", async () => {
  const e = makeEnv({ native: true, prefixed: true });
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card: null, doc: e.doc });
  await api.enter();
  assert.equal(e.frame.requestCalls, 1, "webkitRequestFullscreen was used");
  assert.equal(api.mode(), "native");
  assert.equal(e.buttonAttrs.get("aria-label"), "Vollbild beenden");
  assert.equal(e.buttonAttrs.has("aria-pressed"), false);
  assert.equal(e.doc.documentElement.set.has("live-fs-lock"), false);
  assert.equal(e.doc.activeElement, e.button);
  // The button exits through webkitExitFullscreen.
  await api.exit();
  assert.equal(e.doc.webkitFullscreenElement, null);
  assert.equal(api.mode(), null);
  assert.equal(e.buttonAttrs.get("aria-label"), "Live-Demo im Vollbild öffnen");
  assert.equal(e.doc.activeElement, e.opener);
  // The browser's own exit arrives as webkitfullscreenchange only.
  await api.enter();
  e.doc.webkitFullscreenElement = null;
  e.fire("doc", "webkitfullscreenchange");
  assert.equal(api.mode(), null);
  assert.equal(e.labelNode.textContent, "Vollbild");
});

test("webkitfullscreenerror falls back to the overlay", async () => {
  const e = makeEnv({ native: true, prefixed: true });
  e.frame.webkitRequestFullscreen = () => e.fire("doc", "webkitfullscreenerror");
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card: null, doc: e.doc });
  await api.enter();
  assert.equal(api.mode(), "overlay");
  assert.ok(e.doc.documentElement.set.has("live-fs-lock"));
});

test("fullscreen puts the card in its panel layout (edge to edge, full height) and restores it", async () => {
  const e = makeEnv({ native: false });
  const card = { shadowRoot: { querySelector: () => null }, layout: undefined };
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card, doc: e.doc });
  await api.enter();
  assert.equal(card.layout, "panel");
  await api.exit();
  assert.equal(card.layout, undefined);
});

test("the button is hidden in the static markup and shown only once it is wired", () => {
  for (const locale of ["de", "en"]) {
    const html = readFileSync(join(out, locale, "index.html"), "utf8");
    assert.match(html, /<button class="live-fs"[^>]* hidden>/, locale);
  }
  const e = makeEnv({ native: false });
  e.button.hidden = true;
  setupLiveFullscreen({ frame: e.frame, button: e.button, card: null, doc: e.doc });
  assert.equal(e.button.hidden, false);
  const css = readFileSync("demo/live-demo.css", "utf8");
  assert.match(css, /\.live-fs\[hidden\] \{\s*display: none/);
  assert.match(readFileSync("demo/site.js", "utf8"), /live-fullscreen\.js"\)[\s\S]*\.catch\(/);
});

test("on narrow screens the bar keeps one line and fullscreen closes with an icon button", () => {
  const css = readFileSync("demo/live-demo.css", "utf8");
  assert.match(css, /\.live-status \{[^}]*white-space: nowrap/);
  const narrow = css.slice(css.indexOf("@media (max-width: 640px)"));
  assert.match(narrow, /\.live-dots \{\s*display: none/);
  assert.match(
    narrow,
    /\.live-frame\[data-fullscreen\] \.live-fs \[data-live-fs-label\] \{[^}]*clip-path/,
  );
  assert.match(css, /live-frame:not\(\[data-fullscreen\]\) \.live-status-more \{\s*display: none/);
  assert.match(css, /padding-block: max\(12px, env\(safe-area-inset-top\)\)/);
});

test("in the panel layout the sidebar is no taller than the view, so its footer is not clipped", () => {
  const css = readFileSync("src/design-system/foundation.css", "utf8");
  assert.match(css, /\.atelier\.panel \.sidebar \{\s*min-height: 0/);
  assert.match(
    readFileSync("dist/mealie-atelier-cards.js", "utf8"),
    /\.atelier\.panel \.sidebar \{\s*min-height: 0/,
  );
});

test("the card's panel height follows the measured space under the bar, with no fixed bar height", async () => {
  const e = makeEnv({ native: false });
  const props = new Map();
  let notify;
  let disconnected = false;
  e.doc.defaultView = {
    ResizeObserver: class {
      constructor(fn) {
        notify = fn;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  };
  const card = {
    shadowRoot: { querySelector: () => null },
    clientHeight: 733,
    style: {
      setProperty: (k, v) => props.set(k, v),
      removeProperty: (k) => props.delete(k),
    },
  };
  const api = setupLiveFullscreen({ frame: e.frame, button: e.button, card, doc: e.doc });
  assert.equal(props.has("--header-height"), false, "nothing set while not fullscreen");
  await api.enter();
  assert.equal(props.get("--header-height"), "calc(100vh - 733px)");
  card.clientHeight = 640; // rotation, a taller bar, a changed safe area
  notify();
  assert.equal(props.get("--header-height"), "calc(100vh - 640px)");
  await api.exit();
  assert.equal(disconnected, true);
  assert.equal(props.has("--header-height"), false, "the card's own value comes back");
  const css = readFileSync("demo/live-demo.css", "utf8");
  assert.doesNotMatch(css, /--header-height:\s*calc\(\s*100vh - 100dvh \+ 79px/);
});
