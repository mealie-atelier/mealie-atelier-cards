"""Recapture the app screens of the product page that show the navigation, from the built public demo.

  desktop   app-desktop-recipes, app-desktop-mealplan, app-desktop-shopping, compare-desktop-atelier
  tablet    app-tablet-today, app-tablet-mealplan
  phone     app-phone-cookbook, app-phone-discover, app-phone-family, app-phone-family-helper,
            app-phone-mealplan, app-phone-shopping (English only: the German phone shots carry no stale names)

The shots come from the real card with the fixture data of the demo and a frozen clock (Thursday, October 29).
Nothing is retouched. A gate fails the run when a shot shows a navigation name the card no longer uses
or text of the other language (for example KITCHEN STUDIO or MENU in a German shot).

Usage (after `npm run build:demo`):
  uv run --with playwright --with pillow python scripts/capture-app-showcase.py [name ...]
Without names every shot is captured. Files go to demo/showcase/<locale>/<name>-<width>.webp in the sizes
that demo/showcase/manifest.json lists.
"""

import datetime
import io
import json
import re
import socket
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "demo/public-site"
SHOWCASE = ROOT / "demo/showcase"
CLOCK = datetime.datetime(2026, 10, 29, 18, 0, 0)
QUALITY = 82
LOCALES = {"de": "de-DE", "en": "en-US"}

# CSS viewport and the pixel density that gives the published size (manifest width x height).
DESKTOP = dict(viewport=(1600, 1000), scale=1, mobile=False)
COMPARE = dict(viewport=(1600, 797), scale=1, mobile=False)
TABLET = dict(viewport=(1180, 820), scale=1600 / 1180, mobile=False)
PHONE = dict(viewport=(393, 852), scale=720 / 393, mobile=True)

# name: (device, nav view, extra step, locales)
SHOTS = {
    "app-desktop-recipes": (DESKTOP, "recipes", None, ("de", "en")),
    "app-desktop-mealplan": (DESKTOP, "mealplan", None, ("de", "en")),
    "app-desktop-shopping": (DESKTOP, "shopping", None, ("de", "en")),
    "compare-desktop-atelier": (COMPARE, "recipes", None, ("de", "en")),
    "app-tablet-today": (TABLET, "today", None, ("de", "en")),
    "app-tablet-mealplan": (TABLET, "mealplan", None, ("de", "en")),
    "app-phone-cookbook": (PHONE, "cookbook", None, ("en",)),
    "app-phone-discover": (PHONE, "discover", None, ("en",)),
    "app-phone-family": (PHONE, "family", None, ("en",)),
    "app-phone-family-helper": (PHONE, "family", "adult-view", ("en",)),
    "app-phone-mealplan": (PHONE, "mealplan", None, ("en",)),
    "app-phone-shopping": (PHONE, "shopping", None, ("en",)),
}

FILL = (
    "mealie-atelier-card{position:fixed!important;inset:0!important;z-index:9999!important;margin:0!important;"
    "max-width:none!important;width:100vw!important;height:100vh!important;overflow:auto!important;"
    "border-radius:0!important;border:0!important;box-shadow:none!important;background:#0c120f!important}"
)
# Capture only: the screen has no frame of its own, so the card draws no border and fills the whole viewport.
CARD_FLAT = ".atelier{border:0!important;border-radius:0!important;box-shadow:none!important;min-height:100vh!important}"
STALE = re.compile(r"Cook ideas|Meal planner|Family cooking")
ENGLISH_LEAK = re.compile(r"KITCHEN STUDIO|\bMENU\b|\b(Overview|Today|Recipes|Shopping|Cookbook|Manage|Quick actions)\b")
GERMAN_LEAK = re.compile(r"KÜCHENSTUDIO|\bMENÜ\b|\b(Übersicht|Heute|Rezepte|Einkaufsliste|Kochbuch|Verwalten|Schnellzugriff)\b")
EXPECTED = {
    "en": ("Discover", "Meal plan", "Cook together"),
    "de": ("Kochinspo", "Wochenplan", "Gemeinsam kochen"),
}

TEXT_JS = """(card) => {
  const out = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      const r = el.getBoundingClientRect();
      if (r.width && r.height && el.children.length === 0 && el.textContent.trim()) out.push(el.textContent.trim());
    }
  };
  walk(card.shadowRoot);
  return out.join(' | ');
}"""


