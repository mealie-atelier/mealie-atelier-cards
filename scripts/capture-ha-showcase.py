"""Recapture the Home Assistant dashboard shots of the product page from the live test rig.

  ha-desktop-dashboard  1600 x 1000, the overview inside Home Assistant (header tabs, sidebar hidden)
  ha-phone-dashboard    720 x 1558, the same on a phone
  ha-integration        1600 x 1000, the Bridge integration page (sidebar docked, version read from the running Bridge)

Needs the rig of the bridge repo (Home Assistant on :18123 with the card bundle from `npm run build` at
www/community/mealie-atelier-cards/ and Mealie seeded from demo/data/recipes.json), fictional data only.
The dashboard tabs are named like the card's own navigation (Discover, not Cook ideas).

Usage:
  uv run --with playwright --with pillow python scripts/capture-ha-showcase.py <bridge-repo>/tests/live [de] [en]
The recipe names on the shots are the language the rig was seeded in (seed_mealie.py ... de|en): capture a
language only while the rig is seeded in it.
The ha-integration shot needs the rig to run the Bridge of this release (restart Home Assistant after copying
custom_components/mealie_atelier): a gate fails the run when the page shows another version than package.json.
It switches the rig user's profile language, the map dashboard title and the sidebar dashboards for the shot and
puts all of them back in a finally block.
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
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
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


INTEGRATION = "ha-integration"
INTEGRATION_PATH = "/config/integrations/integration/mealie_atelier"
MAP_TITLE = {"de": "Karte", "en": "Map"}
TEXT_JS = (
    "() => { const out = []; const walk = (r) => { for (const e of r.querySelectorAll('*')) { if (e.shadowRoot) walk(e.shadowRoot);"
    " if (!e.children.length && e.textContent.trim() && e.getBoundingClientRect().width) out.push(e.textContent.trim()); } };"
    " walk(document); return out.join(' | '); }"
)


async def set_integration_rig(loc):
    """Put the profile language, map title and sidebar in the state of the shot; return what to restore."""
    async with HaSocket(BASE, read_token(str(LIVE / "state" / "ha-token"))) as socket:
        _, dashboards = await socket.call({"type": "lovelace/dashboards/list"})
        _, data = await socket.call({"type": "frontend/get_user_data", "key": "language"})
        saved = {
            "language": (data or {}).get("value"),
            "dashboards": {d["id"]: {"title": d["title"], "show_in_sidebar": d["show_in_sidebar"]} for d in dashboards or []},
        }
        ok, error = await socket.call({"type": "frontend/set_user_data", "key": "language", "value": {"language": loc}})
        assert ok, error
        for board in dashboards or []:
            wanted = {"show_in_sidebar": False} if board["id"] != "map" else {"title": MAP_TITLE[loc]}
            if any(board.get(key) != value for key, value in wanted.items()):
                ok, error = await socket.call({"type": "lovelace/dashboards/update", "dashboard_id": board["id"], **wanted})
                assert ok, error
        return saved


async def restore_integration_rig(saved):
    async with HaSocket(BASE, read_token(str(LIVE / "state" / "ha-token"))) as socket:
        if saved["language"] is not None:
            await socket.call({"type": "frontend/set_user_data", "key": "language", "value": saved["language"]})
        for dashboard_id, original in saved["dashboards"].items():
            await socket.call({"type": "lovelace/dashboards/update", "dashboard_id": dashboard_id, **original})


def run_async(coroutine):
    with ThreadPoolExecutor(1) as pool:
        return pool.submit(asyncio.run, coroutine).result()


def capture_integration(browser, loc):
    """The Bridge integration page the way the setup guide shows it, in the profile language of the locale."""
    saved = run_async(set_integration_rig(loc))
    try:
        ctx = browser.new_context(
            viewport={"width": 1600, "height": 1000},
            color_scheme="dark",
            locale=LOCALES[loc],
            service_workers="block",
        )
        ctx.add_init_script(
            f"localStorage.setItem('dockedSidebar', JSON.stringify('docked'));"
            f"localStorage.setItem('selectedLanguage', JSON.stringify('{loc}'));"
        )
        page = ctx.new_page()
        page.set_default_timeout(30_000)
        sign_in(page)
        page.goto(f"{BASE}{INTEGRATION_PATH}")
        page.get_by_text("Mealie Atelier Bridge").first.wait_for(timeout=60_000)
        page.wait_for_function("!document.getElementById('ha-launch-screen')", timeout=60_000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        text = page.evaluate(TEXT_JS)
        versions = re.findall(r"Version (\d+\.\d+\.\d+)", text)
        assert versions == [VERSION], f"{loc}/{INTEGRATION}: page shows versions {versions}, package.json says {VERSION}"
        save(Image.open(io.BytesIO(page.screenshot())).convert("RGB"), INTEGRATION, loc)
        print("wrote", f"{loc}/{INTEGRATION}")
        ctx.close()
    finally:
        run_async(restore_integration_rig(saved))


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
                run_async(prepare(loc))
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
                    text = page.evaluate(TEXT_JS)
                    assert not STALE.findall(text), f"{loc}/{name}: stale names {STALE.findall(text)}"
                    assert not STALE_NAV[loc].findall(text), f"{loc}/{name}: old view name {STALE_NAV[loc].findall(text)}"
                    leak = (ENGLISH_LEAK if loc == "de" else GERMAN_LEAK).findall(text)
                    assert not leak, f"{loc}/{name}: other language {leak}"
                    save(Image.open(io.BytesIO(page.screenshot())).convert("RGB"), name, loc)
                    print("wrote", f"{loc}/{name}")
                    ctx.close()
                capture_integration(browser, loc)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
