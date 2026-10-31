"""Capture the two hero screens of the product page from the built public demo.

  hero-tablet-cook     cooking mode of Gnocchi alla Sorrentina, step 1, kitchen timer reading 07:28
  hero-phone-shopping  shopping list "Wocheneinkauf" filled from the same recipe, two items ticked (they sink
                       to the "done" group at the end of the list), scrolled so that the list name, all
                       nine ingredients and the done group are on screen, tab rail on whole tabs

The shots come from the real cards with the fixture data of the demo, a frozen clock and no pixel
retouching. Every gate below fails the run instead of fixing a picture afterwards.

Besides the images the run writes demo/showcase/hero-capture.json: what every gate measured plus the sha256
of each published file. test/demo-site.test.mjs reads it, so a capture that broke a gate cannot be committed.

Usage (after `npm run build:demo`):
  npm run capture:hero
  uv run --with playwright --with pillow python scripts/capture-hero.py [site-dir] [showcase-dir]
"""

import datetime
import hashlib
import socket
import io
import os
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "demo/public-site"
SHOWCASE = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "demo/showcase"
# HERO_SCREENS=phone captures only the phone screen and keeps the published tablet files and their report.
PHONE_ONLY = os.environ.get("HERO_SCREENS") == "phone"
# HERO_LOCALES=de captures only the listed locales and keeps the report and files of the others.
LOCALES = os.environ.get("HERO_LOCALES", "de,en").split(",")
RECIPE = "gnocchi-alla-sorrentina"
CLOCK = datetime.datetime(2026, 10, 26, 18, 52, 0)
TABLET_WIDTHS = [800, 1200, 1600]
WEBP_QUALITY = 82
# The tablet carries a dish photo, so its 1600w file would pass the 163 KB budget at 82. 78 keeps it under.
TABLET_QUALITY = 78
PHONE_WIDTHS = [400, 700, 1179]
# 1180 x 900: the dialog is 810 px high and the step column with the running timer of the shot is a little taller than
# that, so it scrolls and the Back and Next bar is pinned over its lower end at rest (product layout, nothing is
# restyled for the shot). The shot is taken with the column scrolled to its end, as a cook who has read down to the
# footnote sees it: the footnote then stands above the bar. The clip ends under the footnote, a little before that
# bar, and the gate below checks that nothing inside the clip is cut and the footnote clears the bar.
# The picture is 2096 x 1470 (aspect 1.426, close to the 1.424 of an iPad Air frame). The CSS stage aspect (100 / 71)
# follows this picture.
TABLET_VIEWPORT = {"width": 1180, "height": 900}
FOOT_MARGIN = 5  # CSS px between the footnote and the lower clip edge
# Viewport heights tried for the phone (CSS px, 393 wide, status bar drawn by the page not counted), the one
# nearest to 798 (an iPhone screen without its status bar) whose lower edge cuts no row is used.
PHONE_HEIGHTS = sorted(range(700, 861), key=lambda h: abs(h - 798))
SHAVE = 2  # device pixels cut from each side of the dialog clip (anti aliased edge)

TEXT = {
    "de": dict(locale="de-DE", label="Sauce köcheln", list="Wocheneinkauf", first="Kartoffelgnocchi", tick=["Kirschtomaten", "Olivenöl"], done="2/9 erledigt"),
    "en": dict(locale="en-US", label="Simmer the sauce", list="Weekly shop", first="potato gnocchi", tick=["cherry tomatoes", "olive oil"], done="2/9 done"),
}
GERMAN_LEAK = re.compile(r"\b(Heute|Einkauf|Rezept|Zutaten|Schritt)\b")
ENGLISH_LEAK = re.compile(r"\b(Today|Recipe|Ingredients|Step|Cooking mode)\b")
# Names the views carried before they were renamed (the family view is "Cook together" / "Gemeinsam kochen").
STALE_VIEW_NAMES = {
    "en": re.compile(r"\b(Family|Cook ideas|Meal planner)\b", re.I),
    "de": re.compile(r"\bFamilie\b", re.I),
}

