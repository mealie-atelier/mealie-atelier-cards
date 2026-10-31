"""Browser check of the dialog header strip (the bar behind the close button that names the dialog).

Run: uv run --with playwright python web/test/dialog-strip-browser.py [chromium|webkit] [--shots <folder>]

Rule under test: whenever the strip title is visible, an opaque strip is visible with it, on top of the
dialog content and pinned to the dialog top; and the strip never shows without its title. The rule is
sampled on every animation frame while scrolling and while re-rendering, so a fade that runs on one
of the two elements only is caught. A different dialog always opens at scroll 0 with the strip off.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
browser_name = next((a for a in sys.argv[1:] if a in ("chromium", "webkit")), "chromium")
shots = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
if shots:
    shots.mkdir(parents=True, exist_ok=True)


def launch(cmd, env=None):
    p = subprocess.Popen(cmd, cwd=ROOT / "web", env=env or os.environ.copy(), stdout=subprocess.PIPE, text=True, bufsize=1)
    for _ in range(20):
        line = p.stdout.readline().strip()
        match = re.search(r"(?:127\.0\.0\.1:)?(\d{4,5})\b", line)
        if match:
            return p, int(match.group(1))
    raise RuntimeError("server did not start")


CARD = 'const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".atelier"));'
# State of the strip right now; also installed as a per-frame sampler.
STATE = """(() => {
  const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".atelier"));
  const root = card.shadowRoot;
  const modal = root.querySelector(".modal");
  if (!modal) return null;
  const title = modal.querySelector(":scope > .modal-bar-title");
  const close = modal.querySelector(":scope > .modal-close");
  if (!title || !close) return { modal: true, noStrip: true, scrollTop: Math.round(modal.scrollTop), barOn: modal.classList.contains("bar-on") };
  const mr = modal.getBoundingClientRect();
  const tr = title.getBoundingClientRect();
  const cs = getComputedStyle(close);
  const before = getComputedStyle(close, "::before");
  const stripShown = before.display !== "none" && +before.opacity > 0.05;
  const stripOpaque = before.display !== "none" && +before.opacity >= 0.99 && before.backgroundColor !== "rgba(0, 0, 0, 0)" && parseFloat(before.height) > 20;
  const titleShown = getComputedStyle(title).display !== "none" && +getComputedStyle(title).opacity > 0.05;
  const titleOpaque = +getComputedStyle(title).opacity >= 0.99 && getComputedStyle(title).visibility === "visible";
  // The title sits above the dialog content and the strip stays pinned to the dialog top.
  let seen = null;
  const above = (el, x, y) => {
    const stack = root.elementsFromPoint(x, y);
    if (el === title) seen = stack.slice(0, 3).map((n) => n.tagName + "." + n.className);
    const own = stack.indexOf(el);
    const other = stack.findIndex((n) => n !== modal && modal.contains(n) && !close.contains(n) && !title.contains(n));
    return own >= 0 && (other < 0 || own < other);
  };
  const cr = close.getBoundingClientRect();
  const closeOnTop = above(close, cr.left + cr.width / 2, cr.top + cr.height / 2);
  // Hit testing skips the strip title (pointer-events: none), so give it pointer events for its own probe only.
  const keep = title.style.pointerEvents;
  title.style.pointerEvents = "auto";
  const onTop = closeOnTop && above(title, tr.left + 40, tr.top + tr.height / 2);
  title.style.pointerEvents = keep;
  const sticky = getComputedStyle(title).position === "sticky" && cs.position === "sticky";
  const h2 = modal.querySelector("h2");
  return { modal: true, scrollable: /^(auto|scroll)$/.test(getComputedStyle(modal).overflowY), scrollTop: Math.round(modal.scrollTop), barOn: modal.classList.contains("bar-on"), stripShown, stripOpaque, titleShown, titleOpaque,
    stripTop: Math.round(tr.top - mr.top), onTop, sticky,
    closeShown: cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.5 && close.getBoundingClientRect().width > 8,
    h: h2 ? h2.textContent.trim().slice(0, 30) : null, topmost: seen, headingBottom: h2 ? Math.round(h2.getBoundingClientRect().bottom - mr.top) : null, barEdge: 20 + title.offsetHeight, mh: Math.round(mr.height) };
})()"""
SAMPLER = "() => { window.__frames = []; window.__go = true; const tick = () => { if (!window.__go) return; window.__frames.push(" + STATE + "); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }"

problems = []
checked = [0]


def judge(label, s, expect_top=False):
    checked[0] += 1
    base = re.sub(r" frame \d+$", "", label)
    if any(p.startswith(base) for p in problems) and " frame " in label:
        return
    if not s:
        problems.append(f"{label}: no dialog")
        return
    if s.get("noStrip"):
        return
    if not s["scrollable"]:
        # The wide landscape layout scrolls its content column, not the dialog: the strip has nothing to show.
        if s["titleShown"] or s["stripShown"]:
            problems.append(f"{label}: strip or title shown in a dialog that does not scroll ({json.dumps(s)})")
        if not s["closeShown"]:
            problems.append(f"{label}: close button not shown ({json.dumps(s)})")
        return
    if s["titleShown"] and not (s["stripOpaque"] and s["titleOpaque"]):
        problems.append(f"{label}: title visible without an opaque strip ({json.dumps(s)})")
    if s["stripShown"] and not s["titleShown"]:
        problems.append(f"{label}: strip visible without its title ({json.dumps(s)})")
    if s["titleShown"] and not s["onTop"]:
        problems.append(f"{label}: title under the dialog content ({json.dumps(s)})")
    if s["titleShown"] and (not s["sticky"] or s["stripTop"] > 40):
        problems.append(f"{label}: strip does not stay at the dialog top ({json.dumps(s)})")
    if not s["closeShown"]:
        problems.append(f"{label}: close button not shown ({json.dumps(s)})")
    if s["headingBottom"] is not None and s["scrollTop"] > 0 and s["headingBottom"] <= s["barEdge"] and not s["titleShown"]:
        problems.append(f"{label}: heading under the strip but strip off ({json.dumps(s)})")
    if s["headingBottom"] is not None and s["headingBottom"] > s["barEdge"] + 4 and (s["titleShown"] or s["stripShown"]):
        problems.append(f"{label}: strip over the visible heading ({json.dumps(s)})")
    if expect_top and (s["scrollTop"] > 0 or s["barOn"]):
        problems.append(f"{label}: new dialog not at scroll 0 with strip off ({json.dumps(s)})")


mock, mport = launch(["node", "test/mock-services.mjs"])
env = {**os.environ, "MEALIE_URL": f"http://127.0.0.1:{mport}", "MEALIE_API_TOKEN": "LOCAL_TEST_TOKEN",
       "ATELIER_USERNAME": "atelier", "ATELIER_PASSWORD": "test-pass-strip-1", "PORT": "0", "HOST": "127.0.0.1",
       "ATELIER_DATA_DIR": tempfile.mkdtemp(prefix="strip-browser-")}
web = None
try:
    web, wport = launch(["node", "server.mjs"], env)
    with sync_playwright() as play:
        browser = getattr(play, browser_name).launch()
        for width, height in [(int(w), 520) for w in os.environ.get('WIDTHS', '390,1440').split(',')]:
            phone = width < 600
            ctx = browser.new_context(http_credentials={"username": "atelier", "password": "test-pass-strip-1"}, locale="de-DE",
                                      viewport={"width": width, "height": height}, is_mobile=phone, has_touch=phone,
                                      service_workers="block")
            page = ctx.new_page()
            tag = f"{browser_name}-{width}"

            def settle(ms=500):
                page.wait_for_timeout(ms)
                page.evaluate("() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")

            def state():
                return page.evaluate("() => " + STATE)

            def scroll(y):
                if not state()["scrollable"]:
                    return
                page.evaluate("(y) => {" + CARD + " card.shadowRoot.querySelector('.modal').scrollTop = y; }", y)
                settle(300)

            def shoot(name):
                if shots:
                    page.screenshot(path=str(shots / f"{tag}-{name}.png"))

            def frames(label, expect_top=False):
                for i, f in enumerate(page.evaluate("() => { window.__go = false; return window.__frames; }")):
                    if f:
                        judge(f"{label} frame {i}", f, expect_top=False)

            def close():
                for _ in range(3):
                    if page.locator(".modal > .modal-close").count():
                        page.locator(".modal > .modal-close").first.click()
                        settle(400)

            page.goto(f"http://127.0.0.1:{wport}/", wait_until="domcontentloaded")
            page.locator(".recipe-tile").first.wait_for(timeout=20000)
            settle(600)

            page.locator(".recipe-tile").first.click()
            settle(700)
            judge(f"{tag} recipe top", state(), expect_top=True)
            shoot("recipe-top")
            room = page.evaluate("() => {" + CARD + " const m = card.shadowRoot.querySelector('.modal'); return m.scrollHeight - m.clientHeight; }")
            if not state()["scrollable"]:
                room = 0
            elif room < 40:
                problems.append(f"{tag}: recipe dialog does not scroll in a {height}px window, test cannot reach the scrolled state")
            # Scroll through the whole range with the per-frame sampler running.
            page.evaluate(SAMPLER)
            for y in (range(0, int(room) + 1, max(1, int(room) // 12)) if room else ()):
                scroll(y)
            frames(f"{tag} recipe scrolling")
            scroll(min(200, room))
            judge(f"{tag} recipe scrolled", state())
            shoot("recipe-scrolled")
            # A re-render of the same dialog keeps the scroll position and keeps strip and title in step, frame by frame.
            before = state()["scrollTop"]
            page.evaluate(SAMPLER)
            page.evaluate("() => {" + CARD + " card._render(); card._render(); }")
            settle(500)
            frames(f"{tag} recipe re-render")
            after = state()
            judge(f"{tag} recipe after re-render", after)
            if abs(after["scrollTop"] - before) > 2:
                problems.append(f"{tag}: re-render of the same dialog lost its scroll ({before} to {after['scrollTop']})")
            # Different dialogs opened by clicking from the scrolled recipe start at the top with the strip off.
            for action in ("plan-form", "edit-form", "journal-open", "recipe-to-list-form"):
                btn = page.locator(f'.modal [data-action="{action}"]')
                if not btn.count():
                    continue
                scroll(min(200, room))
                page.evaluate(SAMPLER)
                btn.first.click()
                settle(30)
                judge(f"{tag} {action} 30ms", state(), expect_top=True)
                settle(700)
                frames(f"{tag} {action} frames")
                judge(f"{tag} {action} settled", state(), expect_top=True)
                shoot(f"{action}-top")
                r = page.evaluate("() => {" + CARD + " const m = card.shadowRoot.querySelector('.modal'); return m.scrollHeight - m.clientHeight; }")
                if r > 40:
                    scroll(min(200, r))
                    judge(f"{tag} {action} scrolled", state())
                    shoot(f"{action}-scrolled")
                close()
                page.locator(".recipe-tile").first.click()
                settle(700)
            ctx.close()
        browser.close()
finally:
    if web:
        web.terminate()
    mock.terminate()

print(f"{browser_name}: {checked[0]} checks, {len(problems)} problems")
for p in problems[:40]:
    print("FAIL", p)
sys.exit(1 if problems else 0)
