import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { loadCards, makeCard } from "./support/card-harness.mjs";

/** A card whose previous ha-card is swapped while the page reports the given card tops. */
function swappingCard(tops) {
  const cards = loadCards();
  const scrolled = [];
  cards.document.scrollingElement = { scrollBy: (x, y) => scrolled.push([x, y]) };
  const card = makeCard(cards);
  const queue = [...tops];
  card.getBoundingClientRect = () => ({ top: queue.shift() });
  const root = card.shadowRoot;
  const query = root.querySelector;
  root.querySelector = (selector) =>
    selector === "ha-card" ? { replaceWith() {} } : query(selector);
  return { card, scrolled };
}

test("a re-render that shifts the page is scrolled back so the card stays in place", () => {
  // WebKit re-anchors after the swap and jumps the page down by the card's height.
  const { card, scrolled } = swappingCard([120, -742]);
  card._render();
  assert.deepEqual(scrolled, [[0, -862]]);
});

test("a re-render that keeps the card in place does not scroll", () => {
  const { card, scrolled } = swappingCard([120, 120.5]);
  card._render();
  assert.deepEqual(scrolled, []);
});

test("a card that fills a panel view runs edge to edge, elsewhere it keeps its frame", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._render();
  assert.doesNotMatch(cards.document.markup, /class="atelier [^"]*\bpanel\b/);
  card.layout = "panel";
  assert.match(cards.document.markup, /class="atelier [^"]*\bpanel\b/);
});

test("re-rendering an open dialog does not replay the backdrop or heading enter animation", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = {
    slug: "gnocchi",
    name: "Gnocchi",
    recipeInstructions: [{ text: "a" }, { text: "b" }],
  };
  card._modal = "cook";
  card._render();
  assert.match(cards.document.markup, /class="modal-backdrop"/);
  card._cookIndex = 1;
  card._render();
  assert.match(cards.document.markup, /class="modal-backdrop modal-stable"/);
  assert.match(cards.document.markup, /class="modal modal-stable /);
});

test("the first open of a dialog still animates, also right after another dialog", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = { slug: "g", name: "G", recipeInstructions: [{ text: "a" }, { text: "b" }] };
  card._modal = "loading";
  card._render();
  card._modal = "cook";
  card._render();
  assert.match(cards.document.markup, /class="modal-backdrop"/);
  assert.doesNotMatch(cards.document.markup, /modal-stable/);
});

test("the stable marker really switches off the backdrop and step heading animations", () => {
  const css = readFileSync(new URL("../src/design-system/motion.css", import.meta.url), "utf8");
  const rules = [...css.matchAll(/([^{}]*\.modal-stable[^{}]*)\{([^}]*)\}/g)];
  for (const selector of [
    ".atelier .modal.modal-stable",
    ".atelier .modal-backdrop.modal-stable",
    ".atelier .modal-stable .cook-stage h2",
  ]) {
    const rule = rules.find(([, selectors]) =>
      selectors.split(",").some((one) => one.trim() === selector),
    );
    assert.ok(rule, `${selector} has a rule`);
    assert.match(rule[2], /animation:\s*none\s*!important/, selector);
  }
});

/** A headless Chromium from CHROME_BIN or the Playwright cache, if one is installed. */
function findChrome() {
  const candidates = [process.env.CHROME_BIN];
  for (const dir of [".cache/ms-playwright", "Library/Caches/ms-playwright"]) {
    const root = join(process.env.HOME ?? "", dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root).sort().reverse()) {
      if (!entry.startsWith("chromium_headless_shell-")) continue;
      for (const sub of readdirSync(join(root, entry)))
        candidates.push(join(root, entry, sub, "chrome-headless-shell"));
    }
  }
  return candidates.find((path) => path && existsSync(path));
}

const bundlePath = new URL("../dist/mealie-atelier-cards.js", import.meta.url).pathname;

/**
 * Run a scenario against a real card with an open cooking dialog in a real engine. The
 * scenario text runs after the shared setup (card, recipe, running timer, helpers q, grab,
 * settled, wait) and must set `result`; the page reports it as JSON.
 */