FILL = (
    "mealie-atelier-card{position:fixed!important;inset:0!important;z-index:9999!important;margin:0!important;"
    "max-width:none!important;width:100vw!important;height:100vh!important;overflow:auto!important;"
    "border-radius:0!important;border:0!important;box-shadow:none!important}"
)
# Capture only: the dialog is framed by the CSS device, so its own corners and border are removed.
MODAL_FLAT = ".modal{border-radius:0!important;border:0!important;box-shadow:none!important}"
# Capture only: the screen is framed by the CSS device, so the card draws no border line of its own. Its
# `overflow: hidden` would make the card the scroll container of the sticky tab rail, so the rail would scroll
# away inside the fixed capture box. Without it the rail sticks to the box, as it sticks to the page on a phone.
CARD_FLAT = ".atelier{border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}"
# The phone tab rail fades 12 px at the start (corners.css, the snap position of a tab is that same 12 px) and at
# the end from where the last whole tab ends (at least 12 px, --nav-fade). Nothing of the rail is restyled for the
# capture: only its scroll position is chosen, see RAIL_JS.
RAIL_FADE = 12
# The tab the rail has to show whole next to the active one (the renamed family view).
RAIL_NEED = {"en": "Cook together", "de": "Gemeinsam kochen"}

CUT_JS = """(card, opts) => {
  // opts.sel: element that frames the shot (default the viewport); opts.top / opts.bottom: shot edges inside it.
  const out = [];
  const sel = opts.sel;
  const frame = sel ? card.shadowRoot.querySelector(sel).getBoundingClientRect() : { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const view = { l: frame.left, t: opts.top ?? frame.top, w: frame.right, h: opts.bottom ?? frame.bottom };
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) walk(el.shadowRoot);
      if (!el.matches('button,input,label,p,h1,h2,h3,strong,small,time,span,a,li')) continue;
      // Text elements are judged by their text, form fields (the add item bar, the list picker) by their box.
      const field = el.matches('input,select,textarea');
      if (!field && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (el.closest('.sidebar .nav')) continue; // the tab rail has its own gate
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      // Vertical: an element that shows more than a fifth of its height but not all of it is cut.
      // Less than that is box padding, no glyph reaches the edge. A field has no padding to hide in: any
      // visible sliver of it is a cut.
      const shown = Math.min(b.bottom, view.h) - Math.max(b.top, view.t);
      const share = shown / b.height;
      if (b.left < view.l - 0.5 || b.right > view.w + 0.5 || (share > (field ? 0.02 : 0.2) && share < 0.98))
        out.push((el.textContent || '').trim().slice(0, 40));
    }
  };
  walk(sel ? card.shadowRoot.querySelector(sel) : card.shadowRoot);
  return out;
}"""

LIST_GAP = 14  # CSS px between the tab rail and the list picker after scrolling

# Scrolls the card so that the list picker sits LIST_GAP px under the sticky tab rail.
SCROLL_TO_LIST_JS = """(card, gap) => {
  const r = card.shadowRoot;
  card.scrollTo({ top: 0, behavior: 'instant' });
  const rail = r.querySelector('.sidebar .nav').closest('.sidebar') || r.querySelector('.sidebar .nav');
  const select = r.querySelector('select');
  const delta = select.getBoundingClientRect().top - rail.getBoundingClientRect().bottom - gap;
  card.scrollTo({ top: Math.max(0, delta), behavior: 'instant' });
}"""

RAIL_BOTTOM_JS = """(card) => {
  const r = card.shadowRoot;
  const rail = r.querySelector('.sidebar .nav').closest('.sidebar') || r.querySelector('.sidebar .nav');
  return rail.getBoundingClientRect().bottom;
}"""

