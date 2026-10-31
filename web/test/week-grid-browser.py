"""Browser check of the week grid: recipe names in the day cards stay readable at every width.

Run: uv run --with playwright python web/test/week-grid-browser.py [chromium|webkit] [--shots <folder>]

Rules under test, in the live demo (1440x900) and in the web app (1440x900, 1180x820, 1194x834, 1024x768, 390x844):
- a name word of up to 12 letters (a German "Kürbissuppe") always fits the width of its name box;
- no word is split across lines unless the break is a real hyphenation (hyphens: auto with the card language set);
- no text in the grid, a day card or a meal button is wider than its box, and no meal button leaves its day card.
SIZES overrides the web app sizes (for example SIZES=1194x834).
"""

import http.server
import os
import re
import subprocess
import sys
import tempfile
import threading
from functools import partial
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
browser_name = next((a for a in sys.argv[1:] if a in ("chromium", "webkit")), "chromium")
shots = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
if shots:
    shots.mkdir(parents=True, exist_ok=True)


def launch(cmd, env=None):
    p = subprocess.Popen(cmd, cwd=ROOT / "web", env=env or os.environ.copy(), stdout=subprocess.PIPE, text=True, bufsize=1)
    for _ in range(20):
        line = p.stdout.readline().strip()
        match = re.search(r"(?:127\.0\.0\.1:)?(\d{4,5})\b", line)
        if match:
            return p, int(match.group(1))
    raise RuntimeError("server did not start")


# Runs inside the page: reads every week grid of the card and returns the problems it finds.
CHECK = """() => {
  const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".atelier"));
  const root = card.shadowRoot;
  const grids = [...root.querySelectorAll(".week-grid")];
  const problems = [];
  const info = { grids: grids.length, names: 0, columns: 0, nameWidth: 0, hyphenated: 0 };
  const lang = (root.querySelector(".atelier").getAttribute("lang") || "").toLowerCase();
  for (const grid of grids) {
    info.columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const wrapped = [...grid.querySelectorAll(".day")].map((d) => Math.round(d.getBoundingClientRect().top));
    info.rows = new Set(wrapped).size;
    // Text boxes that are wider than themselves are clipped or run out of their card.
    for (const el of grid.querySelectorAll(".day, .day-meal, .day-meal-name, .day-head, .day-head span, .day-head b, .day-meal small, .day-empty")) {
      if (el.scrollWidth > el.clientWidth + 1) problems.push(`${el.className || el.tagName} overflows ${el.scrollWidth} > ${el.clientWidth}`);
    }
    for (const meal of grid.querySelectorAll(".day-meal")) {
      const m = meal.getBoundingClientRect();
      const d = meal.closest(".day").getBoundingClientRect();
      if (m.left < d.left - 0.5 || m.right > d.right + 0.5) problems.push("meal button leaves its day card");
    }
    for (const name of grid.querySelectorAll(".day-meal-name")) {
      info.names++;
      const cs = getComputedStyle(name);
      info.nameWidth = Math.round(name.clientWidth);
      const text = name.textContent;
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;hyphens:none;font:inherit;letter-spacing:inherit";
      name.append(probe);
      const walker = document.createTreeWalker(name, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (probe.contains(node)) continue;
        for (const m of node.data.matchAll(/\\p{L}+/gu)) {
          const word = m[0];
          probe.textContent = word;
          const natural = probe.getBoundingClientRect().width;
          if (word.length <= 12 && natural > name.clientWidth + 0.5) problems.push(`"${word}" needs ${Math.round(natural)}px but the name box has ${name.clientWidth}px`);
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + word.length);
          const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
          if (lines.size > 1) {
            info.hyphenated++;
            if (cs.hyphens !== "auto" || !lang.startsWith("de")) problems.push(`"${word}" is split across lines without a hyphenation break (hyphens ${cs.hyphens}, lang ${lang})`);
          }
        }
      }
      probe.remove();
    }
  }
  return { problems, info };
}"""

problems = []
checked = [0]


def run(page, tag, label):
    page.wait_for_timeout(700)
    result = page.evaluate(CHECK)
    checked[0] += 1
    if not result["info"]["names"]:
        problems.append(f"{tag} {label}: no meal names in the week grid")
    for p in result["problems"][:6]:
        problems.append(f"{tag} {label}: {p}")
    print(f"{tag} {label}: {result['info']}")
    if shots:
        page.screenshot(path=str(shots / f"{tag}-{label}.png"), full_page=True)


demo_dir = tempfile.mkdtemp(prefix="week-grid-demo-")
subprocess.run(["node", "scripts/generate-demo-site.mjs"], cwd=ROOT, env={**os.environ, "ATELIER_DEMO_OUT_DIR": demo_dir}, check=True, stdout=subprocess.DEVNULL)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


static = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=demo_dir))
threading.Thread(target=static.serve_forever, daemon=True).start()

mock, mport = launch(["node", "test/mock-services.mjs"], {**os.environ, "MOCK_LONG_PLAN": "1"})
env = {**os.environ, "MEALIE_URL": f"http://127.0.0.1:{mport}", "MEALIE_API_TOKEN": "LOCAL_TEST_TOKEN",
       "ATELIER_USERNAME": "atelier", "ATELIER_PASSWORD": "test-pass-week-1", "PORT": "0", "HOST": "127.0.0.1",
       "ATELIER_DATA_DIR": tempfile.mkdtemp(prefix="week-grid-"), "BRING_EMAIL": "", "BRING_PASSWORD": ""}
web = None
try:
    web, wport = launch(["node", "server.mjs"], env)
    with sync_playwright() as play:
        browser = getattr(play, browser_name).launch()
        nav = '[data-action="nav"][data-value="%s"]'

        ctx = browser.new_context(locale="de-DE", viewport={"width": 1440, "height": 900}, service_workers="block")
        page = ctx.new_page()
        page.goto(f"http://127.0.0.1:{static.server_address[1]}/de/", wait_until="domcontentloaded")
        page.locator(nav % "mealplan").first.wait_for(timeout=20000)
        page.locator(nav % "mealplan").first.click()
        page.locator(".week-grid").first.wait_for(timeout=10000)
        run(page, f"{browser_name}-demo-1440x900", "mealplan")
        ctx.close()

        sizes = [tuple(int(v) for v in z.split("x")) for z in os.environ.get("SIZES", "1440x900,1180x820,1194x834,1024x768,390x844").split(",")]
        for width, height in sizes:
            phone = width < 600
            ctx = browser.new_context(http_credentials={"username": "atelier", "password": "test-pass-week-1"}, locale="de-DE",
                                      viewport={"width": width, "height": height}, is_mobile=phone, has_touch=phone,
                                      service_workers="block")
            page = ctx.new_page()
            tag = f"{browser_name}-web-{width}x{height}"
            page.goto(f"http://127.0.0.1:{wport}/", wait_until="domcontentloaded")
            page.locator(".recipe-tile, .week-grid").first.wait_for(timeout=20000)
            for view in ("dashboard", "mealplan"):
                page.locator(nav % view).first.click()
                if page.locator(".week-grid").count():
                    page.locator(".week-grid").first.wait_for(timeout=10000)
                    run(page, tag, view)
                elif view == "mealplan":
                    problems.append(f"{tag}: the meal plan view has no week grid")
            ctx.close()
        browser.close()
finally:
    static.shutdown()
    if web:
        web.terminate()
    mock.terminate()

print(f"{browser_name}: {checked[0]} checks, {len(problems)} problems")
for p in problems[:40]:
    print("FAIL", p)
sys.exit(1 if problems else 0)