function runCooking(chrome, body, { mode = "", width = 900 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "atelier-cook-step-"));
  try {
    // Tiny real pictures, so the card's broken-image handler leaves them alone.
    mkdirSync(join(dir, "food"));
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    for (const name of ["hero", "a", "b"]) writeFileSync(join(dir, "food", `${name}.webp`), gif);
    writeFileSync(
      join(dir, "harness.html"),
      `<!doctype html><meta charset="utf-8"><body><pre id="out">pending</pre><script src="file://${bundlePath}"></script><script>
(async () => {
  let result = null;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let popovers = 0;
  const show = HTMLElement.prototype.showPopover;
  if (show) HTMLElement.prototype.showPopover = function () { popovers++; return show.call(this); };
  const card = document.createElement("mealie-atelier-card");
  card.setConfig({ type: "custom:mealie-atelier-card", ...(location.hash === "#off" ? { motion: "off" } : {}) });
  document.body.append(card);
  card._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true }] };
  card._hass = { language: "en", callWS: async () => ({}) };
  card._detail = {
    slug: "g", name: "Gnocchi", image: "h", imageUrl: "./food/hero.webp",
    recipeInstructions: [
      { text: "One", imageUrls: ["./food/a.webp"] },
      { text: "Two", imageUrls: ["./food/a.webp"] },
      { text: "Three" },
      { text: "Four", imageUrls: ["./food/b.webp"] },
      { text: "Five", imageUrls: ["./food/a.webp"] },
    ],
  };
  card._timers = [{ id: "t1", label: "Pasta", deadline: Date.now() + 600000, durationMs: 600000, startedAt: Date.now(), done: false }];
  card._modal = "cook";
  card._cookIndex = 0;
  card._render();
  const q = (selector) => card.shadowRoot.querySelector(selector);
  const settled = async (src) => {
    for (let i = 0; i < 80 && !(card.shadowRoot.querySelectorAll(".cook-step-photo").length === 1 && q(".cook-step-photo").getAttribute("src") === src); i++) await wait(50);
    await wait(100);
  };
  const grab = () => ({
    backdrop: q(".modal-backdrop"), modal: q(".modal"), hero: q(".cook-visual img"), fill: q(".cook-fill"),
    status: q(".cook-timer-status"), photo: q(".cook-step-photo"), next: q('[data-action="cook-next"]'),
    backdropAnimations: q(".modal-backdrop").getAnimations(),
    pulse: q(".cook-timer-status")?.getAnimations({ subtree: true })[0],
  });
${body}
  document.getElementById("out").textContent = JSON.stringify({ result });
})().catch((error) => { document.getElementById("out").textContent = JSON.stringify({ error: String(error.stack) }); });
</script>`,
    );
    const dom = execFileSync(
      chrome,
      [
        "--no-sandbox",
        ...(process.env.DBG ? ["--enable-logging=stderr", "--v=0"] : []),
        ...(mode === "reduced" ? ["--force-prefers-reduced-motion"] : []),
        "--allow-file-access-from-files",
        "--virtual-time-budget=8000",
        `--window-size=${width},900`,
        "--dump-dom",
        `file://${join(dir, "harness.html")}${mode === "off" ? "#off" : ""}`,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", process.env.DBG ? "inherit" : "ignore"],
        timeout: 120000,
      },
    );
    const out = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1].replaceAll("&quot;", '"');
    const report = JSON.parse(out);
    if (report.error) throw new Error(report.error);
    return report.result;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("stepping through the cooking dialog patches it in place in a real engine", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  const report = steppingReport(chrome);
  const byLabel = Object.fromEntries(report.rows.map((row) => [row.label, row]));
  assert.equal(report.rows.length, 10);
  for (const row of report.rows) {
    // The backdrop, the dialog, the hero image and the progress fill are the same nodes.
    for (const key of ["sameBackdrop", "sameModal", "sameHero", "sameFill", "sameStatus"])
      assert.equal(row[key], true, `${row.label}: ${key}`);
    // The last step turns the next button into the finish button, every other step keeps it.
    if (row.heading !== "Five") assert.equal(row.nextKept, true, `${row.label}: next button`);
    // A kept backdrop is never raised again, so it cannot drop out of the top layer.
    assert.equal(row.popoverAttr, report.hasPopover ? "manual" : null, row.label);
    assert.equal(row.freshBackdropAnimations, 0, `${row.label}: replayed backdrop animation`);
    if (report.hasPopover) assert.equal(row.backdropOpen, true, row.label);
    // The running timer pulse is the very same animation, still running.
    assert.equal(row.samePulse, true, `${row.label}: timer pulse`);
    assert.equal(row.pulseRunning, true, `${row.label}: timer pulse running`);
    // The timer keeps running across every step change: same card, same deadline.
    assert.equal(row.runningTimers, 1, `${row.label}: running timer`);
    assert.equal(row.timerDeadline, report.rows[0].timerDeadline, `${row.label}: deadline`);
  }
  if (report.hasPopover) assert.equal(report.popovers, 1);
  // The content itself follows the step.
  assert.equal(byLabel.start.heading, "One");
  assert.equal(byLabel.next.heading, "Two");
  assert.equal(byLabel.next.index, "02 / 05");
  assert.equal(byLabel.next.valuenow, "2");
  assert.equal(byLabel.next.width, "40%");
  assert.equal(byLabel["hass update"].heading, "Two");
  assert.equal(byLabel["to a step without photo"].photo, false);
  assert.equal(byLabel["to another photo"].photoSrc, "./food/b.webp");
  assert.equal(byLabel.back.heading, "Three");
  // A photo shared by two steps stays the same element, so it cannot blank or reload.
  assert.equal(byLabel.start.samePhoto, true);
  assert.equal(byLabel.next.samePhoto, true);
  assert.equal(byLabel["hass update"].samePhoto, true);
  // Only text lines fade, never the photo or the stage, and the same photo does not fade at all.
  for (const row of report.rows) {
    for (const tag of row.fades) assert.match(tag, /^(H2|P)$/, `${row.label}: faded ${tag}`);
  }
  assert.deepEqual(byLabel["next right away"].fades, ["H2"]);
  assert.deepEqual(byLabel["hass update"].fades, []);
  // A different photo replaces the old one only once it is decoded: the old photo shows
  // right away, the new one follows, so the photo area never goes blank.
  assert.equal(byLabel["to step five right away"].photoSrcNow, "./food/b.webp");
  assert.equal(byLabel["to step five"].photoSrcNow, "./food/a.webp");
  assert.equal(byLabel["to step four"].photoSrcNow, "./food/b.webp");
});

