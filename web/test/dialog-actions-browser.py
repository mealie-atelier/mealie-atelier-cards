"""Browser check of dialog action rows, the photo-index badge contrast, checkbox rows and lining figures.

Run: uv run --with playwright python web/test/dialog-actions-browser.py [chromium|webkit]

The real card is loaded from the built bundle (dist/mealie-atelier-cards.js) and rendered in a real browser, so
every value below is a computed style or a measured box, never a source pattern.

- Dialogs whose action row sits directly in an editor card ("Erledigte entfernen") show no empty band above the
  buttons, and paired buttons are equally tall.
- The "ATELIER / 01" badge on a photoless tile has at least 4.5:1 contrast in light mode, measured against the
  lightest colour of the tile gradient and over pure white.
- Checkbox label rows in studio forms center the box on the text (issue 55).
- Headings and counters use lining figures, so a zero is not an "o" (issue 118).
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "dist" / "mealie-atelier-cards.js"
name = next((a for a in sys.argv[1:] if a in ("chromium", "webkit")), "chromium")

SETUP = """(opts) => {
  document.body.innerHTML = "";
  const c = document.createElement("mealie-atelier-card");
  document.body.appendChild(c);
  c.setConfig({ type: "custom:mealie-atelier-card", theme: opts.theme || "dark" });
  c._didLoad = true;
  c._status = { entries: [{ entry_id: "e1", can_write: true, can_manage: true }] };
  c._data = {
    shopping: { items: [{ id: "1", shoppingListId: "L", checked: true, display: "Milk", note: "Milk" }], lists: [{ id: "L", name: "Groceries" }] },
    recipes: { items: opts.recipes || [] },
  };
  c._activeList = "L";
  Object.assign(c, opts.fields || {});
  c._render();
  return true;
}"""

MEASURE = """() => {
  const card = document.querySelector("mealie-atelier-card");
  const r = card.shadowRoot;
  const box = (el) => el.getBoundingClientRect();
  const actions = r.querySelector(".modal .form-actions");
  // The element right above the buttons: the last form row, or the dialog lead when the buttons sit alone in a card.
  const anchor = actions.previousElementSibling || r.querySelector(".modal .editor-lead");
  return {
    gap: box(actions).top - box(anchor).bottom,
    heights: [...actions.querySelectorAll(":scope > .btn")].map((b) => box(b).height),
    inCard: !!actions.closest(".editor-card") && actions.parentElement.classList.contains("editor-card"),
  };
}"""

problems = []
checked = [0]


def check(ok, msg):
    checked[0] += 1
    if not ok:
        problems.append(msg)


def lum(rgb):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


with sync_playwright() as play:
    browser = getattr(play, name).launch()
    for width in (390, 1280):
        page = browser.new_page(viewport={"width": width, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.set_content("<body></body>")
        page.add_script_tag(path=str(BUNDLE))
        tag = f"{name}-{width}"

        dialogs = {
            "shopping-clear": {},
            "create": {},
            "import": {},
            "create-list": {},
            "shopping-edit": {"_shoppingEditId": "1"},
            # Action row after a field and a checkbox row inside one card: it must keep its normal gap.
            "journal": {"_detail": {"slug": "r1", "name": "Recipe 1", "id": "1"}},
        }
        for modal, extra in dialogs.items():
            page.evaluate(SETUP, {"fields": {"_modal": modal, **extra}})
            m = page.evaluate(MEASURE)
            check(m["gap"] <= 26, f"{tag} {modal}: {m['gap']:.1f}px between content and buttons (empty band)")
            if modal == "journal":
                check(m["gap"] >= 12, f"{tag} {modal}: buttons sit flush against the last field ({m['gap']:.1f}px)")
            hs = m["heights"]
            check(len(hs) >= 1 and max(hs) - min(hs) < 0.5, f"{tag} {modal}: button heights differ {hs}")
            if modal == "shopping-clear":
                check(m["inCard"] and len(hs) == 2, f"{tag}: clear dialog no longer renders its actions directly in an editor card")

        # Photoless tile badge in light mode.
        page.evaluate(SETUP, {"theme": "light", "fields": {"_view": "recipes"}, "recipes": [
            {"id": str(i), "slug": f"r{i}", "name": f"Recipe {i}", "image": None, "recipeCategory": [], "totalTime": ""} for i in range(4)]})
        tiles = page.evaluate("""() => {
          const r = document.querySelector("mealie-atelier-card").shadowRoot;
          const out = [];
          for (const el of r.querySelectorAll(".recipe-tile .photo-index")) {
            const bg = getComputedStyle(el).backgroundColor;
            const fg = getComputedStyle(el).color;
            const grad = getComputedStyle(el.closest(".tile-image")).backgroundImage;
            out.push({ bg, fg, grad, size: getComputedStyle(el).fontSize });
          }
          return out;
        }""")
        check(len(tiles) >= 4, f"{tag}: expected photoless tiles with a badge, found {len(tiles)}")

        def nums(s):
            import re
            return [float(x) for x in re.findall(r"[\d.]+", s)]

        for t in tiles:
            import re
            bg = nums(t["bg"])
            fg = nums(t["fg"])[:3]
            stops = [nums(m)[:3] for m in re.findall(r"rgba?\([^)]*\)", t["grad"])]
            check(len(stops) >= 2, f"{tag}: no gradient stops read from {t['grad'][:60]}")
            # White is the worst backdrop the badge can meet (a photo highlight or the bare card), so it is checked too.
            for stop in stops + [[255.0, 255.0, 255.0]]:
                a = bg[3] if len(bg) > 3 else 1
                comp = [bg[i] * a + stop[i] * (1 - a) for i in range(3)]
                c = contrast(fg, comp)
                check(c >= 4.5, f"{tag}: photo-index contrast {c:.2f}:1 over gradient stop {stop} (needs 4.5:1)")

        # Checkbox rows center the box on the text (issue 55) and headings use lining figures (issue 118).
        res = page.evaluate("""() => {
          const r = document.querySelector("mealie-atelier-card").shadowRoot;
          const host = r.querySelector(".atelier");
          const form = document.createElement("form");
          form.className = "studio-form";
          form.innerHTML = '<label class="studio-inline"><input type="checkbox"><span>Als Grundvorrat behalten, ein recht langer Text der auf dem Telefon in mehrere Zeilen umbrechen muss</span></label>';
          host.appendChild(form);
          const row = form.querySelector(".studio-inline");
          const box = form.querySelector("input").getBoundingClientRect();
          const text = form.querySelector("span").getBoundingClientRect();
          const out = { align: getComputedStyle(row).alignItems, boxMid: box.top + box.height / 2, textMid: text.top + text.height / 2, lines: Math.round(text.height / parseFloat(getComputedStyle(form.querySelector("span")).lineHeight || 18)) };
          form.remove();
          const h = document.createElement("h2");
          h.textContent = "0 / 10";
          host.appendChild(h);
          out.figures = getComputedStyle(h).fontFeatureSettings + "|" + getComputedStyle(h).fontVariantNumeric;
          h.remove();
          return out;
        }""")
        check(res["align"] != "flex-start", f"{tag}: checkbox row aligns to flex-start")
        check(abs(res["boxMid"] - res["textMid"]) < 3, f"{tag}: checkbox center {res['boxMid']:.1f} vs text center {res['textMid']:.1f}")
        check("lnum" in res["figures"] or "lining-nums" in res["figures"], f"{tag}: heading figures are not lining ({res['figures']})")
        check(not errors, f"{tag}: page errors {errors}")
        page.close()
    browser.close()

print(f"{name}: {checked[0]} checks, {len(problems)} problems")
for p in problems[:40]:
    print("FAIL", p)
sys.exit(1 if problems else 0)
