/** Container health probe: authenticated GET /api/health against the local server. */
const password = process.env.ATELIER_PASSWORD || "";
// With ATELIER_USERS only there is no shared password. An anonymous request is not counted by the
// sign-in throttle and its 401 still proves that the server is up.
const headers = password
  ? {
      Authorization: `Basic ${Buffer.from(`${process.env.ATELIER_USERNAME || "atelier"}:${password}`).toString("base64")}`,
    }
  : {};
try {
  const res = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health`, {
    headers,
    signal: AbortSignal.timeout(4000),
  });
  process.exit(res.ok || (!password && res.status === 401) ? 0 : 1);
} catch {
  process.exit(1);
}
