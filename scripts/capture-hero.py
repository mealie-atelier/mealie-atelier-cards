"""Capture the two hero screens of the product page from the built public demo.

  hero-tablet-cook     cooking mode of Gnocchi alla Sorrentina, step 1, kitchen timer reading 07:28
  hero-phone-shopping  shopping list "Wocheneinkauf" filled from the same recipe, one item ticked

The shots come from the real cards with the fixture data of the demo, a frozen clock and no pixel
retouching. Every gate below fails the run instead of fixing a picture afterwards.

Usage (after `npm run build:demo`):
  npm run capture:hero
  uv run --with playwright --with pillow python scripts/capture-hero.py [site-dir] [showcase-dir]
"""

import datetime
import socket
import io
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "demo/public-site"
SHOWCASE = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "demo/showcase"
RECIPE = "gnocchi-alla-sorrentina"
CLOCK = datetime.datetime(2026, 10, 26, 18, 52, 0)
TABLET_WIDTHS = [800, 1200, 1600]
PHONE_WIDTHS = [400, 700, 1179]
SHAVE = 2  # device pixels cut from each side of the dialog clip (anti aliased edge)

TEXT = {
    "de": dict(locale="de-DE", label="Sauce köcheln", list="Wocheneinkauf"),
    "en": dict(locale="en-US", label="Simmer the sauce", list="Weekly shop"),
}
GERMAN_LEAK = re.compile(r"\b(Heute|Einkauf|Rezept|Zutaten|Schritt)\b")
ENGLISH_LEAK = re.compile(r"\b(Today|Recipe|Ingredients|Step|Cooking mode)\b")

FILL = (
    "mealie-atelier-card{position:fixed!important;inset:0!important;z-index:9999!important;margin:0!important;"
    "max-width:none!important;width:100vw!important;height:100vh!important;overflow:auto!important;"
    "border-radius:0!important;border:0!important;box-shadow:none!important}"
)
# Capture only: the dialog is framed by the CSS device, so its own corners and border are removed.
MODAL_FLAT = ".modal{border-radius:0!important;border:0!important;box-shadow:none!important}"
# Capture only: the rail would fade its outer tabs, a tab at the edge would then read as cut.
# Capture only: the screen is framed by the CSS device, so the card draws no border line of its own.
CARD_FLAT = ".atelier{border:0!important;border-radius:0!important;box-shadow:none!important}"
RAIL_PLAIN = ".sidebar .nav{-webkit-mask-image:none!important;mask-image:none!important;scroll-behavior:auto!important;scroll-snap-type:none!important}"

CUT_JS = """(card, sel) => {
  const out = [];
  const frame = sel ? card.shadowRoot.querySelector(sel).getBoundingClientRect() : { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const view = { l: frame.left, t: frame.top, w: frame.right, h: frame.bottom };
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (!el.matches('button,input,label,p,h1,h2,h3,strong,small,time,span,a')) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (el.closest('.sidebar .nav')) continue; // the tab rail has its own gate
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      // Vertical: an element that shows more than a fifth of its height but not all of it is cut.
      // Less than that is box padding, no glyph reaches the edge.
      const shown = Math.min(b.bottom, view.h) - Math.max(b.top, view.t);
      const share = shown / b.height;
      if (b.left < view.l - 0.5 || b.right > view.w + 0.5 || (share > 0.2 && share < 0.98))
        out.push((el.textContent || '').trim().slice(0, 40));
    }
  };
  walk(sel ? card.shadowRoot.querySelector(sel) : card.shadowRoot);
  return out;
}"""

RAIL_JS = """(card) => {
  // The rail scrolls and cuts a tab at each end. Pick the run of whole tabs that holds the active
  // one, fits the rail and shows the most tabs, then size the rail to that run and centre it.
  const rail = card.shadowRoot.querySelector('.sidebar .nav');
  const base = rail.getBoundingClientRect();
  const tabs = [...rail.children].map((b) => {
    const r = b.getBoundingClientRect();
    return { text: b.textContent.trim(), left: r.left - base.left + rail.scrollLeft, width: r.width, active: b.classList.contains('active') };
  });
  let best = null;
  for (let i = 0; i < tabs.length; i++) {
    for (let j = i; j < tabs.length; j++) {
      const width = tabs[j].left + tabs[j].width - tabs[i].left;
      const active = tabs.slice(i, j + 1).findIndex((t) => t.active);
      if (width > rail.clientWidth || active < 0) continue;
      const interior = active > 0 && active < j - i ? 1 : 0;
      const score = [j - i + 1, interior, width];
      if (!best || score.some((v, k) => (v !== best.score[k] ? v > best.score[k] : false) && score.slice(0, k).every((u, m) => u === best.score[m]))) best = { i, j, width, score };
    }
  }
  if (!best) return { failed: true };
  rail.style.setProperty('width', best.width + 'px', 'important');
  rail.style.setProperty('margin-inline', 'auto', 'important');
  rail.scrollLeft = tabs[best.i].left;
  const r = rail.getBoundingClientRect();
  const cut = [...rail.children].filter((b) => {
    const x = b.getBoundingClientRect();
    return (x.left < r.left - 0.5 && x.right > r.left + 0.5) || (x.left < r.right - 0.5 && x.right > r.right + 0.5);
  }).map((b) => b.textContent.trim());
  return { scrollLeft: rail.scrollLeft, width: best.width, cut, tabs: tabs.slice(best.i, best.j + 1).map((t) => t.text) };
}"""


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


