"""Render check of the hero stage of the built public demo (headless Chromium).

For every locale and every width below, with and without reduced motion:
  - both screenshots are really decoded (complete and a natural width above zero), the hidden tablet on a
    phone is the one pixel GIF and is never requested
  - the picked file is crisp (displayed width x device pixel ratio fits into it) and the smallest that is
  - the devices keep the readable sizes of the concept, nothing scrolls sideways, the phone stays clear of
    the right 70 percent of the tablet (where the step text and the timer are)
  - no layout shift (PerformanceObserver) and the entrance timings of the concept
Optionally writes a screenshot of the hero per run: --shots <folder>.

Usage (after `npm run build:demo`):
  npm run check:hero
  uv run --with playwright python scripts/check-hero.py [--site <dir>] [--shots <folder>] [--repeat N]
"""

import argparse
import functools
import re
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
WIDTHS = [(390, 844, 3), (390, 844, 2), (768, 1024, 2), (1024, 768, 2), (1180, 820, 2), (1440, 900, 2), (1440, 900, 1)]
LOCALES = {"de": "de-DE", "en": "en-US"}
TABLET_FILES = [800, 1200, 1600]
PHONE_FILES = [400, 700, 1179]

SHIFT_JS = """() => {
  window.__shift = 0; window.__lcp = null;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shift += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    const e = list.getEntries().at(-1);
    window.__lcp = { tag: e.element ? e.element.tagName + '.' + (e.element.className || '') : null, time: Math.round(e.startTime) };
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}"""

MEASURE_JS = """() => {
  const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
  const imgs = [...document.querySelectorAll('.hero-stage img')].map((i) => ({
    cls: i.closest('.device-tablet') ? 'tablet' : 'phone',
    shown: i.getBoundingClientRect().width > 0,
    complete: i.complete,
    natural: i.naturalWidth,
    css: i.getBoundingClientRect().width,
    src: i.currentSrc,
    candidates: (i.srcset.match(/(\\d+)w/g) || []).map((w) => parseInt(w)),
  }));
  const phone = document.querySelector('.device-phone'), tablet = document.querySelector('.device-tablet');
  const style = (e) => { const c = getComputedStyle(e); return { opacity: c.opacity, translate: c.translate, transition: c.transitionDuration + ' ' + c.transitionDelay, display: c.display }; };
  return {
    imgs,
    phone: box(phone), tablet: box(tablet), stage: box(document.querySelector('.hero-stage')),
    tabletStyle: style(tablet), phoneStyle: style(phone),
    scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    reveal: document.documentElement.classList.contains('reveal-ready'),
    entered: document.querySelector('.hero-stage').classList.contains('in'),
    shift: window.__shift, lcp: window.__lcp,
  };
}"""


def serve(site):
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(site)))
    server.request_queue_size = 128
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def width_of(src):
    m = re.search(r"-(\d+)\.webp$", src)
    return int(m.group(1)) if m else None


def check(label, ok, detail=""):
    if not ok:
        raise AssertionError(f"{label}: {detail}")


