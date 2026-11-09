/**
 * Preload for tests that spawn the real server with Cloudflare Access configured. It answers the
 * key fetch from ACCESS_TEST_JWKS, so production code needs no way to point at another key source.
 */
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).endsWith("/cdn-cgi/access/certs"))
    return new Response(process.env.ACCESS_TEST_JWKS, { status: 200 });
  return realFetch(url, init);
};