PORT = free_port()


def blur_everything(page, card):
    page.evaluate("document.activeElement && document.activeElement.blur()")
    card.evaluate("c => c.shadowRoot.activeElement && c.shadowRoot.activeElement.blur()")
    page.mouse.move(0, 0)


def open_page(browser, loc, viewport, scale, mobile, url_tail):
    ctx = browser.new_context(
        viewport=viewport,
        device_scale_factor=scale,
        is_mobile=mobile,
        has_touch=mobile,
        color_scheme="dark",
        reduced_motion="reduce",
        locale=TEXT[loc]["locale"],
    )
    page = ctx.new_page()
    page.clock.install(time=CLOCK)
    page.goto(f"http://localhost:{PORT}/{loc}/{url_tail}")
    page.clock.run_for(3000)
    page.wait_for_load_state("networkidle")
    page.add_style_tag(content=FILL)
    page.clock.run_for(800)
    card = page.locator("mealie-atelier-card")
    # The page clock is a fake: give the recipe link time to open its dialog, step by step.
    for _ in range(30):
        if "?recipe=" not in url_tail or card.locator("[role=dialog]").count():
            break
        page.clock.run_for(500)
        page.wait_for_timeout(100)
    return ctx, page, card


def check_language(loc, text):
    leak = (GERMAN_LEAK if loc == "en" else ENGLISH_LEAK).findall(text)
    assert not leak, f"{loc} shot shows strings of the other language: {leak}"


def capture_tablet(browser, loc):
    t = TEXT[loc]
    ctx, page, card = open_page(browser, loc, {"width": 1180, "height": 820}, 2, False, f"?recipe={RECIPE}#live-demo")
    card.evaluate("c => { const s = document.createElement('style'); s.textContent = %s; c.shadowRoot.appendChild(s); }" % json.dumps(MODAL_FLAT))
    # Pin the page clock (it also follows real time while Playwright works) so the timer runs only
    # on the 32 seconds advanced below.
    page.clock.pause_at(datetime.datetime.fromtimestamp(page.evaluate("Date.now()") / 1000 + 2))
    card.locator("[data-timer-minutes]").first.fill("8")
    card.locator("[data-timer-label]").first.fill(t["label"])
    card.locator("[data-action='timer-start']").first.click()
    blur_everything(page, card)
    page.clock.run_for(32_000)
    dial = card.locator(".cook-timer-dial").first.inner_text().strip()
    counter = card.locator("[role=dialog]").first.inner_text()
    assert dial == "07:28", f"timer reads {dial}"
    assert "01 / 03" in counter, "step counter is not 01 / 03"
    check_language(loc, counter)
    box = card.locator("[role=dialog]").first.bounding_box()
    scale = 2
    clip = {
        "x": box["x"] + SHAVE / scale,
        "y": box["y"] + SHAVE / scale,
        "width": box["width"] - 2 * SHAVE / scale,
        "height": box["height"] - 2 * SHAVE / scale,
    }
    png = page.screenshot(clip=clip)
    cut = card.evaluate(CUT_JS, "[role=dialog]")
    print(loc, "tablet cut:", cut or "none", "| timer", dial)
    ctx.close()
    return Image.open(io.BytesIO(png)).convert("RGB"), cut


