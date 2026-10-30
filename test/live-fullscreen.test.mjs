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
    assert.match(button, /type="button" aria-pressed="false" aria-controls="live-frame"/);
    assert.ok(button.includes(`data-enter-label="${enter}"`), locale);
    assert.ok(button.includes(`data-exit-label="${exit}"`), locale);
    assert.ok(button.includes(`aria-label="${aria}"`), locale);
    assert.ok(button.includes(`data-live-fs-label>${enter}<`), locale);
  }
  assert.ok(readFileSync(join(out, "assets/live-fullscreen.js"), "utf8").includes("overlay"));
  assert.match(readFileSync(join(out, "assets/site.js"), "utf8"), /setupLiveFullscreen/);
});

// A tiny DOM: just what the module touches.
function makeEnv({ native }) {
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
  if (native) {
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
  assert.equal(e.buttonAttrs.get("aria-pressed"), "false");
  await api.enter();
  assert.equal(api.mode(), "overlay");
  assert.equal(e.frameAttrs.get("data-fullscreen"), "overlay");
  assert.equal(e.frameAttrs.get("role"), "dialog");
  assert.equal(e.frameAttrs.get("aria-modal"), "true");
  assert.equal(e.buttonAttrs.get("aria-pressed"), "true");
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
  assert.equal(e.buttonAttrs.get("aria-pressed"), "true");
  assert.equal(e.sibling.inert, false, "the Fullscreen API needs no inert page");
  // The user leaves with the browser's Escape: only the change event arrives.
  e.doc.fullscreenElement = null;
  e.fire("doc", "fullscreenchange");
  assert.equal(api.mode(), null);
  assert.equal(e.buttonAttrs.get("aria-pressed"), "false");
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
