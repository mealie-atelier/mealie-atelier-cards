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
from datetime import datetime  # noqa: E402

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
    ctx = browser.new_context(
        viewport=viewport,
        color_scheme=theme,
        locale="en-US",
        device_scale_factor=2,
        is_mobile=phone,
        has_touch=phone,
        service_workers="block",
    )
    # Every shot is taken at the same time of day, so the overview greets the same way on phone and desktop.
    ctx.clock.set_fixed_time(datetime.now().replace(hour=9, minute=0, second=0, microsecond=0))
    return ctx


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
CUTS = """(modal, withBar, margin = 14, tolerance = 0, ingredientsClean = true) => {
  const box = modal.getBoundingClientRect();
  const bar = modal.querySelector(':scope > .modal-close');
  const edges = [[box.bottom - margin, margin]];
  if (bar && withBar) edges.push([bar.getBoundingClientRect().bottom + 13, 7]);
  // The cooking dialog's sticky step bar covers what scrolls under it: its top edge must not cut anything either.
  const actions = modal.querySelector('.cook-actions');
  if (actions) edges.push([actions.getBoundingClientRect().top - 14, 14]);
  let cuts = 0;
  const all = [];
  const collect = (root) => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) collect(el.shadowRoot); } };
  collect(modal);
  for (const el of all) {
    if (el === bar || bar?.contains(el) || el.closest('.cook-actions') || el.closest('.modal-hero') || el.matches('.modal-hero')) continue;
    // The ingredient list runs on like any list in a scrolling dialog: a row border may reach the edge, its text may not.
    if (el.matches('label.ingredient') || (el.closest('label.ingredient') && !ingredientsClean)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.height > 130 || r.width < 4) continue;
    // A group heading just above the edge would stand alone, its card cut off below it.
    if (/^H[1-6]$/.test(el.tagName) || el.matches('.step-group, .group-title') ) { if (r.bottom > box.bottom - 50 && r.top < box.bottom) cuts += 1; continue; }
    if (edges.some(([line, gap]) => r.top < line + gap && r.bottom > line + tolerance)) cuts += 1;
  }
  return cuts;
}"""


def fit_recipe_top(page) -> None:
    """Show the recipe dialog from its top (photo, name, actions) with the product's own layout.

    The dialog is never scrolled, so the photo stays whole. The viewport is shortened (the width follows, same
    aspect as the published 1440 x 960) until the dialog's bottom edge falls between two rows: no ingredient row
    or step card is sliced mid-text, the lists simply continue below the edge.
    """
    modal = page.locator(".modal >> visible=true").first
    modal.evaluate("m => { m.style.transition = 'none'; m.scrollTop = 0; }")
    for height in range(DESKTOP["height"], DESKTOP["height"] - 400, -2):
        page.set_viewport_size({"width": round(height * DESKTOP["width"] / DESKTOP["height"]), "height": height})
        page.wait_for_timeout(250)
        modal.evaluate("m => { m.style.transition = 'none'; m.scrollTop = 0; }")
        if modal.evaluate(CUTS, True) == 0:
            print("recipe viewport height", height)
            page.mouse.move(2, 2)
            page.wait_for_timeout(600)
            return
    raise SystemExit("no viewport height whose dialog bottom edge falls between two rows")


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


# Count the boxes, texts and buttons of a page (shadow roots included) that the bottom edge of the viewport cuts
# through or that end within 14 px of it (those look sliced too).
PAGE_CUTS = """() => {
  const line = innerHeight;
  let cuts = 0;
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (/^(IMG|SVG|PATH|PICTURE|VIDEO|CANVAS)$/i.test(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 130 && r.top > line - 40 && r.top < line && r.width > 100) cuts += 1; // a sliver of a card
      if (r.height < 4 || r.height > 130 || r.width < 4 || r.top >= line) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      const text = el.children.length === 0 && el.textContent.trim();
      const solid = el.tagName === 'BUTTON' || el.tagName === 'INPUT' || /^H[1-6]$/.test(el.tagName) || text;
      if (r.bottom > line || (solid && r.bottom > line - 14)) cuts += 1;
    }
  };
  walk(document);
  return cuts;
}"""


