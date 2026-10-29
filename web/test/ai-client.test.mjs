import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAiConfig, callAiJson, ANTHROPIC_MIN_TIMEOUT_MS } from "../ai-client.mjs";
import { aiSuggest } from "../nutrition.mjs";
import { aiSubstitute, aiAudit } from "../studio-ai.mjs";

const SERVER = join(dirname(fileURLToPath(import.meta.url)), "..", "server.mjs");
const ANTHROPIC = { provider: "anthropic", key: "sk-ant-test" };
const recipe = {
  name: "Soup",
  recipeIngredient: [{ display: "1 onion" }],
  recipeInstructions: [{ text: "Cook it." }],
};

async function withFetch(handler, run) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}
const reply = (payload, extra = {}) =>
  new Response(
    JSON.stringify({
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "..." },
        { type: "text", text: JSON.stringify(payload) },
      ],
      ...extra,
    }),
    { status: 200 },
  );

function assertAnthropicRequest(url, init, schemaProps) {
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(init.method, "POST");
  assert.equal(init.redirect, "manual");
  assert.equal(init.headers["x-api-key"], "sk-ant-test");
  assert.equal(init.headers["anthropic-version"], "2026-10-21");
  assert.equal(init.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
  assert.equal(init.headers["content-type"], "application/json");
  assert.equal(init.headers.Authorization, undefined);
  const body = JSON.parse(init.body);
  assert.equal(body.model, "claude-opus-5-5");
  assert.equal(body.max_tokens, 4000);
  assert.equal(typeof body.system, "string");
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].role, "user");
  assert.equal(body.output_config.effort, "low");
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(body.output_config.format.schema.additionalProperties, false);
  assert.deepEqual(
    body.output_config.format.schema.required.sort(),
    Object.keys(body.output_config.format.schema.properties).sort(),
  );
  assert.deepEqual(Object.keys(body.output_config.format.schema.properties).sort(), schemaProps);
  assert.equal(body.fallbacks, "default");
  for (const k of ["thinking", "temperature", "top_p", "top_k", "store", "text"])
    assert.equal(k in body, false, k);
}

test("aiSuggest calls Anthropic with the expected request", () =>
  withFetch(
    async (url, init) => {
      assertAnthropicRequest(url, init, ["suggestions"]);
      return reply({ suggestions: [{ index: 0, query: "oats", note: "" }] });
    },
    async () => {
      const r = await aiSuggest(ANTHROPIC, ["100 g Haferflocken"]);
      assert.equal(r[0].query, "oats");
    },
  ));

test("aiSubstitute calls Anthropic with the expected request", () =>
  withFetch(
    async (url, init) => {
      assertAnthropicRequest(url, init, ["alternatives", "warning"]);
      return reply({ alternatives: [{ name: "margarine", adjustment: "1:1" }], warning: "" });
    },
    async () => {
      const r = await aiSubstitute(ANTHROPIC, "butter", "cake", "en");
      assert.equal(r.alternatives[0].name, "margarine");
    },
  ));

test("aiAudit calls Anthropic with the expected request", () =>
  withFetch(
    async (url, init) => {
      assertAnthropicRequest(url, init, ["issues", "summary"]);
      return reply({ issues: [], summary: "fine" });
    },
    async () => {
      const r = await aiAudit(ANTHROPIC, recipe, "en");
      assert.equal(r.summary, "fine");
    },
  ));

test("OpenAI request stays unchanged for a bare key", () =>
  withFetch(
    async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(init.headers.Authorization, "Bearer k");
      const body = JSON.parse(init.body);
      assert.equal(body.model, "gpt-4.1-mini");
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.text.format.name, "recipe_audit");
      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                { type: "output_text", text: JSON.stringify({ issues: [], summary: "ok" }) },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    },
    async () => assert.equal((await aiAudit("k", recipe, "en")).summary, "ok"),
  ));

