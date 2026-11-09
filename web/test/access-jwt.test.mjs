import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, createSign, generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccessVerifier, parseAccessConfig } from "../access-jwt.mjs";
import { hashPassword, parseUsers } from "../security.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PRELOAD = join(ROOT, "test", "support", "access-fake-jwks.mjs");
const TEAM = "example-team.cloudflareaccess.com";
const ISS = `https://${TEAM}`;
const CERTS = `${ISS}/cdn-cgi/access/certs`;
const AUD = "test-audience-tag";
const EMAIL = "anna@example.com";
const T0 = 1_800_000_000_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const pairA = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pairB = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = (pair, kid) => ({ ...pair.publicKey.export({ format: "jwk" }), kid });
const b64 = (value) => Buffer.from(value).toString("base64url");
const claimsAt = (t, extra = {}) => ({
  iss: ISS,
  aud: [AUD],
  email: EMAIL,
  exp: Math.floor(t / SECOND) + 300,
  iat: Math.floor(t / SECOND),
  ...extra,
});
const rsaSign = (pair, input) =>
  createSign("RSA-SHA256").update(input).sign(pair.privateKey, "base64url");

/** Signs with RSA whatever the header claims, so only the header check can reject the alg. */
function token(claims, { kid = "k1", alg = "RS256", pair = pairA, header = null } = {}) {
  const input = `${b64(JSON.stringify(header ?? { alg, kid }))}.${b64(JSON.stringify(claims))}`;
  return `${input}.${rsaSign(pair, input)}`;
}
const without = (object, key) => {
  const copy = { ...object };
  delete copy[key];
  return copy;
};
const flipFirst = (segment) => (segment[0] === "A" ? "B" : "A") + segment.slice(1);

function harness({ keys = [jwk(pairA, "k1")], users = [[EMAIL, "anna"]] } = {}) {
  const state = { t: T0, keys, fail: false, calls: [] };
  const fetchImpl = async (url, init) => {
    state.calls.push({ url, init });
    if (state.fail) throw new Error("network down");
    return new Response(JSON.stringify({ keys: state.keys }), { status: 200 });
  };
  const verifier = createAccessVerifier({
    teamDomain: TEAM,
    audience: AUD,
    users: new Map(users),
    fetchImpl,
    now: () => state.t,
  });
  const verify = (jwt) => verifier.verify({ headers: { "cf-access-jwt-assertion": jwt } });
  return { state, verifier, verify };
}
const rejects = async (name, build, options) =>
  test(name, async () => {
    const { verify } = harness(options);
    assert.equal(await verify(build()), null);
  });

test("a valid token returns the mapped username and fetches the team's key set", async () => {
  const { state, verify } = harness();
  assert.equal(await verify(token(claimsAt(T0))), "anna");
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].url, CERTS);
});

test("aud may be a plain string or an array holding the audience", async () => {
  const { verify } = harness();
  assert.equal(await verify(token(claimsAt(T0, { aud: AUD }))), "anna");
  assert.equal(await verify(token(claimsAt(T0, { aud: ["other", AUD] }))), "anna");
});

rejects("wrong aud string", () => token(claimsAt(T0, { aud: "other" })));
rejects("wrong aud array", () => token(claimsAt(T0, { aud: ["other", `${AUD}x`] })));
rejects("aud that only contains the audience as a substring", () =>
  token(claimsAt(T0, { aud: `x${AUD}` })),
);
rejects("missing aud", () => token(without(claimsAt(T0), "aud")));
rejects("aud of another type", () => token(claimsAt(T0, { aud: { 0: AUD } })));
rejects("wrong iss", () => token(claimsAt(T0, { iss: "https://other.cloudflareaccess.com" })));
rejects("iss with a trailing slash", () => token(claimsAt(T0, { iss: `${ISS}/` })));
rejects("missing iss", () => token(without(claimsAt(T0), "iss")));
rejects("expired token", () => token(claimsAt(T0, { exp: Math.floor(T0 / SECOND) - 1 })));
rejects("token expiring this very second", () =>
  token(claimsAt(T0, { exp: Math.floor(T0 / SECOND) })),
);
rejects("missing exp", () => token(without(claimsAt(T0), "exp")));
rejects("exp that is not a number", () =>
  token(claimsAt(T0, { exp: String(Math.floor(T0 / SECOND) + 300) })),
);
rejects("nbf more than 60 s ahead", () =>
  token(claimsAt(T0, { nbf: Math.floor(T0 / SECOND) + 61 })),
);
rejects("iat more than 60 s ahead", () =>
  token(claimsAt(T0, { iat: Math.floor(T0 / SECOND) + 61 })),
);
rejects("nbf that is not a number", () => token(claimsAt(T0, { nbf: "0" })));
rejects("iat that is not a number", () => token(claimsAt(T0, { iat: null })));

