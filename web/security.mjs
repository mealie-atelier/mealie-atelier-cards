/** Browser hardening headers, Basic auth throttling and shell asset helpers. Zero dependencies. */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 12;

const sha256 = (text) => "'sha256-" + createHash("sha256").update(text).digest("base64") + "'";

/** Hashes of every inline <script> body, so the CSP never needs 'unsafe-inline' for scripts. */
export function inlineScriptHashes(html) {
  const hashes = [];
  for (const match of html.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi))
    hashes.push(sha256(match[1]));
  return hashes;
}

/**
 * Same-origin only. Recipe photos and step images come through /api/image and /api/recipe-asset,
 * so img-src needs no remote host. The print popup is an about:blank document that inherits this
 * policy and uses one inline onclick handler, which is allowed by hash instead of 'unsafe-inline'.
 */
export function contentSecurityPolicy(scriptHashes = []) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-hashes' ${[...scriptHashes, sha256("window.print()")].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(scriptHashes = []) {
  return {
    "Content-Security-Policy": contentSecurityPolicy(scriptHashes),
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
}

/**
 * In-memory failed Basic auth counter per client address. The first `freeAttempts` failures cost
 * nothing, every further failure doubles the lockout (baseMs, 2x, 4x, ...) up to maxMs. A correct
 * login clears the entry, idle entries are dropped and the table is capped against memory abuse.
 */
export function createAuthThrottle({
  freeAttempts = 5,
  baseMs = 1000,
  maxMs = 60 * 1000,
  idleMs = 60 * 60 * 1000,
  maxEntries = 5000,
  now = Date.now,
} = {}) {
  const entries = new Map();
  const prune = () => {
    const t = now();
    for (const [key, e] of entries) if (t - e.last > idleMs && t >= e.until) entries.delete(key);
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
  };
  return {
    /** Returns 0 when the client may try, otherwise the remaining lockout in milliseconds. */
    retryAfterMs(key) {
      const e = entries.get(key);
      return e ? Math.max(0, e.until - now()) : 0;
    },
    fail(key) {
      const t = now();
      const e = entries.get(key) || { failures: 0, until: 0, last: t };
      e.failures += 1;
      e.last = t;
      if (e.failures > freeAttempts)
        e.until = t + Math.min(maxMs, baseMs * 2 ** (e.failures - freeAttempts - 1));
      entries.delete(key);
      entries.set(key, e);
      if (entries.size > maxEntries) prune();
    },
    succeed(key) {
      entries.delete(key);
    },
    size: () => entries.size,
  };
}

export function packageVersion(raw) {
  const version = JSON.parse(raw).version;
  if (typeof version !== "string" || !/^[0-9A-Za-z.+-]{1,40}$/.test(version))
    throw new Error("package.json needs a plain version string");
  return version;
}

/** Fills the service worker cache name from the package version, so each release gets a new cache. */
export function renderServiceWorker(source, version) {
  return source.replaceAll("__ATELIER_VERSION__", version);
}

/** Expands an IPv4 or IPv6 literal into a BigInt plus its bit width, or null when it is not an IP. */
function parseIp(text) {
  let value = String(text || "").trim();
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);
  const v4 = (part) => {
    const m = part.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const bytes = m.slice(1).map(Number);
    return bytes.some((b) => b > 255) ? null : bytes.reduce((n, b) => (n << 8n) | BigInt(b), 0n);
  };
  const direct = v4(value);
  if (direct !== null) return { bits: 32, value: direct };
  if (!value.includes(":")) return null;
  let tail = [];
  const last = value.slice(value.lastIndexOf(":") + 1);
  if (last.includes(".")) {
    const n = v4(last);
    if (n === null) return null;
    value =
      value.slice(0, value.lastIndexOf(":") + 1) +
      ((n >> 16n) & 0xffffn).toString(16) +
      ":" +
      (n & 0xffffn).toString(16);
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const groups = (h) => (h === "" ? [] : h.split(":"));
  const head = groups(halves[0]);
  tail = halves.length === 2 ? groups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  let n = 0n;
  for (const g of all) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    n = (n << 16n) | BigInt(parseInt(g, 16));
  }
  return { bits: 128, value: n };
}

/** IPv4-mapped IPv6 (::ffff:a.b.c.d) is treated as the plain IPv4 address. */
function normalizeIp(ip) {
  if (ip && ip.bits === 128 && ip.value >> 32n === 0xffffn)
    return { bits: 32, value: ip.value & 0xffffffffn };
  return ip;
}

