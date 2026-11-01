import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../scripts/${path}`, import.meta.url), "utf8");

test("cooking dialog shot scroll also avoids a half text line under the pinned title strip", () => {
  const source = read("capture-readme-shots.py");
  const body = source.slice(
    source.indexOf("def scroll_cook_dialog"),
    source.indexOf("def fit_desktop_viewport"),
  );
  assert.match(body, /eval\(cuts\)\(m, true\)/);
  assert.doesNotMatch(body, /eval\(cuts\)\(m, false\)/);
  assert.match(body, /set_viewport_size/);
});

test("bring showcase script writes the web README image with margin below the dialog", () => {
  const source = read("capture-bring-showcase.py");
  assert.match(source, /README_SHOT = ROOT \/ "web" \/ "assets" \/ "bring-account\.webp"/);
  assert.match(source, /README_MARGIN = (4\d|5\d|60)\b/);
  assert.match(source, /dialog_bottom \+ README_MARGIN/);
});

test("readme shots pin the English profile language and the shared sidebar dashboards", () => {
  const source = read("capture-readme-shots.py");
  assert.match(
    source,
    /"type": "frontend\/set_user_data", "key": "language", "value": \{"language": "en"\}/,
  );
  assert.match(source, /"map": \{"title": "Map"\}/);
  assert.match(source, /"atelier_cards": \{"title": "Kitchen", "show_in_sidebar": True\}/);
  assert.match(source, /asyncio\.run\(set_profile_language\(\)\)/);
});

test("readme shots show only the product dashboard in the sidebar and restore the rig afterwards", () => {
  const source = read("capture-readme-shots.py");
  // The smoke test dashboard is hidden during the capture, so "Atelier" does not stand above "Kitchen".
  assert.match(source, /"atelier_live": \{"title": "Atelier", "show_in_sidebar": False\}/);
  assert.doesNotMatch(source, /"atelier_live": \{[^}]*"show_in_sidebar": True/);
  // Any other dashboard that shows in the sidebar is hidden too.
  assert.match(source, /wanted is None and board\.get\("show_in_sidebar"\)/);
  // The original language and sidebar settings are recorded first and restored in a finally block.
  const body = source.slice(source.indexOf("def run()"), source.indexOf("if __name__"));
  assert.match(body, /asyncio\.run\(snapshot_rig\(saved\)\)/);
  assert.match(body, /try:\s+main\(\)\s+finally:\s+asyncio\.run\(restore_rig\(saved\)\)/);
  assert.match(source, /async def restore_rig/);
  assert.match(source, /"show_in_sidebar": board\["show_in_sidebar"\]/);
});

test("the week plan feature shot is a cropped narrow window without automatic hyphenation", () => {
  const source = read("capture-app-showcase.py");
  assert.match(source, /FEATURE = dict\(viewport=\(960, 1200\)[^\n]*whole_names=True/);
  assert.match(source, /"feature-mealplan": \(FEATURE, "mealplan"/);
  assert.match(source, /WHOLE_NAMES = "\.atelier \*\{hyphens:manual!important/);
  assert.match(source, /device\.get\("whole_names"\)/);
});

test("the showcase gate rejects the old family names and captures the family shots in both languages", () => {
  const source = read("capture-app-showcase.py");
  const stale = source.match(/^STALE = re\.compile\(r"([^"]+)"\)/m)[1];
  const re = new RegExp(stale);
  for (const old of [
    "Helfermodus",
    "Helper mode",
    "helper mode",
    "Einfache Helferansicht",
    "Simple helper view",
  ]) {
    assert.match(old, re);
  }
  for (const current of ["Helferansicht", "Helper view", "Kind", "Child"]) {
    assert.doesNotMatch(current, re);
  }
  assert.match(source, /"app-phone-family": \(PHONE, "family", None, \("de", "en"\)\)/);
  assert.match(
    source,
    /"app-phone-family-helper": \(PHONE, "family", "adult-view", \("de", "en"\)\)/,
  );
});