test("nbf and iat within 60 s ahead are accepted, and both are optional", async () => {
  const { verify } = harness();
  const edge = Math.floor(T0 / SECOND) + 60;
  assert.equal(await verify(token(claimsAt(T0, { nbf: edge, iat: edge }))), "anna");
  assert.equal(await verify(token(without(without(claimsAt(T0), "iat"), "nbf"))), "anna");
});

for (const alg of ["none", "None", "HS256", "RS384", "rs256", "PS256"])
  test(`alg ${alg} is refused before any key is fetched, even with a valid RSA signature`, async () => {
    const { state, verify } = harness();
    assert.equal(await verify(token(claimsAt(T0), { alg })), null);
    assert.equal(state.calls.length, 0);
  });

test("alg none with an empty signature is refused", async () => {
  const { state, verify } = harness();
  const input = `${b64(JSON.stringify({ alg: "none", kid: "k1" }))}.${b64(JSON.stringify(claimsAt(T0)))}`;
  assert.equal(await verify(`${input}.`), null);
  assert.equal(state.calls.length, 0);
});

test("HS256 signed with the public key as the secret is refused", async () => {
  const { state, verify } = harness();
  const pem = pairA.publicKey.export({ type: "spki", format: "pem" });
  const input = `${b64(JSON.stringify({ alg: "HS256", kid: "k1" }))}.${b64(JSON.stringify(claimsAt(T0)))}`;
  const signature = createHmac("sha256", pem).update(input).digest("base64url");
  assert.equal(await verify(`${input}.${signature}`), null);
  assert.equal(state.calls.length, 0);
});

test("alg given as an array is refused", async () => {
  const { state, verify } = harness();
  assert.equal(await verify(token(claimsAt(T0), { header: { alg: ["RS256"], kid: "k1" } })), null);
  assert.equal(state.calls.length, 0);
});

rejects("unknown kid", () => token(claimsAt(T0), { kid: "nope" }));
rejects("missing kid", () => token(claimsAt(T0), { header: { alg: "RS256" } }));
rejects("kid that names an Object prototype member", () =>
  token(claimsAt(T0), { kid: "__proto__" }),
);
rejects("signature from another key under a known kid", () => token(claimsAt(T0), { pair: pairB }));
rejects(
  "tampered payload",
  () => {
    const [h, , s] = token(claimsAt(T0)).split(".");
    return `${h}.${b64(JSON.stringify(claimsAt(T0, { email: "ben@example.com" })))}.${s}`;
  },
  {
    users: [
      [EMAIL, "anna"],
      ["ben@example.com", "ben"],
    ],
  },
);
rejects("tampered signature", () => {
  const [h, p, s] = token(claimsAt(T0)).split(".");
  return `${h}.${p}.${flipFirst(s)}`;
});
rejects("unknown email", () => token(claimsAt(T0, { email: "mallory@example.com" })));
rejects("missing email", () => token(without(claimsAt(T0), "email")));
rejects("email that is not a string", () => token(claimsAt(T0, { email: [EMAIL] })));
rejects(
  "email whose Unicode lowercase folds onto a listed address",
  () => token(claimsAt(T0, { email: "Kate@example.com" })),
  { users: [["kate@example.com", "kate"]] },
);
rejects("email that is an Object prototype member", () =>
  token(claimsAt(T0, { email: "constructor" })),
);

