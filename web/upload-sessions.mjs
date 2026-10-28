/** Chunked image upload sessions for the structured recipe editor (contract B.4). Memory only. */
import { createHash, randomUUID } from "node:crypto";

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 256 * 1024;
export const UPLOAD_TTL_MS = 600 * 1000;
export const UPLOAD_MAX_SESSIONS = 2;
const MIN_BYTES = 100;
const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Error carrying the contract code (`atelierCode`) and the HTTP status of the code table. */
export function editError(status, atelierCode, message) {
  return Object.assign(new Error(message), { status, atelierCode });
}
const invalid = (message) => editError(400, "upload_invalid", message);

/** True when the leading bytes match the declared MIME type. */
export function magicMatches(bytes, mime) {
  if (mime === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return (
      bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, i) => bytes[i] === value)
    );
  if (mime === "image/webp")
    return (
      bytes.length >= 12 &&
      bytes.toString("latin1", 0, 4) === "RIFF" &&
      bytes.toString("latin1", 8, 12) === "WEBP"
    );
  return false;
}
function strictBase64(value) {
  if (typeof value !== "string" || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
    throw invalid("Chunk data is not valid base64");
  return Buffer.from(value, "base64");
}

export class UploadSessions {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.sessions = new Map();
  }
  purge() {
    for (const [id, session] of this.sessions)
      if (this.now() - session.touched > UPLOAD_TTL_MS) this.sessions.delete(id);
  }
  begin(userId, { purpose, size, mime, sha256 }) {
    this.purge();
    if (!["cover", "step"].includes(purpose)) throw invalid("Unknown upload purpose");
    if (!Object.hasOwn(MIME_EXT, mime))
      throw invalid("Only JPEG, PNG and WebP images are accepted");
    if (!Number.isInteger(size) || size < MIN_BYTES || size > UPLOAD_MAX_BYTES)
      throw invalid("Image size must be between 100 bytes and 10 MiB");
    if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(sha256))
      throw invalid("Invalid checksum");
    if (this.sessions.size >= UPLOAD_MAX_SESSIONS)
      throw editError(429, "upload_busy", "Too many uploads in progress. Try again shortly.");
    const id = randomUUID();
    this.sessions.set(id, {
      userId,
      purpose,
      size,
      mime,
      sha256: sha256.toLowerCase(),
      chunks: [],
      received: 0,
      complete: false,
      touched: this.now(),
    });
    return {
      upload_id: id,
      chunk_bytes: UPLOAD_CHUNK_BYTES,
      chunks: Math.ceil(size / UPLOAD_CHUNK_BYTES),
    };
  }
  /** Look up a live session of this user; unknown, expired or foreign ids look identical. */
  get(userId, id) {
    this.purge();
    const session = typeof id === "string" ? this.sessions.get(id) : undefined;
    if (!session || session.userId !== userId)
      throw editError(410, "upload_expired", "The upload expired. Start it again.");
    return session;
  }
  chunk(userId, id, index, data) {
    const session = this.get(userId, id);
    const drop = (message) => {
      this.sessions.delete(id);
      return invalid(message);
    };
    if (session.complete) throw drop("Upload already complete");
    if (!Number.isInteger(index) || index !== session.chunks.length)
      throw drop("Chunks must arrive in order");
    let bytes;
    try {
      bytes = strictBase64(data);
    } catch (error) {
      this.sessions.delete(id);
      throw error;
    }
    if (!bytes.length || bytes.length > UPLOAD_CHUNK_BYTES) throw drop("Chunk size is not allowed");
    if (session.received + bytes.length > session.size) throw drop("More data than announced");
    session.chunks.push(bytes);
    session.received += bytes.length;
    session.touched = this.now();
    if (session.received === session.size) {
      const all = Buffer.concat(session.chunks);
      if (createHash("sha256").update(all).digest("hex") !== session.sha256)
        throw drop("Checksum mismatch");
      if (!magicMatches(all, session.mime)) throw drop("File content does not match its type");
      session.bytes = all;
      session.chunks = [];
      session.complete = true;
    }
    return { received: index + 1, complete: session.complete };
  }
  /** Validate a finished session for a command without consuming it yet. */
  peek(userId, id, purpose) {
    const session = this.get(userId, id);
    if (!session.complete) throw invalid("Upload is not complete");
    if (session.purpose !== purpose) throw invalid("Upload was started for another purpose");
    return { bytes: session.bytes, mime: session.mime, ext: MIME_EXT[session.mime] };
  }
  consume(id) {
    this.sessions.delete(id);
  }
}