test("Anthropic refusal and truncation are errors", async () => {
  for (const stop_reason of ["refusal", "max_tokens"]) {
    await withFetch(
      async () => reply({ issues: [], summary: "x" }, { stop_reason }),
      async () =>
        assert.rejects(
          () => aiAudit(ANTHROPIC, recipe, "en"),
          (e) => e.status === 502 && /refused|cut off/.test(e.message),
        ),
    );
  }
});

test("Anthropic HTTP statuses map to errors", async () => {
  const cases = [
    [401, /rejected the API key/],
    [403, /rejected the API key/],
    [429, /temporarily unavailable/],
    [529, /temporarily unavailable/],
    [503, /temporarily unavailable/],
    [400, /HTTP 400/],
  ];
  for (const [status, pattern] of cases)
    await withFetch(
      async () => new Response("{}", { status }),
      async () =>
        assert.rejects(
          () => aiAudit(ANTHROPIC, recipe, "en"),
          (e) => e.status === 502 && pattern.test(e.message) && !e.message.includes("sk-ant"),
        ),
    );
});

test("Anthropic garbage output is rejected", () =>
  withFetch(
    async () =>
      new Response(
        JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "no json" }] }),
        {
          status: 200,
        },
      ),
    async () => assert.rejects(() => aiAudit(ANTHROPIC, recipe, "en"), /AI response invalid/),
  ));

test("resolveAiConfig picks and validates the provider", () => {
  assert.equal(resolveAiConfig({}), null);
  assert.deepEqual(resolveAiConfig({ OPENAI_API_KEY: "a" }), { provider: "openai", key: "a" });
  assert.deepEqual(resolveAiConfig({ ANTHROPIC_API_KEY: "b" }), {
    provider: "anthropic",
    key: "b",
  });
  const both = { OPENAI_API_KEY: "a", ANTHROPIC_API_KEY: "b" };
  assert.throws(() => resolveAiConfig(both), /ATELIER_AI_PROVIDER/);
  assert.deepEqual(resolveAiConfig({ ...both, ATELIER_AI_PROVIDER: "anthropic" }), {
    provider: "anthropic",
    key: "b",
  });
  assert.deepEqual(resolveAiConfig({ ...both, ATELIER_AI_PROVIDER: "OpenAI" }), {
    provider: "openai",
    key: "a",
  });
  assert.throws(
    () => resolveAiConfig({ ...both, ATELIER_AI_PROVIDER: "gemini" }),
    /openai or anthropic/,
  );
  assert.throws(
    () => resolveAiConfig({ OPENAI_API_KEY: "a", ATELIER_AI_PROVIDER: "anthropic" }),
    /ANTHROPIC_API_KEY/,
  );
});

async function startServer(extraEnv) {
  const env = { ...process.env, ...extraEnv };
  delete env.OPENAI_API_KEY;
  delete env.ANTHROPIC_API_KEY;
  delete env.ATELIER_AI_PROVIDER;
  const child = spawn(process.execPath, [SERVER], {
    env: {
      ...env,
      MEALIE_URL: "http://127.0.0.1:9",
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_PASSWORD: "lengthy-test-password",
      ATELIER_DATA_DIR: await mkdtemp(join(tmpdir(), "atelier-ai-")),
      PORT: "0",
      HOST: "127.0.0.1",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "",
    err = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (err += c));
  const result = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ started: false, timedOut: true }), 10000);
    child.stdout.on("data", () => {
      if (/http:\/\/127\.0\.0\.1:\d+/.test(out)) {
        clearTimeout(timer);
        resolve({ started: true });
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve({ started: false, code });
    });
  });
  if (result.started) child.kill();
  return { ...result, err, out };
}

test("server refuses to start with both AI keys and no provider", async () => {
  const r = await startServer({ OPENAI_API_KEY: "sk-secret-a", ANTHROPIC_API_KEY: "sk-secret-b" });
  assert.equal(r.started, false);
  assert.equal(r.code, 1);
  assert.match(r.err, /ATELIER_AI_PROVIDER/);
  assert.doesNotMatch(r.err, /sk-secret/);
});

