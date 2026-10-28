/** Container health probe: authenticated GET /api/health against the local server. */
const auth = Buffer.from(
  `${process.env.ATELIER_USERNAME || "atelier"}:${process.env.ATELIER_PASSWORD || ""}`,
).toString("base64");
try {
  const res = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health`, {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(4000),
  });
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
