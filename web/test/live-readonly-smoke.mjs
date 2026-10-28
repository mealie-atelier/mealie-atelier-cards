/** Manual live Mealie smoke test. Strictly GET-only; no credentials or recipe content printed. */
const url = (process.env.MEALIE_URL || "").replace(/\/$/, "");
const token = process.env.MEALIE_API_TOKEN || "";
if (process.env.MEALIE_ATELIER_TEST_READONLY !== "1" || !url || !token) {
  console.error(
    "Set MEALIE_ATELIER_TEST_READONLY=1, MEALIE_URL and MEALIE_API_TOKEN (never commit these values).",
  );
  process.exit(2);
}
const parsed = new URL(url);
if (
  !["http:", "https:"].includes(parsed.protocol) ||
  parsed.username ||
  parsed.password ||
  parsed.search ||
  parsed.hash
) {
  console.error("Invalid Mealie origin.");
  process.exit(2);
}
const requests = [
  ["/api/users/self", (body) => typeof body.id === "string"],
  ["/api/recipes?perPage=2&page=1", (body) => Array.isArray(body?.items)],
  [
    "/api/households/shopping/lists?perPage=2",
    (body) => Array.isArray(body?.items) || Array.isArray(body),
  ],
  [
    "/api/households/shopping/items?perPage=2",
    (body) => Array.isArray(body?.items) || Array.isArray(body),
  ],
  [
    "/api/organizers/categories?perPage=2",
    (body) => Array.isArray(body?.items) || Array.isArray(body),
  ],
];
let failed = 0;
let sampleSlug = "";
for (const [path, validate] of requests) {
  const abort = AbortSignal.timeout(12000);
  try {
    const response = await fetch(url + path, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "manual",
      signal: abort,
    });
    if (response.status !== 200) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!validate(data)) throw Error("Response schema did not match expected shape");
    if (path.startsWith("/api/recipes?"))
      sampleSlug = typeof data.items?.[0]?.slug === "string" ? data.items[0].slug : "";
    console.log(`OK ${path.split("?")[0]}: valid response`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${path.split("?")[0]}: ${String(error.message).slice(0, 120)}`);
  }
}
if (sampleSlug && /^[a-zA-Z0-9_-]{1,150}$/.test(sampleSlug)) {
  const path = "/api/recipes/" + encodeURIComponent(sampleSlug);
  try {
    const response = await fetch(url + path, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
    if (response.status !== 200) throw Error(`HTTP ${response.status}`);
    const detail = await response.json();
    if (!Array.isArray(detail?.recipeIngredient) || !Array.isArray(detail?.recipeInstructions))
      throw Error("Recipe detail has missing arrays");
    console.log("OK /api/recipes/{slug}: structured recipe detail available");
  } catch (error) {
    failed++;
    console.error("FAIL /api/recipes/{slug}: " + String(error.message).slice(0, 120));
  }
}
console.log(
  failed === 0 ? "GET-only Mealie contract smoke PASSED" : "GET-only Mealie contract smoke FAILED",
);
process.exit(failed ? 1 : 0);