test("email is compared lowercased on both sides", async () => {
  const fromToken = harness();
  assert.equal(await fromToken.verify(token(claimsAt(T0, { email: "AnNa@Example.COM" }))), "anna");
  const fromMap = harness({ users: [["AnNa@Example.COM", "anna"]] });
  assert.equal(await fromMap.verify(token(claimsAt(T0))), "anna");
});

test("malformed tokens return null and never throw", async () => {
  const { verify } = harness();
  const good = token(claimsAt(T0));
  const [h, p, s] = good.split(".");
  const samples = [
    undefined,
    "",
    "abc",
    "a.b",
    `${h}.${p}`,
    `${good}.extra`,
    `${h}..${s}`,
    `${h}.${p}.`,
    `.${p}.${s}`,
    `${h}.${p}.s+g/`,
    `${h}=.${p}.${s}`,
    `${good}, ${good}`,
    `${b64("not json")}.${p}.${s}`,
    `${b64("null")}.${p}.${s}`,
    ["array", "header"],
    42,
  ];
  for (const sample of samples) assert.equal(await verify(sample), null);
  const signedGarbage = (payload) => {
    const input = `${h}.${b64(payload)}`;
    return `${input}.${rsaSign(pairA, input)}`;
  };
  for (const payload of ["not json", "null", "42", "[]"])
    assert.equal(await verify(signedGarbage(payload)), null);
});

test("segments that only decode leniently are refused even when correctly signed", async () => {
  const { verify } = harness();
  const [h, p] = token(claimsAt(T0)).split(".");
  const signed = (head, body) => `${head}.${body}.${rsaSign(pairA, `${head}.${body}`)}`;
  assert.equal(await verify(signed(`${h}=`, p)), null);
  assert.equal(await verify(signed(h, `${p}=`)), null);
  assert.equal(await verify(signed(h, p).concat("=")), null);
  assert.equal(await verify(signed(h, p)), "anna", "the same token without the padding is fine");
});

test("a token without a kid does not trigger a key fetch", async () => {
  const { state, verify } = harness();
  await verify(token(claimsAt(T0)));
  state.t += 5 * MINUTE;
  assert.equal(await verify(token(claimsAt(state.t), { header: { alg: "RS256" } })), null);
  assert.equal(state.calls.length, 1);
});

test("a non-RSA key in the key set is never used, even when a signature would match", async () => {
  const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const { verify } = harness({ keys: [jwk(ec, "ec1"), jwk(pairA, "k1")] });
  assert.equal(await verify(token(claimsAt(T0), { kid: "ec1", pair: ec })), null);
  assert.equal(await verify(token(claimsAt(T0))), "anna");
});

test("requests without headers return null and the cookie is never read", async () => {
  const { state, verifier } = harness();
  assert.equal(await verifier.verify({ headers: {} }), null);
  assert.equal(await verifier.verify({}), null);
  assert.equal(await verifier.verify(undefined), null);
  const cookie = `CF_Authorization=${token(claimsAt(T0))}`;
  assert.equal(await verifier.verify({ headers: { cookie } }), null);
  assert.equal(state.calls.length, 0);
});

test("the key fetch refuses redirects", async () => {
  const { state, verify } = harness();
  await verify(token(claimsAt(T0)));
  assert.equal(state.calls[0].init.redirect, "error");
});

test("a key fetch that hangs is abandoned after 5 s", async () => {
  const verifier = createAccessVerifier({
    teamDomain: TEAM,
    audience: AUD,
    users: new Map([[EMAIL, "anna"]]),
    now: () => T0,
    fetchImpl: (url, init) =>
      new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      }),
  });
  // The abort timer is unreferenced, so without this the test runner sees an empty event loop.
  const keepAlive = setInterval(() => {}, SECOND);
  const started = Date.now();
  const headers = { "cf-access-jwt-assertion": token(claimsAt(T0)) };
  const result = await verifier.verify({ headers });
  clearInterval(keepAlive);
  assert.equal(result, null);
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 4500 && elapsed < 6500, `took ${elapsed} ms`);
});

test("JWKS fetch failure without cached keys returns null", async () => {
  const { state, verify } = harness();
  state.fail = true;
  assert.equal(await verify(token(claimsAt(T0))), null);
});

