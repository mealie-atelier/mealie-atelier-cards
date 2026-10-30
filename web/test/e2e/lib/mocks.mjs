// One local HTTP server that plays every external service the app can call: an OpenAI and an
// Anthropic compatible provider, USDA FoodData Central, a Web Push service and Home Assistant notify.
// It records requests so tests can assert what left the app. No real keys, no real hosts.
import { createServer } from "node:http";

export async function startMocks() {
  const requests = [];
  const behaviour = { aiStatus: 200 };
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const path = new URL(req.url, "http://mock").pathname;
    let body = null;
    try {
      body = raw && req.headers["content-type"]?.includes("json") ? JSON.parse(raw) : null;
    } catch {}
    requests.push({ method: req.method, path, headers: req.headers, body, bytes: raw.length });
    const json = (status, value) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (path === "/_requests") return json(200, requests);
    if (path.startsWith("/ha/") || path.startsWith("/api/services/notify/")) return json(200, []);
    if (path.startsWith("/push/")) {
      res.writeHead(201);
      return res.end();
    }
    if (path.startsWith("/usda/")) {
      if (path.endsWith("/foods/search"))
        return json(200, {
          foods: [
            {
              fdcId: 1001,
              description: `Mock food for ${body?.query}`,
              dataType: "Foundation",
              foodNutrients: [
                { nutrientId: 1008, value: 120 },
                { nutrientId: 1003, value: 4 },
                { nutrientId: 1004, value: 2 },
                { nutrientId: 1005, value: 20 },
              ],
            },
          ],
        });
      return json(404, {});
    }
    if (path.startsWith("/openai/") || path.startsWith("/anthropic/")) {
      if (behaviour.aiStatus !== 200) return json(behaviour.aiStatus, { error: "mock failure" });
      const openai = path.startsWith("/openai/");
      const schema = openai ? body?.text?.format?.schema : body?.output_config?.format?.schema;
      const required = schema?.required || [];
      let answer = {};
      if (required.includes("alternatives"))
        answer = {
          alternatives: [{ name: "Mock substitute", adjustment: "Use the same amount." }],
          warning: "Mock warning",
        };
      else if (required.includes("issues"))
        answer = {
          issues: [
            {
              severity: "info",
              area: "Mock area",
              issue: "Mock issue",
              suggestion: "Mock suggestion",
            },
          ],
          summary: "Mock summary",
        };
      else
        answer = Object.fromEntries(
          required.map((key) => [key, schema.properties[key]?.type === "array" ? [] : "mock"]),
        );
      const text = JSON.stringify(answer);
      return json(
        200,
        openai
          ? { output: [{ content: [{ type: "output_text", text }] }] }
          : { stop_reason: "end_turn", content: [{ type: "text", text }] },
      );
    }
    json(404, { error: "mock: unknown route" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    requests,
    behaviour,
    since: (mark) => requests.slice(mark),
    async stop() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
