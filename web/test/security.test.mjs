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
  commandLevel,
  createCredentialVerifier,
  denial,
  isPrivateAddress,
  hashPassword,
  parseScryptHash,
  parseUsers,
  rolePermissions,
  verifyScrypt,
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
    const anonymousLocked = await fetch(url);
    assert.equal(anonymousLocked.status, 429, "anonymous requests from a throttled address wait");
  } finally {
    child.kill();
  }
});

test("CSP allows exactly the inline scripts of index.html by hash", async () => {
  const html = await readFile(join(ROOT, "public", "index.html"), "utf8");
  const hashes = inlineScriptHashes(html);
  assert.equal(hashes.length, 2, "the first-paint theme script and the module script");
  const csp = contentSecurityPolicy(hashes);
  for (const hash of hashes) assert.ok(csp.includes(hash));
  assert.match(csp, /img-src 'self' data: blob:/);
  assert.match(csp, /object-src 'none'/);
});

test("service worker cache name follows the package version", async () => {
  const source = await readFile(join(ROOT, "public", "sw.js"), "utf8");
  assert.doesNotMatch(source, /shell-v\d{3}\b/, "no hand-maintained cache suffix");
  const version = packageVersion(await readFile(join(ROOT, "package.json"), "utf8"));
  const rendered = renderServiceWorker(source, version);
  assert.match(
    rendered,
    new RegExp(`CACHE = "mealie-atelier-shell-v${version.replace(/\./g, "\\.")}"`),
  );
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
    assert.match(
      await res.text(),
      new RegExp(`mealie-atelier-shell-v${version.replace(/\./g, "\\.")}"`),
    );
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
    for (const [locale, word] of [
      ["en", /Check/],
      ["de", /prüfen/],
    ]) {
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

import { parseTrustedProxies, clientAddress, throttleKey } from "../security.mjs";

test("X-Forwarded-For from an untrusted socket is ignored", () => {
  const rules = parseTrustedProxies("10.0.0.0/8");
  assert.equal(clientAddress("203.0.113.9", "1.2.3.4", rules), "203.0.113.9");
  assert.equal(clientAddress("203.0.113.9", "1.2.3.4", []), "203.0.113.9");
});

test("a trusted proxy yields independent keys per forwarded client", () => {
  const rules = parseTrustedProxies("10.0.0.1, fd00::/8");
  assert.equal(clientAddress("10.0.0.1", "198.51.100.7", rules), "198.51.100.7");
  assert.equal(clientAddress("10.0.0.1", "198.51.100.8", rules), "198.51.100.8");
  // Spoofed left entries are skipped: the rightmost non-proxy address wins.
  assert.equal(clientAddress("10.0.0.1", "6.6.6.6, 198.51.100.7, fd00::5", rules), "198.51.100.7");
  assert.equal(clientAddress("::ffff:10.0.0.1", "198.51.100.7", rules), "198.51.100.7");
  assert.equal(clientAddress("10.0.0.1", undefined, rules), "10.0.0.1");
  assert.equal(clientAddress("10.0.0.1", "garbage", rules), "10.0.0.1");
  const throttle = createAuthThrottle({ freeAttempts: 0, now: () => 0 });
  for (let i = 0; i < 3; i++) throttle.fail(clientAddress("10.0.0.1", "198.51.100.7", rules));
  assert.ok(throttle.retryAfterMs(clientAddress("10.0.0.1", "198.51.100.7", rules)) > 0);
  assert.equal(throttle.retryAfterMs(clientAddress("10.0.0.1", "198.51.100.8", rules)), 0);
});

test("IPv6 clients are grouped by their /64 prefix", () => {
  assert.equal(
    throttleKey("2001:db8:1:2:aaaa::1"),
    throttleKey("2001:db8:1:2:bbbb:cccc:dddd:eeee"),
  );
  assert.notEqual(throttleKey("2001:db8:1:2::1"), throttleKey("2001:db8:1:3::1"));
  assert.equal(throttleKey("::ffff:192.0.2.1"), "192.0.2.1");
  const rules = parseTrustedProxies("10.0.0.1");
  assert.equal(
    clientAddress("10.0.0.1", "2001:db8::1", rules),
    clientAddress("10.0.0.1", "2001:db8::2", rules),
  );
  assert.throws(() => parseTrustedProxies("10.0.0.0/33"));
  assert.throws(() => parseTrustedProxies("nope"));
});

test("default maximum lockout is 60 seconds", () => {
  let t = 0;
  const throttle = createAuthThrottle({ freeAttempts: 0, now: () => t });
  for (let i = 0; i < 30; i++) throttle.fail("a");
  assert.equal(throttle.retryAfterMs("a"), 60000);
});

const basicFor = (name, pass) => "Basic " + Buffer.from(`${name}:${pass}`).toString("base64");
const hashes = {};
async function hashOf(password) {
  return (hashes[password] ||= await hashPassword(password));
}

test("ATELIER_USERS parser accepts valid entries and names the position of malformed ones", async () => {
  const hash = await hashOf("anna-long-passphrase");
  const users = parseUsers(`anna:admin:${hash}; ben.k:writer:${hash};cy_1:reader:${hash};`);
  assert.deepEqual(
    users.map((u) => [u.name, u.role]),
    [
      ["anna", "admin"],
      ["ben.k", "writer"],
      ["cy_1", "reader"],
    ],
  );
  assert.deepEqual(parseUsers(""), []);
  const bad = [
    [`anna:owner:${hash}`, /entry 1 has an invalid role/],
    [`anna:admin`, /entry 1 must look like/],
    [`Anna:admin:${hash}`, /entry 1 has an invalid username/],
    [`ok:admin:${hash};x:reader:scrypt$1024$8$1$c2FsdHNhbHQ$a2V5`, /entry 2 has an invalid hash/],
    [`ok:admin:${hash};two:writer:plain-text`, /entry 2 has an invalid hash/],
  ];
  for (const [text, pattern] of bad)
    assert.throws(
      () => parseUsers(text),
      (e) => pattern.test(e.message) && !e.message.includes(hash),
      text,
    );
  assert.throws(
    () => parseUsers(`anna:admin:${hash};anna:reader:${hash}`),
    /entry 2 repeats the username of entry 1/,
  );
});

test("scrypt hashes verify only the right password with the stored parameters", async () => {
  const hash = await hashOf("correct-horse-battery");
  const parsed = parseScryptHash(hash);
  assert.equal(parsed.N, 16384);
  assert.equal(parsed.key.length, 32);
  assert.equal(await verifyScrypt("correct-horse-battery", parsed), true);
  assert.equal(await verifyScrypt("correct-horse-batterz", parsed), false);
  assert.equal(await verifyScrypt("", parsed), false);
  assert.equal(parseScryptHash(hash.replace("$16384$", "$8192$")), null, "N below 16384 is weak");
  assert.equal(parseScryptHash(hash.replace("$16384$", "$20000$")), null, "N must be a power of 2");
  assert.notEqual(await hashPassword("same"), await hashPassword("same"), "salt is random");
});

test("scrypt compare is constant time and never throws on a stored key of another length", async () => {
  const parsed = parseScryptHash(await hashOf("correct-horse-battery"));
  // timingSafeEqual throws on unequal lengths, so the length guard must answer false instead.
  assert.equal(
    await verifyScrypt("correct-horse-battery", { ...parsed, key: parsed.key.subarray(0, 16) }),
    false,
  );
  assert.equal(
    await verifyScrypt("correct-horse-battery", { ...parsed, key: Buffer.alloc(0) }),
    false,
  );
  for (const index of [0, parsed.key.length - 1]) {
    const flipped = Buffer.from(parsed.key);
    flipped[index] ^= 1;
    assert.equal(await verifyScrypt("correct-horse-battery", { ...parsed, key: flipped }), false);
  }
  const source = await readFile(join(ROOT, "security.mjs"), "utf8");
  assert.match(source, /timingSafeEqual\(key, parsedHash\.key\)/, "uses timingSafeEqual");
});

test("credential verifier caches successes for 10 minutes and never caches failures", async () => {
  let t = 1_000;
  let calls = 0;
  const users = parseUsers(`anna:admin:${await hashOf("anna-long-passphrase")}`);
  const verifier = createCredentialVerifier({
    users,
    now: () => t,
    verify: async (password, hash) => {
      calls++;
      return verifyScrypt(password, hash);
    },
  });
  const good = basicFor("anna", "anna-long-passphrase");
  assert.deepEqual(await verifier.verify(good), { name: "anna", role: "admin" });
  assert.equal(calls, 1);
  await verifier.verify(good);
  assert.equal(calls, 1, "second request is served from the cache");
  t += 10 * 60 * 1000 + 1;
  await verifier.verify(good);
  assert.equal(calls, 2, "cache entry expires after 10 minutes");
  const wrong = basicFor("anna", "wrong-passphrase-here");
  assert.equal(await verifier.verify(wrong), null);
  assert.equal(await verifier.verify(wrong), null);
  assert.equal(calls, 4, "failures are verified again every time");
  assert.equal(verifier.cacheSize(), 1);
});

test("credential verifier maps the shared password to admin and hides unknown usernames", async () => {
  let calls = 0;
  const users = parseUsers(`ben:reader:${await hashOf("ben-long-passphrase")}`);
  const verifier = createCredentialVerifier({
    users,
    legacy: { name: "atelier", password: "shared-long-password" },
    verify: async (password, hash) => {
      calls++;
      return verifyScrypt(password, hash);
    },
  });
  assert.deepEqual(await verifier.verify(basicFor("atelier", "shared-long-password")), {
    name: "atelier",
    role: "admin",
  });
  assert.equal(calls, 0, "the shared password needs no scrypt run");
  assert.equal(await verifier.verify(basicFor("atelier", "nope-nope-nope-nope")), null);
  assert.equal(await verifier.verify(basicFor("ghost", "whatever-long-value")), null);
  assert.equal(calls, 1, "an unknown name still costs one scrypt run");
  assert.deepEqual(await verifier.verify(basicFor("ben", "ben-long-passphrase")), {
    name: "ben",
    role: "reader",
  });
  assert.equal(await verifier.verify("Bearer abc"), null);
  assert.equal(await verifier.verify("Basic !!!"), null);
});

test("role permissions and the command matrix follow the contract", () => {
  assert.deepEqual(rolePermissions("admin"), { can_read: true, can_write: true, can_admin: true });
  assert.deepEqual(rolePermissions("writer"), {
    can_read: true,
    can_write: true,
    can_admin: false,
  });
  assert.deepEqual(rolePermissions("reader"), {
    can_read: true,
    can_write: false,
    can_admin: false,
  });
  assert.deepEqual(rolePermissions("admin", true), {
    can_read: true,
    can_write: false,
    can_admin: false,
  });
  const level = (type, extra = {}) => commandLevel({ type: "mealie_atelier/" + type, ...extra });
  assert.equal(level("recipes"), "read");
  assert.equal(level("mutate", { action: "shopping_toggle" }), "write");
  assert.equal(level("mutate", { action: "recipe_update" }), "admin");
  assert.equal(level("mutate", { action: "bogus" }), null, "unknown actions are invalid_request");
  assert.equal(level("mutate", { action: "toString" }), null);
  assert.equal(level("studio_update", { action: "pantry_put" }), "write");
  assert.equal(
    level("studio_update", { action: "journal_set" }),
    "write",
    "the journal is shared state, so it needs the write level",
  );
  assert.equal(level("studio_update", { action: "family_member" }), "admin");
  assert.equal(level("studio_update", { action: "session_task", payload: { text: "x" } }), "admin");
  assert.equal(
    level("studio_update", { action: "session_task", payload: { session_id: "s", id: "t" } }),
    "admin",
    "a task update without a boolean done is not a toggle",
  );
  assert.equal(
    level("studio_update", {
      action: "session_task",
      payload: { session_id: "s", id: "t", done: true },
    }),
    "write",
    "toggling done stays a plain write",
  );
  assert.equal(
    level("studio_update", {
      action: "session_task",
      payload: { session_id: "s", id: "t", done: true, adultApproved: true },
    }),
    "admin",
    "approving through a toggle-shaped payload with extra keys is admin",
  );
  assert.equal(level("alarm_create"), "personal");
  assert.equal(level("offline_replay"), "write");
  assert.equal(level("sync_run"), "write");
  assert.equal(level("sync_run", { confirm_first_batch: true }), "admin");
  assert.equal(level("bring_connect"), "admin");
  assert.equal(level("bring_disconnect"), "admin");
  assert.equal(level("nutrition_save"), "admin");
  assert.equal(level("ingredient_save"), "admin");
  assert.equal(level("unknown_command"), null);
  assert.equal(denial("reader", "read"), null);
  assert.equal(denial("reader", "write").code, "write_not_permitted");
  assert.equal(denial("reader", "admin").code, "write_not_permitted");
  assert.equal(denial("writer", "admin").code, "unauthorized");
  assert.equal(denial("writer", "write"), null);
  assert.equal(denial("admin", "admin"), null);
  assert.equal(denial("reader", "personal"), null, "grants do not gate personal commands");
  for (const level of ["write", "admin", "personal"])
    assert.equal(denial("admin", level, true).code, "read_only", "read-only blocks " + level);
  assert.equal(denial("admin", "read", true), null);
});

test("server refuses to start on malformed or duplicate ATELIER_USERS without echoing hashes", async () => {
  const hash = await hashOf("anna-long-passphrase");
  const cases = [
    [{ ATELIER_USERS: `anna:boss:${hash}` }, /ATELIER_USERS entry 1 has an invalid role/],
    [{ ATELIER_USERS: `anna:admin:${hash};anna:reader:${hash}` }, /entry 2 repeats the username/],
    [
      { ATELIER_USERS: `atelier:reader:${hash}`, ATELIER_PASSWORD: PASSWORD },
      /repeats the ATELIER_USERNAME/,
    ],
    [{ ATELIER_USERS: "", ATELIER_PASSWORD: "" }, /ATELIER_PASSWORD or ATELIER_USERS/],
  ];
  for (const [env, pattern] of cases) {
    const { ready } = start(env);
    await assert.rejects(ready, (e) => {
      assert.equal(e.code, 1);
      assert.match(e.err, pattern);
      assert.ok(!e.err.includes(hash), "the hash must not be printed");
      return true;
    });
  }
});

test("hash-password reads stdin and prints a hash that verifies", async () => {
  const { spawn: spawnChild } = await import("node:child_process");
  const child = spawnChild(process.execPath, [join(ROOT, "scripts", "hash-password.mjs")], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stdin.end("stdin-passphrase-example\n");
  const [code] = await new Promise((resolve) => child.on("exit", (c) => resolve([c])));
  assert.equal(code, 0);
  const parsed = parseScryptHash(out.trim());
  assert.ok(parsed);
  assert.equal(await verifyScrypt("stdin-passphrase-example", parsed), true);
  const short = spawnChild(process.execPath, [join(ROOT, "scripts", "hash-password.mjs")], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  short.stdin.end("short\n");
  assert.equal(await new Promise((resolve) => short.on("exit", resolve)), 1);
});

test("server warns once about an untrusted proxy and stays quiet when proxies are trusted", async () => {
  for (const [env, expected] of [
    [{}, 1],
    [{ ATELIER_TRUSTED_PROXIES: "127.0.0.1" }, 0],
  ]) {
    const { child, ready } = start({ ATELIER_PASSWORD: PASSWORD, ...env });
    let logged = "";
    child.stderr.on("data", (c) => (logged += c));
    child.stdout.on("data", (c) => (logged += c));
    try {
      const port = await ready;
      const headers = { Authorization: basic(PASSWORD), "X-Forwarded-For": "198.51.100.7" };
      for (let i = 0; i < 3; i++) await fetch(`http://127.0.0.1:${port}/`, { headers });
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(logged.match(/ATELIER_TRUSTED_PROXIES is empty/g)?.length ?? 0, expected);
    } finally {
      child.kill();
    }
  }
});

test("isPrivateAddress recognises loopback and private ranges only", () => {
  for (const a of [
    "127.0.0.1",
    "10.1.2.3",
    "172.18.0.5",
    "192.168.1.9",
    "::1",
    "fd00::1",
    "::ffff:10.0.0.1",
  ])
    assert.equal(isPrivateAddress(a), true, a);
  for (const a of ["8.8.8.8", "172.32.0.1", "2001:db8::1", "unknown"])
    assert.equal(isPrivateAddress(a), false, a);
});
