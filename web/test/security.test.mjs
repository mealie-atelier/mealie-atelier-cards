import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuthThrottle,
  contentSecurityPolicy,
  inlineScriptHashes,
  renderServiceWorker,
  packageVersion,
} from "../security.mjs";
import { resolveLocale } from "../studio-ai.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PASSWORD = "a-sufficiently-long-password";
const basic = (pass) => "Basic " + Buffer.from("atelier:" + pass).toString("base64");

function start(env) {
  const child = spawn(process.execPath, [join(ROOT, "server.mjs")], {
    env: {
      ...process.env,
      MEALIE_URL: "http://127.0.0.1:9",
      MEALIE_API_TOKEN: "DEMO_MOCK_TOKEN",
      ATELIER_USERNAME: "atelier",
      PORT: "0",
      HOST: "127.0.0.1",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "",
    err = "";
  child.stderr.on("data", (c) => (err += c));
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("App did not start")), 5000);
    child.stdout.on("data", (c) => {
      out += c;
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(Object.assign(Error("exited"), { code, err }));
    });
  });
  return { child, ready };
}

test("server refuses to start with a password shorter than 12 characters", async () => {
  const { ready } = start({ ATELIER_PASSWORD: "short-pass" });
  await assert.rejects(ready, (e) => {
    assert.equal(e.code, 1);
    assert.match(e.err, /ATELIER_PASSWORD must be at least 12 characters/);
    return true;
  });
});

test("throttle grows the lockout exponentially after the free attempts and resets on success", () => {
  let t = 1000;
  const throttle = createAuthThrottle({ freeAttempts: 2, baseMs: 1000, maxMs: 5000, now: () => t });
  throttle.fail("a");
  throttle.fail("a");
  assert.equal(throttle.retryAfterMs("a"), 0);
  throttle.fail("a");
  assert.equal(throttle.retryAfterMs("a"), 1000);
  t += 1000;
  assert.equal(throttle.retryAfterMs("a"), 0);
  throttle.fail("a");
  assert.equal(throttle.retryAfterMs("a"), 2000);
  t += 2000;
  throttle.fail("a");
  assert.equal(throttle.retryAfterMs("a"), 4000);
  t += 4000;
  throttle.fail("a");
  assert.equal(throttle.retryAfterMs("a"), 5000, "lockout is capped");
  assert.equal(throttle.retryAfterMs("b"), 0, "other clients are unaffected");
  throttle.succeed("a");
  assert.equal(throttle.retryAfterMs("a"), 0);
  assert.equal(throttle.size(), 0);
});

test("throttle table stays bounded", () => {
  const throttle = createAuthThrottle({ maxEntries: 10 });
  for (let i = 0; i < 100; i++) throttle.fail("ip" + i);
  assert.ok(throttle.size() <= 10);
});

