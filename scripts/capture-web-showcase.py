"""Recapture web/assets/showcase-desktop.png from the standalone web app run against the test rig.

Usage: uv run --with playwright --with pillow python scripts/capture-web-showcase.py <url> <user> <password>

Start the web app first (cd web; MEALIE_URL=... MEALIE_API_TOKEN=... ATELIER_USERNAME=...
ATELIER_PASSWORD=... node server.mjs) against the English rig. Dark theme, 1480 px wide, the top
2016 px of the overview, rendered at twice the density and downscaled.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

url, user, password = sys.argv[1:4]
OUT = Path(__file__).resolve().parent.parent / "web" / "assets" / "showcase-desktop.png"
TMP = OUT.with_suffix(".tmp.png")

with sync_playwright() as play:
    browser = play.chromium.launch(headless=True)
    try:
        context = browser.new_context(
            viewport={"width": 1480, "height": 1000},
            device_scale_factor=2,
            color_scheme="dark",
            locale="en-US",
            http_credentials={"username": user, "password": password},
        )
        page = context.new_page()
        page.goto(url)
        page.locator(".view-stage").first.wait_for(timeout=60_000)
        page.wait_for_timeout(5000)
        page.screenshot(path=str(TMP), full_page=True, clip={"x": 0, "y": 0, "width": 1480, "height": 2016})
    finally:
        browser.close()
Image.open(TMP).convert("RGB").resize((1480, 2016), Image.LANCZOS).save(OUT, optimize=True)
TMP.unlink()
print("ok", OUT)