# What the list shows: every row complete between the rail and the lower edge, how many are ticked.
ROWS_JS = """(card, gap) => {
  const r = card.shadowRoot;
  const rail = r.querySelector('.sidebar .nav').closest('.sidebar') || r.querySelector('.sidebar .nav');
  const top = rail.getBoundingClientRect().bottom;
  const rows = [...r.querySelectorAll('.shopping-row')];
  const shown = (e) => { const b = e.getBoundingClientRect(); return b.top >= top - 0.5 && b.bottom <= innerHeight + 0.5; };
  const ticked = rows.filter((e) => e.classList.contains('checked'));
  const names = (list) => list.map((e) => e.querySelector('.shopping-name').textContent.trim());
  return {
    total: rows.length,
    ticked: ticked.length,
    open: rows.length - ticked.length,
    allShown: rows.length > 0 && rows.every(shown),
    tickedShown: ticked.filter(shown).length,
    tickedNames: names(ticked),
    checkedAria: ticked.every((e) => e.querySelector('[role=checkbox]').getAttribute('aria-checked') === 'true'),
  };
}"""

RAIL_JS = """(card, [fade, need]) => {
  // Only the scroll position of the real rail is chosen. The product fades the rail 12 px at the start and, at the
  // end, from where the last whole tab ends (--nav-fade, at least 12 px), so a tab at the end only ever sits inside
  // the fade. A tab is whole when its icon and label sit in the opaque part. A position is taken when no tab straddles
  // the edge of the opaque part, the active tab and the tab named `need` are whole and at least three tabs are whole.
  // Among those the one with the most even gaps left and right wins.
  const rail = card.shadowRoot.querySelector('.sidebar .nav');
  const base = rail.getBoundingClientRect();
  const W = rail.clientWidth;
  const tabs = [...rail.children].map((b) => {
    const r = b.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(b).paddingLeft);
    return { text: b.textContent.trim(), left: r.left - base.left + rail.scrollLeft, width: r.width, pad, active: b.classList.contains('active') };
  });
  const max = rail.scrollWidth - rail.clientWidth;
  const evaluate = (s) => {
    const fadeL = s > 1 ? fade : 0;
    let fadeR = 0;
    if (s < max - 1) {
      let last = 0;
      for (const t of tabs) { const r = t.left + t.width - s; if (r <= W + 0.5 && r > last) last = r; }
      fadeR = Math.max(fade, Math.ceil(W - last));
    }
    const whole = [];
    for (const [i, t] of tabs.entries()) {
      const cl = t.left - s + t.pad, cr = t.left + t.width - s - t.pad;
      if (cl >= fadeL - 0.5 && cr <= W - fadeR + 0.5) { whole.push(i); continue; }
      const straddlesLeft = cl < fadeL - 0.5 && cr > fadeL + 0.5, straddlesRight = cl < W - fadeR - 0.5 && cr > W - fadeR + 0.5;
      if (straddlesLeft || straddlesRight) return null;
    }
    if (whole.length < 3 || !whole.some((i) => tabs[i].active) || !whole.some((i) => tabs[i].text === need)) return null;
    const first = tabs[whole[0]], last = tabs[whole[whole.length - 1]];
    const gapL = first.left - s, gapR = W - (last.left + last.width - s);
    return { whole: whole.map((i) => tabs[i].text), gapL, gapR, skew: Math.abs(gapL - gapR) };
  };
  let best = null;
  const candidates = new Set();
  // The rail snaps (mandatory): the browser moves any scroll position to a snap point. So every wanted
  // position is tried on the real rail and judged at the position the browser actually settles on.
  for (const t of tabs) { candidates.add(t.left - fade); candidates.add(t.left + t.width - (W - fade)); candidates.add(t.left); }
  candidates.add(max);
  const reached = new Set();
  for (const raw of candidates) {
    rail.scrollTo({ left: Math.min(max, Math.max(0, raw)), behavior: 'instant' });
    reached.add(Math.round(rail.scrollLeft * 100) / 100);
  }
  for (const s of reached) {
    const e = evaluate(s);
    if (e && (!best || e.skew < best.skew)) best = { s, ...e };
  }
  if (!best) return { failed: true, reached: [...reached], tabs: tabs.map((t) => [t.text, Math.round(t.left), Math.round(t.width)]), W };
  rail.scrollTo({ left: best.s, behavior: 'instant' });
  return best;
}"""

