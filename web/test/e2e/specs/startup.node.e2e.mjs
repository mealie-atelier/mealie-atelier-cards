// Configuration the server must refuse at startup, each with one clear line (plain Node route).
import { test } from "node:test";
import assert from "node:assert/strict";
import { startRefused, usersEnv } from "../lib/app.mjs";
import { ACCOUNTS } from "../lib/config.mjs";

const cases = [
  [
    "a password shorter than 12 characters",
    { ATELIER_PASSWORD: "short" },
    /at least 12 characters/,
  ],
  ["no password and no users", { ATELIER_PASSWORD: undefined }, /Configure MEALIE_URL/],
  ["a missing Mealie token", { MEALIE_API_TOKEN: undefined }, /Configure MEALIE_URL/],
  [
    "a Mealie URL with credentials",
    { MEALIE_URL: "http://user:pw@127.0.0.1:1" },
    /without credentials or query/,
  ],
  [
    "a Mealie URL with a query",
    { MEALIE_URL: "http://127.0.0.1:1/?a=b" },
    /without credentials or query/,
  ],
  ["a non-http Mealie URL", { MEALIE_URL: "ftp://127.0.0.1" }, /http\(s\) server URL/],
  ["a malformed ATELIER_USERS entry", { ATELIER_USERS: "bob:admin" }, /./],
  ["an invalid role in ATELIER_USERS", { ATELIER_USERS: "bob:root:scrypt$16384$8$1$aa$bb" }, /./],
  ["an invalid alarm channel", { ATELIER_ALARM_CHANNEL: "sms" }, /one of ha, push or both/],
  [
    "half-set Home Assistant settings",
    { ATELIER_HA_URL: "http://127.0.0.1:1" },
    /Home Assistant notifications need all of/,
  ],
  [
    "half-set VAPID settings",
    { ATELIER_VAPID_PUBLIC_KEY: "abc" },
    /VAPID notifications need all of/,
  ],
  [
    "both AI keys without a provider",
    { OPENAI_API_KEY: "sk-mock-1", ANTHROPIC_API_KEY: "ak-mock-1" },
    /Set ATELIER_AI_PROVIDER/,
  ],
  [
    "an unknown AI provider",
    { OPENAI_API_KEY: "sk-mock-1", ATELIER_AI_PROVIDER: "gemini" },
    /must be openai or anthropic/,
  ],
  [
    "an AI provider without its key",
    { ATELIER_AI_PROVIDER: "anthropic" },
    /needs ANTHROPIC_API_KEY/,
  ],
  ["a bad trusted proxy entry", { ATELIER_TRUSTED_PROXIES: "not-an-address" }, /./],
];

for (const [name, env, pattern] of cases)
  test(`startup refuses ${name}`, async () => {
    const { code, output } = await startRefused(env);
    assert.notEqual(code, 0, output);
    assert.match(output, pattern);
  });

test("startup refuses a username that is both shared and per-person", async () => {
  const users = (await usersEnv()).replace(/^ana:/, `${ACCOUNTS.shared.name}:`);
  const { code, output } = await startRefused({ ATELIER_USERS: users });
  assert.notEqual(code, 0);
  assert.match(output, /repeats the ATELIER_USERNAME/);
});

test("startup refuses a PORT outside 0 to 65535", async () => {
  const { code } = await startRefused({ PORT: "70000" });
  assert.notEqual(code, 0);
});
