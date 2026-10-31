import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCards, makeCard } from "./support/card-harness.mjs";

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