RAIL_CHECK_JS = """(card, [fade]) => {
  // Read from the real rail after the product has set its fade: the end fade is --nav-fade wide.
  const rail = card.shadowRoot.querySelector('.sidebar .nav');
  const r = rail.getBoundingClientRect();
  const max = rail.scrollWidth - rail.clientWidth;
  const fadeL = rail.scrollLeft > 1 ? fade : 0;
  const fadeR = rail.scrollLeft < max - 1 ? Math.max(fade, parseFloat(rail.style.getPropertyValue('--nav-fade')) || 0) : 0;
  const tabs = [...rail.children].map((b) => {
    const pad = parseFloat(getComputedStyle(b).paddingLeft);
    const box = b.getBoundingClientRect();
    return { text: b.textContent.trim(), box, content: { left: box.left + pad - r.left, right: box.right - pad - r.left }, active: b.classList.contains('active') };
  });
  const whole = (t) => t.content.left >= fadeL - 0.5 && t.content.right <= r.width - fadeR + 0.5;
  // Cut: content that straddles the edge of the opaque part, so half a label would show at full strength.
  const edge = (t, x) => t.content.left < x - 0.5 && t.content.right > x + 0.5;
  const cut = tabs.filter((t) => !whole(t) && (edge(t, fadeL) || edge(t, r.width - fadeR))).map((t) => t.text);
  const shown = tabs.filter(whole);
  const active = tabs.find((t) => t.active);
  return {
    scrollLeft: rail.scrollLeft,
    fadeRight: fadeR,
    // The next tab starts inside the end fade: the rail does not look as if it ended.
    peek: fadeR === 0 || tabs.some((t) => !whole(t) && t.content.left > r.width - fadeR - 0.5 && t.content.left < r.width - 4),
    cut,
    activeWhole: whole(active),
    shown: shown.map((t) => t.text),
    labels: tabs.map((t) => t.text),
    gapLeft: Math.round(shown[0].box.left - r.left),
    gapRight: Math.round(r.right - shown[shown.length - 1].box.right),
  };
}"""


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


PORT = free_port()


def blur_everything(page, card):
    page.evaluate("document.activeElement && document.activeElement.blur()")
    card.evaluate("c => c.shadowRoot.activeElement && c.shadowRoot.activeElement.blur()")
    page.mouse.move(0, 0)


def open_page(browser, loc, viewport, scale, mobile, url_tail, style=FILL):
    ctx = browser.new_context(
        viewport=viewport,
        device_scale_factor=scale,
        is_mobile=mobile,
        has_touch=mobile,
        color_scheme="dark",
        reduced_motion="reduce",
        locale=TEXT[loc]["locale"],
    )
    page = ctx.new_page()
    page.clock.install(time=CLOCK)
    page.goto(f"http://localhost:{PORT}/{loc}/{url_tail}")
    page.clock.run_for(3000)
    page.wait_for_load_state("networkidle")
    page.add_style_tag(content=style)
    page.clock.run_for(800)
    card = page.locator("mealie-atelier-card")
    for _ in range(30):
        if page.evaluate("!!document.querySelector('mealie-atelier-card')?.shadowRoot"):
            break
        page.clock.run_for(500)
        page.wait_for_timeout(100)
    # The page clock is a fake: give the recipe link time to open its dialog, step by step.
    for _ in range(30):
        if "?recipe=" not in url_tail or card.locator("[role=dialog]").count():
            break
        page.clock.run_for(500)
        page.wait_for_timeout(100)
    return ctx, page, card


def check_language(loc, text):
    leak = (GERMAN_LEAK if loc == "en" else ENGLISH_LEAK).findall(text)
    assert not leak, f"{loc} shot shows strings of the other language: {leak}"


