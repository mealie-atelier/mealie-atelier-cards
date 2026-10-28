/** Safe, optimistic structured-ingredient transactions. Never issue a full recipe PUT. */
import { createHash, randomUUID } from "node:crypto";
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const id = /^[a-zA-Z0-9_-]{1,150}$/;
const str = (value, max) => {
  if (typeof value !== "string" || value.length > max) throw fail("Invalid ingredient text");
  return value.trim();
};
export function ingredientFingerprint(recipe) {
  if (!recipe || typeof recipe !== "object" || !Array.isArray(recipe.recipeIngredient))
    throw fail("Invalid recipe response");
  return createHash("sha256")
    .update(JSON.stringify({ slug: recipe.slug, ingredients: recipe.recipeIngredient }))
    .digest("hex");
}
export function ingredientPreview(recipe) {
  return {
    slug: recipe.slug,
    expected_hash: ingredientFingerprint(recipe),
    rows: recipe.recipeIngredient.map((r) => ({
      referenceId: r.referenceId,
      quantity: r.quantity ?? null,
      food: r.food ? { id: r.food.id, name: r.food.name } : null,
      unit: r.unit ? { id: r.unit.id, name: r.unit.name } : null,
      note: r.note || "",
      originalText: r.originalText || "",
      display: r.display || "",
      title: r.title || "",
    })),
    warning:
      "An existing Mealie recipe will only be modified after explicit confirmation. A server backup is created first.",
  };
}
/** Draft row input: referenceId, quantity, note, originalText, food_id, unit_id. */
export async function mergeIngredients(recipe, draft, resolveLink) {
  if (!Array.isArray(draft) || draft.length > 100 || !draft.length)
    throw fail("Expected 1-100 ingredient rows");
  const current = new Map();
  for (const r of recipe.recipeIngredient || []) {
    if (!uuid.test(r.referenceId || "") || current.has(r.referenceId))
      throw fail(
        "Existing ingredient has invalid or duplicated referenceId. Use Mealie to repair it.",
      );
    current.set(r.referenceId, r);
  }
  const seen = new Set(),
    result = [];
  for (const input of draft) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw fail("Invalid ingredient row");
    const ref = input.referenceId || randomUUID();
    if (!uuid.test(ref) || seen.has(ref) || (input.referenceId && !current.has(ref)))
      throw fail("Invalid or duplicated ingredient referenceId");
    seen.add(ref);
    const old = current.get(ref) || {
      referenceId: ref,
      food: null,
      unit: null,
      originalText: "",
      display: "",
      note: "",
      quantity: null,
    };
    const row = structuredClone(old);
    if ("quantity" in input) {
      if (input.quantity === null || input.quantity === "") row.quantity = null;
      else {
        const n = Number(input.quantity);
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw fail("Quantity out of range");
        row.quantity = n;
      }
    }
    for (const field of ["note", "originalText", "display", "title"])
      if (field in input)
        row[field] = str(
          input[field],
          field === "originalText" || field === "display" ? 1000 : 300,
        );
    for (const [key, kind] of [
      ["food_id", "food"],
      ["unit_id", "unit"],
    ])
      if (Object.hasOwn(input, key)) {
        if (input[key] === null || input[key] === "") row[kind] = null;
        else {
          if (!id.test(String(input[key]))) throw fail("Invalid linked item identifier");
          row[kind] = await resolveLink(kind, input[key]);
          if (!row[kind] || row[kind].id !== input[key])
            throw fail("Unknown Mealie " + kind + " link");
        }
      }
    if (!row.food && !str(row.originalText || row.display || row.note || "", 1000))
      throw fail("Unlinked ingredient requires a readable description");
    result.push(row);
  }
  return result;
}
export function verifyIngredientWrite(beforeDraft, after) {
  if (
    !Array.isArray(after?.recipeIngredient) ||
    after.recipeIngredient.length !== beforeDraft.length
  )
    return false;
  return beforeDraft.every((r, i) => {
    const saved = after.recipeIngredient[i];
    return (
      saved?.referenceId === r.referenceId &&
      (saved.quantity ?? null) === (r.quantity ?? null) &&
      (saved.food?.id || null) === (r.food?.id || null) &&
      (saved.unit?.id || null) === (r.unit?.id || null)
    );
  });
}
