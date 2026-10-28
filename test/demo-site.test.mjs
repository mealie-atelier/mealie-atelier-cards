import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("each demo page is pinned to its own language", () => {
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync("node", ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out, ATELIER_DEMO_BASE_URL: "" },
      stdio: "pipe",
    });
    for (const locale of ["de", "en"]) {
      const html = readFileSync(join(out, locale, "index.html"), "utf8");
      assert.match(html, new RegExp(`const demoLanguage = "${locale}";`));
      assert.match(html, new RegExp(`<html lang="${locale}">`));
      assert.doesNotMatch(html, /URLSearchParams\(window\.location\.search\)\.get\("lang"\)/);
      assert.doesNotMatch(html, /rel="canonical" href=""/);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