for (const mode of ["reduced", "off"]) {
  test(`stepping with ${mode} motion fades nothing but still patches in place`, (t) => {
    const chrome = findChrome();
    if (!chrome) return t.skip("no headless Chromium available");
    const report = steppingReport(chrome, mode);
    assert.equal(report.rows.length, 10);
    for (const row of report.rows) {
      assert.deepEqual(row.fades, [], `${row.label}: fade`);
      assert.equal(row.sameModal, true, `${row.label}: modal replaced`);
    }
    assert.equal(report.rows.find((r) => r.label === "next").heading, "Two");
  });
}

/** Step through the cooking dialog of a real card in a real engine and report what stayed. */
function steppingReport(chrome, mode = "") {
  return runCooking(
    chrome,
    String.raw`
  const first = grab();
  await wait(100);
  const rows = [];
  const seen = new WeakSet();
  const newFades = () => {
    const all = q(".cook-stage").getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSAnimation) && a.effect.getKeyframes().some((k) => k.opacity === "0.35"));
    const fresh = all.filter((a) => !seen.has(a));
    all.forEach((a) => seen.add(a));
    return fresh.map((a) => a.effect.target.tagName);
  };
  const record = (label, node) => {
    const now = grab();
    rows.push({
      label,
      heading: q(".cook-stage h2")?.textContent,
      index: q(".cook-topline span:last-child")?.textContent,
      valuenow: q(".cook-track").getAttribute("aria-valuenow"),
      width: q(".cook-fill").style.width,
      photo: Boolean(now.photo),
      photoSrc: now.photo?.getAttribute("src") || "",
      sameBackdrop: now.backdrop === first.backdrop,
      sameModal: now.modal === first.modal,
      sameHero: now.hero === first.hero,
      sameFill: now.fill === first.fill,
      sameStatus: now.status === first.status,
      runningTimers: card.shadowRoot.querySelectorAll(".cook-timer-card:not(.is-done)").length,
      timerDeadline: card._timers[0]?.deadline,
      samePulse: Boolean(first.pulse) && now.pulse === first.pulse,
      pulseRunning: now.pulse?.playState === "running",
      samePhoto: node ? now.photo === node : null,
      fades: newFades(),
      photoSrcNow: q(".cook-step-photo")?.getAttribute("src") || "",
      backdropOpen: q(".modal-backdrop").matches(":popover-open"),
      popoverAttr: q(".modal-backdrop").getAttribute("popover"),
      nextKept: now.next === first.next,
      freshBackdropAnimations: q(".modal-backdrop").getAnimations().filter((a) => !first.backdropAnimations.includes(a)).length,
    });
  };
  record("start", first.photo);
  card.shadowRoot.querySelector('[data-action="cook-next"]').click();
  record("next right away", first.photo);
  await wait(150);
  record("next", first.photo);
  card._render();
  record("hass update", first.photo);
  card.shadowRoot.querySelector('[data-action="cook-next"]').click();
  await wait(150);
  record("to a step without photo");
  card.shadowRoot.querySelector('[data-action="cook-next"]').click();
  await settled("./food/b.webp");
  record("to another photo");
  card.shadowRoot.querySelector('[data-action="cook-back"]').click();
  await wait(150);
  record("back");
  card.shadowRoot.querySelector('[data-action="cook-next"]').click();
  await settled("./food/b.webp");
  record("to step four");
  card.shadowRoot.querySelector('[data-action="cook-next"]').click();
  record("to step five right away");
  await settled("./food/a.webp");
  record("to step five");
  result = { rows, popovers, hasPopover: Boolean(show) };
`,
    { mode },
  );
}
const WIDTHS = [390, 820, 1440];

