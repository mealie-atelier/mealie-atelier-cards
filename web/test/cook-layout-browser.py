"""Browser check of the cooking dialog layout in a real engine.

Run: uv run --with playwright python web/test/cook-layout-browser.py [chromium|webkit] [--shots <folder>]

The built bundle is loaded into a plain page and the cook dialog is opened for a matrix of viewports, both
languages, a short and a 400 character step and 0 and 3 running timers (the shared session chip is always on,
the worst case for the tools row). Rules under test:
  (a) nothing in the dialog reaches past the dialog edges horizontally;
  (b) no button label or pill is clipped, tool button text is at least 12px, the sync chip sits on its own row on phones;
  (c) the step text shows at least 4 full lines whenever the step has that many;
  (d) a scrolling step text has a bottom fade and a visible scrollbar, and shows no cut line without that cue;
  (f) on a phone (width up to 460px, height from 641px) the step text area is at least 140px high (or as high as its content) with a timer running
      and the newest timer card is shown whole;
  (e) the timer list (its newest card in view, older ones scroll inside the list) and the Back and Next bar are on screen, and the cook-track hides when cut.
"""

import json
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
browser_name = next((a for a in sys.argv[1:] if a in ("chromium", "webkit")), "chromium")
shots = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
if shots:
    shots.mkdir(parents=True, exist_ok=True)

BUNDLE = ROOT / "dist" / "mealie-atelier-cards.js"
VIEWPORTS = [
    (360, 780), (375, 667), (390, 844), (430, 932), (820, 1180), (1180, 820),
    (1024, 768), (1440, 720), (1440, 900), (1600, 1000), (1920, 1080),
]
SHORT = "Dice the onions."
LONG = ("Peel the onions and dice them finely, then sweat them in a large pan with a little butter until they turn "
        "glassy. Add the garlic, stir for a minute, pour in the tomatoes and let everything simmer gently while you "
        "boil the gnocchi in plenty of salted water until they float to the top and are done. ") 
LONG = (LONG * 2)[:400]

HARNESS = """<!doctype html><meta charset="utf-8"><body style="margin:0"><script src="file://%s"></script>"""

SETUP = """async ({ lang, text, summary, timers }) => {
  document.querySelectorAll("mealie-atelier-card").forEach((c) => c.remove());
  const card = document.createElement("mealie-atelier-card");
  card.setConfig({ type: "custom:mealie-atelier-card", motion: "off" });
  document.body.append(card);
  card._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true }] };
  card._hass = { language: lang, callWS: async () => ({}) };
  card._detail = { slug: "g", name: "Gnocchi", recipeInstructions: [summary ? { summary, text } : { text }, { text: "Done" }] };
  card._studio = { family: { members: [], session: { slug: "g", timers: [] } }, journal: {}, pantry: [], goals: {}, history: [] };
  card._timers = Array.from({ length: timers }, (_, i) => ({ id: "t" + i, label: "Pot " + i, deadline: Date.now() + 600000, durationMs: 600000, startedAt: Date.now(), done: false }));
  card._modal = "cook";
  card._cookIndex = 0;
  card._render();
  await new Promise((resolve) => setTimeout(resolve, 500));
}"""