def capture_tablet(browser, loc):
    t = TEXT[loc]
    ctx, page, card = open_page(browser, loc, TABLET_VIEWPORT, 2, False, f"?recipe={RECIPE}#live-demo")
    card.evaluate("c => { const s = document.createElement('style'); s.textContent = %s; c.shadowRoot.appendChild(s); }" % json.dumps(MODAL_FLAT))
    # Pin the page clock (it also follows real time while Playwright works) so the timer runs only
    # on the 32 seconds advanced below.
    page.clock.pause_at(datetime.datetime.fromtimestamp(page.evaluate("Date.now()") / 1000 + 2))
    card.locator("[data-timer-minutes]").first.fill("8")
    card.locator("[data-timer-label]").first.fill(t["label"])
    card.locator("[data-action='timer-start']").first.click()
    blur_everything(page, card)
    page.clock.run_for(32_000)
    # The shot shows the step column scrolled to its end, down to the footnote above the pinned bar.
    card.evaluate("c => c.shadowRoot.querySelectorAll('.cook-content, [role=dialog]').forEach((e) => { e.scrollTop = e.scrollHeight; })")
    page.clock.run_for(300)
    dial = card.locator(".cook-timer-dial").first.inner_text().strip()
    counter = card.locator("[role=dialog]").first.inner_text()
    assert dial == "07:28", f"timer reads {dial}"
    assert "01 / 03" in counter, "step counter is not 01 / 03"
    check_language(loc, counter)
    box = card.locator("[role=dialog]").first.bounding_box()
    foot = card.evaluate(
        "c => { const r = c.shadowRoot; const f = r.querySelector('.cook-footnote').getBoundingClientRect(); "
        "const a = r.querySelector('.cook-actions').getBoundingClientRect(); return { bottom: f.bottom, bar: a.top }; }"
    )
    bottom = foot["bottom"] + FOOT_MARGIN
    assert bottom <= foot["bar"] and bottom <= box["y"] + box["height"], f"the footnote does not fit above the action bar: {foot} {box}"
    scale = 2
    clip = {
        "x": box["x"] + SHAVE / scale,
        "y": box["y"] + SHAVE / scale,
        "width": box["width"] - 2 * SHAVE / scale,
        "height": bottom - box["y"] - 2 * SHAVE / scale,
    }
    png = page.screenshot(clip=clip)
    cut = card.evaluate(CUT_JS, {"sel": "[role=dialog]", "bottom": bottom})
    print(loc, "tablet cut:", cut or "none", "| timer", dial)
    ctx.close()
    report = {"timer": dial, "step": "01 / 03", "cut": cut, "viewport": TABLET_VIEWPORT}
    return Image.open(io.BytesIO(png)).convert("RGB"), cut, report


