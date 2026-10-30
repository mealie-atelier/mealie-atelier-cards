// Minimal AI client for the optional helpers. Plain fetch, no SDK. Two providers: OpenAI and Anthropic.

const OPENAI_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const PROVIDERS = ["openai", "anthropic"];

/**
 * Picks the provider from the environment. Returns null when no key is set (AI disabled),
 * otherwise { provider, key }. Throws a message without any key material on bad configuration.
 */
export function resolveAiConfig(env = process.env) {
  const openai = String(env.OPENAI_API_KEY || "").trim();
  const anthropic = String(env.ANTHROPIC_API_KEY || "").trim();
  const chosen = String(env.ATELIER_AI_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (chosen && !PROVIDERS.includes(chosen))
    throw new Error("ATELIER_AI_PROVIDER must be openai or anthropic.");
  const keys = { openai, anthropic };
  if (chosen) {
    if (!keys[chosen])
      throw new Error(
        `ATELIER_AI_PROVIDER=${chosen} needs ${chosen === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}.`,
      );
    return { provider: chosen, key: keys[chosen] };
  }
  if (openai && anthropic)
    throw new Error(
      "Both OPENAI_API_KEY and ANTHROPIC_API_KEY are set. Set ATELIER_AI_PROVIDER to openai or anthropic.",
    );
  if (openai) return { provider: "openai", key: openai };
  if (anthropic) return { provider: "anthropic", key: anthropic };
  return null;
}

/** Accepts a { provider, key } config or a bare OpenAI key string (legacy callers). */
export function normalizeAi(ai) {
  if (!ai) return null;
  if (typeof ai === "string") return { provider: "openai", key: ai };
  return ai.key ? { provider: ai.provider || "openai", key: ai.key } : null;
}

export const fail = (message) =>
  Object.assign(new Error(message), { status: 502, atelierCode: "ai_error" });

export const ANTHROPIC_MIN_TIMEOUT_MS = 60000;

function statusError(status) {
  if (status === 401 || status === 403) return fail(`AI provider rejected the API key (${status})`);
  if (status === 429 || status === 529 || status >= 500)
    return fail(`AI provider temporarily unavailable (${status})`);
  return fail(`AI provider HTTP ${status}`);
}

/**
 * Calls the configured provider with a JSON schema and returns the parsed JSON object.
 * Every failure is an Error with status 502.
 */
export async function callAiJson({
  ai,
  instructions,
  input,
  schema,
  schemaName,
  timeoutMs = 25000,
}) {
  const cfg = normalizeAi(ai);
  if (!cfg)
    throw Object.assign(new Error("AI is not configured"), {
      status: 400,
      atelierCode: "ai_not_configured",
    });
  const anthropic = cfg.provider === "anthropic";
  const request = anthropic
    ? {
        url: ANTHROPIC_URL,
        headers: {
          "x-api-key": cfg.key,
          "anthropic-version": "2026-10-21",
          "anthropic-beta": "server-side-fallback-2026-07-01",
          "content-type": "application/json",
        },
        body: {
          model: "claude-opus-5-5",
          max_tokens: 4000,
          system: instructions,
          messages: [{ role: "user", content: input }],
          output_config: { effort: "low", format: { type: "json_schema", schema } },
          fallbacks: "default",
        },
      }
    : {
        url: OPENAI_URL,
        headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
        body: {
          model: "gpt-4.1-mini",
          store: false,
          instructions,
          input,
          text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
        },
      };
  const controller = new AbortController();
  const effectiveTimeout = anthropic ? Math.max(timeoutMs, ANTHROPIC_MIN_TIMEOUT_MS) : timeoutMs;
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    const res = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      redirect: "manual",
      signal: controller.signal,
    });
    if (res.status !== 200) throw statusError(res.status);
    const data = await res.json();
    let raw;
    if (anthropic) {
      if (data.stop_reason === "refusal") throw fail("AI provider refused the request");
      if (data.stop_reason === "max_tokens") throw fail("AI response was cut off");
      raw = data.content?.find((x) => x?.type === "text")?.text;
    } else {
      raw = data.output
        ?.flatMap((x) => x.content || [])
        .find((x) => x.type === "output_text")?.text;
    }
    try {
      const parsed = JSON.parse(raw || "{}");
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* falls through to the error below */
    }
    throw fail("AI response invalid");
  } catch (e) {
    if (e?.atelierCode === "ai_error") throw e;
    if (e?.name === "AbortError") throw fail("AI request timed out");
    if (e instanceof SyntaxError) throw fail("AI answer could not be read");
    throw fail("AI provider unavailable");
  } finally {
    clearTimeout(timer);
  }
}