for (const [name, body, status] of [
  ["a non-2xx answer", JSON.stringify({ keys: [jwk(pairA, "k1")] }), 500],
  ["invalid JSON", "<html>", 200],
  ["no keys member", "{}", 200],
  ["only unusable keys", JSON.stringify({ keys: [{ kty: "RSA", kid: "k1" }] }), 200],
  ["a non-RSA key", null, 200],
])
  test(`an answer with ${name} counts as a failed fetch`, async () => {
    const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const text = body ?? JSON.stringify({ keys: [jwk(ec, "k1")] });
    const verifier = createAccessVerifier({
      teamDomain: TEAM,
      audience: AUD,
      users: new Map([[EMAIL, "anna"]]),
      now: () => T0,
      fetchImpl: async () => new Response(text, { status }),
    });
    const headers = { "cf-access-jwt-assertion": token(claimsAt(T0)) };
    assert.equal(await verifier.verify({ headers }), null);
  });

test("a bad answer keeps the cached keys in use", async () => {
  const responses = [
    new Response(JSON.stringify({ keys: [jwk(pairA, "k1")] })),
    new Response("{}"),
  ];
  let t = T0;
  const verifier = createAccessVerifier({
    teamDomain: TEAM,
    audience: AUD,
    users: new Map([[EMAIL, "anna"]]),
    now: () => t,
    fetchImpl: async () => responses.shift(),
  });
  const verify = (jwt) => verifier.verify({ headers: { "cf-access-jwt-assertion": jwt } });
  assert.equal(await verify(token(claimsAt(t))), "anna");
  t += HOUR + SECOND;
  assert.equal(await verify(token(claimsAt(t))), "anna");
});

test("JWKS fetch failure with cached keys keeps verifying", async () => {
  const { state, verify } = harness();
  assert.equal(await verify(token(claimsAt(T0))), "anna");
  state.fail = true;
  state.t += HOUR + SECOND;
  assert.equal(state.calls.length, 1);
  assert.equal(await verify(token(claimsAt(state.t))), "anna");
  assert.equal(state.calls.length, 2, "the expired cache was refetched");
});

test("keys are cached for one hour", async () => {
  const { state, verify } = harness();
  await verify(token(claimsAt(T0)));
  state.t = T0 + HOUR - SECOND;
  await verify(token(claimsAt(state.t)));
  assert.equal(state.calls.length, 1);
  state.t = T0 + HOUR;
  await verify(token(claimsAt(state.t)));
  assert.equal(state.calls.length, 2);
});

test("kid rotation: an unknown kid refetches, the new key works and a removed key stops", async () => {
  const { state, verify } = harness();
  const oldToken = token(claimsAt(T0));
  assert.equal(await verify(oldToken), "anna");
  state.t += 5 * MINUTE;
  state.keys = [jwk(pairB, "k2")];
  const rotated = token(claimsAt(state.t), { kid: "k2", pair: pairB });
  assert.equal(await verify(rotated), "anna");
  assert.equal(state.calls.length, 2);
  assert.equal(await verify(token(claimsAt(state.t))), null, "the removed key is gone");
});

test("unknown kids refetch at most once every 5 minutes", async () => {
  const { state, verify } = harness();
  await verify(token(claimsAt(T0)));
  assert.equal(state.calls.length, 1);
  state.keys = [jwk(pairA, "k1"), jwk(pairB, "k2")];
  const rotated = (t) => token(claimsAt(t), { kid: "k2", pair: pairB });
  state.t = T0 + 5 * MINUTE - SECOND;
  assert.equal(await verify(rotated(state.t)), null);
  assert.equal(await verify(token(claimsAt(state.t), { kid: "other" })), null);
  assert.equal(state.calls.length, 1, "inside the window nothing is fetched");
  state.t = T0 + 5 * MINUTE;
  assert.equal(await verify(rotated(state.t)), "anna");
  assert.equal(state.calls.length, 2);
});

test("a failed fetch waits out the same 5 minutes and then recovers", async () => {
  const { state, verify } = harness();
  state.fail = true;
  assert.equal(await verify(token(claimsAt(T0))), null);
  state.fail = false;
  state.t = T0 + 5 * MINUTE - SECOND;
  assert.equal(await verify(token(claimsAt(state.t))), null);
  assert.equal(state.calls.length, 1, "an unreachable Cloudflare is not hammered");
  state.t = T0 + 5 * MINUTE;
  assert.equal(await verify(token(claimsAt(state.t))), "anna");
  assert.equal(state.calls.length, 2);
});