test("the photo slot and the controls below keep their place when a step gains a photo", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  for (const width of WIDTHS) {
    const report = runCooking(
      chrome,
      String.raw`
  const top = (sel) => Math.round(q(sel).getBoundingClientRect().top * 10) / 10;
  const measure = () => ({
    next: top('[data-action="cook-next"]'),
    timer: top(".cook-utility"),
    figure: Boolean(q(".cook-step-figure")),
    slotAlt: q(".cook-step-photo")?.getAttribute("alt"),
    slotSrc: (q(".cook-step-photo")?.getAttribute("src") || "").slice(0, 10),
    figureHeight: q(".cook-step-figure")?.getBoundingClientRect().height ?? 0,
    runningTimers: card.shadowRoot.querySelectorAll(".cook-timer-card:not(.is-done)").length,
  });
  // Step 3 has no photo, step 4 has one. Measure right after the click, before any decode.
  card._cookIndex = 2;
  card._render();
  await wait(100);
  const before = measure();
  q('[data-action="cook-next"]').click();
  const sync = measure();
  const samples = [];
  for (let i = 0; i < 12; i++) {
    await wait(40);
    samples.push(measure());
  }
  await wait(300);
  result = { before, sync, samples, after: measure(), photos: card.shadowRoot.querySelectorAll(".cook-step-photo").length, src: q(".cook-step-photo")?.getAttribute("src") };
`,
      { width },
    );
    const label = `at ${width}px`;
    assert.equal(report.before.figure, false, label);
    // Right away the slot is there with its final size, and nothing below it moved.
    assert.equal(report.sync.figure, true, `${label}: slot in place at once`);
    // The empty slot has a source that paints nothing, so no broken image or alt text shows.
    assert.equal(report.sync.slotAlt, "", label);
    assert.equal(report.sync.slotSrc, "data:image", label);
    assert.ok(report.sync.figureHeight > 100, `${label}: slot has its size`);
    for (const sample of [report.sync, ...report.samples, report.after]) {
      assert.equal(sample.next, report.sync.next, `${label}: next button moved`);
      assert.equal(sample.timer, report.sync.timer, `${label}: timer panel moved`);
      assert.equal(sample.figureHeight, report.sync.figureHeight, `${label}: slot resized`);
      assert.equal(sample.runningTimers, 1, `${label}: timer stopped`);
    }
    assert.equal(report.photos, 1, `${label}: one photo once settled`);
    assert.equal(report.src, "./food/b.webp", label);
  }
});

test("the new photo cross-fades over the old one and instantly with reduced motion", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  const body = String.raw`
  card._cookIndex = 0;
  card._render();
  await wait(100);
  const oldImg = q(".cook-step-photo");
  card._cookIndex = 3;
  card._render();
  const now = [...card.shadowRoot.querySelectorAll(".cook-step-photo")].map((i) => i.getAttribute("src"));
  let overlap = 0;
  for (let i = 0; i < 40; i++) {
    await wait(10);
    overlap = Math.max(overlap, card.shadowRoot.querySelectorAll(".cook-step-photo").length);
  }
  await wait(600);
  const figure = q(".cook-step-figure");
  result = { now, overlap, count: card.shadowRoot.querySelectorAll(".cook-step-photo").length,
    src: q(".cook-step-photo").getAttribute("src"), oldGone: !oldImg.isConnected,
    imgStyle: q(".cook-step-photo").getAttribute("style"), figureStyle: figure.getAttribute("style") };
`;
  const fade = runCooking(chrome, body);
  assert.deepEqual(fade.now, ["./food/a.webp"]);
  assert.equal(fade.overlap, 2, "both photos stand on top of each other while fading");
  assert.equal(fade.count, 1);
  assert.equal(fade.src, "./food/b.webp");
  assert.equal(fade.oldGone, true);
  assert.equal(fade.imgStyle, null, "no leftover inline style on the photo");
  assert.equal(fade.figureStyle, null, "no leftover inline style on the figure");
  const calm = runCooking(chrome, body, { mode: "reduced" });
  assert.equal(calm.overlap, 1, "reduced motion swaps without an overlap");
  assert.equal(calm.src, "./food/b.webp");
});

