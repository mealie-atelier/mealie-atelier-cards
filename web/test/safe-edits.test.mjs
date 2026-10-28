import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  ingredientPreview,
  ingredientFingerprint,
  mergeIngredients,
  verifyIngredientWrite,
} from "../recipe-safety.mjs";
import { sniffImage, limitedBody } from "../photo-upload.mjs";

const ref = randomUUID();
const existing = {
  id: "test-id",
  slug: "gnocchi",
  recipeIngredient: [
    {
      referenceId: ref,
      quantity: 250,
      food: { id: "food-1", name: "Gnocchi" },
      unit: { id: "unit-1", name: "g" },
      note: "",
      originalText: "250 g Gnocchi",
      display: "",
      title: "",
      customField: "keep-me",
    },
  ],
};
const resolver = async (kind, id) => ({ id, name: kind + "-" + id });

test("structured editor previews original identifiers and hashes without mutation", () => {
  const clone = structuredClone(existing);
  const preview = ingredientPreview(existing);
  assert.equal(preview.rows[0].referenceId, ref);
  assert.equal(preview.expected_hash, ingredientFingerprint(existing));
  assert.deepEqual(existing, clone);
  const updated = {
    ...existing,
    recipeIngredient: [{ ...existing.recipeIngredient[0], quantity: 150 }],
  };
  assert.notEqual(preview.expected_hash, ingredientFingerprint(updated));
});

test("structured merge preserves unknown fields and linked foods unless explicitly changed", async () => {
  const draft = await mergeIngredients(
    existing,
    [{ referenceId: ref, quantity: 200, note: "mild" }],
    resolver,
  );
  assert.equal(draft[0].customField, "keep-me");
  assert.deepEqual(draft[0].food, existing.recipeIngredient[0].food);
  assert.equal(draft[0].quantity, 200);
  assert.equal(existing.recipeIngredient[0].quantity, 250);
  assert.ok(verifyIngredientWrite(draft, { recipeIngredient: structuredClone(draft) }));
  assert.equal(
    verifyIngredientWrite(draft, {
      recipeIngredient: [{ ...draft[0], food: { id: "different" } }],
    }),
    false,
  );
});

test("rejects unexpected row ids, duplicate ids, unbounded quantities, missing notes and invalid linked foods", async () => {
  await assert.rejects(
    () => mergeIngredients(existing, [{ referenceId: randomUUID(), quantity: 100 }], resolver),
    /referenceId/,
  );
  await assert.rejects(
    () => mergeIngredients(existing, [{ referenceId: ref }, { referenceId: ref }], resolver),
    /duplicate/,
  );
  await assert.rejects(
    () => mergeIngredients(existing, [{ referenceId: ref, quantity: -1 }], resolver),
    /Quantity/,
  );
  await assert.rejects(
    () => mergeIngredients(existing, [{ referenceId: ref, quantity: Infinity }], resolver),
    /Quantity/,
  );
  await assert.rejects(
    () => mergeIngredients(existing, [{ referenceId: ref, food_id: "../secret" }], resolver),
    /identifier/,
  );
  await assert.rejects(
    () => mergeIngredients({ slug: "x", recipeIngredient: [] }, [{ quantity: 1 }], resolver),
    /description/,
  );
});

test("photo signature sniffing refuses mismatched and unsupported uploads", () => {
  const jpeg = Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(128)]);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(110)]);
  const webp = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("WEBP"),
    Buffer.alloc(110),
  ]);
  assert.equal(sniffImage(jpeg).ext, "jpg");
  assert.equal(sniffImage(png).type, "image/png");
  assert.equal(sniffImage(webp).ext, "webp");
  assert.throws(() => sniffImage(Buffer.alloc(150)), /Only JPEG/);
});

test("photo reads reject oversized and tiny bodies", async () => {
  async function* huge() {
    yield Buffer.alloc(400);
    yield Buffer.alloc(1200);
  }
  await assert.rejects(() => limitedBody(huge(), 1024), /exceeds/);
  async function* tiny() {
    yield Buffer.alloc(20);
  }
  await assert.rejects(() => limitedBody(tiny()), /Empty/);
  async function* valid() {
    yield Buffer.alloc(110);
  }
  assert.equal((await limitedBody(valid())).length, 110);
});
