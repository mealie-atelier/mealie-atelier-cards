"""Recapture the Home Assistant dashboard shots of the product page from the live test rig.

  ha-desktop-dashboard  1600 x 1000, the overview inside Home Assistant (header tabs, sidebar hidden)
  ha-phone-dashboard    720 x 1558, the same on a phone

Needs the rig of the bridge repo (Home Assistant on :18123 with the card bundle from `npm run build` at
www/community/mealie-atelier-cards/ and Mealie seeded from demo/data/recipes.json), fictional data only.
The dashboard tabs are named like the card's own navigation (Discover, not Cook ideas).

Usage:
  uv run --with playwright --with pillow python scripts/capture-ha-showcase.py <bridge-repo>/tests/live [de] [en]
The recipe names on the shots are the language the rig was seeded in (seed_mealie.py ... de|en): capture a
language only while the rig is seeded in it.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

LIVE = Path(sys.argv[1])
sys.path.insert(0, str(LIVE))
from ha_ws import HaSocket, read_token  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SHOWCASE = ROOT / "demo/showcase"
BASE = "http://localhost:18123"
URL_PATH = "atelier-showcase"
VIEWS = {
    "en": [("Kitchen", "dashboard"), ("Recipes", "recipes"), ("Meal plan", "mealplan"), ("Shopping", "shopping"), ("Discover", "discover")],
    "de": [("Küche", "dashboard"), ("Rezepte", "recipes"), ("Wochenplan", "mealplan"), ("Einkauf", "shopping"), ("Kochinspo", "discover")],
}
LOCALES = {"de": "de-DE", "en": "en-US"}
DEVICES = {
    "ha-desktop-dashboard": dict(viewport=(1600, 1000), scale=1, mobile=False),
    "ha-phone-dashboard": dict(viewport=(393, 852), scale=720 / 393, mobile=True),
}
STALE = re.compile(r"Cook ideas|Meal planner|Family cooking")
# The family view is called Cook together / Gemeinsam kochen; a bare Family or Familie nav label is an old bundle.
STALE_NAV = {
    "en": re.compile(r"(?:^| \| )(Family)(?= \| |$)"),
    "de": re.compile(r"(?:^| \| )(Familie)(?= \| |$)"),
}
ENGLISH_LEAK = re.compile(r"KITCHEN STUDIO|\bMENU\b|\b(Overview|Today|Recipes|Shopping|Cookbook|Manage|Quick actions)\b")
GERMAN_LEAK = re.compile(r"KÜCHENSTUDIO|\bMENÜ\b|\b(Übersicht|Heute|Rezepte|Einkaufsliste|Kochbuch|Verwalten|Schnellzugriff)\b")


async def prepare(loc):
    async with HaSocket(BASE, read_token(str(LIVE / "state" / "ha-token"))) as socket:
        _, dashboards = await socket.call({"type": "lovelace/dashboards/list"})
        if URL_PATH not in {d["url_path"] for d in dashboards or []}:
            ok, error = await socket.call(
                {"type": "lovelace/dashboards/create", "url_path": URL_PATH, "title": "Atelier", "mode": "storage", "show_in_sidebar": False}
            )
            assert ok, error
        views = [
            {"title": title, "path": path, "panel": True,
             "cards": [{"type": "custom:mealie-atelier-card", "mode": path, "theme": "dark", "language": loc}]}
            for title, path in VIEWS[loc]
        ]
        ok, error = await socket.call({"type": "lovelace/config/save", "url_path": URL_PATH, "config": {"views": views}})
        assert ok, error


def sign_in(page):
    page.goto(f"{BASE}/{URL_PATH}/dashboard")
    page.wait_for_url("**/auth/authorize**", timeout=30_000)
    page.locator("input[name='username']").fill("atelier")
    page.locator("input[name='password']").fill("atelier-test-only")
    page.keyboard.press("Enter")
    page.wait_for_url(lambda url: "auth_callback" not in url and URL_PATH in url, timeout=30_000)
    page.wait_for_load_state("networkidle")


def settle(page):
    page.locator("mealie-atelier-card .view-stage").first.wait_for(timeout=60_000)
    page.wait_for_function("!document.getElementById('ha-launch-screen')", timeout=60_000)
    page.wait_for_load_state("networkidle")
    for img in page.locator("mealie-atelier-card img >> visible=true").all():
        # A lazy image that never loads must not hang the run: decode() has no timeout of its own.
        img.evaluate("img => Promise.race([img.decode().catch(() => null), new Promise((done) => setTimeout(done, 5000))])")
    page.wait_for_timeout(1500)


def save(img, name, loc):
    manifest = json.loads((SHOWCASE / "manifest.json").read_text())
    entry = manifest[loc][name]
    img = img.crop((0, 0, img.width, min(img.height, entry["height"]))).resize((entry["width"], entry["height"]), Image.LANCZOS)
    for width in entry["widths"]:
        out = img if width == img.width else img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        out.save(SHOWCASE / loc / f"{name}-{width}.webp", "WEBP", quality=82, method=6)


def main():
    with sync_playwright() as play:
        browser = play.chromium.launch(headless=True)
        try:
            for loc in (sys.argv[2:] or ("en", "de")):
                with ThreadPoolExecutor(1) as pool:
                    pool.submit(asyncio.run, prepare(loc)).result()
                for name, device in DEVICES.items():
                    width, height = device["viewport"]
                    ctx = browser.new_context(
                        viewport={"width": width, "height": height},
                        device_scale_factor=device["scale"],
                        is_mobile=device["mobile"],
                        has_touch=device["mobile"],
                        color_scheme="dark",
                        locale=LOCALES[loc],
                        service_workers="block",
                    )
                    ctx.add_init_script(
                        f"localStorage.setItem('dockedSidebar', JSON.stringify('always_hidden'));"
                        f"localStorage.setItem('selectedLanguage', JSON.stringify('{loc}'));"
                    )
                    page = ctx.new_page()
                    page.set_default_timeout(30_000)
                    sign_in(page)
                    page.goto(f"{BASE}/{URL_PATH}/dashboard")
                    settle(page)
                    text = page.evaluate(
                        "() => { const out = []; const walk = (r) => { for (const e of r.querySelectorAll('*')) { if (e.shadowRoot) walk(e.shadowRoot); if (!e.children.length && e.textContent.trim() && e.getBoundingClientRect().width) out.push(e.textContent.trim()); } }; walk(document); return out.join(' | '); }"
                    )
                    assert not STALE.findall(text), f"{loc}/{name}: stale names {STALE.findall(text)}"
                    assert not STALE_NAV[loc].findall(text), f"{loc}/{name}: old view name {STALE_NAV[loc].findall(text)}"
                    leak = (ENGLISH_LEAK if loc == "de" else GERMAN_LEAK).findall(text)
                    assert not leak, f"{loc}/{name}: other language {leak}"
                    save(Image.open(io.BytesIO(page.screenshot())).convert("RGB"), name, loc)
                    print("wrote", f"{loc}/{name}")
                    ctx.close()
        finally:
            browser.close()


if __name__ == "__main__":
    main()