def run_one(browser, port, loc, width, height, dpr, reduced, shots, errors):
    label = f"{loc} {width}@{dpr}x {'reduced' if reduced else 'motion'}"
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=dpr,
        color_scheme="dark",
        reduced_motion="reduce" if reduced else "no-preference",
        locale=LOCALES[loc],
    )
    try:
        page = ctx.new_page()
        requested = []
        failed = []
        page.on("request", lambda r: requested.append(r.url))
        page.on("requestfailed", lambda r: failed.append(r.url))
        page.add_init_script(f"({SHIFT_JS})()")
        page.goto(f"http://127.0.0.1:{port}/{loc}/")
        page.wait_for_load_state("networkidle")
        if not reduced:
            # The entrance starts when the stage scrolls into view (on a phone it sits below the copy).
            page.locator(".hero-stage").scroll_into_view_if_needed()
        page.wait_for_timeout(500 if reduced else 2200)
        m = page.evaluate(MEASURE_JS)
        phone_only = width <= 640
        hero_requests = [u for u in requested if "hero-" in u]
        check(label + " failed requests", not [u for u in failed if "hero-" in u], failed)
        by = {i["cls"]: i for i in m["imgs"]}
        check(label + " phone decoded", by["phone"]["complete"] and by["phone"]["natural"] > 0, by["phone"])
        if phone_only:
            check(label + " tablet is the GIF", by["tablet"]["src"].startswith("data:image/gif"), by["tablet"]["src"][:40])
            check(label + " tablet never requested", not [u for u in hero_requests if "hero-tablet" in u], hero_requests)
            check(label + " tablet not displayed", m["tabletStyle"]["display"] == "none", m["tabletStyle"])
        else:
            check(label + " tablet decoded", by["tablet"]["complete"] and by["tablet"]["natural"] > 0, by["tablet"])
        for cls, img in by.items():
            if cls == "tablet" and phone_only:
                continue
            got = width_of(img["src"])
            need = img["css"] * dpr
            check(label + f" {cls} file known", got in img["candidates"], img["src"])
            fits = [c for c in img["candidates"] if c >= need - 1]
            best = min(fits) if fits else max(img["candidates"])
            check(label + f" {cls} crisp and not wasteful", got == best, f"needs {need:.0f}px, picked {got}w, best {best}w")
        check(label + " no sideways scroll", m["scrollW"] <= m["innerW"], (m["scrollW"], m["innerW"]))
        check(label + " layout shift 0", m["shift"] == 0, m["shift"])
        p, t, s = m["phone"], m["tablet"], m["stage"]
        check(label + " phone inside the stage", p["x"] >= s["x"] - 1 and p["r"] <= s["x"] + s["w"] + 1 and p["b"] <= s["b"] + 1, (p, s))
        if phone_only:
            check(label + " phone floor", p["w"] >= 240, p)
        else:
            check(label + " tablet floor", t["w"] >= (537 if width >= 768 else 496), t)
            check(label + " phone floor", p["w"] >= (204 if width >= 768 else 188), p)
            check(label + " phone clear of the timer side", p["r"] - t["x"] <= 0.3 * t["w"], (p, t))
        if reduced:
            check(label + " final state at once", m["phoneStyle"]["opacity"] == "1" and m["tabletStyle"]["opacity"] == "1", m)
            check(label + " no transition", not m["reveal"] and float(m["phoneStyle"]["transition"].split("s")[0]) < 0.01, m["phoneStyle"])
        elif not phone_only:
            check(label + " entrance ran", m["reveal"] and m["entered"] and m["phoneStyle"]["opacity"] == "1" and m["tabletStyle"]["opacity"] == "1", m)
            check(label + " phone delay 140ms", m["phoneStyle"]["transition"] == "0.7s, 0.9s 0.14s, 0.14s", m["phoneStyle"])
            check(label + " tablet no delay", m["tabletStyle"]["transition"] == "0.7s, 0.9s 0s, 0s", m["tabletStyle"])
        if shots and reduced and dpr == 2:
            page.locator("section.hero").screenshot(path=str(shots / f"hero-{loc}-{width}.png"))
        sizes = {c: (round(i["css"]), width_of(i["src"])) for c, i in by.items() if not (c == "tablet" and phone_only)}
        print(f"ok {label}: tablet {round(t['w'])} phone {round(p['w'])} files {sizes} lcp {m['lcp']}")
    except AssertionError as err:
        errors.append(str(err))
        print("FAIL", err)
    finally:
        ctx.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default=str(ROOT / "demo/public-site"))
    parser.add_argument("--shots")
    parser.add_argument("--repeat", type=int, default=1)
    args = parser.parse_args()
    shots = Path(args.shots) if args.shots else None
    if shots:
        shots.mkdir(parents=True, exist_ok=True)
    server = serve(Path(args.site))
    port = server.server_address[1]
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                for _ in range(args.repeat):
                    for loc in LOCALES:
                        for width, height, dpr in WIDTHS:
                            for reduced in (True, False):
                                run_one(browser, port, loc, width, height, dpr, reduced, shots, errors)
            finally:
                browser.close()
    finally:
        server.shutdown()
    if errors:
        print(f"{len(errors)} check(s) failed")
        sys.exit(1)
    print("hero render check passed")


if __name__ == "__main__":
    main()
