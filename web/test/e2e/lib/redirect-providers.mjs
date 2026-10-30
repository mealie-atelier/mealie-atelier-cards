// Preloaded into the app process with `node --import`. Sends the three third-party API hosts the app
// can call (OpenAI, Anthropic, USDA FoodData Central) and Web Push services to the local mock, so the
// "configured" paths run end to end without any real key or network access.
const origin = process.env.E2E_MOCK_ORIGIN;
const map = {
  "api.openai.com": "openai",
  "api.anthropic.com": "anthropic",
  "api.nal.usda.gov": "usda",
  "fcm.googleapis.com": "push",
};
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return realFetch(input, init);
  }
  const prefix = map[url.hostname];
  if (origin && prefix) return realFetch(`${origin}/${prefix}${url.pathname}${url.search}`, init);
  return realFetch(input, init);
};