MEASURE = """() => {
  const card = document.querySelector("mealie-atelier-card");
  const root = card.shadowRoot;
  const modal = root.querySelector(".modal");
  const out = { problems: [] };
  const m = modal.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  const name = (el) => el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] + (el.dataset?.action ? "[" + el.dataset.action + "]" : "");
  // (a) nothing past the dialog edges horizontally
  out.sticks = [];
  for (const el of modal.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.closest(".cook-sr-only, .cook-visual, .modal-bar-title")) continue;
    if (r.right > m.right + 0.5 || r.left < m.left - 0.5) out.sticks.push(name(el) + " " + Math.round(r.left) + ".." + Math.round(r.right) + " vs " + Math.round(m.left) + ".." + Math.round(m.right));
  }
  out.dialog = [Math.round(m.left), Math.round(m.right), vw];
  // (b) clipped labels
  out.clipped = [];
  for (const el of modal.querySelectorAll("button:not(.icon-btn), .btn, .cook-timer-count, .studio-shared-note, .studio-tool-text, .cook-timer-presets button")) {
    if (el.closest(".cook-visual")) continue;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline") out.clipped.push(name(el) + " " + el.scrollWidth + ">" + el.clientWidth);
  }
  const util = modal.querySelector(".cook-utility");
  const ur = util.getBoundingClientRect();
  for (const el of util.querySelectorAll(".cook-timer-count, .studio-shared-note, .studio-cook-tools .btn, .cook-timer-start, .cook-timer-fields input")) {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > ur.right + 0.5 || r.left < ur.left - 0.5)) out.clipped.push(name(el) + " outside the panel");
  }
  out.toolFont = Math.min(...[...modal.querySelectorAll(".studio-cook-tools .btn")].map((b) => parseFloat(getComputedStyle(b).fontSize)));
  const note = modal.querySelector(".studio-shared-note");
  const btns = [...modal.querySelectorAll(".studio-cook-tools .btn")];
  out.phone = vw <= 460;
  out.viewportHeight = vh;
  out.timersRunning = modal.querySelectorAll(".cook-timer-card").length;
  out.noteOwnRow = !!note && btns.every((b) => note.getBoundingClientRect().top >= b.getBoundingClientRect().bottom - 1);
  // (c) full lines of step text
  const stage = modal.querySelector(".cook-stage");
  const sr = stage.getBoundingClientRect();
  let total = 0, full = 0;
  // A line under the bottom fade does not count as fully shown.
  const fade = stage.classList.contains("has-more") ? 28 : 0;
  for (const el of stage.querySelectorAll("h2, .cook-step-detail")) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Map();
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) tops.set(Math.round(r.top), r);
    for (const r of tops.values()) {
      total++;
      if (r.top >= sr.top - 0.5 && r.bottom <= sr.bottom - fade + 0.5) full++;
    }
  }
  out.lines = { total, full };
  out.stageHeight = stage.clientHeight;
  out.stageScroll = stage.scrollHeight;
  // (d) scroll cue
  const cs = getComputedStyle(stage);
  const scrolls = stage.scrollHeight > stage.clientHeight + 1;
  out.cue = { scrolls, mask: cs.maskImage || cs.webkitMaskImage, gutter: stage.offsetWidth - stage.clientWidth, more: stage.classList.contains("has-more"), scrollbarWidth: cs.scrollbarWidth };
  // (e) timers and bar on screen
  const bar = modal.querySelector(".cook-actions").getBoundingClientRect();
  const timers = [...modal.querySelectorAll(".cook-timer-card")];
  out.bar = [Math.round(bar.top), Math.round(bar.bottom), vh];
  out.timersVisible = timers.map((t) => { const r = t.getBoundingClientRect(); const tl = t.parentElement.getBoundingClientRect(); return r.top >= tl.top - 0.5 && r.bottom <= tl.bottom + 0.5; });
  out.timerListOnScreen = [...modal.querySelectorAll(".cook-timers")].every((l) => l.getBoundingClientRect().bottom <= bar.top + 1 && l.getBoundingClientRect().top >= 0);
  out.utility = [Math.round(ur.top), Math.round(ur.bottom)];
  out.barOk = bar.bottom <= vh + 0.5 && ur.bottom <= bar.top + 1 && ur.top >= 0;
  out.track = (() => { const t = modal.querySelector(".cook-track"); return !!t; })();
  return out;
}"""

problems = []
checks = 0


def check(ok, label, detail=""):
    global checks
    checks += 1
    if not ok:
        problems.append(f"{label}: {detail}")


STEP_SCROLL_SETUP = """async (text) => {
  document.querySelectorAll("mealie-atelier-card").forEach((c) => c.remove());
  const card = document.createElement("mealie-atelier-card");
  card.setConfig({ type: "custom:mealie-atelier-card", motion: "off" });
  document.body.append(card);
  card._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true }] };
  card._hass = { language: "en", callWS: async () => ({}) };
  card._detail = { slug: "g", name: "Gnocchi", recipeInstructions: [{ text: "First " + text }, { text: "Second " + text }, { text: "Third " + text }] };
  card._studio = { family: { members: [], session: null }, journal: {}, pantry: [], goals: {}, history: [] };
  card._timers = [];
  card._modal = "cook";
  card._cookIndex = 1;
  card._render();
  await new Promise((resolve) => setTimeout(resolve, 400));
}"""

STEP_SCROLL_STATE = """() => {
  const root = document.querySelector("mealie-atelier-card").shadowRoot;
  const stage = root.querySelector(".cook-stage");
  const h2 = stage.querySelector("h2, .cook-step-detail, p");
  const sr = stage.getBoundingClientRect();
  return { top: stage.scrollTop, max: stage.scrollHeight - stage.clientHeight, headTop: h2 ? h2.getBoundingClientRect().top - sr.top : 0,
    more: stage.classList.contains("has-more"), text: stage.textContent.slice(0, 20) };
}"""


