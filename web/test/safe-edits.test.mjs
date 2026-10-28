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
import { UploadSessions, magicMatches } from "../upload-sessions.mjs";
import { RecipeBackups, BACKUPS_PER_RECIPE, IMAGE_BACKUPS_PER_RECIPE } from "../recipe-backups.mjs";
import { appendStepImage, stripStepImage } from "../recipe-editing.mjs";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const pngBytes = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200),
]);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("magic bytes are checked per declared type", () => {
  assert.equal(magicMatches(pngBytes, "image/png"), true);
  assert.equal(magicMatches(pngBytes, "image/jpeg"), false);
  assert.equal(magicMatches(Buffer.from("%PDF-1.7 and more bytes"), "image/webp"), false);
  assert.equal(magicMatches(Buffer.from("RIFF\0\0\0\0WEBPVP8 "), "image/webp"), true);
});

test("upload sessions expire after the TTL and are bound to their user", () => {
  let now = 1_000;
  const sessions = new UploadSessions({ now: () => now });
  const begun = sessions.begin("alice", {
    purpose: "cover",
    size: pngBytes.length,
    mime: "image/png",
    sha256: digest(pngBytes),
  });
  assert.throws(() => sessions.get("bob", begun.upload_id), { atelierCode: "upload_expired" });
  assert.deepEqual(sessions.chunk("alice", begun.upload_id, 0, pngBytes.toString("base64")), {
    received: 1,
    complete: true,
  });
  assert.throws(() => sessions.peek("alice", begun.upload_id, "step"), {
    atelierCode: "upload_invalid",
  });
  assert.equal(sessions.peek("alice", begun.upload_id, "cover").ext, "png");
  now += 601_000;
  assert.throws(() => sessions.peek("alice", begun.upload_id, "cover"), {
    atelierCode: "upload_expired",
  });
});

test("an oversized chunk and surplus data drop the session", () => {
  const sessions = new UploadSessions();
  const begin = () =>
    sessions.begin("alice", {
      purpose: "cover",
      size: 300_000,
      mime: "image/png",
      sha256: "a".repeat(64),
    }).upload_id;
  const id = begin();
  assert.throws(() => sessions.chunk("alice", id, 0, Buffer.alloc(262145).toString("base64")), {
    atelierCode: "upload_invalid",
  });
  assert.throws(() => sessions.get("alice", id), { atelierCode: "upload_expired" });
});

test("recipe backups keep the newest ten snapshots and three cover files, and fail closed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atelier-backups-"));
  try {
    const store = new RecipeBackups({ dir });
    const actor = { id: "u", name: "Kitchen" };
    const recipe = { id: "r1", slug: "soup", name: "Soup", recipeIngredient: [] };
    for (let i = 0; i < BACKUPS_PER_RECIPE + 1; i++)
      await store.save({
        recipe,
        kind: "ingredients",
        summary: `save ${i}`,
        actor,
        image: i < 5 ? Buffer.from("webp") : null,
      });
    const listed = await store.list("r1");
    assert.equal(listed.length, BACKUPS_PER_RECIPE);
    assert.equal(listed[0].summary, "save 10");
    const files = await readdir(join(dir, "recipe-backups", "r1"));
    assert.equal(files.filter((n) => n.endsWith(".webp")).length, IMAGE_BACKUPS_PER_RECIPE);
    const huge = { ...recipe, description: "x".repeat(600 * 1024) };
    await assert.rejects(() => store.save({ recipe: huge, kind: "basics", summary: "x", actor }), {
      atelierCode: "backup_failed",
    });
    await assert.rejects(
      () => store.save({ recipe: { id: "../up" }, kind: "basics", summary: "x", actor }),
      {
        atelierCode: "backup_failed",
      },
    );
    await assert.rejects(() => store.get("r1", "not-a-uuid"), { atelierCode: "backup_not_found" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("step photo tags are appended and stripped without touching other text", () => {
  const withTag = appendStepImage("Boil\n\nSalt the water", "r1", "pic-1.png");
  assert.equal(
    withTag,
    'Boil\n\nSalt the water\n\n<img src="/api/media/recipes/r1/assets/pic-1.png" alt="" />',
  );
  assert.equal(stripStepImage(withTag, "r1", "pic-1.png"), "Boil\n\nSalt the water");
  assert.equal(stripStepImage(withTag, "r1", "pic-2.png"), withTag);
});