IMAGES_JS = """(card) => {
  const imgs = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (el.tagName === 'IMG') imgs.push(el);
    }
  };
  walk(card.shadowRoot);
  imgs.forEach((img) => { img.loading = 'eager'; });
  return imgs.filter((img) => !(img.complete && img.naturalWidth > 0)).length;
}"""


DECODE_JS = """async (card) => {
  const imgs = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (el.tagName === 'IMG') imgs.push(el);
    }
  };
  walk(card.shadowRoot);
  await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
}"""


def wait_for_images(page, card):
    """Photos load lazily and the page clock is fake: step the clock until every image has decoded."""
    for _ in range(60):
        if card.evaluate(IMAGES_JS) == 0:
            # Loaded is not painted: decode every photo, then give the compositor a moment.
            card.evaluate(DECODE_JS)
            page.clock.run_for(500)
            page.wait_for_timeout(1500)
            return
        page.clock.run_for(300)
        page.wait_for_timeout(150)
    raise AssertionError("images did not finish loading")


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


PORT = free_port()


def capture(browser, loc, device, view, step):
    width, height = device["viewport"]
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=device["scale"],
        is_mobile=device["mobile"],
        has_touch=device["mobile"],
        color_scheme="dark",
        reduced_motion="reduce",
        locale=LOCALES[loc],
    )
    page = ctx.new_page()
    page.clock.install(time=CLOCK)
    page.goto(f"http://localhost:{PORT}/{loc}/")
    page.clock.run_for(3000)
    page.wait_for_load_state("networkidle")
    page.add_style_tag(content=FILL)
    page.clock.run_for(1500)
    card = page.locator("mealie-atelier-card")
    card.evaluate(
        "(c, css) => { const s = document.createElement('style'); s.textContent = css; c.shadowRoot.appendChild(s); }",
        CARD_FLAT,
    )
    card.locator(f"[data-action='nav'][data-value='{view}']").first.click()
    page.clock.run_for(2500)
    if step == "adult-view":
        card.locator("[data-action='studio-kid-toggle']").click()
        page.clock.run_for(1500)
    wait_for_images(page, card)
    page.evaluate("document.activeElement && document.activeElement.blur()")
    card.evaluate("c => c.shadowRoot.activeElement && c.shadowRoot.activeElement.blur()")
    page.mouse.move(0, 0)
    page.clock.run_for(600)
    text = card.evaluate(TEXT_JS)
    png = page.screenshot()
    ctx.close()
    return Image.open(io.BytesIO(png)).convert("RGB"), text


def gate(loc, name, text):
    stale = STALE.findall(text)
    assert not stale, f"{loc}/{name}: stale navigation names {stale}"
    leak = (ENGLISH_LEAK if loc == "de" else GERMAN_LEAK).findall(text)
    assert not leak, f"{loc}/{name}: text of the other language {leak}"
    if not name.startswith("app-phone"):
        for label in EXPECTED[loc]:
            assert label in text, f"{loc}/{name}: navigation name {label!r} missing"


def save(img, name, loc, manifest):
    entry = manifest[loc][name]
    size = (entry["width"], entry["height"])
    assert abs(img.width - size[0]) <= 1 and abs(img.height - size[1]) <= 4, f"{loc}/{name}: shot is {img.size}, manifest says {size}"
    img = img.crop((0, 0, img.width, min(img.height, size[1]))).resize(size, Image.LANCZOS)
    for width in entry["widths"]:
        out = img if width == img.width else img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        out.save(SHOWCASE / loc / f"{name}-{width}.webp", "WEBP", quality=QUALITY, method=6)


def main():
    names = sys.argv[1:] or list(SHOTS)
    manifest = json.loads((SHOWCASE / "manifest.json").read_text())
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "-d", str(SITE)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1.2)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                for name in names:
                    device, view, step, locales = SHOTS[name]
                    for loc in locales:
                        img, text = capture(browser, loc, device, view, step)
                        gate(loc, name, text)
                        save(img, name, loc, manifest)
                        print("wrote", f"{loc}/{name}")
            finally:
                browser.close()
    finally:
        server.terminate()


if __name__ == "__main__":
    main()