test("a Home Assistant theme switch and a plain state update keep the open cooking dialog calm", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  const report = runCooking(
    chrome,
    String.raw`
  card._didLoad = true;
  const hassOf = (dark) => ({ language: "en", callWS: async () => ({}), themes: { darkMode: dark } });
  card.hass = hassOf(false);
  await wait(50);
  card._cookIndex = 1;
  card._render();
  await wait(300);
  const first = grab();
  const deadline = card._timers[0].deadline;
  const snap = (label) => {
    const now = grab();
    return {
      label,
      theme: q(".atelier").classList.contains("light") ? "light" : q(".atelier").classList.contains("dark") ? "dark" : "?",
      sameBackdrop: now.backdrop === first.backdrop,
      sameModal: now.modal === first.modal,
      samePhoto: now.photo === first.photo,
      sameHero: now.hero === first.hero,
      fresh: now.backdrop.getAnimations().filter((a) => !first.backdropAnimations.includes(a)).length,
      backdropOpacity: +getComputedStyle(now.backdrop).opacity,
      modalOpacity: +getComputedStyle(now.modal).opacity,
      open: now.backdrop.matches(":popover-open"),
      heading: q(".cook-stage h2").textContent,
      running: card.shadowRoot.querySelectorAll(".cook-timer-card:not(.is-done)").length,
      deadline: card._timers[0].deadline === deadline,
      samePulse: now.pulse === first.pulse,
    };
  };
  const rows = [snap("start")];
  card.hass = hassOf(false);
  rows.push(snap("plain update"));
  card.hass = { ...hassOf(false), states: { "sensor.x": { state: "1" } } };
  rows.push(snap("another update"));
  card.hass = hassOf(true);
  rows.push(snap("theme to dark"));
  await wait(300);
  rows.push(snap("theme to dark settled"));
  card.hass = hassOf(false);
  rows.push(snap("theme to light"));
  await wait(300);
  rows.push(snap("theme to light settled"));
  result = { rows, popovers };
`,
  );
  const byLabel = Object.fromEntries(report.rows.map((row) => [row.label, row]));
  for (const row of report.rows) {
    assert.equal(row.sameBackdrop, true, `${row.label}: backdrop replaced`);
    assert.equal(row.sameModal, true, `${row.label}: dialog replaced`);
    assert.equal(row.samePhoto, true, `${row.label}: photo replaced`);
    assert.equal(row.sameHero, true, `${row.label}: hero replaced`);
    assert.equal(row.fresh, 0, `${row.label}: backdrop animation replayed`);
    assert.equal(row.backdropOpacity, 1, `${row.label}: backdrop flashed`);
    assert.equal(row.modalOpacity, 1, `${row.label}: dialog flashed`);
    assert.equal(row.heading, "Two", `${row.label}: step lost`);
    assert.equal(row.running, 1, `${row.label}: timer lost`);
    assert.equal(row.deadline, true, `${row.label}: timer restarted`);
    assert.equal(row.samePulse, true, `${row.label}: timer pulse restarted`);
    if (report.popovers) assert.equal(row.open, true, `${row.label}: left the top layer`);
  }
  if (report.popovers) assert.equal(report.popovers, 1);
  assert.equal(byLabel.start.theme, "light");
  assert.equal(byLabel["plain update"].theme, "light");
  assert.equal(byLabel["theme to dark"].theme, "dark");
  assert.equal(byLabel["theme to light settled"].theme, "light");
});

test("a re-render keeps the dialog header strip on, so no frame paints it transparent", () => {
  const cards = loadCards();
  const card = makeCard(cards);
  card._detail = { slug: "g", name: "G", recipeInstructions: [{ text: "a" }, { text: "b" }] };
  card._modal = "create";
  card._render();
  assert.doesNotMatch(cards.document.markup, /bar-on/);
  const open = card.shadowRoot.querySelector;
  card.shadowRoot.querySelector = (sel) =>
    sel === ".modal"
      ? { classList: { contains: (name) => name === "bar-on" }, querySelector: () => null }
      : open(sel);
  card._render();
  assert.match(cards.document.markup, /class="modal modal-stable bar-on /);
  card.shadowRoot.querySelector = open;
  card._render();
  assert.doesNotMatch(cards.document.markup, /bar-on/);
});

test("the header strip does not fade again when a stable dialog is re-rendered", () => {
  const css = readFileSync(
    new URL("../src/design-system/mobile-forms.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.atelier \.modal\.modal-stable > \.modal-bar-title \{\s*transition: none;/);
});