test("concurrent requests share one key fetch and all succeed", async () => {
  const { state, verify } = harness();
  const jwt = token(claimsAt(T0));
  assert.deepEqual(await Promise.all([verify(jwt), verify(jwt), verify(jwt)]), [
    "anna",
    "anna",
    "anna",
  ]);
  assert.equal(state.calls.length, 1);
});

test("neither tokens nor emails reach the console", async (t) => {
  const lines = [];
  for (const method of ["log", "warn", "error", "info"])
    t.mock.method(console, method, (...args) => lines.push(args.join(" ")));
  const { state, verify } = harness();
  const jwt = token(claimsAt(T0));
  await verify(jwt);
  await verify(token(claimsAt(T0, { email: "mallory@example.com" })));
  state.fail = true;
  state.t += HOUR;
  await verify(jwt);
  const output = lines.join("\n");
  assert.ok(!output.includes(jwt));
  assert.ok(!output.includes("@example.com"));
});

// --- Configuration ---------------------------------------------------------------------------

const accountHash = await hashPassword("a-sufficiently-long-password");
const ACCOUNTS = `anna:admin:${accountHash};ben:reader:${accountHash};cara:writer:${accountHash}`;
const USERS = parseUsers(ACCOUNTS);
const CONFIG = {
  ATELIER_ACCESS_TEAM_DOMAIN: TEAM,
  ATELIER_ACCESS_AUD: AUD,
  ATELIER_ACCESS_USERS: `${EMAIL}:anna,Ben@Example.com:ben`,
};

test("a complete configuration is parsed, with emails lowercased", () => {
  const config = parseAccessConfig(CONFIG, USERS);
  assert.equal(config.teamDomain, TEAM);
  assert.equal(config.audience, AUD);
  assert.deepEqual(
    [...config.users],
    [
      [EMAIL, "anna"],
      ["ben@example.com", "ben"],
    ],
  );
});

test("no Access settings at all means the feature is off", () => {
  assert.equal(parseAccessConfig({}, USERS), null);
  assert.equal(
    parseAccessConfig(
      { ATELIER_ACCESS_TEAM_DOMAIN: "", ATELIER_ACCESS_AUD: " ", ATELIER_ACCESS_USERS: "" },
      USERS,
    ),
    null,
  );
});

for (const name of Object.keys(CONFIG))
  test(`partial configuration is refused when ${name} is missing`, () => {
    assert.throws(
      () => parseAccessConfig(without(CONFIG, name), USERS),
      new RegExp(`missing ${name}`),
    );
    assert.throws(
      () => parseAccessConfig({ ...CONFIG, [name]: "  " }, USERS),
      new RegExp(`missing ${name}`),
    );
  });

for (const domain of [
  "cloudflareaccess.com",
  ".cloudflareaccess.com",
  "https://team.cloudflareaccess.com",
  "team.cloudflareaccess.com/",
  "team.cloudflareaccess.com:443",
  "team.cloudflareaccess.com.evil.example",
  "team.example.com",
  "a.b.cloudflareaccess.com",
  "user@team.cloudflareaccess.com",
  "Team.cloudflareaccess.com",
  "-team.cloudflareaccess.com",
  "team_x.cloudflareaccess.com",
])
  test(`team domain ${domain} is refused`, () => {
    assert.throws(
      () => parseAccessConfig({ ...CONFIG, ATELIER_ACCESS_TEAM_DOMAIN: domain }, USERS),
      /ATELIER_ACCESS_TEAM_DOMAIN must be/,
    );
  });