def fit_phone_viewport(page, check) -> None:
    """Shorten the phone viewport until nothing is cut at the bottom edge.

    The width follows (same aspect as the 390 x 844 tile, so nothing is stretched when downscaled; a viewport wider
    than 425 px would switch the card to its tablet layout).
    """
    for offset in range(0, -200, -2):
        height = PHONE["height"] + offset
        width = round(height * PHONE["width"] / PHONE["height"])
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(180)
        if check() == 0:
            print("phone viewport height", height)
            return
    raise SystemExit("no phone viewport height with a clean bottom edge")


TAB_ROW = 74


def scroll_hero_into_view(page) -> None:
    """Scroll the phone page just far enough that the hero card ends with its rounded bottom inside the viewport."""
    box = page.locator("section.hero >> visible=true").first.bounding_box()
    scrolled = page.evaluate("window.scrollY")
    # At least the height of the in-card tab row, so it leaves under the app bar whole instead of showing half.
    shift = max(TAB_ROW, round(box["y"] + box["height"] + scrolled + 18 - PHONE["height"]))
    page.evaluate(f"window.scrollTo(0, {shift})")
    page.wait_for_timeout(400)
    print("phone page scroll", shift)


def scroll_until_clean(page) -> None:
    """Scroll the phone page (it keeps its 425 x 920 viewport) the fewest pixels that leave no cut text at the bottom."""
    for shift in range(0, 160, 2):
        page.evaluate(f"window.scrollTo(0, {shift})")
        page.wait_for_timeout(120)
        if page.evaluate(PAGE_CUTS) == 0:
            print("phone page scroll", shift)
            return
    raise SystemExit("no phone page scroll with a clean bottom edge")


def scroll_cook_dialog(page) -> None:
    """Scroll the cooking dialog (natural size) the fewest pixels that leave no tool or timer card under the step bar."""
    modal = page.locator(".modal >> visible=true").first
    top = modal.evaluate(
        "(m, [cuts, limit]) => { m.style.transition = 'none';"
        " for (let t = 0; t <= limit; t += 1) { m.scrollTop = t; if (eval(cuts)(m, false) === 0) return t; }"
        " return -1; }",
        [CUTS, 500],
    )
    if top < 0:
        raise SystemExit("no cooking dialog scroll without a cut card")
    print("cooking dialog scroll", top)
    page.wait_for_timeout(400)


def fit_desktop_viewport(page, check) -> None:
    """Shorten the desktop viewport (the width follows, same aspect) until the bottom edge falls between two rows."""
    for height in range(DESKTOP["height"], DESKTOP["height"] - 160, -2):
        page.set_viewport_size({"width": round(height * DESKTOP["width"] / DESKTOP["height"]), "height": height})
        page.wait_for_timeout(250)
        if check() == 0:
            print("desktop viewport height", height)
            return
    raise SystemExit("no desktop viewport height with a clean bottom edge")


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
                        scroll_cook_dialog(page)
                    else:
                        fit_recipe_top(page)
                else:
                    view(page, theme, mode)
                    if name == "recipes-dark":
                        fit_desktop_viewport(page, lambda: page.evaluate(PAGE_CUTS))
                        page.mouse.move(2, 2)
                        page.wait_for_timeout(500)
                save(shot(page, tmp), name, (1440, 960))
                page.set_viewport_size(DESKTOP)
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
                    modal = page.locator(".modal >> visible=true").first
                    if step == "cook":
                        start_cooking(page)
                        scroll_cook_dialog(page)
                    else:
                        modal.evaluate("m => { m.scrollTop = 0; }")
                        fit_phone_viewport(page, lambda: modal.evaluate(CUTS, False))
                else:
                    view(page, theme, mode, PHONE_BOARD)
                    if mode == "dashboard":
                        fit_nav(page)
                        scroll_hero_into_view(page)
                    else:
                        scroll_until_clean(page)
                page.mouse.move(2, 2)
                page.wait_for_timeout(500)
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
