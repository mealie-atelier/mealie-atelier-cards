/** Browser hardening headers, Basic auth throttling and shell asset helpers. Zero dependencies. */
import { createHash } from "node:crypto";

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
    value = value.slice(0, value.lastIndexOf(":") + 1) + ((n >> 16n) & 0xffffn).toString(16) + ":" + (n & 0xffffn).toString(16);
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
  if (ip && ip.bits === 128 && ip.value >> 32n === 0xffffn) return { bits: 32, value: ip.value & 0xffffffffn };
  return ip;
}

/** Parses "ip" or "ip/prefix" lists (comma separated) into matchers; invalid entries throw. */
export function parseTrustedProxies(text) {
  const rules = [];
  for (const raw of String(text || "").split(",")) {
    const entry = raw.trim();
    if (!entry) continue;
    const [addr, prefix, ...rest] = entry.split("/");
    const ip = normalizeIp(parseIp(addr));
    if (!ip || rest.length) throw new Error(`ATELIER_TRUSTED_PROXIES has an invalid entry: ${entry}`);
    let length = ip.bits;
    if (prefix !== undefined) {
      if (!/^\d{1,3}$/.test(prefix)) throw new Error(`ATELIER_TRUSTED_PROXIES has an invalid entry: ${entry}`);
      length = Number(prefix);
      // A mapped IPv6 prefix such as ::ffff:10.0.0.0/104 shrinks to its IPv4 equivalent.
      if (parseIp(addr).bits === 128 && ip.bits === 32) length -= 96;
      if (length < 0 || length > ip.bits) throw new Error(`ATELIER_TRUSTED_PROXIES has an invalid entry: ${entry}`);
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
  return (
    [48n, 32n, 16n, 0n].map((s) => ((prefix >> s) & 0xffffn).toString(16)).join(":") + "::/64"
  );
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