for (const [name, value, pattern] of [
  [
    "an unknown username",
    `${EMAIL}:nobody`,
    /entry 1 names a username that is not in ATELIER_USERS/,
  ],
  ["a later unknown username", `${EMAIL}:anna,x@example.com:nobody`, /entry 2 names/],
  ["no separator", EMAIL, /entry 1 must look like email:username/],
  ["too many separators", `${EMAIL}:anna:admin`, /entry 1 must look like email:username/],
  ["an invalid email", "not-an-email:anna", /entry 1 must look like email:username/],
  ["an email with two at signs", "a@b@example.com:anna", /entry 1 must look like email:username/],
  [
    "a repeated email",
    `${EMAIL}:anna,ANNA@example.com:ben`,
    /entry 2 repeats the email of entry 1/,
  ],
  ["only separators", " , ,", /must list at least one/],
])
  test(`ATELIER_ACCESS_USERS with ${name} is refused`, () => {
    assert.throws(
      () => parseAccessConfig({ ...CONFIG, ATELIER_ACCESS_USERS: value }, USERS),
      pattern,
    );
  });

test("a configuration error never echoes the email", () => {
  assert.throws(
    () => parseAccessConfig({ ...CONFIG, ATELIER_ACCESS_USERS: `${EMAIL}:nobody` }, USERS),
    (error) => !error.message.includes(EMAIL),
  );
});

test("usernames resolve only against ATELIER_USERS, not the shared password account", () => {
  assert.throws(
    () => parseAccessConfig({ ...CONFIG, ATELIER_ACCESS_USERS: `${EMAIL}:atelier` }, []),
    /not in ATELIER_USERS/,
  );
});

// --- The real request gate --------------------------------------------------------------------

const PASSWORD = "shared-sign-in-password";
const basic = (pass) => "Basic " + Buffer.from(`atelier:${pass}`).toString("base64");
const ACCESS_ENV = {
  ...CONFIG,
  ATELIER_ACCESS_USERS: `${EMAIL}:anna,ben@example.com:ben,cara@example.com:cara`,
};

