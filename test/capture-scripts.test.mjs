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

test("the week plan feature shot is a cropped narrow window without automatic hyphenation", () => {
  const source = read("capture-app-showcase.py");
  assert.match(source, /FEATURE = dict\(viewport=\(960, 1200\)[^\n]*whole_names=True/);
  assert.match(source, /"feature-mealplan": \(FEATURE, "mealplan"/);
  assert.match(source, /WHOLE_NAMES = "\.atelier \*\{hyphens:manual!important/);
  assert.match(source, /device\.get\("whole_names"\)/);
});