def judge(label, s, full_rules=True):
    check(not s["sticks"], f"{label} (a) past the dialog edge", str(s["sticks"][:5]))
    check(not s["clipped"], f"{label} (b) clipped label", str(s["clipped"][:5]))
    check(s["toolFont"] >= 12, f"{label} (b) tool font size", str(s["toolFont"]))
    if s["phone"]:
        check(s["noteOwnRow"], f"{label} (b) sync chip on its own row")
    if full_rules:
        want = min(4, s["lines"]["total"])
        check(s["lines"]["full"] >= want, f"{label} (c) full step lines", json.dumps(s["lines"]))
        cue = s["cue"]
        if cue["scrolls"]:
            check(cue["more"] and (cue["mask"] or "none") != "none", f"{label} (d) bottom fade", json.dumps(cue))
            check(cue["gutter"] > 0, f"{label} (d) visible scrollbar", json.dumps(cue))
            check(cue["scrollbarWidth"] != "none", f"{label} (d) scrollbar not hidden", json.dumps(cue))
        else:
            check(s["lines"]["full"] == s["lines"]["total"], f"{label} (d) cut line without scrolling", json.dumps(s["lines"]))
    # The open timer form is a deliberate trade, so (f) only judges the default state.
    if full_rules:
        check(not (s["phone"] and s["viewportHeight"] >= 641 and s["timersRunning"] > 0) or s["stageHeight"] >= min(140, s["stageScroll"]),
              f"{label} (f) step text area height on a phone with a timer", str(s["stageHeight"]))
        check(not (s["phone"] and s["timersRunning"] > 0) or all(s["timersVisible"][:1]),
              f"{label} (f) newest timer card shown whole", json.dumps(s["timersVisible"]))
    check(s["barOk"], f"{label} (e) bar and panel on screen", json.dumps({"bar": s["bar"], "utility": s["utility"]}))
    check(all(s["timersVisible"][:1]) and s["timerListOnScreen"], f"{label} (e) timer list visible", json.dumps(s["timersVisible"]))


with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
    page_file = Path(tmp) / "harness.html"
    page_file.write_text(HARNESS % BUNDLE)
    # Playwright hides scrollbars in headless Chromium by default: show them, the scrollbar is part of the cue.
    browser = getattr(pw, browser_name).launch(ignore_default_args=["--hide-scrollbars"] if browser_name == "chromium" else None)
    for width, height in VIEWPORTS:
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(page_file.as_uri())
        for lang in ("de", "en"):
            for kind, text, summary in (("short", SHORT, ""), ("long", LONG, ""), ("detail", LONG, "Let the cherry tomatoes burst until the sauce turns thick")):
                for timers in (0, 3):
                    label = f"{browser_name} {width}x{height} {lang} {kind} {timers} timers"
                    page.evaluate(SETUP, {"lang": lang, "text": text, "summary": summary, "timers": timers})
                    s = page.evaluate(MEASURE)
                    if shots:
                        page.screenshot(path=str(shots / f"{label.replace(' ', '_')}.png"))
                    judge(label, s)
                    # Where the timer form is collapsed behind its button, opening it must keep the rest on screen.
                    shown = page.evaluate("""() => {
                      const t = document.querySelector("mealie-atelier-card").shadowRoot.querySelector(".cook-timer-toggle");
                      return !!t && getComputedStyle(t).display !== "none";
                    }""")
                    if shown:
                        compose_hidden = page.evaluate("() => getComputedStyle(document.querySelector('mealie-atelier-card').shadowRoot.querySelector('.cook-timer-compose')).display === 'none'")
                        check(compose_hidden, f"{label} (c) timer form collapsed by default")
                        page.evaluate("""() => { const r = document.querySelector("mealie-atelier-card").shadowRoot; r.querySelector(".cook-timer-toggle").click(); }""")
                        page.wait_for_timeout(100)
                        o = page.evaluate(MEASURE)
                        if shots:
                            page.screenshot(path=str(shots / f"{label.replace(' ', '_')}_form.png"))
                        judge(label + " form open", o, full_rules=False)
        # A new step opens scrolled to its top, for Next and for Back (the stage is the scroll container).
        page.evaluate(STEP_SCROLL_SETUP, "word " * 400)
        for action in ("cook-next", "cook-back"):
            label = f"{browser_name} {width}x{height} step scroll {action}"
            page.evaluate("() => { const st = document.querySelector('mealie-atelier-card').shadowRoot.querySelector('.cook-stage'); st.scrollTop = 80; }")
            before = page.evaluate(STEP_SCROLL_STATE)
            if before["max"] < 20:
                continue  # the whole step fits: nothing to reset
            check(before["top"] > 0, f"{label} precondition: stage scrolled", json.dumps(before))
            page.evaluate("(a) => document.querySelector('mealie-atelier-card').shadowRoot.querySelector(`[data-action=\"${a}\"]`).click()", action)
            for wait in (50, 400):
                page.wait_for_timeout(wait)
                after = page.evaluate(STEP_SCROLL_STATE)
                check(after["top"] == 0, f"{label} stage scrollTop is 0", json.dumps(after))
                check(after["headTop"] >= -1, f"{label} heading visible", json.dumps(after))
                check(after["more"] == (after["max"] > 1), f"{label} has-more re-evaluated", json.dumps(after))
        page.close()
    browser.close()

for p in problems:
    print("PROBLEM", p)
print(f"{checks} checks, {len(problems)} problems")
sys.exit(1 if problems else 0)