async function start(env) {
  const dataDir = await mkdtemp(join(tmpdir(), "atelier-access-"));
  const child = spawn(process.execPath, ["--import", PRELOAD, join(ROOT, "server.mjs")], {
    env: {
      PATH: process.env.PATH,
      MEALIE_URL: "http://127.0.0.1:9",
      MEALIE_API_TOKEN: "t",
      ATELIER_USERNAME: "atelier",
      ATELIER_PASSWORD: PASSWORD,
      ATELIER_USERS: ACCOUNTS,
      ATELIER_DATA_DIR: dataDir,
      ACCESS_TEST_JWKS: JSON.stringify({ keys: [jwk(pairA, "k1")] }),
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
    const timer = setTimeout(() => reject(Error("App did not start")), 8000);
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
  const stop = async () => {
    child.kill();
    await rm(dataDir, { recursive: true, force: true });
  };
  return { ready, stop, output: () => out + err };
}

async function withServer(env, run) {
  const server = await start(env);
  try {
    await run(`http://127.0.0.1:${await server.ready}`, server);
  } finally {
    await server.stop();
  }
}

const now = () => Date.now();
const assertion = (claims = {}, options) => ({
  "cf-access-jwt-assertion": token(claimsAt(now(), claims), options),
});
const bridge = (base, headers, msg) =>
  fetch(`${base}/api/bridge`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(msg),
  });
const CSRF = { "x-atelier-request": "1" };

test("gate: absent or invalid tokens get the 401 sign-in, a valid token does not", async () => {
  await withServer(ACCESS_ENV, async (base) => {
    const absent = await fetch(`${base}/`);
    assert.equal(absent.status, 401);
    assert.match(absent.headers.get("www-authenticate"), /^Basic /);
    for (const headers of [
      { "cf-access-jwt-assertion": "garbage" },
      assertion({}, { pair: pairB }),
      assertion({ aud: "other" }),
      assertion({ exp: 1 }),
      assertion({ email: "mallory@example.com" }),
      assertion({}, { alg: "none" }),
    ]) {
      const denied = await fetch(`${base}/`, { headers });
      assert.equal(denied.status, 401);
      assert.match(denied.headers.get("www-authenticate"), /^Basic /);
    }
    const valid = await fetch(`${base}/`, { headers: assertion() });
    assert.equal(valid.status, 200);
    assert.equal(valid.headers.get("www-authenticate"), null);
  });
});

test("gate: Basic sign-in keeps working next to Access, also with an invalid token", async () => {
  await withServer(ACCESS_ENV, async (base) => {
    assert.equal(
      (await fetch(`${base}/`, { headers: { Authorization: basic(PASSWORD) } })).status,
      200,
    );
    const headers = { Authorization: basic(PASSWORD), "cf-access-jwt-assertion": "garbage" };
    assert.equal((await fetch(`${base}/`, { headers })).status, 200);
  });
});

test("gate: invalid tokens are not failed sign-ins", async () => {
  await withServer(ACCESS_ENV, async (base) => {
    for (let i = 0; i < 10; i++) {
      const denied = await fetch(`${base}/`, { headers: assertion({ aud: "other" }) });
      assert.equal(denied.status, 401);
    }
  });
});

test("gate: a valid token skips the sign-in lockout, an invalid token does not", async () => {
  await withServer(ACCESS_ENV, async (base) => {
    let status = 0;
    for (let i = 0; i < 8 && status !== 429; i++)
      status = (await fetch(`${base}/`, { headers: { Authorization: basic("wrong-password") } }))
        .status;
    assert.equal(status, 429, "the address is locked out");
    assert.equal((await fetch(`${base}/`, { headers: assertion() })).status, 200);
    assert.equal((await fetch(`${base}/`, { headers: assertion({ aud: "other" }) })).status, 429);
  });
});

test("gate: the token's user gets the role from ATELIER_USERS, and writes stay guarded", async () => {
  await withServer(ACCESS_ENV, async (base) => {
    const status = { type: "mealie_atelier/status" };
    const permissions = async (email) => {
      const response = await bridge(base, { ...assertion({ email }), ...CSRF }, status);
      assert.equal(response.status, 200);
      return (await response.json()).entries[0].permissions;
    };
    assert.deepEqual(await permissions(EMAIL), {
      can_read: true,
      can_write: true,
      can_admin: true,
    });
    assert.deepEqual(await permissions("cara@example.com"), {
      can_read: true,
      can_write: true,
      can_admin: false,
    });
    assert.deepEqual(await permissions("ben@example.com"), {
      can_read: true,
      can_write: false,
      can_admin: false,
    });
    const noCsrf = await bridge(base, assertion(), status);
    assert.equal(noCsrf.status, 403);
    assert.match((await noCsrf.json()).error, /CSRF/);
    const write = { type: "mealie_atelier/mutate", action: "shopping_add" };
    const refused = await bridge(
      base,
      { ...assertion({ email: "ben@example.com" }), ...CSRF },
      write,
    );
    assert.equal(refused.status, 403);
    assert.equal((await refused.json()).code, "write_not_permitted");
  });
});

test("gate: read-only mode also holds for a token user", async () => {
  await withServer({ ...ACCESS_ENV, ATELIER_READ_ONLY: "true" }, async (base) => {
    const refused = await bridge(
      base,
      { ...assertion(), ...CSRF },
      {
        type: "mealie_atelier/mutate",
        action: "shopping_add",
      },
    );
    assert.equal(refused.status, 403);
    assert.equal((await refused.json()).code, "read_only");
  });
});

test("gate: without the settings the header means nothing", async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(`${base}/`, { headers: assertion() })).status, 401);
  });
});

for (const [name, env, pattern] of [
  ["partial settings", without(ACCESS_ENV, "ATELIER_ACCESS_AUD"), /missing ATELIER_ACCESS_AUD/],
  [
    "an invalid team domain",
    { ...ACCESS_ENV, ATELIER_ACCESS_TEAM_DOMAIN: "example.com" },
    /ATELIER_ACCESS_TEAM_DOMAIN must be/,
  ],
  [
    "an unknown username",
    { ...ACCESS_ENV, ATELIER_ACCESS_USERS: `${EMAIL}:nobody` },
    /not in ATELIER_USERS/,
  ],
])
  test(`server refuses to start with ${name}`, async () => {
    const server = await start(env);
    try {
      await assert.rejects(server.ready, (e) => {
        assert.equal(e.code, 1);
        assert.match(e.err, pattern);
        assert.ok(!e.err.includes(EMAIL));
        return true;
      });
    } finally {
      await server.stop();
    }
  });
