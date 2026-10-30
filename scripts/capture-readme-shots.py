"""Recapture the README screenshots in assets/screens/ from the live test rig.

Usage: uv run --with playwright --with pillow python scripts/capture-readme-shots.py [bridge-dir]

Needs the rig of the Bridge repo (tests/live/rig.sh up, seeded in English) with the current cards
bundle mounted and registered (tests/live/ui_smoke.py). Signs in as the rig user, renders the
`atelier-shots-light` and `atelier-shots-dark` dashboards at twice the pixel density and downscales
to the published size. Fictional data only.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRIDGE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "mealie-atelier-bridge"
LIVE = BRIDGE / "tests" / "live"
sys.path.insert(0, str(LIVE))
sys.argv = [sys.argv[0], str(ROOT / "assets" / "screens"), "en"]

import asyncio  # noqa: E402

import capture_screens as cs  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = ROOT / "assets" / "screens"
DESKTOP = {"width": 1440, "height": 960}
PHONE = {"width": 390, "height": 844}


def save(png: Path, name: str, size: tuple[int, int]) -> Image.Image:
    image = Image.open(png).convert("RGB").resize(size, Image.LANCZOS)
    image.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
    print("ok  ", name, size)
    return image


def context(browser, theme: str, viewport: dict, phone: bool):
    return browser.new_context(
        viewport=viewport,
        color_scheme=theme,
        locale="en-US",
        device_scale_factor=2,
        is_mobile=phone,
        has_touch=phone,
        service_workers="block",
    )


def sign_in(page) -> None:
    page.goto(f"{cs.BASE}/{cs.DASHBOARD}-light/dashboard")
    page.wait_for_url("**/auth/authorize**", timeout=30_000)
    page.locator("input[name='username']").fill("atelier")
    page.locator("input[name='password']").fill("atelier-test-only")
    page.keyboard.press("Enter")
    page.wait_for_url(lambda url: "auth_callback" not in url and cs.DASHBOARD in url, timeout=30_000)


def settle(page) -> None:
    """Wait for card content and decoded photos; the network never idles (live cooking state)."""
    page.locator("mealie-atelier-card .view-stage").first.wait_for(timeout=60_000)
    page.wait_for_function("!document.getElementById('ha-launch-screen')", timeout=60_000)
    page.wait_for_timeout(1500)
    for img in page.locator("mealie-atelier-card img >> visible=true").all():
        img.evaluate(
            "img => Promise.race([img.decode().catch(() => null),"
            " new Promise(done => setTimeout(done, 4000))])"
        )
    page.wait_for_timeout(900)


def set_sidebar(page, mode: str) -> None:
    page.evaluate(f"localStorage.setItem('dockedSidebar', JSON.stringify('{mode}'))")
    page.reload()
    page.wait_for_load_state("domcontentloaded")


def view(page, theme: str, mode: str) -> None:
    page.goto(f"{cs.BASE}/{cs.DASHBOARD}-{theme}/{mode}")
    settle(page)


def open_recipe(page, theme: str) -> None:
    view(page, theme, "recipes")
    page.locator(".recipe-tile >> visible=true").first.click()
    page.locator("[data-action='cook-start'] >> visible=true").wait_for()
    settle(page)


def start_cooking(page) -> None:
    page.locator("[data-action='cook-start'] >> visible=true").click()
    replace = page.get_by_role("button", name="Replace session")
    page.wait_for_timeout(800)
    if replace.count():
        # A cooking session of an earlier run is still shared in Home Assistant: take it over.
        replace.first.click()
    page.locator("[data-action='cook-next'] >> visible=true").wait_for()
    settle(page)


def shot(page, tmp: Path) -> Path:
    page.screenshot(path=str(tmp))
    return tmp


def main() -> None:
    asyncio.run(cs.prepare())
    tmp = Path(sys.argv[0]).resolve().parent / ".shot.png"
    desktop = [
        ("dashboard-light", "light", "dashboard", None),
        ("dashboard-dark", "dark", "dashboard", None),
        ("recipes-dark", "dark", "recipes", None),
        ("mealplan-light", "light", "mealplan", None),
        ("shopping-dark", "dark", "shopping", None),
        ("discover-light", "light", "discover", None),
        ("recipe-light", "light", "recipes", "recipe"),
        ("cook-dark", "dark", "recipes", "cook"),
    ]
    phones = [
        ("light", "dashboard", None),
        ("dark", "recipes", "recipe"),
        ("light", "recipes", "cook"),
        ("dark", "shopping", None),
    ]
    with sync_playwright() as play:
        browser = play.chromium.launch(headless=True, args=["--lang=en-US"])
        try:
            sessions = {}
            for name, theme, mode, step in desktop:
                if theme not in sessions:
                    ctx = context(browser, theme, DESKTOP, False)
                    page = ctx.new_page()
                    sign_in(page)
                    set_sidebar(page, "docked")
                    sessions[theme] = (ctx, page)
                page = sessions[theme][1]
                if step:
                    open_recipe(page, theme)
                    if step == "cook":
                        start_cooking(page)
                else:
                    view(page, theme, mode)
                save(shot(page, tmp), name, (1440, 960))
            for ctx, _ in sessions.values():
                ctx.close()
            browser.close()
            browser = play.chromium.launch(headless=True, args=["--lang=en-US"])
            tiles = []
            for theme, mode, step in phones:
                ctx = context(browser, theme, PHONE, True)
                page = ctx.new_page()
                sign_in(page)
                set_sidebar(page, "always_hidden")
                if step:
                    open_recipe(page, theme)
                    if step == "cook":
                        start_cooking(page)
                else:
                    view(page, theme, mode)
                page.screenshot(path=str(tmp))
                tiles.append(Image.open(tmp).convert("RGB").resize((390, 844), Image.LANCZOS))
                ctx.close()
        finally:
            browser.close()
    sheet = Image.new("RGBA", (4 * 390 + 3 * 36, 844), (0, 0, 0, 0))
    for index, tile in enumerate(tiles):
        mask = Image.new("L", tile.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, *tile.size), radius=24, fill=255)
        sheet.paste(tile, (index * (390 + 36), 0), mask)
    sheet.save(OUT / "phones.webp", "WEBP", quality=88, method=6)
    print("ok   phones", sheet.size)
    tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
