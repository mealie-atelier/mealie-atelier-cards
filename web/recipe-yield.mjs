/** Keeps the free text yield of a recipe ("4 servings") in step with a changed serving count. */
const LEADING_NUMBER = /^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?![\d/.,]*\d)/;

// A range such as "2-3 Portionen" or "4 to 6 servings" has no single number to follow.
const RANGE_AFTER = /^\s*(?:[-–]|bis\b|to\b)\s*\d/i;

function numberValue(raw) {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(raw.replace(",", "."));
}

function formatNumber(value, comma) {
  const text = String(Math.round(value * 100) / 100);
  return comma ? text.replace(".", ",") : text;
}

/**
 * Returns the yield fields to patch, or null when the yield stays as it is: it is empty, does not start with a
 * number, or that number is not the old serving count (for example "1 Blech" with 12 servings).
 */
export function syncedYield(oldServings, newServings, recipeYield) {
  if (typeof recipeYield !== "string" || !Number.isFinite(oldServings)) return null;
  const match = recipeYield.match(LEADING_NUMBER);
  if (!match || RANGE_AFTER.test(recipeYield.slice(match[0].length))) return null;
  const value = numberValue(match[2]);
  if (!Number.isFinite(value) || Math.abs(value - oldServings) > 1e-9) return null;
  const comma = match[2].includes(",");
  return {
    recipeYield: `${match[1]}${formatNumber(newServings, comma)}${recipeYield.slice(match[0].length)}`,
    recipeYieldQuantity: newServings,
  };
}
