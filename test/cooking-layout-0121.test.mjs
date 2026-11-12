import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCards, makeCard } from "./support/card-harness.mjs";
import { findChrome } from "./support/chrome.mjs";

const read = (name) =>
  readFileSync(new URL(`../src/design-system/${name}`, import.meta.url), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
const polish = read("polish.css");
const refinement = read("control-refinement.css");
const kitchen = read("kitchen.css");

/** Rule bodies of every rule whose selector list contains the needle (comments already stripped). */
function rules(css, needle) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css.matchAll(re)) if (m[1].includes(needle)) out.push(m[2]);
  return out;
}

test("the step text is the only part of the cooking column that scrolls, the controls sit outside it", () => {
  const flat = refinement.replace(/\s+/g, " ");
  const stage = flat.match(/\.cook-content > \.cook-stage \{([^}]*)\}/)?.[1];
  assert.ok(stage, "a stage rule inside the bounded layout exists");
  assert.match(stage, /flex:\s*0 1 auto/);
  assert.match(stage, /min-height:\s*min\(/);
  assert.match(stage, /overflow:\s*hidden auto/);
  // The scroll cue: a bottom fade while there is more below, a drawn thin scrollbar.
  assert.match(
    flat,
    /\.cook-stage\.has-more \{[^}]*mask-image:\s*linear-gradient\(to bottom, #000 calc\(100% - 28px\), transparent\)/,
  );
  assert.match(flat, /\.cook-stage::-webkit-scrollbar \{ width: 6px; \}/);
  assert.match(stage, /justify-content:\s*safe center/);
  const controls = flat.match(/\.cook-content > \.cook-controls \{([^}]*)\}/)?.[1];
  assert.ok(controls, "the controls are a real box");
  assert.match(controls, /display:\s*flex/);
  assert.match(controls, /flex:\s*0 0 auto/);
  assert.match(controls, /margin-block-start:\s*auto/);
  // The bar is in the normal flow below the panel, not pinned over the scrolling text.
  const bar = flat.match(/\.modal\.large:has\(\.cook-layout\) \.cook-actions \{([^}]*)\}/)?.[1];
  assert.match(bar, /position:\s*static/);
  // The old stage cap and the dissolved controls box are gone.
  assert.doesNotMatch(refinement, /max-height:\s*max\(320px/);
  assert.doesNotMatch(
    polish,
    /\.cook-controls \{\s*display:\s*contents;\s*\}\s*\.atelier \.modal:has\(\.cook-layout\) \.cook-actions \{\s*margin-block/,
  );
});

test("the dialog is one fixed height box from 641px of height up", () => {
  const flat = refinement.replace(/\s+/g, " ");
  const at = flat.indexOf("@media (min-height: 641px) {");
  assert.ok(at >= 0);
  const block = flat.slice(at, at + 1400);
  assert.match(block, /height: min\(90dvh, 940px\)/);
  assert.match(block, /overflow: hidden/);
  assert.match(block, /> \.cook-layout \{ flex: 1 1 auto; min-height: 0;/);
});

const bundlePath = new URL("../dist/mealie-atelier-cards.js", import.meta.url).pathname;
const LONG_STEP = "Peel the onions and dice them finely, then sweat them in a large pan. ".repeat(
  6,
);

/** Boxes of the cooking dialog parts for one step text and viewport, measured in a real engine. */
function measureCooking(chrome, width, height, text, timers) {
  const dir = mkdtempSync(join(tmpdir(), "atelier-cook-layout-"));
  try {
    writeFileSync(
      join(dir, "harness.html"),
      `<!doctype html><meta charset="utf-8"><body style="margin:0"><pre id="out">pending</pre><script src="file://${bundlePath}"></script><script>
(async () => {
  const card = document.createElement("mealie-atelier-card");
  card.setConfig({ type: "custom:mealie-atelier-card", motion: "off" });
  document.body.append(card);
  card._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true }] };
  card._hass = { language: "en", callWS: async () => ({}) };
  card._detail = { slug: "g", name: "Gnocchi", recipeInstructions: [{ text: ${JSON.stringify(text)} }, { text: "Done" }] };
  card._timers = Array.from({ length: ${timers} }, (_, i) => ({ id: "t" + i, label: "Pot " + i, deadline: Date.now() + 600000, durationMs: 600000, startedAt: Date.now(), done: false }));
  card._modal = "cook";
  card._cookIndex = 0;
  card._render();
  await new Promise((resolve) => setTimeout(resolve, 600));
  const box = (selector) => { const e = card.shadowRoot.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
  document.getElementById("out").textContent = JSON.stringify({
    vh: innerHeight, utility: box(".cook-utility"), actions: box(".cook-actions"), stage: box(".cook-stage"),
  });
})().catch((error) => { document.getElementById("out").textContent = JSON.stringify({ error: String(error.stack) }); });
</script>`,
    );
    const dom = execFileSync(
      chrome,
      [
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--virtual-time-budget=6000",
        `--window-size=${width},${height}`,
        "--dump-dom",
        `file://${join(dir, "harness.html")}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000 },
    );
    const out = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1].replaceAll("&quot;", '"');
    const report = JSON.parse(out);
    if (report.error) throw new Error(report.error);
    return report;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const VIEWPORTS = [
  [390, 844],
  [1440, 700],
  [1440, 720],
  [1440, 900],
  [1180, 820],
  [1024, 768],
  [820, 1180],
];
test("the timer panel and the Back and Next bar are on screen for every step length and size", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  for (const [width, height] of VIEWPORTS) {
    for (const [kind, text] of [
      ["short", "Dice the onions."],
      ["xlong", LONG_STEP],
    ]) {
      for (const timers of [0, 2]) {
        const label = `${width}x${height} ${kind} step, ${timers} timers`;
        const m = measureCooking(chrome, width, height, text, timers);
        assert.ok(m.utility && m.actions, `${label}: panel and bar exist`);
        assert.ok(
          m.actions.bottom <= m.vh + 0.5,
          `${label}: bar bottom ${m.actions.bottom} within ${m.vh}`,
        );
        assert.ok(m.utility.top >= 0, `${label}: panel top on screen`);
        assert.ok(
          m.utility.bottom <= m.actions.top + 1,
          `${label}: panel bottom ${m.utility.bottom} clears the bar top ${m.actions.top}`,
        );
        assert.ok(m.stage.bottom <= m.utility.top + 1, `${label}: text ends above the panel`);
      }
    }
  }
});

function toolsCard(options) {
  const card = makeCard(loadCards(options));
  card._modal = "cook";
  card._cookIndex = 0;
  card._flash = () => {};
  card._detail = {
    slug: "pancakes",
    name: "Pancakes",
    recipeIngredient: [],
    recipeInstructions: [{ text: "Mix" }, { text: "Bake" }],
  };
  card._studio = { family: { members: [], session: null }, journal: {} };
  card._render = () => {};
  return card;
}
const button = (html, action) =>
  html.match(
    new RegExp(`<button class="btn[^"]*" data-action="${action}"[\\s\\S]*?</button>`),
  )?.[0];
/** The text a screen reader announces: everything except aria-hidden spans. */
const accessibleName = (markup) =>
  markup
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
const reserved = (markup) =>
  [
    ...markup.matchAll(/<span class="studio-tool-text" aria-hidden="true" data-reserve>([^<]*)</g),
  ].map((m) => m[1]);

for (const language of ["de", "en"]) {
  test(`read aloud and voice buttons reserve both labels and keep one accessible name (${language})`, () => {
    const card = toolsCard({ hass: { language } });
    card._hass = { language, callWS: async () => ({}) };
    const idleHtml = card._modalHtml();
    const idle = button(idleHtml, "studio-read-step");
    assert.ok(idle);
    const speakingLabel = card.t("studioReadSpeaking");
    assert.ok(speakingLabel);
    // Both texts are in the button, the one that does not apply is hidden from assistive technology.
    assert.deepEqual(reserved(idle), [speakingLabel]);
    assert.equal(accessibleName(idle), card.t("studioReadStepLabel"));

    card._readSpeaking = true;
    const speaking = button(card._modalHtml(), "studio-read-step");
    assert.deepEqual(reserved(speaking), [card.t("studioReadStepLabel")]);
    assert.equal(accessibleName(speaking), speakingLabel);

    const voice = button(idleHtml, "studio-voice-command");
    assert.deepEqual(reserved(voice), [card.t("studioVoiceListening")]);
    assert.equal(accessibleName(voice), card.t("studioVoiceCommandLabel"));
    card._voiceListening = true;
    const listening = button(card._modalHtml(), "studio-voice-command");
    assert.equal(accessibleName(listening), card.t("studioVoiceListening"));
  });
}

test("the stacked labels share one grid cell and the reserved one is invisible", () => {
  const label =
    rules(kitchen, ".studio-tool-label {")[0] ?? rules(kitchen, ".studio-tool-label")[0];
  assert.match(label, /display:\s*inline-grid/);
  const text = rules(kitchen, ".studio-tool-label > .studio-tool-text").find((r) =>
    /grid-area/.test(r),
  );
  assert.match(text, /grid-area:\s*1\s*\/\s*1/);
  const hidden = rules(kitchen, "[data-reserve]")[0];
  assert.match(hidden, /visibility:\s*hidden/);
});

test("the tools row and the timer panel shrink to the dialog and the tools read at 12px", () => {
  const flat = refinement.replace(/\s+/g, " ");
  assert.match(
    flat,
    /:is\( \.cook-content, \.cook-controls, \.cook-utility, \.cook-timer-header, \.cook-timer-compose, \.cook-timer-fields, \.cook-timers, \.cook-timer-card \) \{ min-width: 0; max-width: 100%; \}/,
  );
  assert.match(flat, /\.cook-utility \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(flat, /\.studio-cook-tools \{ flex-wrap: wrap; max-width: 100%; \}/);
  assert.match(flat, /\.studio-cook-tools \.btn \{ font-size: 12px; \}/);
  // The compact panel no longer forces one nowrap row at 10px.
  assert.doesNotMatch(flat, /font-size: 10px; white-space: nowrap/);
  assert.doesNotMatch(flat, /\.studio-cook-tools \{ flex-wrap: nowrap/);
  // The sync chip takes a row of its own on phones.
  assert.match(
    flat,
    /max-width: 460px\) \{ \.atelier \.modal:has\(\.cook-layout\) \.studio-shared-note \{ flex: 0 0 100%; \}/,
  );
});

test("the timer form folds behind its button and the compact block exists once", () => {
  const flat = refinement.replace(/\s+/g, " ");
  assert.equal(flat.split("(max-height: 860px) or (max-width: 900px)").length - 1, 1);
  assert.match(
    flat,
    /\.cook-utility:not\(\[data-composing\]\) \.cook-timer-compose \{ display: none; \}/,
  );
});

test("the timer toggle opens the form, keeps its state over a render and folds after a start", () => {
  const card = toolsCard({ hass: { language: "en" } });
  card._hass = { language: "en", callWS: async () => ({}) };
  const closed = card._modalHtml();
  assert.match(
    closed,
    /<button type="button" class="cook-timer-toggle" data-action="timer-compose-toggle" aria-expanded="false" aria-controls="cook-timer-compose">Set a timer<\/button>/,
  );
  assert.doesNotMatch(closed, /data-composing/);
  assert.match(closed, /<div class="cook-timer-compose" id="cook-timer-compose">/);
  card._timerComposeOpen = true;
  const open = card._modalHtml();
  assert.match(open, /<section class="cook-utility"[^>]* data-composing>/);
  assert.match(open, /aria-expanded="true"/);
  const german = toolsCard({ hass: { language: "de" } });
  german._hass = { language: "de", callWS: async () => ({}) };
  assert.match(german._modalHtml(), />Timer stellen<\/button>/);
});

test("on a phone the tool buttons shrink and the timer list shows one compact card", () => {
  const flat = refinement.replace(/\s+/g, " ");
  assert.match(
    flat,
    /@media \(min-height: 641px\) and \(max-width: 600px\) \{[^@]*\.studio-cook-tools \.btn \{ min-height: 32px;[^@]*\.cook-timers \{ max-height: 62px;/,
  );
});
