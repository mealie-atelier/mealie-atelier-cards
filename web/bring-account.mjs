/**
 * Keeps the Bring! session tokens of the connected account in the data directory. Only tokens are
 * stored (file mode 0600): the password is used for one login and never written anywhere. The
 * account is kept as its e-mail address (shown masked, and in full to administrators so signing in
 * again needs only the password).
 */
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const TEXT_FIELDS = ["uuid", "tokenType", "accessToken", "refreshToken"];

function validSession(session) {
  return (
    !!session &&
    typeof session === "object" &&
    TEXT_FIELDS.every((key) => typeof session[key] === "string" && session[key]) &&
    Number.isFinite(session.expiresAt)
  );
}

export class BringAccountStore {
  constructor({ dir }) {
    this.dir = dir;
    this.file = join(dir, "bring-account.json");
    this.queue = Promise.resolve();
  }

  /** The stored session or null when none exists or the file is unreadable. */
  async load() {
    try {
      const data = JSON.parse(await readFile(this.file, "utf8"));
      return validSession(data?.session)
        ? {
            uuid: data.session.uuid,
            publicUuid: typeof data.session.publicUuid === "string" ? data.session.publicUuid : "",
            tokenType: data.session.tokenType,
            accessToken: data.session.accessToken,
            refreshToken: data.session.refreshToken,
            expiresAt: data.session.expiresAt,
            country: /^[A-Z]{2}$/.test(data.session.country) ? data.session.country : "DE",
            account: typeof data.session.account === "string" ? data.session.account : "",
            email: typeof data.session.email === "string" ? data.session.email : "",
            defaultList:
              typeof data.session.defaultList === "string" ? data.session.defaultList : "",
          }
        : null;
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Bring! account storage is unreadable; ignoring");
      return null;
    }
  }

  /** Writes the session atomically, or removes the file when `session` is null. */
  save(session) {
    const write = async () => {
      if (!session) return rm(this.file, { force: true });
      await mkdir(this.dir, { recursive: true, mode: 0o700 });
      const temp = `${this.file}.${randomUUID()}.tmp`;
      // Pick the fields one by one so nothing else can ever end up in the file.
      const data = {
        version: 1,
        session: Object.fromEntries(
          [
            ...TEXT_FIELDS,
            "publicUuid",
            "country",
            "account",
            "email",
            "defaultList",
            "expiresAt",
          ].map((key) => [key, session[key]]),
        ),
      };
      await writeFile(temp, JSON.stringify(data), { mode: 0o600, flag: "wx" });
      await rename(temp, this.file);
    };
    const task = this.queue.then(write);
    this.queue = task.catch(() => {});
    return task;
  }
}
