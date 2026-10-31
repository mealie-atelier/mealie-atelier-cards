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
  // Heading and eyebrow text must never run under the close tile (text boxes, not the full-width block boxes).
  const collisions = [];
  const stripBottom = modal.getBoundingClientRect().top + 20 + (title ? title.offsetHeight : 48);
  const stripOn = modal.classList.contains("bar-on");
  if (close) {
    const t = close.getBoundingClientRect();
    for (const el of modal.querySelectorAll("h1, h2, h3, h4, .eyebrow, .modal-eyebrow")) {
      if (title && title.contains(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        if (stripOn && r.bottom <= stripBottom) continue;
        if (r.left < t.right - 0.5 && r.right > t.left + 0.5 && r.top < t.bottom - 0.5 && r.bottom > t.top + 0.5) {
          collisions.push(el.tagName.toLowerCase() + "." + el.className + ":" + el.textContent.trim().slice(0, 24));
          break;
        }
      }
    }
  }
  // A thin coloured element (a progress bar) cut by the dialog's top edge shows as a stray tab: while the strip is off,
  // nothing like that may be visible there.
  const clipped = [];
  {
    const top = modal.getBoundingClientRect().top;
    for (const el of modal.querySelectorAll("*")) {
      if (close && close.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 1 || r.height > 12 || r.width < 8) continue;
      if (r.top < top + 0.5 && r.bottom > top + 0.5 && getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)" && getComputedStyle(el).visibility === "visible") {
        clipped.push(el.tagName.toLowerCase() + "." + el.className);
      }
    }
  }
  // Content that spilled out of a scroller above its top edge cannot be scrolled to (a centred flex column that is taller
  // than its box does this): headings, eyebrows, buttons and the cook dialog's own rows must stay inside every scroller
  // above them, or be reachable by scrolling it.
  const lost = [];
  for (const el of modal.querySelectorAll("h1, h2, h3, h4, .eyebrow, .cook-topline, .cook-track, .cook-wake, .cook-stage, .cook-actions, .cook-utility")) {
    if (title && title.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    for (let a = el.parentElement; a && a !== modal.parentNode; a = a.parentElement) {
      if (!/^(auto|scroll|hidden)$/.test(getComputedStyle(a).overflowY) && a !== modal) continue;
      const ar = a.getBoundingClientRect();
      const max = a.scrollHeight - a.clientHeight;
      // Only the nearest scroller clips the element; the ones above it see the clipped box.
      if (r.top < ar.top - 1 && a.scrollTop <= 0) lost.push("above:" + el.tagName.toLowerCase() + "." + el.className + " in ." + a.className);
      if (r.bottom > ar.bottom + 1 && a.scrollTop >= max - 1 && max >= 0 && !/^(fixed|sticky)$/.test(getComputedStyle(el).position)) lost.push("below:" + el.tagName.toLowerCase() + "." + el.className + " in ." + a.className);
      break;
    }
  }
  const column = modal.querySelector(".cook-content");
  const columnScroll = column ? { top: Math.round(column.scrollTop), room: column.scrollHeight - column.clientHeight } : null;
  if (!title || !close) return { modal: true, noStrip: true, collisions, clipped, lost, columnScroll, scrollTop: Math.round(modal.scrollTop), barOn: modal.classList.contains("bar-on") };
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
  // The strip takes over when the first content under it has scrolled away: the heading, or the cook progress bar.
  const h2 = modal.querySelector("[data-bar-anchor]") || modal.querySelector("h2");
  return { modal: true, collisions, clipped, lost, columnScroll, scrollable: /^(auto|scroll)$/.test(getComputedStyle(modal).overflowY), scrollTop: Math.round(modal.scrollTop), barOn: modal.classList.contains("bar-on"), stripShown, stripOpaque, titleShown, titleOpaque,
    stripTop: Math.round(tr.top - mr.top), onTop, sticky,
    closeShown: cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.5 && close.getBoundingClientRect().width > 8,
    h: h2 ? h2.textContent.trim().slice(0, 30) : null, hasHeading: !!modal.querySelector("h2"), topmost: seen, headingBottom: h2 ? Math.round(h2.getBoundingClientRect().bottom - mr.top) : null, barEdge: 20 + title.offsetHeight, mh: Math.round(mr.height) };
})()"""
SAMPLER = "() => { window.__frames = []; window.__go = true; const tick = () => { if (!window.__go) return; window.__frames.push(" + STATE + "); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }"

# The same measurement with every heading and eyebrow of the open dialog set to a long German compound word plus a
# long phrase (the worst case a translation or a recipe name can produce), then restored. With lift, the dialog is first
# scrolled until its first heading sits at the top (the state of the screenshot where the title ran under the tile),
# and only text that reaches below the header strip counts, because text wholly under the strip is hidden by design.
STRESS = """((lift) => {
  const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".atelier"));
  const modal = card.shadowRoot.querySelector(".modal");
  const close = modal && modal.querySelector(":scope > .modal-close");
  if (!close) return null;
  const long = "Donaudampfschifffahrtsgesellschaftskapitänsmützenhalter und Buttermilchpfannkuchen mit Beerenkompott";
  // Headings with child elements (links, spans) get the long text in their first text node, so none is skipped.
  const els = [...modal.querySelectorAll("h1, h2, h3, h4, .eyebrow")].filter((el) => !el.closest(".modal-bar-title"));
  const own = (el) => [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()) || null;
  const targets = els.filter((el) => own(el) || !el.children.length);
  const saved = targets.map((el) => (own(el) ? own(el).textContent : el.textContent));
  const scrollBefore = modal.scrollTop;
  // The first thing the strip takes over from: the heading, or the cook dialog's progress bar.
  const first = modal.querySelector("[data-bar-anchor]") || modal.querySelector("h2");
  if (lift && first) modal.scrollTop += first.getBoundingClientRect().top - modal.getBoundingClientRect().top - 8;
  targets.forEach((el) => { if (own(el)) own(el).textContent = long; else el.textContent = long; });
  const t = close.getBoundingClientRect();
  const stripEdge = modal.getBoundingClientRect().top + 20 + (modal.querySelector(":scope > .modal-bar-title")?.offsetHeight || 48);
  const out = [];
  // With the cook progress bar lifted to the top the strip is on, and an opaque strip hides everything under the tile.
  const stripCovers = lift && first && first !== modal.querySelector("h2");
  targets.forEach((el) => {
    if (stripCovers) return;
    if (lift && el.getBoundingClientRect().bottom <= stripEdge) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      if (r.left < t.right - 0.5 && r.right > t.left + 0.5 && r.top < t.bottom - 0.5 && r.bottom > t.top + 0.5) {
        out.push(el.tagName.toLowerCase() + "." + el.className);
        break;
      }
    }
  });
  targets.forEach((el, i) => { if (own(el)) own(el).textContent = saved[i]; else el.textContent = saved[i]; });
  modal.scrollTop = scrollBefore;
  return { checked: targets.length, skipped: els.length - targets.length, out };
})"""

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
    if s.get("lost"):
        problems.append(f"{label}: content sticks out of a scroller where it cannot be scrolled to ({s['lost'][:4]})")
    if s["collisions"]:
        problems.append(f"{label}: heading or eyebrow runs under the close button ({s['collisions']})")
    if s["clipped"] and not s.get("barOn"):
        problems.append(f"{label}: a thin element is cut by the dialog top edge and shows as a stray tab ({s['clipped']})")
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


def sync_rule_editor(page, tag, settle, scroll, state, shoot, close, stress):
    """Creates a rule through the Bring! wizard (the first window of a server does it, later ones find it), then opens
    the real rule editor ("Bearbeiten") and checks it at the top and scrolled."""
    close()
    page.locator('[data-action="nav"]', has_text="Einkauf").first.click()
    page.locator(".shopping-toolbar").wait_for()
    settle(900)
    if not page.locator('[data-action="sync-open"]').count():
        page.locator("button.bw-entry").first.click()
        settle(700)
        page.fill('[data-input="sync-bring-email"]', "cook@example.test")
        page.fill('[data-input="sync-bring-password"]', "fixture-bring-password")
        page.locator('.bw-form button[type="submit"]').first.click()
        page.locator('[data-input="sync-bw-bring"]').first.wait_for(timeout=15000)
        settle(300)
        page.locator(".bw-choice").first.click()
        for _ in range(3):
            page.locator('[data-action="sync-bw-next"]:not([disabled])').first.click(timeout=15000)
            settle(900)
        page.locator('[data-action="sync-bw-save"], [data-action="sync-bw-send"]').first.click()
        settle(1500)
        # The centred "done" screen keeps its title on the centre line of its panel (the close button reserve of the
        # dialog headings must not push it sideways).
        off = page.evaluate("""() => {
          const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".atelier"));
          const done = card.shadowRoot.querySelector(".bw-done .bw-title");
          if (!done) return null;
          const range = document.createRange();
          range.selectNodeContents(done);
          const r = range.getBoundingClientRect();
          const p = done.closest(".bw-done").getBoundingClientRect();
          return Math.round((r.left + r.right) / 2 - (p.left + p.right) / 2);
        }""")
        checked[0] += 1
        if off is None:
            problems.append(f"{tag}: the Bring! wizard did not reach its done screen")
        elif abs(off) > 3:
            problems.append(f"{tag}: the done screen title is {off}px off the centre")
        shoot("bring-done")
        close()
    page.locator('[data-action="sync-open"]').first.click()
    settle(700)
    edit = page.locator('.modal [data-action="sync-setup-open"][data-value]:not([data-value=""])')
    if not edit.count():
        problems.append(f"{tag}: no sync rule to edit after the wizard")
        close()
        return
    edit.first.click()
    settle(1200)
    st = state()
    if not st or "sync-setup" not in (page.evaluate("() => {" + CARD + " return card._modal; }") or ""):
        problems.append(f"{tag}: Bearbeiten did not open the sync rule editor")
        close()
        return
    judge(f"{tag} sync rule editor top", st, expect_top=True)
    stress(f"{tag} sync rule editor top")
    shoot("sync-rule-editor-top")
    room = page.evaluate("() => {" + CARD + " const m = card.shadowRoot.querySelector('.modal'); return m.scrollHeight - m.clientHeight; }")
    if not st["scrollable"] or room < 150:
        problems.append(f"{tag}: sync rule editor does not scroll here (room {room})")
    else:
        for y in (200, min(900, room)):
            scroll(y)
            judge(f"{tag} sync rule editor scrolled {y}", state())
            shoot(f"sync-rule-editor-scrolled-{y}")
    close()


mock, mport = launch(["node", "test/mock-services.mjs"], {**os.environ, "MOCK_RICH_RECIPE": "1"})
bring, bport = launch(["node", "test/support/fake-bring-server.mjs", "0"])
env = {**os.environ, "MEALIE_URL": f"http://127.0.0.1:{mport}", "MEALIE_API_TOKEN": "LOCAL_TEST_TOKEN",
       "ATELIER_USERNAME": "atelier", "ATELIER_PASSWORD": "test-pass-strip-1", "PORT": "0", "HOST": "127.0.0.1",
       "ATELIER_DATA_DIR": tempfile.mkdtemp(prefix="strip-browser-"), "BRING_EMAIL": "", "BRING_PASSWORD": "",
       "BRING_API_BASE": f"http://127.0.0.1:{bport}", "BRING_API_KEY": "fixture-api-key"}
web = None
try:
    web, wport = launch(["node", "server.mjs"], env)
    with sync_playwright() as play:
        browser = getattr(play, browser_name).launch()
        # Phone: a short portrait window. Desktop: windows above the landscape hero layouts of polish.css (max-height
        # 700px), where the dialog does not scroll: 720 (the cook step column scrolls and nearly nothing else) and 900.
        sizes = [tuple(int(v) for v in z.split("x")) for z in os.environ.get("SIZES", "390x520,1440x720,1440x900").split(",")]
        for width, height in sizes:
            phone = width < 600
            ctx = browser.new_context(http_credentials={"username": "atelier", "password": "test-pass-strip-1"}, locale="de-DE",
                                      viewport={"width": width, "height": height}, is_mobile=phone, has_touch=phone,
                                      service_workers="block")
            page = ctx.new_page()
            tag = f"{browser_name}-{width}x{height}"

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

            def stress(label):
                # At scroll 0, and with the first heading lifted to the top of the dialog.
                for lift in (False, True):
                    checked[0] += 1
                    st = state()
                    if not st or (not lift and st["scrollTop"] != 0) or (lift and not st.get("scrollable")):
                        continue
                    r = page.evaluate(STRESS, lift)
                    if r and r["out"]:
                        problems.append(f"{label}{' lifted' if lift else ''}: long heading or eyebrow runs under the close button ({r['out']})")

            def sweep(label):
                """Scrolls the open dialog in small steps and reports every position where a thin element peeks out of its top edge."""
                checked[0] += 1
                found = page.evaluate("""async (state) => {
                  const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".atelier"));
                  const modal = card.shadowRoot.querySelector(".modal");
                  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                  const read = new Function("return " + state);
                  const room = modal.scrollHeight - modal.clientHeight;
                  const out = [];
                  for (let y = 0; y <= room; y += Math.max(1, Math.floor(room / 80))) {
                    modal.scrollTop = y;
                    await frame();
                    const s = read();
                    if (s && s.clipped.length && !s.barOn) out.push(y + ":" + s.clipped.join(","));
                  }
                  modal.scrollTop = 0;
                  await frame();
                  return out;
                }""", STATE)
                if found:
                    problems.append(f"{label}: a thin element peeks out of the dialog top edge while scrolling at {found[:3]}")

            def column_sweep(label):
                """The cook dialog scrolls its step column, not the dialog: walk the column top to bottom and judge every stop."""
                top = state()
                cs = top.get("columnScroll") if top else None
                if not cs:
                    return
                if cs["room"] > 0:
                    for y in sorted({0, cs["room"] // 3, cs["room"]}):
                        page.evaluate("(y) => {" + CARD + " card.shadowRoot.querySelector('.cook-content').scrollTop = y; }", y)
                        settle(200)
                        judge(f"{label} column scrolled {y}", state())
                        shoot(f"{label.split(' ')[-2]}-column-{y}")
                    page.evaluate("() => {" + CARD + " card.shadowRoot.querySelector('.cook-content').scrollTop = 0; }")
                    settle(200)

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
            stress(f"{tag} recipe top")
            shoot("recipe-top")
            room = page.evaluate("() => {" + CARD + " const m = card.shadowRoot.querySelector('.modal'); return m.scrollHeight - m.clientHeight; }")
            if not state()["scrollable"]:
                room = 0
                problems.append(f"{tag}: recipe dialog does not scroll in a {width}x{height} window, so the strip is not exercised there")
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
            # Far enough that the heading is under the strip: the strip must be on, named and opaque (a desktop window included).
            if room > 400:
                scroll(min(500, room))
                deep = state()
                judge(f"{tag} recipe deep", deep)
                if not deep["barOn"] or not deep["titleShown"]:
                    problems.append(f"{tag}: recipe heading scrolled under the strip but the strip is off ({json.dumps(deep)})")
                shoot("recipe-deep")
                scroll(min(200, room))
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
            for action in ("plan-form", "edit-form", "journal-open", "recipe-to-list-form", "cook-start"):
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
                stress(f"{tag} {action} top")
                shoot(f"{action}-top")
                if action == "cook-start":
                    column_sweep(f"{tag} {action} step")
                    nxt = page.locator('.modal [data-action="cook-next"]')
                    if nxt.count():
                        nxt.first.click()
                        settle(700)
                        judge(f"{tag} cook step 2", state())
                        column_sweep(f"{tag} cook step 2")
                sweep(f"{tag} {action} sweep")
                r = page.evaluate("() => {" + CARD + " const m = card.shadowRoot.querySelector('.modal'); return m.scrollHeight - m.clientHeight; }")
                if r > 40:
                    scroll(min(200, r))
                    judge(f"{tag} {action} scrolled", state())
                    shoot(f"{action}-scrolled")
                close()
                page.locator(".recipe-tile").first.click()
                settle(700)
            sync_rule_editor(page, tag, settle, scroll, state, shoot, close, stress)
            ctx.close()
        browser.close()
finally:
    bring.terminate()
    if web:
        web.terminate()
    mock.terminate()

print(f"{browser_name}: {checked[0]} checks, {len(problems)} problems")
for p in problems[:40]:
    print("FAIL", p)
sys.exit(1 if problems else 0)
