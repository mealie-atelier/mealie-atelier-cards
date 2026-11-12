import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findChrome } from "./support/chrome.mjs";

// The facts row of a recipe page (prep, cook, servings, cuisine) keeps whole words whole. On a
// 320 px phone "Hausmannskost" and "Mediterranean" were wider than their cell, so the page scrolled
// sideways. Every recipe page, both languages, is laid out in a real engine at phone widths.
const MEASURE = `<script>
document.fonts.ready.then(() => {
  const cells = [...document.querySelectorAll(".recipe-metrics div")].map((cell) => {
    const value = cell.querySelector("b");
    const style = getComputedStyle(cell);
    const room = cell.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const probe = value.cloneNode();
    probe.style.cssText = "position:absolute;white-space:nowrap;visibility:hidden";
    cell.append(probe);
    let widest = 0;
    for (const word of value.textContent.split(" ")) {
      probe.textContent = word;
      widest = Math.max(widest, probe.getBoundingClientRect().width);
    }
    probe.remove();
    return { text: value.textContent, room, widest };
  });
  const out = document.createElement("pre");
  out.id = "out";
  out.textContent = JSON.stringify({ width: innerWidth, scroll: document.documentElement.scrollWidth, cells });
  document.body.append(out);
});
</script>`;

test("recipe facts fit their cells on phones without splitting a word", (t) => {
  const chrome = findChrome();
  if (!chrome) return t.skip("no headless Chromium available");
  const out = mkdtempSync(join(tmpdir(), "atelier-metrics-"));
  try {
    execFileSync(process.execPath, ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out },
      stdio: "pipe",
    });
    let checked = 0;
    for (const [lang, dir] of [
      ["de", "rezepte"],
      ["en", "recipes"],
    ]) {
      for (const slug of readdirSync(join(out, lang, dir))) {
        const page = join(out, lang, dir, slug);
        const html = readFileSync(join(page, "index.html"), "utf8");
        writeFileSync(join(page, "measure.html"), html.replace("</body>", `${MEASURE}</body>`));
        for (const width of [320, 360, 390]) {
          const dom = execFileSync(
            chrome,
            [
              "--no-sandbox",
              "--allow-file-access-from-files",
              "--hide-scrollbars",
              "--virtual-time-budget=4000",
              `--window-size=${width},800`,
              "--dump-dom",
              `file://${join(page, "measure.html")}`,
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60000 },
          );
          const raw = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1];
          assert.ok(raw, `${lang}/${slug} at ${width}: measured`);
          const m = JSON.parse(raw.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
          assert.equal(m.width, width, `${lang}/${slug}: viewport is ${width}`);
          assert.ok(m.cells.length >= 3, `${lang}/${slug}: facts row exists`);
          assert.ok(m.scroll <= width, `${lang}/${slug} at ${width}: page ${m.scroll} px wide`);
          for (const cell of m.cells)
            assert.ok(
              cell.widest <= cell.room,
              `${lang}/${slug} at ${width}: "${cell.text}" needs ${cell.widest} of ${cell.room} px`,
            );
          checked++;
        }
      }
    }
    assert.equal(checked, 60);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