def capture_phone(browser, loc):
    t = TEXT[loc]
    ctx, page, card = open_page(browser, loc, {"width": 393, "height": 798}, 3, True, f"?recipe={RECIPE}#live-demo")
    dialog = card.locator("[role=dialog]")
    submit = dialog.locator("button:not([data-action])")
    card.locator("[data-action='cook-to-recipe']").click()
    page.clock.run_for(1500)
    # The fixture list belongs to another dish and the demo cannot delete items. A fresh list
    # with the same name holds only the nine ingredients of the Gnocchi on the tablet.
    card.locator("[data-action='recipe-to-list-form']").click()
    page.clock.run_for(1500)
    dialog.locator("[data-action='create-list-form']").click()
    page.clock.run_for(1200)
    dialog.locator("input[name=name]").fill(t["list"])
    submit.click()
    page.clock.run_for(2000)
    card.locator("[data-action='nav'][data-value='recipes']").click()
    page.clock.run_for(2000)
    card.locator(f"[data-action='open-recipe'][data-id='{RECIPE}'], [data-action='open-recipe'][data-value='{RECIPE}']").first.click()
    page.clock.run_for(1500)
    card.locator("[data-action='recipe-to-list-form']").click()
    page.clock.run_for(1500)
    dialog.locator("select").select_option(index=2)
    submit.click()
    page.clock.run_for(2500)
    if dialog.count():
        dialog.locator("[data-action='close-modal']").click()
        page.clock.run_for(800)
    card.locator("[data-action='nav'][data-value='shopping']").click()
    page.clock.run_for(2500)
    picker = card.locator("select[data-action='shopping-list'], .shopping-toolbar select, select").first
    picker.select_option(index=picker.locator("option").count() - 1)
    page.clock.run_for(2000)
    count = card.locator("[data-action='shopping-toggle']").count()
    assert count == 9, f"the new list holds {count} items, expected the nine Gnocchi ingredients"
    card.locator("[data-action='shopping-toggle']").nth(1).click()  # tick the tomatoes, stays in the list
    page.clock.run_for(1200)
    card.evaluate("c => { const s = document.createElement('style'); s.textContent = %s; c.shadowRoot.appendChild(s); }" % json.dumps(CARD_FLAT + RAIL_PLAIN))
    card.evaluate("c => c.scrollTo && c.scrollTo(0, 0)")
    rail = card.evaluate(RAIL_JS)
    assert rail and not rail.get("failed") and not rail["cut"], f"tab rail has a cut label: {rail}"
    blur_everything(page, card)
    page.clock.run_for(500)
    page.wait_for_timeout(200)
    png = page.screenshot()
    cut = card.evaluate(CUT_JS, None)
    print(loc, "phone rail:", rail, "| cut:", cut or "none")
    text = card.evaluate("c => [...c.shadowRoot.children].filter((e) => e.tagName !== 'STYLE').map((e) => e.innerText).join(' ')")
    check_language(loc, text)
    ctx.close()
    img = Image.open(io.BytesIO(png)).convert("RGB")
    top = [img.getpixel((img.width // 2, y)) for y in range(0, 4)]
    assert all(max(abs(a - b) for a, b in zip(px, top[3])) <= 2 for px in top), f"seam in the top rows: {top}"
    return img, cut, top[0]


def save_variants(img, name, widths, loc):
    folder = SHOWCASE / loc
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob(f"{name}-*.webp"):
        old.unlink()
    for width in widths:
        out = img if width == img.width else img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        out.save(folder / f"{name}-{width}.webp", "WEBP", quality=82, method=6)
    return {"width": img.width, "height": img.height, "widths": widths}


def write_manifest(entries):
    path = SHOWCASE / "manifest.json"
    manifest = json.loads(path.read_text())
    for loc, items in entries.items():
        manifest[loc].update(items)
    text = json.dumps(manifest, indent=2, ensure_ascii=False)
    text = re.sub(r'"widths": \[\s*([^\]]*?)\s*\]', lambda m: '"widths": [' + re.sub(r"\s+", " ", m.group(1)) + "]", text)
    path.write_text(text + "\n")


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "-d", str(SITE)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1.2)
    entries = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                for loc in TEXT:
                    tablet, cut_t = capture_tablet(browser, loc)
                    phone, cut_p, status = capture_phone(browser, loc)
                    assert not cut_t and not cut_p, f"{loc}: text cut by the screenshot edge: {cut_t} {cut_p}"
                    print(loc, "status bar colour (CSS .status background):", "#%02x%02x%02x" % status)
                    entries[loc] = {
                        "hero-tablet-cook": save_variants(tablet, "hero-tablet-cook", TABLET_WIDTHS, loc),
                        "hero-phone-shopping": save_variants(phone, "hero-phone-shopping", PHONE_WIDTHS, loc),
                    }
            finally:
                browser.close()
    finally:
        server.terminate()
    write_manifest(entries)
    print("wrote", ", ".join(f"{loc}/{n}" for loc, e in entries.items() for n in e))


if __name__ == "__main__":
    main()
