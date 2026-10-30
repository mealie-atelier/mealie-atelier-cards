"""Recapture the product page shots of the Bring! account card (demo/showcase/<locale>/app-bring-*).

Usage: uv run --with playwright --with pillow python scripts/capture-bring-showcase.py <mealie-url> <token-file> [out-dir]

Runs the standalone web app on ports 5190 (fake Bring!) and 5191 (app) against a Mealie rig that has the
fictional list "Wocheneinkauf" (German) and walks the real connect dialog with the fake Bring! server
(web/test/support/fake-bring-server.mjs, account familie.beispiel@example.com). The English run adds a
temporary Mealie list "Weekly shop" and removes it again. Nothing real is contacted. The dialog is captured in its
connected state: a wide one for the browser frame and a phone one.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
MEALIE, TOKEN_FILE = sys.argv[1], sys.argv[2]
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "demo" / "showcase"
TOKEN = Path(TOKEN_FILE).read_text().strip()
FAKE_PORT, APP_PORT = 5190, 5191
EMAIL, PASSWORD = "familie.beispiel@example.com", "fixture-bring-password"
LOCALES = {
    "de": {"locale": "de-DE", "list": "Wocheneinkauf", "shop": "Einkauf", "nav": "Einkauf"},
    "en": {"locale": "en-US", "list": "Weekly shop", "shop": "Groceries", "nav": "Shopping"},
}


def api(method: str, path: str, body=None):
    request = urllib.request.Request(
        MEALIE + path,
        None if body is None else json.dumps(body).encode(),
        {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(request) as response:
        raw = response.read()
    return json.loads(raw) if raw else None


def control(patch: dict):
    request = urllib.request.Request(
        f"http://127.0.0.1:{FAKE_PORT}/__fake/control", json.dumps(patch).encode(), {"Content-Type": "application/json"}, method="POST"
    )
    urllib.request.urlopen(request).read()


def wait_port(port: int):
    for _ in range(100):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1)
            return
        except urllib.error.HTTPError:
            return
        except Exception:
            time.sleep(0.15)
    raise RuntimeError(f"port {port} did not open")


def save(png: Path, name: str, locale: str, widths: list[int], crop_height: int = 0):
    image = Image.open(png).convert("RGB")
    if crop_height:  # css pixels at twice the density: end below the last button, above the next card
        image = image.crop((0, 0, image.width, crop_height * 2))
    target = OUT / locale
    target.mkdir(parents=True, exist_ok=True)
    for width in widths:
        height = round(image.height * width / image.width)
        image.resize((width, height), Image.LANCZOS).save(target / f"{name}-{width}.webp", "WEBP", quality=86, method=6)
    print(locale, name, image.size)
    return image.size


def connect(browser, lang: str, viewport: dict, scale: int, shot: Path):
    spec = LOCALES[lang]
    context = browser.new_context(
        locale=spec["locale"],
        color_scheme="dark",
        viewport=viewport,
        device_scale_factor=scale,
        http_credentials={"username": "atelier", "password": "polish-passphrase"},
        reduced_motion="reduce",
    )
    page = context.new_page()
    try:
        page.goto(f"http://127.0.0.1:{APP_PORT}/")
        page.locator(".recipe-tile").first.wait_for(timeout=60000)
        page.wait_for_timeout(1500)
        page.locator('[data-action="nav"]', has_text=spec["nav"]).first.click()
        page.locator(".shopping-toolbar").wait_for()
        page.wait_for_timeout(1200)
        page.locator("button.bw-entry").click()
        page.fill('[data-input="sync-bring-email"]', EMAIL)
        page.fill('[data-input="sync-bring-password"]', PASSWORD)
        page.locator('.bw-form button[type="submit"]').click()
        page.locator('[data-input="sync-bw-bring"]').first.wait_for()
        page.locator('[data-action="sync-bw-next"]').click()
        page.locator("label.bw-choice", has_text=spec["list"]).first.click()
        page.locator('[data-action="sync-bw-next"]').click()
        page.locator('[data-action="sync-bw-preview"], .bw-lines').first.wait_for()
        page.wait_for_timeout(800)
        if page.locator('[data-action="sync-bw-preview"]').count():
            page.locator('[data-action="sync-bw-preview"]').click()
        page.locator(".bw-lines").wait_for()
        page.locator('[data-action="sync-bw-next"]').click()
        page.locator('[data-action="sync-bw-send"]').click()
        page.locator(".bw-done").wait_for()
        page.wait_for_timeout(600)
        page.locator('[data-action="sync-bw-status"]').click()
        page.locator('[data-action="sync-bring-disconnect-ask"]').wait_for()
        page.wait_for_timeout(1500)
        page.screenshot(path=str(shot))
    except Exception:
        page.screenshot(path=str(shot.with_suffix(".fail.png")))
        raise
    finally:
        context.close()


def main():
    tmp = Path(tempfile.mkdtemp(prefix="bring-showcase-"))
    procs = []
    created = None
    try:
        fake = subprocess.Popen(
            ["node", str(ROOT / "web/test/support/fake-bring-server.mjs"), str(FAKE_PORT)],
            stdout=subprocess.DEVNULL,
            env=dict(os.environ, FAKE_BRING_EMAIL=EMAIL),
        )
        procs.append(fake)
        wait_port(FAKE_PORT)
        with sync_playwright() as play:
            browser = play.chromium.launch()
            try:
                for lang, spec in LOCALES.items():
                    if lang == "en":
                        created = api("POST", "/api/households/shopping/lists", {"name": spec["list"]})
                        for note in ["Milk", "Eggs", "Lemons", "Rolled oats", "Parmesan", "Basil"]:
                            api("POST", "/api/households/shopping/items", {"shoppingListId": created["id"], "note": note, "quantity": 1})
                    for kind, viewport, name, widths in (
                        ("wide", {"width": 900, "height": 940}, "app-bring-connected", [900, 1800]),
                        ("phone", {"width": 360, "height": 780}, "app-bring-phone", [360, 720]),
                    ):
                        control({"resetLists": True})
                        control({"addList": spec["shop"]})
                        for old in ["Einkauf", "Party"]:
                            if spec["shop"] != old:
                                control({"dropList": old})
                        data = tmp / f"{lang}-{kind}"
                        data.mkdir()
                        env = dict(
                            os.environ, MEALIE_URL=MEALIE, MEALIE_API_TOKEN=TOKEN, ATELIER_PASSWORD="polish-passphrase", ATELIER_DATA_DIR=str(data),
                            BRING_EMAIL="", BRING_PASSWORD="", BRING_API_BASE=f"http://127.0.0.1:{FAKE_PORT}", BRING_API_KEY="fixture-api-key",
                            PORT=str(APP_PORT), HOST="127.0.0.1",
                        )
                        app = subprocess.Popen(["node", str(ROOT / "web/server.mjs")], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT / "web")
                        procs.append(app)
                        try:
                            wait_port(APP_PORT)
                            png = tmp / f"{lang}-{kind}.png"
                            connect(browser, lang, viewport, 2, png)
                            save(png, name, lang, widths, 858 if kind == "wide" else 0)
                        finally:
                            app.terminate()
                            app.wait(10)
                            procs.remove(app)
                    if created:
                        api("DELETE", f"/api/households/shopping/lists/{created['id']}")
                        created = None
            finally:
                browser.close()
    finally:
        if created:
            api("DELETE", f"/api/households/shopping/lists/{created['id']}")
        for proc in procs:
            proc.terminate()
        if not os.environ.get("KEEP_TMP"):
            shutil.rmtree(tmp, ignore_errors=True)  # temp dir created by this script
        else:
            print("kept", tmp)


main()