test("server starts with both AI keys when the provider is chosen", async () => {
  const r = await startServer({
    OPENAI_API_KEY: "sk-secret-a",
    ANTHROPIC_API_KEY: "sk-secret-b",
    ATELIER_AI_PROVIDER: "anthropic",
  });
  assert.equal(r.started, true, r.err);
});

test("German AI instructions ask for informal du on both providers", async () => {
  for (const ai of [ANTHROPIC, "k"]) {
    const seen = [];
    await withFetch(
      async (_url, init) => {
        const body = JSON.parse(init.body);
        seen.push(body.system ?? body.instructions);
        const payload = /ingredient substitutes/.test(seen.at(-1))
          ? { alternatives: [], warning: "" }
          : { issues: [], summary: "" };
        return typeof ai === "string"
          ? new Response(
              JSON.stringify({
                output: [{ content: [{ type: "output_text", text: JSON.stringify(payload) }] }],
              }),
              { status: 200 },
            )
          : reply(payload);
      },
      async () => {
        await aiSubstitute(ai, "butter", "cake", "de");
        await aiAudit(ai, recipe, "de");
        await aiAudit(ai, recipe, "en");
      },
    );
    assert.match(seen[0], /informally with "du"/);
    assert.match(seen[1], /informally with "du"/);
    assert.doesNotMatch(seen[2], /"du"/);
  }
});

test("AI failures carry the ai_error code, also for shape failures", async () => {
  const cases = [
    () => new Response("{}", { status: 401 }),
    () => new Response("{}", { status: 503 }),
    () => reply({ nonsense: true }),
  ];
  for (const handler of cases) {
    await withFetch(
      async () => handler(),
      async () => {
        await assert.rejects(
          aiSubstitute(ANTHROPIC, "butter", "cake", "en"),
          (e) => e.status === 502 && e.atelierCode === "ai_error" && !/sk-ant/.test(e.message),
        );
        await assert.rejects(
          aiAudit(ANTHROPIC, recipe),
          (e) => e.status === 502 && e.atelierCode === "ai_error",
        );
        await assert.rejects(
          aiSuggest(ANTHROPIC, ["1 onion"]),
          (e) => e.status === 502 && e.atelierCode === "ai_error",
        );
      },
    );
  }
});

test("Anthropic calls wait at least the minimum timeout, OpenAI keeps the given one", async () => {
  const seen = [];
  const realSet = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...rest) => {
    seen.push(ms);
    return realSet(fn, ms, ...rest);
  };
  try {
    await withFetch(
      async () => reply({ ok: true }),
      () =>
        callAiJson({ ai: ANTHROPIC, instructions: "x", input: "y", schema: {}, timeoutMs: 20000 }),
    );
    await withFetch(
      async () =>
        new Response(
          JSON.stringify({ output: [{ content: [{ type: "output_text", text: "{}" }] }] }),
          { status: 200 },
        ),
      () =>
        callAiJson({
          ai: { provider: "openai", key: "sk-x" },
          instructions: "x",
          input: "y",
          schema: {},
          timeoutMs: 20000,
        }),
    );
  } finally {
    globalThis.setTimeout = realSet;
  }
  assert.equal(ANTHROPIC_MIN_TIMEOUT_MS, 60000);
  assert.deepEqual(seen.slice(0, 2), [60000, 20000]);
});

test("transport failures and unreadable 200 bodies become ai_error 502 without leaking details", async () => {
  const handlers = [
    async () => {
      throw new TypeError("fetch failed ECONNREFUSED sk-ant-test");
    },
    async () => new Response("<html>not json</html>", { status: 200 }),
  ];
  for (const handler of handlers) {
    await withFetch(handler, async () => {
      await assert.rejects(
        callAiJson({ ai: ANTHROPIC, instructions: "x", input: "y", schema: {}, timeoutMs: 1000 }),
        (e) =>
          e.status === 502 &&
          e.atelierCode === "ai_error" &&
          !/sk-ant|ECONNREFUSED|html/.test(e.message),
      );
    });
  }
});
