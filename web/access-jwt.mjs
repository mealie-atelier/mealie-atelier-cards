/** Cloudflare Access sign-in: verifies the signed cf-access-jwt-assertion header. Zero dependencies. */
import { createPublicKey, verify as verifySignature } from "node:crypto";

const HEADER = "cf-access-jwt-assertion";
const SEGMENT = /^[A-Za-z0-9_-]+$/;
const KEY_TTL_MS = 60 * 60 * 1000;
const FETCH_INTERVAL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_FUTURE_S = 60;
const TEAM_DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/;
const EMAIL = /^[^\s@:,]+@[^\s@:,]+$/;
const SETTINGS = ["ATELIER_ACCESS_TEAM_DOMAIN", "ATELIER_ACCESS_AUD", "ATELIER_ACCESS_USERS"];

/** ASCII only: String#toLowerCase folds U+212A (Kelvin sign) to "k", which could match another address. */
const lowerEmail = (email) => email.replace(/[A-Z]/g, (c) => c.toLowerCase());
const decodeJson = (segment) => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

/**
 * Reads the three ATELIER_ACCESS_* settings. Returns null when none is set (the feature is off) and
 * throws on partial or invalid values. Errors name the entry position, never the email.
 */
export function parseAccessConfig(env, users) {
  const value = (name) => String(env[name] ?? "").trim();
  const missing = SETTINGS.filter((name) => !value(name));
  if (missing.length === SETTINGS.length) return null;
  if (missing.length)
    throw new Error(
      `Cloudflare Access needs all of ${SETTINGS.join(", ")}; missing ${missing.join(", ")}.`,
    );
  const teamDomain = value("ATELIER_ACCESS_TEAM_DOMAIN");
  if (!TEAM_DOMAIN.test(teamDomain))
    throw new Error(
      "ATELIER_ACCESS_TEAM_DOMAIN must be a bare hostname ending in .cloudflareaccess.com.",
    );
  const entries = value("ATELIER_ACCESS_USERS")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!entries.length)
    throw new Error("ATELIER_ACCESS_USERS must list at least one email:username.");
  const known = new Set(users.map((u) => u.name));
  const emails = [];
  const mapped = new Map();
  entries.forEach((entry, index) => {
    const at = `ATELIER_ACCESS_USERS entry ${index + 1}`;
    const parts = entry.split(":");
    if (parts.length !== 2 || !EMAIL.test(parts[0]))
      throw new Error(`${at} must look like email:username`);
    const email = lowerEmail(parts[0]);
    const first = emails.indexOf(email);
    if (first >= 0) throw new Error(`${at} repeats the email of entry ${first + 1}`);
    if (!known.has(parts[1]))
      throw new Error(`${at} names a username that is not in ATELIER_USERS`);
    emails.push(email);
    mapped.set(email, parts[1]);
  });
  return { teamDomain, audience: value("ATELIER_ACCESS_AUD"), users: mapped };
}

function importKeys(body) {
  const keys = new Map();
  for (const jwk of Array.isArray(body?.keys) ? body.keys : []) {
    if (jwk?.kty !== "RSA" || typeof jwk.kid !== "string") continue;
    try {
      keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
    } catch {
      // One unusable key does not spoil the others.
    }
  }
  return keys;
}

/**
 * Returns `{ verify(req) }`. verify resolves to the username of a valid token and to null for
 * anything else, including an unreachable Cloudflare. It never throws and never logs a token or email.
 */
export function createAccessVerifier({
  teamDomain,
  audience,
  users,
  fetchImpl = fetch,
  now = Date.now,
}) {
  const issuer = `https://${teamDomain}`;
  const certsUrl = `${issuer}/cdn-cgi/access/certs`;
  const byEmail = new Map([...users].map(([email, name]) => [lowerEmail(email), name]));
  let keys = null;
  let keysAt = 0;
  let lastFetch = -Infinity;
  let running = null;

  async function fetchKeys() {
    try {
      const response = await fetchImpl(certsUrl, {
        redirect: "error",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error("bad status");
      const fresh = importKeys(await response.json());
      if (!fresh.size) throw new Error("no usable keys");
      keys = fresh;
      keysAt = now();
    } catch {
      console.warn(
        "Cloudflare Access keys could not be fetched; cached keys or Basic sign-in stay in use.",
      );
    }
  }

  /** One shared attempt at a time and at most one every 5 minutes, also while Cloudflare is down. */
  function refresh() {
    if (running) return running;
    if (now() - lastFetch < FETCH_INTERVAL_MS) return null;
    lastFetch = now();
    running = fetchKeys().finally(() => {
      running = null;
    });
    return running;
  }

  async function keyFor(kid) {
    if (!keys || now() - keysAt >= KEY_TTL_MS || !keys.has(kid)) await refresh();
    return keys?.get(kid) ?? null;
  }

  async function check(token) {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3 || !parts.every((part) => SEGMENT.test(part))) return null;
    const header = decodeJson(parts[0]);
    // The algorithm is fixed before any key is touched, so a token cannot choose how it is checked.
    if (header?.alg !== "RS256" || typeof header.kid !== "string") return null;
    const key = await keyFor(header.kid);
    if (!key) return null;
    const signedPart = Buffer.from(`${parts[0]}.${parts[1]}`);
    if (!verifySignature("RSA-SHA256", signedPart, key, Buffer.from(parts[2], "base64url")))
      return null;
    const claims = decodeJson(parts[1]);
    if (claims?.iss !== issuer) return null;
    const audienceOk = Array.isArray(claims.aud)
      ? claims.aud.includes(audience)
      : claims.aud === audience;
    if (!audienceOk) return null;
    const seconds = now() / 1000;
    if (typeof claims.exp !== "number" || !(claims.exp > seconds)) return null;
    for (const claim of [claims.nbf, claims.iat])
      if (claim !== undefined && (typeof claim !== "number" || !(claim <= seconds + MAX_FUTURE_S)))
        return null;
    if (typeof claims.email !== "string") return null;
    return byEmail.get(lowerEmail(claims.email)) ?? null;
  }

  return {
    async verify(req) {
      try {
        return await check(req?.headers?.[HEADER]);
      } catch {
        return null;
      }
    },
  };
}