/** True for loopback, private (RFC 1918), link-local and unique-local addresses. */
export function isPrivateAddress(address) {
  const ip = normalizeIp(parseIp(address));
  if (!ip) return false;
  const inside = (base, length) => {
    const shift = BigInt(ip.bits - length);
    return ip.value >> shift === base >> shift;
  };
  if (ip.bits === 32)
    return [
      [0x7f000000n, 8],
      [0x0a000000n, 8],
      [0xac100000n, 12],
      [0xc0a80000n, 16],
      [0xa9fe0000n, 16],
    ].some(([base, length]) => inside(base, length));
  return ip.value === 1n || inside(0xfc00n << 112n, 7) || inside(0xfe80n << 112n, 10);
}

/** Parses "ip" or "ip/prefix" lists (comma separated) into matchers; invalid entries throw. */
export function parseTrustedProxies(text) {
  const rules = [];
  for (const raw of String(text || "").split(",")) {
    const entry = raw.trim();
    if (!entry) continue;
    const [addr, prefix, ...rest] = entry.split("/");
    const ip = normalizeIp(parseIp(addr));
    if (!ip || rest.length)
      throw new Error(`ATELIER_TRUSTED_PROXIES has an invalid entry: ${entry}`);
    let length = ip.bits;
    if (prefix !== undefined) {
      if (!/^\d{1,3}$/.test(prefix))
        throw new Error(`ATELIER_TRUSTED_PROXIES has an invalid entry: ${entry}`);
      length = Number(prefix);
      // A mapped IPv6 prefix such as ::ffff:10.0.0.0/104 shrinks to its IPv4 equivalent.
      if (parseIp(addr).bits === 128 && ip.bits === 32) length -= 96;
      if (length < 0 || length > ip.bits)
        throw new Error(`ATELIER_TRUSTED_PROXIES has an invalid entry: ${entry}`);
    }
    rules.push({ bits: ip.bits, value: ip.value, length });
  }
  return rules;
}

export function isTrustedProxy(address, rules) {
  const ip = normalizeIp(parseIp(address));
  if (!ip) return false;
  return rules.some((r) => {
    if (r.bits !== ip.bits) return false;
    const shift = BigInt(r.bits - r.length);
    return ip.value >> shift === r.value >> shift;
  });
}

/** Throttle key: IPv4 as is, IPv6 reduced to its /64 prefix so one host cannot rotate addresses. */
export function throttleKey(address) {
  const ip = normalizeIp(parseIp(address));
  if (!ip) return String(address || "unknown");
  if (ip.bits === 32) {
    const v = ip.value;
    return [24n, 16n, 8n, 0n].map((s) => (v >> s) & 255n).join(".");
  }
  const prefix = ip.value >> 64n;
  return [48n, 32n, 16n, 0n].map((s) => ((prefix >> s) & 0xffffn).toString(16)).join(":") + "::/64";
}

/**
 * Picks the address the throttle counts. X-Forwarded-For is only read when the socket peer is a
 * trusted proxy; the list is walked from the right and the first non-proxy address wins.
 */
