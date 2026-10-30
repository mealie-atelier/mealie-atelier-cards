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

/** Step through the cooking dialog of a real card in a real engine and report what stayed. */
function steppingReport(chrome, mode = "") {
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
    for (let i = 0; i < 80 && (q(".cook-step-photo")?.getAttribute("src") || "") !== src; i++) await wait(50);
    await wait(100);
  };
  const grab = () => ({
    backdrop: q(".modal-backdrop"), modal: q(".modal"), hero: q(".cook-visual img"), fill: q(".cook-fill"),
    status: q(".cook-timer-status"), photo: q(".cook-step-photo"), next: q('[data-action="cook-next"]'),
    backdropAnimations: q(".modal-backdrop").getAnimations(),
    pulse: q(".cook-timer-status")?.getAnimations({ subtree: true })[0],
  });
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
  document.getElementById("out").textContent = JSON.stringify({ rows, popovers, hasPopover: Boolean(show) });
})();
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
        "--window-size=900,900",
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
    return JSON.parse(out);
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
