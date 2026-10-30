"""Recapture the README screenshots in assets/screens/ from the live test rig.

Usage: uv run --with playwright --with pillow python scripts/capture-readme-shots.py [bridge-dir]

Needs the rig of the Bridge repo (tests/live/rig.sh up, seeded in English) with the current cards
bundle mounted and registered (tests/live/ui_smoke.py). Signs in as the rig user, renders the
`atelier-shots-light` and `atelier-shots-dark` dashboards at twice the pixel density and downscales
to the published size. Fictional data only.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRIDGE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "mealie-atelier-bridge"
LIVE = BRIDGE / "tests" / "live"
sys.path.insert(0, str(LIVE))
ONLY = set(os.environ.get("SHOTS", "").split(",")) - {""}
sys.argv = [sys.argv[0], str(ROOT / "assets" / "screens"), "en"]

import asyncio  # noqa: E402

import capture_screens as cs  # noqa: E402

# The rig's view tabs must use the product's current page names (the bridge default still has the old one).
cs.TITLES["en"] = ["Kitchen", "Recipes", "Meal plan", "Shopping", "Discover"]
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = ROOT / "assets" / "screens"
# Rendered larger than the published 1440 x 960 (same aspect) so tall views fit whole, then downscaled.
DESKTOP = {"width": int(os.environ.get("W", 1650)), "height": int(os.environ.get("H", 1100))}
# Rendered 425 px wide (a large phone) so the first five app menu entries fit without a cut one at the edge,
# then downscaled to the 390 x 844 tile (same aspect).
PHONE = {"width": 425, "height": 920}


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


PHONE_BOARD = "atelier-shots-phone"
# Icons instead of titles keep five view tabs inside a 390 px header without a scroll arrow over the labels.
PHONE_ICONS = [
    "mdi:home-variant-outline",
    "mdi:book-open-page-variant-outline",
    "mdi:calendar-week",
    "mdi:cart-outline",
    "mdi:compass-outline",
]


async def prepare_phone_boards() -> None:
    """Create one dashboard per theme like the shot dashboards, but with icon-only view tabs."""
    async with cs.HaSocket(cs.BASE, cs.read_token(str(LIVE / "state" / "ha-token"))) as socket:
        _, boards = await socket.call({"type": "lovelace/dashboards/list"})
        existing = {item["url_path"] for item in boards or []}
        for theme in ("light", "dark"):
            url_path = f"{PHONE_BOARD}-{theme}"
            if url_path not in existing:
                ok, error = await socket.call(
                    {
                        "type": "lovelace/dashboards/create",
                        "url_path": url_path,
                        "title": "Atelier phone",
                        "mode": "storage",
                        "show_in_sidebar": False,
                    }
                )
                if not ok:
                    raise SystemExit(f"dashboard: {error}")
            views = [
                {
                    "title": title,
                    "icon": icon,
                    "path": mode,
                    "panel": True,
                    "cards": [
                        {
                            "type": "custom:mealie-atelier-card",
                            "mode": mode,
                            "theme": theme,
                            "language": "en",
                        }
                    ],
                }
                for mode, title, icon in zip(cs.MODES, cs.TITLES["en"], PHONE_ICONS, strict=True)
            ]
            ok, error = await socket.call(
                {"type": "lovelace/config/save", "url_path": url_path, "config": {"views": views}}
            )
            if not ok:
                raise SystemExit(f"dashboard config: {error}")


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


def view(page, theme: str, mode: str, board: str = cs.DASHBOARD) -> None:
    page.goto(f"{cs.BASE}/{board}-{theme}/{mode}")
    settle(page)


def open_recipe(page, theme: str, board: str = cs.DASHBOARD) -> None:
    view(page, theme, "recipes", board)
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


# Count the elements of the recipe dialog that a scroll position cuts through or crowds against the header strip
# (the sticky close button draws a strip 13 px below itself) or the bottom edge.
CUTS = """(modal) => {
  const box = modal.getBoundingClientRect();
  const bar = modal.querySelector(':scope > .modal-close');
  const edges = [[box.bottom - 6, 0]];
  if (bar) edges.push([bar.getBoundingClientRect().bottom + 13, 7]);
  let cuts = 0;
  for (const el of modal.querySelectorAll('*')) {
    if (el === bar || bar?.contains(el) || el.closest('.modal-hero') || el.matches('.modal-hero')) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.height > 130 || r.width < 4) continue;
    if (edges.some(([line, gap]) => r.top < line + gap && r.bottom > line)) cuts += 1;
  }
  return cuts;
}"""


def scroll_recipe(page) -> None:
    """Scroll the recipe dialog to the first position where no text or box is cut by an edge.

    The actions, the first ingredients and the first step stay visible; the hero photo is scrolled out.
    """
    modal = page.locator(".modal >> visible=true").first
    for top in range(int(os.environ.get("S0", 215)), 400):
        modal.evaluate(f"m => {{ m.scrollTop = {top}; }}")
        page.wait_for_timeout(60)
        if modal.evaluate(CUTS) == 0:
            break
    else:
        raise SystemExit("no clean scroll position for the recipe dialog")
    print("scroll", top)
    page.mouse.move(2, 2)
    page.wait_for_timeout(600)


FIT_NAV = """(nav) => {
  const items = [...nav.querySelectorAll('button')];
  const edge = nav.getBoundingClientRect();
  for (const first of items) {
    nav.scrollLeft = first.offsetLeft - items[0].offsetLeft;
    const cut = items.some((item) => {
      const r = item.getBoundingClientRect();
      return (r.left < edge.left - 1 && r.right > edge.left + 1) || (r.left < edge.right - 1 && r.right > edge.right + 1);
    });
    if (!cut) return items.indexOf(first);
  }
  return -1;
}"""


def fit_nav(page) -> None:
    """Scroll the phone's app menu so no entry is cut at its edges."""
    first = page.locator(".sidebar .nav >> visible=true").first.evaluate(FIT_NAV)
    if first < 0:
        raise SystemExit("no scroll position of the app menu without a cut entry")
    page.wait_for_timeout(300)


def scroll_to_end(page) -> None:
    """Scroll the cooking dialog to its end so the sticky step bar covers nothing."""
    page.locator(".modal >> visible=true").first.evaluate("m => { m.scrollTop = m.scrollHeight; }")
    page.wait_for_timeout(600)


def shot(page, tmp: Path) -> Path:
    page.screenshot(path=str(tmp))
    return tmp


def main() -> None:
    asyncio.run(cs.prepare())
    asyncio.run(prepare_phone_boards())
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
                if ONLY and name not in ONLY:
                    continue
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
                        scroll_recipe(page)
                else:
                    view(page, theme, mode)
                save(shot(page, tmp), name, (1440, 960))
            for ctx, _ in sessions.values():
                ctx.close()
            browser.close()
            browser = play.chromium.launch(headless=True, args=["--lang=en-US"])
            tiles = []
            for theme, mode, step in phones if not ONLY or "phones" in ONLY else []:
                ctx = context(browser, theme, PHONE, True)
                page = ctx.new_page()
                sign_in(page)
                set_sidebar(page, "always_hidden")
                if step:
                    open_recipe(page, theme, PHONE_BOARD)
                    if step == "cook":
                        start_cooking(page)
                        scroll_to_end(page)
                else:
                    view(page, theme, mode, PHONE_BOARD)
                    if mode == "dashboard":
                        fit_nav(page)
                page.screenshot(path=str(tmp))
                tiles.append(Image.open(tmp).convert("RGB").resize((390, 844), Image.LANCZOS))
                ctx.close()
        finally:
            browser.close()
    if not tiles:
        return
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
