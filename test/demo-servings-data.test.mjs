import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync("demo/data/recipes.json", "utf8"));
const preview = readFileSync("demo/preview.html", "utf8");
const FRACTIONS = { "½": 0.5, "¼": 0.25, "¾": 0.75 };

// Leading amount of a display line: integer, comma or dot decimal, or a fraction glyph.
function leadingAmount(line) {
  const m = /^(\d+(?:[.,]\d+)?|[½¼¾])\s+(.*)$/.exec(line);
  if (!m) return null;
  const value = FRACTIONS[m[1]] ?? Number(m[1].replace(",", "."));
  return { value, rest: m[2] };
}

test("all ten recipes carry parsed ingredient parts and step links", () => {
  assert.equal(catalog.recipes.length, 10);
  for (const r of catalog.recipes) {
    assert.ok(r.ingredientParts, `${r.id} has ingredientParts`);
    assert.ok(Array.isArray(r.stepIngredients), `${r.id} has stepIngredients`);
  }
});

for (const r of catalog.recipes) {
  test(`${r.id}: parts match the display lines`, () => {
    for (const lang of ["de", "en"]) {
      const lines = r.ingredients[lang];
      const parts = r.ingredientParts[lang];
      assert.equal(parts.length, lines.length, `${lang} length`);
      parts.forEach((part, i) => {
        if (part === null) return;
        assert.ok(typeof part.quantity === "number" && part.quantity > 0, `${lang}[${i}] quantity`);
        assert.ok(part.unit === null || typeof part.unit === "string", `${lang}[${i}] unit`);
        assert.ok(typeof part.food === "string" && part.food.trim(), `${lang}[${i}] food`);
        assert.equal(typeof part.note, "string", `${lang}[${i}] note`);
        const lead = leadingAmount(lines[i]);
        assert.ok(lead, `${lang}[${i}] line starts with an amount: ${lines[i]}`);
        assert.equal(lead.value, part.quantity, `${lang}[${i}] quantity equals the line`);
        if (part.unit) {
          assert.ok(lead.rest.startsWith(part.unit + " "), `${lang}[${i}] unit follows the amount`);
        }
        assert.ok(
          lines[i].toLowerCase().includes(part.food.toLowerCase()),
          `${lang}[${i}] food "${part.food}" in "${lines[i]}"`,
        );
      });
    }
  });

  test(`${r.id}: de and en agree on rows and quantities`, () => {
    const { de, en } = r.ingredientParts;
    de.forEach((part, i) => {
      assert.equal(part === null, en[i] === null, `null at ${i}`);
      if (part) assert.equal(part.quantity, en[i].quantity, `quantity at ${i}`);
    });
  });

  test(`${r.id}: step links are valid and cover every parsed row`, () => {
    assert.equal(r.stepIngredients.length, r.steps.de.length);
    assert.equal(r.stepIngredients.length, r.steps.en.length);
    const linked = new Set();
    for (const step of r.stepIngredients) {
      assert.ok(Array.isArray(step));
      for (const i of step) {
        assert.ok(Number.isInteger(i) && i >= 0 && i < r.ingredients.de.length, `index ${i}`);
        linked.add(i);
      }
    }
    assert.ok(
      r.stepIngredients.some((s) => s.length > 0),
      "links at least one step",
    );
    r.ingredientParts.de.forEach((part, i) => {
      if (part) assert.ok(linked.has(i), `row ${i} is linked`);
    });
  });
}

test("at least three recipes keep a note-only row", () => {
  const withNull = catalog.recipes.filter((r) => r.ingredientParts.de.includes(null));
  assert.ok(withNull.length >= 3);
});

test("preview maps parts, step references and the capability flags", () => {
  assert.match(preview, /features: \{ recipe_scale: true, session_servings: true \}/);
  assert.match(preview, /referenceId = "demo-ing-" \+ index \+ "-" \+ i/);
  assert.match(preview, /ingredientReferences:/);
  assert.match(preview, /referenceId: "demo-ing-" \+ index \+ "-" \+ i/);
  assert.match(preview, /action === "session_servings"/);
  assert.match(preview, /servingsBase: p\.servings_base/);
  assert.match(preview, /req\.payload\.scale \?\? 1/);
  assert.match(preview, /row\.quantity \* scale/);
});

// The generator builds a per-locale catalog from selected fields; a field it drops never reaches the
// live demo (cook mode showed no chips and every row had quantity 0). Run it for real into a temp dir.
test("the generated demo catalog keeps parsed rows and step links", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const out = mkdtempSync(join(tmpdir(), "atelier-demo-"));
  try {
    execFileSync(process.execPath, ["scripts/generate-demo-site.mjs"], {
      env: { ...process.env, ATELIER_DEMO_OUT_DIR: out },
      stdio: "pipe",
    });
    for (const lang of ["de", "en"]) {
      const built = JSON.parse(readFileSync(join(out, "data", `${lang}.json`), "utf8"));
      const recipes = built.recipes;
      assert.equal(recipes.length, catalog.recipes.length);
      for (const [i, r] of recipes.entries()) {
        const source = catalog.recipes[i];
        assert.deepEqual(r.ingredientParts, source.ingredientParts[lang], `${lang} ${r.id} parts`);
        assert.deepEqual(r.stepIngredients, source.stepIngredients, `${lang} ${r.id} links`);
      }
      assert.ok(recipes.some((r) => r.stepIngredients.some((links) => links.length)));
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
