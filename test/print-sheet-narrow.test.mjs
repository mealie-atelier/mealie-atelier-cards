import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCards } from "./support/card-harness.mjs";
import { findChrome } from "./support/chrome.mjs";

// The week plan sheet used to squeeze seven columns into a phone: an inline grid style beat every
// media query, so day names ran together and recipe names broke letter by letter.
const { buildPrintDocument } = loadCards();
const MEALS = [
  "Restessen vom Wochenende mit Salat aus dem Garten und Brot",
  "Kürbissuppe",
  "Spaghetti Bolognese",
  "Kartoffelgratin",
  "Gemüsepfanne mit Reis",
  "Pfannkuchen",
  "Sonntagsbraten",
];
function weekDocument() {
  return buildPrintDocument("mealplan", {
    mealplan: MEALS.map((title, i) => ({
      date: `2026-11-${String(9 + i).padStart(2, "0")}`,
      entryType: "dinner",
      title,
    })),
    weekStart: new Date(2026, 10, 9),
    weekDays: 7,
    locale: "de-DE",
    translate: (key) => key,
  });
}
const styleOf = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];

test("week sheet: the narrow-screen layout is screen only and paper keeps seven columns", () => {
  const html = weekDocument();
  const css = styleOf(html);
  assert.ok(!/<section class="week-print" style="[^"]*grid-template-columns/.test(html));
  assert.match(
    css,
    /\.week-print\{display:grid;grid-template-columns:repeat\(var\(--week-days,7\)/,
  );
  assert.match(
    css,
    /@media screen and \(max-width:920px\)\{\.week-print\{grid-template-columns:minmax\(0,1fr\)/,
  );
  assert.match(css, /@media screen and \(max-width:590px\)\{[^}]*\}\.week-day\{display:block/);
  // Automatic hyphenation split short words ("Rot-kohl") in narrow columns.
  assert.ok(!css.includes("hyphens:auto"));
  const print = css.slice(css.indexOf("@media print{"), css.indexOf("@media(max-width:920px)"));
  assert.ok(!print.includes("week-print"), "print rules do not touch the week grid");
  assert.match(css, /@page\{size:A4 landscape/);
});

const MEASURE = `<script>
document.fonts.ready.then(() => {
  const box = (el) => el.getBoundingClientRect();
  const days = [...document.querySelectorAll(".week-day")].map(box);
  const heads = [...document.querySelectorAll(".weekday")].map(box);
  const names = [...document.querySelectorAll(".week-meal b")].map((b) => ({ over: b.scrollWidth - b.clientWidth }));
  const out = document.createElement("pre");
  out.id = "out";
  out.textContent = JSON.stringify({ width: innerWidth, scroll: document.documentElement.scrollWidth, days, heads, names });
  document.body.append(out);
});
</script>`;

for (const width of [375, 820])
  test(`week sheet at ${width} px stacks the days without overlap or squeezed words`, (t) => {
    const chrome = findChrome();
    if (!chrome) return t.skip("no headless Chromium available");
    const dir = mkdtempSync(join(tmpdir(), "atelier-week-"));
    try {
      const file = join(dir, "week.html");
      writeFileSync(file, weekDocument().replace("</body>", `${MEASURE}</body>`));
      const dom = execFileSync(
        chrome,
        [
          "--no-sandbox",
          "--allow-file-access-from-files",
          "--hide-scrollbars",
          "--virtual-time-budget=4000",
          `--window-size=${width},800`,
          "--dump-dom",
          `file://${file}`,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60000 },
      );
      const raw = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1];
      assert.ok(raw, "measured");
      const m = JSON.parse(raw.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
      assert.equal(m.width, width);
      assert.ok(m.scroll <= width, `page is ${m.scroll} px wide`);
      assert.equal(m.days.length, 7);
      m.days.forEach((d, i) => {
        assert.ok(d.width >= 250, `day ${i} is ${d.width} px wide, not squeezed`);
        if (i) assert.ok(d.top >= m.days[i - 1].bottom - 0.5, `day ${i} starts below day ${i - 1}`);
      });
      for (const n of m.names) assert.ok(n.over <= 0, "a recipe name overflows its column");
      // On a tablet each day is one row: its heading sits left of its meals, not above them.
      if (width > 590)
        m.heads.forEach((h, i) =>
          assert.ok(
            h.right <= m.days[i].left + m.days[i].width / 2,
            `day ${i} heading on the left`,
          ),
        );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
