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
  maxMs = 15 * 60 * 1000,
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