def capture_phone(browser, loc):
    t = TEXT[loc]
    ctx, page, card = open_page(browser, loc, {"width": 393, "height": PHONE_HEIGHTS[0]}, 3, True, f"?recipe={RECIPE}#live-demo")
    dialog = card.locator("[role=dialog]")
    submit = dialog.locator("button:not([data-action])")
    card.locator("[data-action='cook-to-recipe']").click()
    page.clock.run_for(1500)
    # The fixture list belongs to another dish and the demo cannot delete items. A fresh list
    # with the same name holds only the nine ingredients of the Gnocchi on the tablet.
    card.locator("[data-action='recipe-to-list-form']").click()
    page.clock.run_for(1500)
    dialog.locator("[data-action='create-list-form']").click()
    page.clock.run_for(1200)
    dialog.locator("input[name=name]").fill(t["list"])
    submit.click()
    page.clock.run_for(2000)
    card.locator("[data-action='nav'][data-value='recipes']").click()
    page.clock.run_for(2000)
    card.locator(f"[data-action='open-recipe'][data-id='{RECIPE}'], [data-action='open-recipe'][data-value='{RECIPE}']").first.click()
    page.clock.run_for(1500)
    card.locator("[data-action='recipe-to-list-form']").click()
    page.clock.run_for(1500)
    dialog.locator("select").select_option(index=2)
    submit.click()
    page.clock.run_for(2500)
    if dialog.count():
        dialog.locator("[data-action='close-modal']").click()
        page.clock.run_for(800)
    card.locator("[data-action='nav'][data-value='shopping']").click()
    page.clock.run_for(2500)
    picker = card.locator("select[data-action='shopping-list'], .shopping-toolbar select, select").first
    picker.select_option(index=picker.locator("option").count() - 1)
    page.clock.run_for(2000)
    count = card.locator("[data-action='shopping-toggle']").count()
    assert count == 9, f"the new list holds {count} items, expected the nine Gnocchi ingredients"
    for name in t["tick"]:
        # Ticked rows sink to the done group, so every row is looked up by its text, never by its index.
        card.locator(".shopping-row", has_text=name).locator("[data-action='shopping-toggle']").click()
        page.clock.run_for(1500)
    page.clock.run_for(7000)  # the "saved" toast of the ticks leaves on its own
    card.evaluate("c => { const s = document.createElement('style'); s.textContent = %s; c.shadowRoot.appendChild(s); }" % json.dumps(CARD_FLAT))
    # The shot is scrolled to the list: the sticky tab rail sits on top, right under it the list picker with
    # the done counter, then the open items and the done group with the two ticked rows. A viewport height
    # is chosen where no row or label is cut at the lower edge.
    placed = None
    for height in PHONE_HEIGHTS:
        page.set_viewport_size({"width": 393, "height": height})
        page.clock.run_for(400)
        card.evaluate(SCROLL_TO_LIST_JS, LIST_GAP)
        page.clock.run_for(300)
        low = card.evaluate(CUT_JS, {"top": card.evaluate(RAIL_BOTTOM_JS)})
        if not low and card.evaluate(ROWS_JS, LIST_GAP)["allShown"]:
            placed = height
            break
    assert placed, "no viewport height shows the whole list between the tab rail and the lower edge"
    page.clock.run_for(400)
    rail_move = card.evaluate(RAIL_JS, [RAIL_FADE, RAIL_NEED[loc]])
    assert not rail_move.get("failed"), f"no scroll position keeps the rail clean at both ends: {rail_move}"
    page.clock.run_for(800)
    rail = card.evaluate(RAIL_CHECK_JS, [RAIL_FADE])
    assert not rail["cut"] and rail["activeWhole"], f"tab rail has a cut label: {rail}"
    # The end gap is the fade, in which the start of the next tab shows: it may be wider than the start gap.
    assert (rail["peek"] or rail["gapRight"] <= 24) and abs(rail["gapLeft"] - rail["gapRight"]) <= 70, f"tab rail is lopsided or looks like it ends: {rail}"
    assert RAIL_NEED[loc] in rail["shown"], f"{loc} tab rail does not show {RAIL_NEED[loc]!r} whole: {rail}"
    assert len(rail["shown"]) >= 3, f"{loc} tab rail shows fewer than three whole tabs: {rail}"
    stale = [x for x in rail["shown"] if STALE_VIEW_NAMES[loc].search(x)]
    assert not stale, f"{loc} tab rail shows stale view names (rebuild the demo with npm run build:demo): {stale}"
    visible = card.evaluate(
        "c => [...c.shadowRoot.querySelectorAll('*')].filter((e) => e.tagName !== 'STYLE' && (e.tagName === 'SELECT' || [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) && e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().bottom <= innerHeight).map((e) => e.tagName === 'SELECT' ? e.selectedOptions[0].textContent.trim() : e.textContent.trim()).join(' | ')"
    )
    print(loc, "visible:", visible[:400])
    for needle in (t["list"], t["first"], t["done"]):
        assert needle in visible, f"{needle!r} is not on the phone screen"
    rows = card.evaluate(ROWS_JS, LIST_GAP)
    assert rows["total"] == 9 and rows["allShown"], f"the nine ingredient rows are not all on screen: {rows}"
    assert rows["ticked"] == 2 and rows["tickedShown"] == 2, f"two ticked rows must be visible: {rows}"
    assert rows["tickedNames"] and all(any(n.lower() in x.lower() for x in rows["tickedNames"]) for n in t["tick"]), rows
    assert rows["open"] == 7, rows
    toast = card.evaluate("c => [...c.shadowRoot.querySelectorAll('.toast, [role=status]')].filter((e) => e.getBoundingClientRect().height).map((e) => e.innerText)")
    assert not toast, f"a toast is on screen: {toast}"
    blur_everything(page, card)
    page.clock.run_for(500)
    page.wait_for_timeout(200)
    png = page.screenshot()
    cut = card.evaluate(CUT_JS, {})
    print(loc, "phone height", placed, "| rail", {k: rail[k] for k in ("scrollLeft", "shown", "gapLeft", "gapRight")}, "| cut:", cut or "none")
    text = card.evaluate("c => [...c.shadowRoot.children].filter((e) => e.tagName !== 'STYLE').map((e) => e.innerText).join(' ')")
    check_language(loc, text)
    ctx.close()
    img = Image.open(io.BytesIO(png)).convert("RGB")
    top = [img.getpixel((img.width // 2, y)) for y in range(0, 4)]
    assert all(max(abs(a - b) for a, b in zip(px, top[3])) <= 2 for px in top), f"seam in the top rows: {top}"
    report = {
        "height": placed,
        "ticked": rows["ticked"],
        "open": rows["open"],
        "total": rows["total"],
        "tickedShown": rows["tickedShown"],
        "allRowsShown": rows["allShown"],
        "tickedNames": rows["tickedNames"],
        "rail": {k: rail[k] for k in ("cut", "activeWhole", "shown", "labels", "fadeRight", "peek", "gapLeft", "gapRight")},
        "cut": cut,
        "statusColour": "#%02x%02x%02x" % top[0],
    }
    return img, cut, top[0], report


def save_variants(img, name, widths, loc, quality=WEBP_QUALITY):
    folder = SHOWCASE / loc
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob(f"{name}-*.webp"):
        old.unlink()
    for width in widths:
        out = img if width == img.width else img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        out.save(folder / f"{name}-{width}.webp", "WEBP", quality=quality, method=6)
    return {"width": img.width, "height": img.height, "widths": widths}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_report(reports, entries):
    for loc, items in entries.items():
        for name, entry in items.items():
            reports[loc][name]["files"] = {
                str(w): sha256(SHOWCASE / loc / f"{name}-{w}.webp") for w in entry["widths"]
            }
    path = SHOWCASE / "hero-capture.json"
    merged = json.loads(path.read_text())
    for loc, items in reports.items():
        merged.setdefault(loc, {}).update(items)
    path.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")


def write_manifest(entries):
    path = SHOWCASE / "manifest.json"
    manifest = json.loads(path.read_text())
    for loc, items in entries.items():
        manifest[loc].update(items)
    text = json.dumps(manifest, indent=2, ensure_ascii=False)
    text = re.sub(r'"widths": \[\s*([^\]]*?)\s*\]', lambda m: '"widths": [' + re.sub(r"\s+", " ", m.group(1)) + "]", text)
    path.write_text(text + "\n")


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "-d", str(SITE)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1.2)
    entries = {}
    reports = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                for loc in LOCALES:
                    if PHONE_ONLY:
                        tablet, cut_t = None, []
                        report_t = json.loads((SHOWCASE / "hero-capture.json").read_text())[loc]["hero-tablet-cook"]
                    else:
                        tablet, cut_t, report_t = capture_tablet(browser, loc)
                    phone, cut_p, status, report_p = capture_phone(browser, loc)
                    reports[loc] = {"hero-tablet-cook": report_t, "hero-phone-shopping": report_p}
                    assert not cut_t and not cut_p, f"{loc}: text cut by the screenshot edge: {cut_t} {cut_p}"
                    print(loc, "status bar colour (CSS .status background):", "#%02x%02x%02x" % status)
                    entries[loc] = {"hero-phone-shopping": save_variants(phone, "hero-phone-shopping", PHONE_WIDTHS, loc)}
                    if not PHONE_ONLY:
                        entries[loc]["hero-tablet-cook"] = save_variants(tablet, "hero-tablet-cook", TABLET_WIDTHS, loc, TABLET_QUALITY)
            finally:
                browser.close()
    finally:
        server.terminate()
    write_manifest(entries)
    write_report(reports, entries)
    print("wrote", ", ".join(f"{loc}/{n}" for loc, e in entries.items() for n in e))


if __name__ == "__main__":
    main()