export function clientAddress(socketAddress, forwardedFor, rules) {
  const peer = socketAddress || "unknown";
  if (!rules.length || !isTrustedProxy(peer, rules)) return throttleKey(peer);
  const hops = String(Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  for (let i = hops.length - 1; i >= 0; i--) {
    if (!parseIp(hops[i])) return throttleKey(peer);
    if (!isTrustedProxy(hops[i], rules)) return throttleKey(hops[i]);
  }
  return throttleKey(peer);
}

// --- Per-person accounts and write grants (feature C) ---------------------------------------

export const ROLES = ["admin", "writer", "reader"];
const USERNAME = /^[a-z0-9._-]{1,40}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_MIN_COST = 16384;

const fromB64Url = (text) => Buffer.from(text, "base64url");
const scryptAsync = (password, salt, length, options) =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
const scryptOptions = ({ N, r, p }) => ({ N, r, p, maxmem: 256 * N * r + 128 * r * p + (1 << 20) });

/** Parses `scrypt$N$r$p$salt$key`; returns null for anything malformed or too weak. */
export function parseScryptHash(text) {
  const parts = String(text || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = parts.slice(1, 4).map((n) => (/^\d{1,8}$/.test(n) ? Number(n) : NaN));
  if (!Number.isInteger(N) || N < SCRYPT_MIN_COST || N > 1 << 20 || (N & (N - 1)) !== 0)
    return null;
  if (!Number.isInteger(r) || r < 1 || r > 16 || !Number.isInteger(p) || p < 1 || p > 16)
    return null;
  if (!B64URL.test(parts[4]) || !B64URL.test(parts[5])) return null;
  const salt = fromB64Url(parts[4]),
    key = fromB64Url(parts[5]);
  if (salt.length < 8 || key.length !== SCRYPT_KEY_LENGTH) return null;
  return { N, r, p, salt, key };
}

/** Creates a hash string for ATELIER_USERS (used by scripts/hash-password.mjs). */
export async function hashPassword(password, { N = SCRYPT_MIN_COST, r = 8, p = 1 } = {}) {
  const salt = randomBytes(16);
  const key = await scryptAsync(
    String(password),
    salt,
    SCRYPT_KEY_LENGTH,
    scryptOptions({ N, r, p }),
  );
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Checks a password against a parsed hash with the stored parameters and a constant-time compare. */
export async function verifyScrypt(password, parsedHash) {
  const key = await scryptAsync(
    String(password),
    parsedHash.salt,
    SCRYPT_KEY_LENGTH,
    scryptOptions(parsedHash),
  );
  return key.length === parsedHash.key.length && timingSafeEqual(key, parsedHash.key);
}

/**
 * Parses ATELIER_USERS (`username:role:hash;...`). Errors name the entry position, never the hash.
 */
export function parseUsers(text) {
  const users = [];
  const entries = String(text || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
  entries.forEach((entry, index) => {
    const at = `ATELIER_USERS entry ${index + 1}`;
    const parts = entry.split(":");
    if (parts.length !== 3) throw new Error(`${at} must look like username:role:hash`);
    const [name, role, hash] = parts;
    if (!USERNAME.test(name))
      throw new Error(`${at} has an invalid username (use a-z, 0-9, dot, dash, underscore)`);
    if (!ROLES.includes(role)) throw new Error(`${at} has an invalid role (admin, writer, reader)`);
    const parsed = parseScryptHash(hash);
    if (!parsed)
      throw new Error(`${at} has an invalid hash (scrypt with N of at least ${SCRYPT_MIN_COST})`);
    const first = users.findIndex((u) => u.name === name);
    if (first >= 0) throw new Error(`${at} repeats the username of entry ${first + 1}`);
    users.push({ name, role, hash: parsed });
  });
  return users;
}

/** Maps a role to the permissions object of the status payload (contract 0.4). */
export function rolePermissions(role, readOnly = false) {
  return {
    can_read: true,
    can_write: role !== "reader" && !readOnly,
    can_admin: role === "admin" && !readOnly,
  };
}

/**
 * Verifies Basic credentials against ATELIER_USERS (scrypt) and the legacy shared password
 * (role admin). Successes are cached for `ttlMs`, keyed by an HMAC of the Authorization header
 * with a per-process secret; failures are never cached.
 */
export function createCredentialVerifier({
  users = [],
  legacy = null,
  secret = randomBytes(32),
  ttlMs = 10 * 60 * 1000,
  maxEntries = 500,
  now = Date.now,
  verify = verifyScrypt,
} = {}) {
  const byName = new Map(users.map((u) => [u.name, u]));
  const cache = new Map();
  const digest = (value) => createHmac("sha256", secret).update(String(value)).digest();
  const equal = (a, b) => timingSafeEqual(digest(a), digest(b));
  // Unknown names still pay one scrypt run, so response time does not reveal valid usernames.
  const decoy = users[0]?.hash || null;
  return {
    async verify(header) {
      if (!String(header || "").startsWith("Basic ")) return null;
      const cacheKey = digest(header).toString("hex");
      const hit = cache.get(cacheKey);
      if (hit && hit.until > now()) return { ...hit.identity };
      cache.delete(cacheKey);
      let name, password;
      try {
        const credentials = Buffer.from(header.substring(6), "base64").toString("utf8");
        const i = credentials.indexOf(":");
        if (i < 0) return null;
        name = credentials.slice(0, i);
        password = credentials.slice(i + 1);
      } catch {
        return null;
      }
      let identity = null;
      const user = byName.get(name);
      if (user) {
        if (await verify(password, user.hash)) identity = { name, role: user.role };
      } else if (legacy && equal(name, legacy.name)) {
        if (equal(password, legacy.password)) identity = { name, role: "admin" };
      } else if (decoy) {
        await verify(password, decoy).catch(() => false);
      }
      if (!identity) return null;
      cache.set(cacheKey, { identity, until: now() + ttlMs });
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
      return { ...identity };
    },
    cacheSize: () => cache.size,
  };
}

/** Permission level of each bridge command; commands that are not listed fall through to 400. */
const COMMAND_LEVELS = {
  read: [
    "status",
    "recipes",
    "recipe",
    "mealplan",
    "shopping",
    "metadata",
    "nutrition_prepare",
    "nutrition_search",
    "nutrition_ai",
    "nutrition_calculate",
    "studio_state",
    "studio_substitute",
    "studio_ai_audit",
    "alarms",
    "alarm_capabilities",
    "foods",
    "units",
    "ingredients_get",
    "recipe_backups",
    "sync_state",
    "sync_destinations",
    "sync_preview",
    "sync_records",
    "ingredient_preview",
    "ingredient_catalog",
    "push_unregister",
  ],
  write: ["offline_replay", "sync_run", "sync_pause", "sync_resume", "sync_retry", "sync_resolve"],
  admin: [
    "nutrition_save",
    "food_create",
    "unit_create",
    "ingredients_save",
    "ingredient_save",
    "recipe_restore",
    "upload_begin",
    "upload_chunk",
    "recipe_image_set",
    "recipe_image_delete",
    "step_image_add",
    "step_image_remove",
    "sync_rule_save",
    "sync_rule_delete",
  ],
  personal: ["alarm_create", "alarm_cancel", "push_register"],
};
const MUTATE_LEVELS = {
  shopping_toggle: "write",
  shopping_list_create: "write",
  shopping_from_recipe: "write",
  shopping_add: "write",
  mealplan_add: "write",
  mealplan_delete: "write",
  recipe_create: "admin",
  recipe_update: "admin",
  recipe_import: "admin",
};

/**
 * Level of a studio_update action. The journal is one shared object, so journal_set needs the
 * write level like any other shared state. Family members and helper
 * task create, edit or approve are admin only, as on the Bridge (contract C.3); only toggling
 * a task's done flag is a plain write.
 */
function studioUpdateLevel(msg) {
  if (msg.action === "family_member") return "admin";
  if (msg.action === "session_task") {
    const p = msg.payload;
    const toggle =
      p &&
      typeof p === "object" &&
      typeof p.done === "boolean" &&
      Object.keys(p).sort().join(",") === "done,id,session_id";
    return toggle ? "write" : "admin";
  }
  return "write";
}

/**
 * Returns "read", "write", "admin" or "personal" for a bridge message, or null for an unknown
 * command or `mutate` action (the caller answers those with invalid_request, so the denial
 * never reveals which actions exist).
 */
export function commandLevel(msg) {
  const type = String(msg?.type || "").replace(/^mealie_atelier\//, "");
  if (type === "mutate")
    return Object.hasOwn(MUTATE_LEVELS, msg.action) ? MUTATE_LEVELS[msg.action] : null;
  if (type === "studio_update") return studioUpdateLevel(msg);
  if (type === "sync_run") return msg.confirm_first_batch === true ? "admin" : "write";
  for (const [level, names] of Object.entries(COMMAND_LEVELS))
    if (names.includes(type)) return level;
  return null;
}

/**
 * Decides whether `role` may run a command of `level`. Order: read-only first, then the missing
 * write grant (a reader), then admin only. Personal commands are blocked by read-only only.
 * Returns null when allowed, otherwise `{status, code, message}` (contract 0.3).
 */
export function denial(role, level, readOnly = false) {
  if (level === "read") return null;
  if (readOnly)
    return { status: 403, code: "read_only", message: "Mealie Atelier is in read-only mode" };
  if (level === "personal") return null;
  const permissions = rolePermissions(role, false);
  if (!permissions.can_write)
    return {
      status: 403,
      code: "write_not_permitted",
      message: "Your account may view this kitchen but not change it",
    };
  if (level === "admin" && !permissions.can_admin)
    return { status: 403, code: "unauthorized", message: "An administrator account is required" };
  return null;
}
