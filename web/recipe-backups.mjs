/** File-based recipe snapshots for the standalone app (contract B.3 and B.7). */
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { editError } from "./upload-sessions.mjs";

export const BACKUPS_PER_RECIPE = 10;
export const IMAGE_BACKUPS_PER_RECIPE = 3;
export const BACKUP_MAX_RECIPES = 200;
export const SNAPSHOT_MAX_BYTES = 512 * 1024;
const FIELDS = [
  "name",
  "description",
  "recipeServings",
  "recipeYieldQuantity",
  "recipeYield",
  "recipeIngredient",
  "recipeInstructions",
  "assets",
];
const SAFE_ID = /^[A-Za-z0-9_-]{1,150}$/;
const failed = (message = "The backup could not be written. Nothing was changed.") =>
  editError(507, "backup_failed", message);

export class RecipeBackups {
  constructor({ dir, now = () => new Date() }) {
    this.root = join(dir, "recipe-backups");
    this.now = now;
    this.counter = 0;
  }
  folder(recipeId) {
    if (!SAFE_ID.test(String(recipeId))) throw failed();
    return join(this.root, recipeId);
  }
  async readAll(recipeId) {
    let names;
    try {
      names = await readdir(this.folder(recipeId));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw failed();
    }
    const snapshots = [];
    for (const name of names.filter((n) => n.endsWith(".json"))) {
      try {
        snapshots.push(JSON.parse(await readFile(join(this.folder(recipeId), name), "utf8")));
      } catch {
        // A damaged file must not hide the other snapshots.
      }
    }
    return snapshots.sort((a, b) => (b.order || 0) - (a.order || 0));
  }
  /** Newest first, public fields only. */
  async list(recipeId) {
    return (await this.readAll(recipeId)).map((s) => ({
      backup_id: s.backup_id,
      created_at: s.created_at,
      user_name: s.user_name,
      kind: s.kind,
      summary: s.summary,
      has_image: Boolean(s.image_file),
    }));
  }
  async get(recipeId, backupId) {
    if (!/^[0-9a-f-]{36}$/.test(String(backupId)))
      throw editError(404, "backup_not_found", "That backup does not exist.");
    try {
      return JSON.parse(await readFile(join(this.folder(recipeId), `${backupId}.json`), "utf8"));
    } catch {
      throw editError(404, "backup_not_found", "That backup does not exist.");
    }
  }
  async readImage(recipeId, snapshot) {
    if (!snapshot.image_file) return null;
    try {
      return await readFile(join(this.folder(recipeId), snapshot.image_file));
    } catch {
      throw editError(404, "backup_not_found", "The backup photo is missing.");
    }
  }
  /** Persist a snapshot (and the previous cover when given). Throws `backup_failed`, fail closed. */
  async save({ recipe, kind, summary, actor, image = null }) {
    const recipeId = String(recipe?.id || "");
    const backupId = randomUUID();
    const fields = {};
    for (const key of FIELDS) fields[key] = structuredClone(recipe?.[key] ?? null);
    const snapshot = {
      backup_id: backupId,
      created_at: this.now().toISOString(),
      order: this.now().getTime() * 1000 + (this.counter++ % 1000),
      user_id: actor.id,
      user_name: actor.name,
      kind,
      slug: String(recipe?.slug || ""),
      summary: String(summary).slice(0, 120),
      fields,
      image_file: image ? `${backupId}.webp` : null,
    };
    const text = JSON.stringify(snapshot);
    if (Buffer.byteLength(text) > SNAPSHOT_MAX_BYTES)
      throw failed("The recipe is too large to back up.");
    try {
      await this.makeRoom(recipeId);
      await mkdir(this.folder(recipeId), { recursive: true, mode: 0o700 });
      if (image)
        await writeFile(join(this.folder(recipeId), snapshot.image_file), image, {
          mode: 0o600,
          flag: "wx",
        });
      await writeFile(join(this.folder(recipeId), `${backupId}.json`), text, {
        mode: 0o600,
        flag: "wx",
      });
      await this.prune(recipeId);
    } catch (error) {
      if (error.atelierCode) throw error;
      throw failed();
    }
    return snapshot;
  }
  async makeRoom(recipeId) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const names = await readdir(this.root);
    if (names.includes(recipeId) || names.length < BACKUP_MAX_RECIPES) return;
    const aged = [];
    for (const name of names) aged.push([name, (await stat(join(this.root, name))).mtimeMs]);
    aged.sort((a, b) => a[1] - b[1]);
    await this.removeFolder(aged[0][0]);
  }
  async removeFolder(recipeId) {
    for (const file of await readdir(this.folder(recipeId)))
      await unlink(join(this.folder(recipeId), file));
    await rmdir(this.folder(recipeId));
  }
  async prune(recipeId) {
    const snapshots = await this.readAll(recipeId);
    for (const old of snapshots.slice(BACKUPS_PER_RECIPE)) {
      await unlink(join(this.folder(recipeId), `${old.backup_id}.json`));
      if (old.image_file) await unlink(join(this.folder(recipeId), old.image_file)).catch(() => {});
    }
    const withImage = snapshots.slice(0, BACKUPS_PER_RECIPE).filter((s) => s.image_file);
    for (const old of withImage.slice(IMAGE_BACKUPS_PER_RECIPE)) {
      await unlink(join(this.folder(recipeId), old.image_file)).catch(() => {});
      await writeFile(
        join(this.folder(recipeId), `${old.backup_id}.json`),
        JSON.stringify({ ...old, image_file: null }),
        { mode: 0o600 },
      );
    }
  }
}