test("server locks out a client after repeated wrong passwords and sets hardening headers", async () => {
  const { child, ready } = start({ ATELIER_PASSWORD: PASSWORD });
  try {
    const port = await ready;
    const url = `http://127.0.0.1:${port}/`;
    const anonymous = await fetch(url);
    assert.equal(anonymous.status, 401, "anonymous request is not a failed attempt");
    const ok = await fetch(url, { headers: { Authorization: basic(PASSWORD) } });
    assert.equal(ok.status, 200);
    const csp = ok.headers.get("content-security-policy");
    assert.match(csp, /script-src 'self' 'unsafe-hashes' 'sha256-/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
    assert.match(ok.headers.get("permissions-policy"), /camera=\(\)/);
    assert.equal(ok.headers.get("cross-origin-opener-policy"), "same-origin");
    assert.equal(ok.headers.get("referrer-policy"), "no-referrer");
    for (let i = 0; i < 5; i++) {
      const r = await fetch(url, { headers: { Authorization: basic("wrong-password-" + i) } });
      assert.equal(r.status, 401);
    }
    const sixth = await fetch(url, { headers: { Authorization: basic("wrong-password-x") } });
    assert.equal(sixth.status, 401);
    const locked = await fetch(url, { headers: { Authorization: basic(PASSWORD) } });
    assert.equal(locked.status, 429, "even the correct password waits out the lockout");
    assert.ok(Number(locked.headers.get("retry-after")) >= 1);
  } finally {
    child.kill();
  }
});

test("CSP allows exactly the inline scripts of index.html by hash", async () => {
  const html = await readFile(join(ROOT, "public", "index.html"), "utf8");
  const hashes = inlineScriptHashes(html);
  assert.equal(hashes.length, 1);
  const csp = contentSecurityPolicy(hashes);
  assert.ok(csp.includes(hashes[0]));
  assert.match(csp, /img-src 'self' data: blob:/);
  assert.match(csp, /object-src 'none'/);
});

test("service worker cache name follows the package version", async () => {
  const source = await readFile(join(ROOT, "public", "sw.js"), "utf8");
  assert.doesNotMatch(source, /shell-v\d{3}\b/, "no hand-maintained cache suffix");
  const version = packageVersion(await readFile(join(ROOT, "package.json"), "utf8"));
  const rendered = renderServiceWorker(source, version);
  assert.match(rendered, new RegExp(`CACHE = "mealie-atelier-shell-v${version.replace(/\./g, "\\.")}"`));
  assert.doesNotMatch(rendered, /__ATELIER_VERSION__/);
  assert.notEqual(
    renderServiceWorker(source, "9.9.9").match(/CACHE = "[^"]+"/)[0],
    rendered.match(/CACHE = "[^"]+"/)[0],
  );
  assert.throws(() => packageVersion('{"version":"1.0\\"; evil"}'));
});

test("server serves the service worker with the rendered cache name", async () => {
  const { child, ready } = start({ ATELIER_PASSWORD: PASSWORD });
  try {
    const port = await ready;
    const version = packageVersion(await readFile(join(ROOT, "package.json"), "utf8"));
    const res = await fetch(`http://127.0.0.1:${port}/sw.js`, {
      headers: { Authorization: basic(PASSWORD) },
    });
    assert.match(await res.text(), new RegExp(`mealie-atelier-shell-v${version.replace(/\./g, "\\.")}"`));
  } finally {
    child.kill();
  }
});

test("AI locale resolves from explicit language, then Accept-Language", () => {
  assert.equal(resolveLocale(undefined, undefined), "de");
  assert.equal(resolveLocale("en-US,en;q=0.9,de;q=0.8"), "en");
  assert.equal(resolveLocale("fr;q=1, de;q=0.5"), "de");
  assert.equal(resolveLocale("de;q=0.3, en;q=0.9"), "en");
  assert.equal(resolveLocale("fr-FR,fr"), "en");
  assert.equal(resolveLocale("de-DE", "en-GB"), "en");
});

test("AI disclaimers are localized", async () => {
  const { aiSubstitute, aiAudit } = await import("../studio-ai.mjs");
  const original = globalThis.fetch;
  const body = (payload) => ({
    status: 200,
    json: async () => ({
      output: [{ content: [{ type: "output_text", text: JSON.stringify(payload) }] }],
    }),
  });
  try {
    for (const [locale, word] of [["en", /Check/], ["de", /prüfen/]]) {
      globalThis.fetch = async (_url, init) => {
        assert.match(JSON.parse(init.body).instructions, locale === "en" ? /English/ : /German/);
        return body(
          init.body.includes("substitute_options")
            ? { alternatives: [], warning: "" }
            : { issues: [], summary: "" },
        );
      };
      const sub = await aiSubstitute("k", "butter", "cake", locale);
      assert.match(sub.disclaimer, word);
      const audit = await aiAudit(
        "k",
        { name: "x", recipeIngredient: [{ display: "a" }], recipeInstructions: [{ text: "b" }] },
        locale,
      );
      assert.match(audit.disclaimer, word);
    }
  } finally {
    globalThis.fetch = original;
  }
});
